/* ai-assistant.js — global "Ask AI" command bar + chat overlay (ClickUp-style).
 *
 * A top-center bar in the header opens a centered overlay that talks to the
 * existing Ready Ralph assistant (POST /assistant/chat/stream, with a
 * non-streaming /assistant/chat fallback). That backend already has 30+
 * read-only account tools (balance, sends, delivery, contacts, campaigns,
 * 10DLC status, integrations…) so it can genuinely "help with anything"
 * grounded in the user's real data.
 *
 * Self-contained: injects its own CSS, builds the overlay lazily, gates on the
 * readysms_token, and reuses window.api / __rsmsToast / __rsmsShowTab when present.
 */
(function () {
  'use strict';
  var API_BASE = (typeof window !== 'undefined' && window.READYSMS_API_BASE) || 'https://api.readysms.io';

  // Optional embed config. On the dashboard the trigger is the static #tb-ai-open
  // header bar; on pages without it (the onboarding wizard) set
  // window.RALPH_INAPP = { floating:true, context:'onboarding' } to get a
  // bottom-right launcher and route the chat through the onboarding tool subset.
  var CFG = (typeof window !== 'undefined' && window.RALPH_INAPP) || {};
  var CONTEXT = CFG.context || null;
  var FLOATING = !!CFG.floating;
  function withCtx(p) { if (CONTEXT) p.context = CONTEXT; return p; }

  function token() {
    try { return localStorage.getItem('readysms_token') || sessionStorage.getItem('readysms_impersonate_token') || ''; } catch (e) { return ''; }
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---- compact markdown -> safe HTML (bold/italic/code/links/lists/headings) ----
  // The assistant suggests in-app navigation as [Label](action:NAME "hint").
  // Route NAME/Label to a Mercury tab so we can render a real clickable button.
  function navFor(a, label) {
    a = (a || '').toLowerCase(); label = (label || '').toLowerCase();
    if (/blast/.test(label)) return 'blasts';
    if (/contact|import|csv|crm/.test(label)) return 'contacts';
    if (/automation|sequence|drip/.test(label)) return 'campaigns';
    if (/dialer|call/.test(label)) return 'dialer';
    if (/report|usage|analytic/.test(label)) return 'reports';
    if (/10dlc|registration|brand|verif/.test(label) || /10dlc|registration/.test(a)) return '10dlc';
    if (/number|deliverab/.test(label)) return 'number-health';
    if (/inbox|message|conversation/.test(label)) return 'inbox';
    return 'settings';
  }
  // Integration-flavored actions deep-link to the Settings → Integrations sub-tab.
  function subFor(a, label) {
    var s = ((a || '') + ' ' + (label || '')).toLowerCase();
    return /ghl|gohighlevel|integration|api[ _-]?key|zapier|webhook|calendly/.test(s) ? 'integrations' : null;
  }
  // An action button is one of three things: CONTINUE THE CHAT (ask the assistant to
  // do/explain something — keeps the modal open), MAILTO, or in-app NAVIGATION.
  // Investigative/affirmative labels ("Check my delivery health", "Yes", "Set it up
  // for me") must continue the conversation, NOT navigate — that was the "button just
  // closes the modal" bug. Only explicit destinations navigate.
  var CONVO_RE = /^(check|dig|analy[sz]e|show|tell|explain|yes\b|no\b|why|what|how|walk|look into|look at|review|find out|continue|more\b|sure\b|go ahead|do it|help me|diagnos|investigat|troubleshoot|inspect|run\b|scan\b|test\b|pull\b|fetch\b|compare\b)/i;
  function classifyAction(act, label) {
    act = (act || '').toLowerCase(); var L = String(label || '').trim();
    if (act === 'email_support') return { kind: 'mail' };
    // Client-side file download (never re-asks Ralph / navigates) — e.g. a ready-to-fill
    // contacts CSV template the user fills in and uploads themselves.
    if (act === 'download_csv_template') return { kind: 'download', what: 'contacts_csv' };
    if (act === 'guided_setup') return { kind: 'send', text: L || 'Yes — go ahead and set it up for me.' };
    if (/^direction_/.test(act)) return { kind: 'send', text: L };
    if (act === 'connect_ghl' || act === 'generate_api_key' || act === 'open_integrations_tab') return { kind: 'nav', tab: 'settings', sub: 'integrations' };
    if (CONVO_RE.test(L)) return { kind: 'send', text: L };          // ask the assistant to continue
    var nav = navFor(act, L);
    return { kind: 'nav', tab: nav, sub: (nav === 'settings') ? subFor(act, L) : null };
  }
  function actBtn(label, act) {
    var c = classifyAction(act, label);
    if (c.kind === 'mail') return '<button type="button" class="rai-act" data-rai-mail="1">' + label + '</button>';
    if (c.kind === 'send') return '<button type="button" class="rai-act" data-rai-send="' + c.text + '">' + label + '</button>'; // c.text is already esc-safe (round-trips via getAttribute)
    if (c.kind === 'download') return '<button type="button" class="rai-act" data-rai-download="' + c.what + '">' + label + '</button>';
    return '<button type="button" class="rai-act" data-rai-nav="' + c.tab + '"' + (c.sub ? ' data-rai-sub="' + c.sub + '"' : '') + '>' + label + '</button>';
  }
  // Build a ready-to-fill contacts CSV (the headers Ralph documents + two example rows)
  // and download it to the user's computer. Client-side only — they fill it in and
  // upload it themselves in Contacts → Import. CRLF for Excel/Sheets friendliness.
  function downloadContactsCsvTemplate() {
    var csv = 'phone,first_name,last_name,email,tags,pipeline_stage\r\n'
      + '+15551234567,Jane,Smith,jane@email.com,new-lead,new_lead\r\n'
      + '5559876543,John,Doe,,buyer;hot-lead,contacted\r\n';
    try {
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'readysms-contacts-template.csv';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { try { URL.revokeObjectURL(a.href); } catch (e) {} }, 1000);
    } catch (e) {}
  }
  // Bare [Label] CTAs the model sometimes emits (without "(action:…)") must START
  // with an action verb to become a button — so citations like [1], placeholders,
  // and code samples are NEVER turned into buttons.
  var CTA_RE = /^(connect|set ?up|register|open|go to|view|add|create|enable|disable|generate|manage|configure|fix|start|finish|complete|buy|get|see|check|update|link|turn on|turn off|review|build|send|schedule|verify|upgrade|activate|import|export)\b/i;
  function inlineMd(s) {
    s = esc(s);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>');
    // 1) Proper action links [Label](action:NAME "hint") → nav button.
    // The hint is matched non-greedily up to its closing quote — NOT [^&]* — because
    // esc() turns a literal & in the hint (e.g. "brand & campaign") into &amp;, which
    // [^&]* can't cross, so the whole link failed to match and rendered as raw text.
    s = s.replace(/\[([^\]]+)\]\(action:([a-z_]+)(?:\s+&quot;[\s\S]*?&quot;)?\)/gi, function (m, label, act) { return actBtn(label, act); });
    // 2) Real URLs.
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // 3) Bare CTA brackets without (action:…) — only if the label starts with an action verb.
    s = s.replace(/\[\s*([^\]\n(]{1,42}?)\s*\](?!\s*\()/g, function (m, label) { var L = label.trim(); return CTA_RE.test(L) ? actBtn(L, '') : m; });
    return s;
  }
  function cells(ln) { return ln.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (c) { return c.trim(); }); }
  function md(t) {
    var lines = String(t || '').split('\n'), html = '', list = null, para = [];
    function flushP() { if (para.length) { html += '<p>' + inlineMd(para.join(' ')) + '</p>'; para = []; } }
    function closeL() { if (list) { html += list === 'ol' ? '</ol>' : '</ul>'; list = null; } }
    function isTableSep(s) { return /^\s*\|?[\s:|-]*-{2,}[\s:|-]*\|?\s*$/.test(s) && s.indexOf('|') >= 0; }
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      // Fenced code block ``` — preserve line breaks, no inline-md inside.
      if (/^\s*```/.test(ln)) {
        flushP(); closeL();
        var codeLines = []; i++;
        while (i < lines.length && !/^\s*```/.test(lines[i])) { codeLines.push(lines[i]); i++; }
        html += '<pre class="rai-pre"><code>' + esc(codeLines.join('\n')) + '</code></pre>';
        continue;
      }
      // GitHub-style table: header row, separator row, then body rows.
      if (/^\s*\|.*\|\s*$/.test(ln) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
        flushP(); closeL();
        var head = cells(ln), body = []; i += 2;
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { body.push(cells(lines[i])); i++; }
        i--;
        html += '<table class="rai-tbl"><thead><tr>' + head.map(function (c) { return '<th>' + inlineMd(c) + '</th>'; }).join('') + '</tr></thead><tbody>'
          + body.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + inlineMd(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
        continue;
      }
      var h = ln.match(/^#{1,4}\s+(.*)$/), ol = ln.match(/^\s*\d+[.)]\s+(.*)$/), ul = ln.match(/^\s*[-*•]\s+(.*)$/);
      if (h) { flushP(); closeL(); html += '<div class="rai-h">' + inlineMd(h[1]) + '</div>'; }
      else if (ol) { flushP(); if (list !== 'ol') { closeL(); html += '<ol>'; list = 'ol'; } html += '<li>' + inlineMd(ol[1]) + '</li>'; }
      else if (ul) { flushP(); if (list !== 'ul') { closeL(); html += '<ul>'; list = 'ul'; } html += '<li>' + inlineMd(ul[1]) + '</li>'; }
      else if (!ln.trim()) { flushP(); closeL(); }
      else { closeL(); para.push(ln.trim()); }
    }
    flushP(); closeL();
    return html || '<p>' + inlineMd(t) + '</p>';
  }

  var SPARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/></svg>';
  var IC = {
    stat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 5-6"/></svg>',
    bal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
    camp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4a2 2 0 0 1 0-4h2"/><path d="M18 9h2a2 2 0 0 0 0-4h-2"/><path d="M6 5h12v4a6 6 0 0 1-12 0z"/><path d="M9 21h6"/><path d="M12 15v6"/></svg>',
    dlc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
  };
  var STARTERS = [
    { q: 'How many texts did I send this week?', i: IC.stat },
    { q: 'What’s my balance and delivery rate?', i: IC.bal },
    { q: 'Which campaign performed best?', i: IC.camp },
    { q: 'How do I register for 10DLC?', i: IC.dlc }
  ];
  // Map a tool name -> friendly "doing X" status while it runs.
  function toolLabel(name) {
    var m = {
      account_health: 'Checking your account…', get_account_performance: 'Pulling your stats…',
      get_campaign_performance: 'Reviewing your campaigns…', find_contact: 'Looking up that contact…',
      delivery_diagnostics: 'Analyzing delivery…', list_phone_numbers: 'Checking your numbers…',
      list_drip_sequences: 'Checking your sequences…', list_tags: 'Reading your tags…',
      recent_inbound_events: 'Reading recent replies…', list_api_keys: 'Checking your API keys…',
      list_webhooks: 'Checking your webhooks…',
      get_dialer_summary: 'Checking your dialer…', get_billing_summary: 'Checking your billing…',
      send_blast: 'Sending your blast…', enroll_contacts: 'Enrolling contacts…',
      create_blast: 'Drafting your blast…', create_automation: 'Building your automation…',
      create_api_key: 'Creating an API key…', subscribe_webhook: 'Setting up your webhook…',
      send_test_sms: 'Sending a test text…',
      pause_dial_campaign: 'Pausing the campaign…', resume_dial_campaign: 'Resuming the campaign…'
    };
    return m[name] || 'Working on it…';
  }

  function injectCss() {
    if (document.getElementById('rai-css')) return;
    var st = document.createElement('style'); st.id = 'rai-css';
    st.textContent = [
      /* top-center bar CSS lives in the static <head> of the dashboard HTML (so it
         paints styled, no FOUC). Only the on-demand overlay is styled here. */
      /* ---- overlay ---- */
      '.rai-overlay{position:fixed;inset:0;z-index:9998;background:rgba(15,23,42,.5);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);display:none;align-items:flex-start;justify-content:center;padding:8vh 16px 16px}',
      '.rai-overlay.open{display:flex}',
      '.rai-modal{position:relative;background:var(--card,#fff);width:100%;max-width:680px;max-height:84vh;border-radius:20px;box-shadow:0 32px 90px rgba(15,23,42,.4),0 0 0 1px rgba(15,23,42,.04);display:flex;flex-direction:column;overflow:hidden;animation:raiIn .2s cubic-bezier(.2,.9,.3,1)}',
      '.rai-modal::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#2563eb,#0ea5e9,#06b6d4);z-index:1}',
      '@keyframes raiIn{from{opacity:0;transform:translateY(-14px) scale(.985)}to{opacity:1;transform:none}}',
      '.rai-head{display:flex;align-items:center;gap:11px;padding:17px 18px 13px}',
      '.rai-av{flex:none;width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#2563eb,#0ea5e9);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(37,99,235,.3)}.rai-av svg{width:17px;height:17px}',
      '.rai-title{font-size:15.5px;font-weight:700;color:var(--ink,#0f172a);letter-spacing:-.01em}',
      '.rai-badge{font-size:9.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#1d4ed8;background:linear-gradient(135deg,rgba(37,99,235,.13),rgba(14,165,233,.13));padding:3px 8px;border-radius:999px}',
      '.rai-flex{flex:1}',
      '.rai-x,.rai-new,.rai-hist{border:0;background:none;color:var(--muted,#6b7280);cursor:pointer;width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;transition:background .12s}.rai-x:hover,.rai-new:hover,.rai-hist:hover{background:var(--bg-soft,#f3f4f6);color:var(--ink,#111)}.rai-x svg{width:18px;height:18px}.rai-new svg,.rai-hist svg{width:16px;height:16px}',
      '.rai-hist-head{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--faint,#9aa3af);padding:4px 2px 8px}',
      '.rai-hist-msg{padding:24px 8px;text-align:center;color:var(--muted,#6b7280);font-size:13px}',
      '.rai-hist-row{display:flex;align-items:center;gap:8px;padding:10px 11px;border-radius:11px;cursor:pointer;transition:background .12s}.rai-hist-row:hover{background:var(--bg-soft,#f3f4f6)}',
      '.rai-hist-main{flex:1;min-width:0}.rai-hist-title{font-size:13.5px;font-weight:600;color:var(--ink,#0f172a);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rai-hist-time{font-size:11.5px;color:var(--faint,#9aa3af);margin-top:1px}',
      '.rai-hist-del{flex:none;border:0;background:none;color:var(--faint,#9aa3af);cursor:pointer;font-size:18px;line-height:1;padding:4px 7px;border-radius:7px}.rai-hist-del:hover{background:var(--red-tint,#fee2e2);color:#dc2626}',
      '.rai-body{flex:1;overflow-y:auto;padding:8px 18px 18px;display:flex;flex-direction:column;gap:16px;min-height:170px}',
      /* empty state */
      '.rai-greet{display:flex;flex-direction:column;align-items:center;text-align:center;padding:20px 8px 4px}',
      '.rai-av-lg{width:48px;height:48px;border-radius:15px;background:linear-gradient(135deg,#2563eb,#0ea5e9);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 22px rgba(37,99,235,.34);margin-bottom:13px}.rai-av-lg svg{width:25px;height:25px}',
      '.rai-greet-t{font-size:18px;font-weight:740;color:var(--ink,#0f172a);letter-spacing:-.02em}',
      '.rai-greet-s{font-size:13px;color:var(--muted,#6b7280);line-height:1.55;margin-top:6px;max-width:410px}',
      '.rai-starters{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:20px}',
      '.rai-chip{display:flex;align-items:center;gap:11px;text-align:left;border:1px solid var(--hairline,#eef0f4);background:var(--card,#fff);color:var(--ink-2,#334155);font:inherit;font-size:12.5px;font-weight:500;line-height:1.4;padding:12px 13px;border-radius:13px;cursor:pointer;box-shadow:0 1px 2px rgba(16,24,40,.03);transition:border-color .14s,box-shadow .14s,transform .14s}',
      '.rai-chip:hover{border-color:#bfdbfe;box-shadow:0 8px 22px rgba(37,99,235,.1);transform:translateY(-1px)}',
      '.rai-chip-ic{flex:none;width:28px;height:28px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(37,99,235,.12),rgba(14,165,233,.12));color:#1d4ed8}.rai-chip-ic svg{width:15px;height:15px}',
      '@media(max-width:560px){.rai-starters{grid-template-columns:1fr}}',
      /* messages */
      '.rai-row{display:flex;gap:10px;align-items:flex-start}',
      '.rai-row-user{justify-content:flex-end}',
      '.rai-bot-av{flex:none;width:27px;height:27px;border-radius:8px;background:linear-gradient(135deg,#2563eb,#0ea5e9);color:#fff;display:flex;align-items:center;justify-content:center;margin-top:1px}.rai-bot-av svg{width:15px;height:15px}',
      '.rai-msg{font-size:14px;line-height:1.6}',
      '.rai-user{max-width:86%;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;padding:10px 14px;border-radius:15px 15px 5px 15px;box-shadow:0 2px 7px rgba(37,99,235,.22)}',
      '.rai-bot{flex:1;min-width:0;color:var(--ink,#0f172a);padding-top:3px}',
      '.rai-bot p{margin:0 0 9px}.rai-bot p:last-child{margin-bottom:0}',
      '.rai-bot ul,.rai-bot ol{margin:5px 0 9px;padding-left:20px}.rai-bot li{margin:4px 0}',
      '.rai-bot .rai-h{font-weight:700;margin:9px 0 3px;font-size:14.5px}',
      '.rai-bot code{background:var(--bg-soft,#f3f4f6);padding:2px 6px;border-radius:5px;font-size:12.5px;font-family:ui-monospace,Menlo,monospace}',
      '.rai-bot .rai-pre{background:#0f172a;color:#e2e8f0;border-radius:10px;padding:11px 13px;margin:6px 0 10px;overflow-x:auto;font-size:12px;line-height:1.5}.rai-bot .rai-pre code{background:none;padding:0;color:inherit;font-size:12px;white-space:pre}',
      '.rai-bot a{color:#2563eb;font-weight:600;text-decoration:none;border-bottom:1px solid rgba(37,99,235,.3)}.rai-bot a:hover{border-bottom-color:#2563eb}',
      '.rai-bot .rai-act{display:inline-flex;align-items:center;margin:4px 7px 2px 0;padding:7px 13px;border:1px solid #bfdbfe;background:linear-gradient(135deg,rgba(37,99,235,.08),rgba(14,165,233,.08));color:#1d4ed8;font:inherit;font-size:12.5px;font-weight:650;border-radius:10px;cursor:pointer;transition:background .12s,transform .12s}',
      '.rai-bot .rai-act:hover{background:linear-gradient(135deg,rgba(37,99,235,.16),rgba(14,165,233,.16));transform:translateY(-1px)}',
      '.rai-bot .rai-tbl{border-collapse:collapse;width:100%;margin:6px 0 10px;font-size:13px;border:1px solid var(--hairline,#eef0f4);border-radius:10px;overflow:hidden}',
      '.rai-bot .rai-tbl th{background:var(--bg-soft,#f7f8fa);text-align:left;font-weight:650;color:var(--ink-2,#334155);padding:7px 11px;border-bottom:1px solid var(--hairline,#eef0f4)}',
      '.rai-bot .rai-tbl td{padding:7px 11px;border-bottom:1px solid var(--hairline,#f1f3f7);color:var(--ink,#0f172a)}.rai-bot .rai-tbl tr:last-child td{border-bottom:0}',
      '.rai-status{color:var(--muted,#9aa3af);display:inline-flex;align-items:center;gap:8px;font-size:13.5px}',
      '.rai-status::before{content:"";width:14px;height:14px;border:2px solid rgba(37,99,235,.25);border-top-color:#2563eb;border-radius:50%;display:inline-block;animation:raiSpin .7s linear infinite}',
      '@keyframes raiSpin{to{transform:rotate(360deg)}}',
      /* input */
      '.rai-foot{padding:12px 16px 13px}',
      '.rai-inwrap{display:flex;align-items:flex-end;gap:8px;border:1.5px solid var(--hairline-strong,#e5e7eb);border-radius:15px;padding:7px 7px 7px 15px;background:var(--card,#fff);transition:border-color .14s,box-shadow .14s}',
      '.rai-inwrap:focus-within{border-color:#93c5fd;box-shadow:0 0 0 4px rgba(37,99,235,.12)}',
      '#rai-input{flex:1;border:0;outline:0;resize:none;font:inherit;font-size:14px;line-height:1.5;max-height:150px;padding:6px 0;background:none;color:var(--ink,#0f172a)}',
      // The global a11y rule (input:focus-visible{outline:2px…!important}) stamps a
      // sharp blue box on the textarea INSIDE our rounded wrapper. Keyboard focus is
      // still clearly shown by .rai-inwrap:focus-within (border + 4px ring), so kill
      // the redundant raw outline here — ID specificity beats the global !important.
      '#rai-input:focus-visible{outline:none!important}',
      '.rai-send{flex:none;width:36px;height:36px;border:0;border-radius:11px;background:linear-gradient(135deg,#2563eb,#0ea5e9);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(37,99,235,.32);transition:transform .12s,opacity .12s}',
      '.rai-send:hover{transform:translateY(-1px)}.rai-send:disabled{opacity:.4;cursor:default;transform:none;box-shadow:none}.rai-send svg{width:17px;height:17px}',
      /* phones: full-screen sheet so the keyboard never hides the input, with a safe-area inset for the home bar */
      '@media(max-width:560px){.rai-overlay{padding:0;align-items:stretch}.rai-modal{max-width:100%;max-height:100%;height:100%;border-radius:0}.rai-head{padding:14px 14px 10px}.rai-body{padding:6px 14px 16px}.rai-foot{padding:10px 12px calc(12px + env(safe-area-inset-bottom,0px))}.rai-greet{padding:14px 4px 4px}.rai-user{max-width:90%}}',
      '.rai-hint{font-size:11px;color:var(--faint,#9aa3af);text-align:center;margin-top:9px}'
    ].join('\n');
    document.head.appendChild(st);
  }

  var overlay = null, threadId = null, msgs = [], busy = false, _stick = true;

  // Cap what we send each turn (cost/latency/token safety on long chats) and make
  // sure the window starts on a USER turn (Anthropic requires the first message
  // to be from the user) — the thread_id keeps full server-side continuity.
  function payloadMsgs() {
    var arr = msgs.slice(-16);
    while (arr.length && arr[0].role !== 'user') arr.shift();
    return arr;
  }
  function chatBody() { return withCtx(threadId ? { messages: payloadMsgs(), thread_id: threadId } : { messages: payloadMsgs() }); }

  function build() {
    injectCss();
    overlay = document.createElement('div'); overlay.id = 'rsms-ai-overlay'; overlay.className = 'rai-overlay';
    overlay.innerHTML =
      '<div class="rai-modal" role="dialog" aria-modal="true" aria-label="Ask AI">'
      + '<div class="rai-head"><span class="rai-av">' + SPARK + '</span><div class="rai-title">Ask AI</div><span class="rai-badge">Beta</span><span class="rai-flex"></span>'
      + '<button class="rai-hist" aria-label="Past chats" title="Past chats"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></button>'
      + '<button class="rai-new" aria-label="New chat" title="New chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>'
      + '<button class="rai-x" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></div>'
      + '<div class="rai-body" id="rai-body"></div>'
      + '<div class="rai-foot"><div class="rai-inwrap"><textarea id="rai-input" rows="1" placeholder="Ask anything…"></textarea>'
      + '<button class="rai-send" id="rai-send" aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg></button></div>'
      + '<div class="rai-hint">AI can make mistakes — double-check anything important.</div></div>'
      + '</div>';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.closest('.rai-x')) { close(); return; }
      if (e.target.closest('.rai-new') || e.target.closest('[data-rai-newchat]')) { e.preventDefault(); newChat(); return; }
      if (e.target.closest('.rai-hist')) { openHistory(); return; }
      var del = e.target.closest('[data-thread-del]');
      if (del) { e.stopPropagation(); deleteThread(del.getAttribute('data-thread-del')); return; }
      var row = e.target.closest('[data-thread]');
      if (row) { loadThread(row.getAttribute('data-thread')); return; }
      var chip = e.target.closest('.rai-chip');
      if (chip) { var inp = document.getElementById('rai-input'); inp.value = chip.getAttribute('data-q') || chip.textContent; sendMsg(); return; }
      // Conversational action button → send its text as a follow-up (modal stays open).
      var sendBtn2 = e.target.closest('[data-rai-send]');
      if (sendBtn2) { var ip = document.getElementById('rai-input'); ip.value = sendBtn2.getAttribute('data-rai-send') || sendBtn2.textContent; sendMsg(); return; }
      var dlBtn = e.target.closest('[data-rai-download]');
      if (dlBtn) { e.preventDefault(); downloadContactsCsvTemplate(); return; }
      if (e.target.closest('[data-rai-mail]')) { window.location.href = 'mailto:support@readysms.io?subject=' + encodeURIComponent('ReadySMS support'); return; }
      var nav = e.target.closest('[data-rai-nav]');
      if (nav) {
        var t = nav.getAttribute('data-rai-nav'), sub = nav.getAttribute('data-rai-sub');
        close();
        if (typeof window.__rsmsShowTab === 'function') { try { window.__rsmsShowTab(t); } catch (x) {} }
        if (sub) setTimeout(function () { var s = document.querySelector('#pane-' + t + ' [data-stab="' + sub + '"]'); if (s) s.click(); }, 140);
        return;
      }
    });
    var bodyEl = document.getElementById('rai-body');
    if (bodyEl) bodyEl.addEventListener('scroll', function () { _stick = (bodyEl.scrollHeight - bodyEl.scrollTop - bodyEl.clientHeight) < 60; });
    var input = document.getElementById('rai-input'), sendBtn = document.getElementById('rai-send');
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } });
    input.addEventListener('input', autoGrow);
    sendBtn.addEventListener('click', function () { sendMsg(); });
    renderEmpty();
  }

  function newChat() { msgs = []; threadId = null; renderEmpty(); var i = document.getElementById('rai-input'); if (i) { i.value = ''; autoGrow(); try { i.focus(); } catch (e) {} } }
  function autoGrow() { var i = document.getElementById('rai-input'); if (!i) return; i.style.height = 'auto'; i.style.height = Math.min(140, i.scrollHeight) + 'px'; }
  // Only auto-scroll when the user is already near the bottom — so scrolling up
  // to re-read mid-answer doesn't get yanked back down on every streamed token.
  function scrollBottom() { var b = document.getElementById('rai-body'); if (b && _stick) b.scrollTop = b.scrollHeight; }
  function setBusy(v) { var s = document.getElementById('rai-send'); if (s) s.disabled = v; }

  function renderEmpty() {
    var b = document.getElementById('rai-body'); if (!b) return;
    b.innerHTML = '<div class="rai-greet"><span class="rai-av-lg">' + SPARK + '</span>'
      + '<div class="rai-greet-t">How can I help?</div>'
      + '<div class="rai-greet-s">Ask about your sends, delivery, contacts, billing, or 10DLC — I can read your real account data — or ask how to do anything in ReadySMS.</div></div>'
      + '<div class="rai-starters">' + STARTERS.map(function (s) { return '<button class="rai-chip" data-q="' + esc(s.q) + '"><span class="rai-chip-ic">' + s.i + '</span><span>' + esc(s.q) + '</span></button>'; }).join('') + '</div>';
  }

  // Bot answers get a gradient AI avatar; user messages are a right-aligned bubble.
  // Returns the inner message element so streaming can update it in place.
  function addMsg(role, html, asHtml) {
    var b = document.getElementById('rai-body'); if (!b) return null;
    var row = document.createElement('div'); row.className = 'rai-row' + (role === 'user' ? ' rai-row-user' : '');
    if (role === 'bot') { var av = document.createElement('span'); av.className = 'rai-bot-av'; av.innerHTML = SPARK; row.appendChild(av); }
    var d = document.createElement('div'); d.className = 'rai-msg rai-' + role;
    if (asHtml) d.innerHTML = html; else d.textContent = html;
    row.appendChild(d); b.appendChild(row); scrollBottom(); return d;
  }

  function apiReq(method, path, body) {
    if (window.api && typeof window.api.request === 'function') return window.api.request(method, path, body);
    var opt = { method: method, headers: { 'Authorization': 'Bearer ' + token() } };
    if (body) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    return fetch(API_BASE + path, opt).then(function (r) { return r.json(); });
  }
  function apiPost(path, body) { return apiReq('POST', path, body); }
  function relTime(ts) {
    if (!ts) return '';
    try {
      var t = new Date((typeof ts === 'string' && ts.indexOf('Z') < 0 && ts.indexOf('T') > 0) ? ts + 'Z' : ts).getTime();
      var s = (Date.now() - t) / 1000;
      if (s < 60) return 'just now';
      if (s < 3600) return Math.floor(s / 60) + 'm ago';
      if (s < 86400) return Math.floor(s / 3600) + 'h ago';
      if (s < 604800) return Math.floor(s / 86400) + 'd ago';
      return new Date(t).toLocaleDateString();
    } catch (e) { return ''; }
  }

  // ---- Past chats (server-persisted threads via /assistant/threads) ----
  async function openHistory() {
    var b = document.getElementById('rai-body'); if (!b) return;
    if (!token()) { newChat(); addMsg('bot', md('Sign in to see your past chats.'), true); return; }
    b.innerHTML = '<div class="rai-hist-msg">Loading your chats…</div>';
    var rows = [];
    try { var r = await apiReq('GET', '/assistant/threads?limit=30'); rows = (r && (r.data || r.threads)) || (Array.isArray(r) ? r : []) || []; } catch (e) {}
    if (!rows.length) { b.innerHTML = '<div class="rai-hist-msg">No past chats yet — ask something to start one.</div>'; return; }
    b.innerHTML = '<div class="rai-hist-head">Past chats</div>' + rows.map(function (t) {
      return '<div class="rai-hist-row" data-thread="' + t.id + '"><div class="rai-hist-main"><div class="rai-hist-title">' + esc(t.title || 'Chat') + '</div><div class="rai-hist-time">' + esc(relTime(t.last_message_at || t.created_at)) + '</div></div>'
        + '<button class="rai-hist-del" data-thread-del="' + t.id + '" aria-label="Delete chat" title="Delete">&times;</button></div>';
    }).join('');
  }
  async function loadThread(id) {
    var b = document.getElementById('rai-body'); if (!b) return;
    b.innerHTML = '<div class="rai-hist-msg">Loading…</div>';
    try {
      var r = await apiReq('GET', '/assistant/threads/' + id);
      var d = (r && (r.data || r)) || {}, ms = d.messages || [];
      threadId = id;
      msgs = ms.map(function (m) {
        var c = Array.isArray(m.content) ? m.content.filter(function (x) { return x.kind === 'assistant_text'; }).map(function (x) { return x.text; }).join('\n\n') : String(m.content || '');
        return { role: m.role, content: c };
      }).filter(function (m) { return m.content; });
      b.innerHTML = '';
      msgs.forEach(function (m) { if (m.role === 'user') addMsg('user', esc(m.content), true); else addMsg('bot', md(m.content), true); });
      _stick = true; scrollBottom();
      var inp = document.getElementById('rai-input'); if (inp) { try { inp.focus(); } catch (e) {} }
    } catch (e) { b.innerHTML = '<div class="rai-hist-msg">Couldn’t load that chat. <a href="#" data-rai-newchat>Start a new one</a>.</div>'; }
  }
  async function deleteThread(id) {
    try { await apiReq('DELETE', '/assistant/threads/' + id); } catch (e) {}
    if (String(id) === String(threadId)) { msgs = []; threadId = null; }
    openHistory();
  }

  // Stream via fetch+getReader (Bearer auth — EventSource can't send headers).
  // Returns the accumulated text (may be '' if nothing streamed).
  async function streamAsk(onText, onStatus) {
    var resp = await fetch(API_BASE + '/assistant/chat/stream', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token(), 'Content-Type': 'application/json' },
      body: JSON.stringify(chatBody())
    });
    if (!resp.ok || !resp.body) throw new Error('stream unavailable');
    var reader = resp.body.getReader(), dec = new TextDecoder(), buf = '', acc = '', pendingBreak = false;
    while (true) {
      var ch = await reader.read(); if (ch.done) break;
      buf += dec.decode(ch.value, { stream: true });
      var blocks = buf.split('\n\n'); buf = blocks.pop();
      for (var i = 0; i < blocks.length; i++) {
        var data = ''; blocks[i].split('\n').forEach(function (ln) { if (ln.indexOf('data:') === 0) data += ln.slice(5).trim(); });
        if (!data) continue;
        var p; try { p = JSON.parse(data); } catch (_) { continue; }
        if (p.type === 'text_delta' && p.text) { if (pendingBreak) { if (acc) acc += '\n\n'; pendingBreak = false; } acc += p.text; onText(acc); }
        else if (p.type === 'turn_end') { if (acc) { pendingBreak = true; onStatus('Working…'); } } // after narration, before the tool answer
        else if (p.type === 'tool_use' && p.name) { onStatus(toolLabel(p.name)); }
        else if (p.type === 'done') { if (p.thread_id) threadId = p.thread_id; }
        else if (p.type === 'error') { throw new Error(p.message || 'stream error'); }
      }
    }
    return acc;
  }

  async function sendMsg() {
    var inp = document.getElementById('rai-input'); if (!inp) return;
    var q = (inp.value || '').trim(); if (!q || busy) return;
    if (!token()) { var st = overlay.querySelector('.rai-starters'); if (st) st.remove(); var gr = overlay.querySelector('.rai-greet'); if (gr) gr.remove(); addMsg('bot', md('**Sign in to use the assistant.** I read your real account data, so you’ll need to be signed in. [Sign in](/login).'), true); return; }
    var stEl = overlay.querySelector('.rai-starters'); if (stEl) stEl.remove();
    var grEl = overlay.querySelector('.rai-greet'); if (grEl) grEl.remove();
    inp.value = ''; autoGrow(); busy = true; setBusy(true); _stick = true; // jump to the new message
    var gotText = false, finalText = '';
    try {
      addMsg('user', esc(q), true);
      msgs.push({ role: 'user', content: q });
      var botEl = addMsg('bot', '<span class="rai-status">Thinking…</span>', true);
      var onText = function (acc) { gotText = true; finalText = acc; botEl.innerHTML = md(acc); scrollBottom(); };
      // Status shows BELOW any text streamed so far (narration stays visible with a
      // spinner under it while a tool runs), or alone before any text.
      var onStatus = function (s) { botEl.innerHTML = (finalText ? md(finalText) + '<div class="rai-status" style="margin-top:8px">' + esc(s) + '</div>' : '<span class="rai-status">' + esc(s) + '</span>'); scrollBottom(); };
      try {
        finalText = await streamAsk(onText, onStatus);
        gotText = !!finalText;
        if (gotText) botEl.innerHTML = md(finalText); // clear any trailing turn-gap spinner
      } catch (e) { /* fall through to non-streaming */ }
      if (!gotText) {
        try {
          var r = await apiPost('/assistant/chat', chatBody());
          var d = (r && r.success !== undefined) ? r : ((r && r.data) || r || {});
          if (d.thread_id) threadId = d.thread_id;
          finalText = d.finalText
            || (Array.isArray(d.transcript) ? d.transcript.filter(function (x) { return x.kind === 'assistant_text'; }).map(function (x) { return x.text; }).join('\n\n') : '')
            || d.error || '';
          if (finalText) { botEl.innerHTML = md(finalText); gotText = true; }
        } catch (e2) { /* handled below */ }
      }
      if (!gotText || !finalText) { botEl.innerHTML = md('Sorry, I couldn’t reach the assistant just now. Please try again in a moment.'); msgs.pop(); } // drop the unanswered user turn so history stays valid
      else { msgs.push({ role: 'assistant', content: finalText }); }
      scrollBottom();
    } finally { busy = false; setBusy(false); try { inp.focus(); } catch (e) {} } // always unlock, even if rendering threw
  }

  function open(prefill, autoSend) {
    if (!overlay) build();
    overlay.classList.add('open');
    try { document.documentElement.style.overflow = 'hidden'; } catch (e) {}
    var inp = document.getElementById('rai-input');
    if (prefill && inp) { inp.value = prefill; autoGrow(); }
    setTimeout(function () { try { inp.focus(); } catch (e) {} }, 30);
    // autoSend: open AND immediately ask (used by the "Ask AI" button on a failed
    // message, so the user lands on a real answer, not just a pre-filled box).
    if (autoSend && prefill) { setTimeout(function () { try { sendMsg(); } catch (e) {} }, 140); }
  }
  function close() {
    if (!overlay) return;
    overlay.classList.remove('open');
    try { document.documentElement.style.overflow = ''; } catch (e) {}
  }
  window.__rsmsOpenAI = open;
  window.__rsmsCloseAI = close;
  // Open the assistant and auto-ask a question in one call.
  window.__rsmsAskAI = function (q) { open(q, true); };

  // Inject the bar/overlay CSS at load (not lazily) so the top-center bar is
  // styled + centered from first paint, before the overlay is ever opened.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectCss);
  else injectCss();

  // Floating launcher for pages without the header bar (the onboarding wizard).
  // Inline-styled so it paints immediately (no FOUC) and never depends on JS CSS.
  function mountFab() {
    if (!FLOATING || document.getElementById('rai-fab')) return;
    if (!token()) return; // onboarding is post-signup — no launcher if not signed in
    if (!document.body) { document.addEventListener('DOMContentLoaded', mountFab); return; }
    var b = document.createElement('button');
    b.id = 'rai-fab'; b.type = 'button'; b.setAttribute('aria-label', 'Ask Ralph');
    b.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:9997;display:inline-flex;align-items:center;gap:8px;height:46px;padding:0 16px 0 14px;border:0;border-radius:999px;background:#2563eb;color:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 8px 22px rgba(37,99,235,.34)';
    b.innerHTML = '<span style="display:flex;width:18px;height:18px">' + SPARK + '</span>Ask Ralph';
    b.addEventListener('click', function () { open(); });
    document.body.appendChild(b);
  }
  mountFab();

  // Triggers: click the top bar, or ⌘K / Ctrl+K (capture-phase so it wins over
  // the onboarding palette's ⌘K — repurposed to the assistant, ClickUp-style).
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('#tb-ai-open')) { e.preventDefault(); open(); }
  }, true);
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (overlay && overlay.classList.contains('open')) close(); else open();
    } else if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) {
      e.stopImmediatePropagation(); close();
    }
  }, true);
})();
