/* ============================================================================
   mercury-buttons.js — wires the Mercury dashboard's action buttons to real
   backend endpoints (window.api) or routes them to the classic app overlay.
   Generated per-pane; each block is isolated in try/catch so one pane can't
   break others. Loaded AFTER api.js + mercury-live.js. All handlers are gated
   to LIVE mode (data-rsms-live) inside each block. Revert: remove the <script> tag.
   ========================================================================== */

// Safety net: if mercury-live.js failed to load __rsmsOpenClassic, fall back to
// hard navigation rather than crashing every button handler.
if (typeof window.__rsmsOpenClassic !== 'function') {
  window.__rsmsOpenClassic = function (query) {
    var p = new URLSearchParams((query || '').replace(/^\?/, '')).get('page') || 'dashboard';
    var M = { conversations:'inbox', dialer:'dialer', 'sms-blasts':'blasts', crm:'contacts', automations:'campaigns', 'usage-reports':'reports', '10dlc':'10dlc', 'number-health':'number-health', settings:'settings', billing:'settings', feedback:'settings' };
    var el = document.querySelector('[data-tab="' + (M[p]||'dashboard') + '"]');
    if (el) el.click();
  };
}

// Reusable styled prompt modal — replaces the ugly native window.prompt() OS dialog.
// Returns a Promise resolving to the entered string, or null if cancelled.
window.__rsmsPrompt = function (opts) {
  opts = opts || {};
  return new Promise(function (resolve) {
    var prev = document.getElementById('rsms-prompt-ov'); if (prev) prev.remove();
    var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
    var ov = document.createElement('div'); ov.id = 'rsms-prompt-ov'; ov.setAttribute('data-rsms-modal', '1');
    ov.style.cssText = 'position:fixed;inset:0;z-index:10010;background:rgba(17,24,39,.45);display:flex;align-items:center;justify-content:center;padding:20px';
    var multi = !!opts.multiline;
    // AI mode (opt-in via opts.ai:true): renders the shared AI kit chrome — a
    // gradient top strip, a gradient sparkle avatar beside the title, and a
    // gradient OK button — so every "…with AI" prompt matches the Ask-AI bar /
    // automation-builder look. Plain prompts (no opts.ai) are byte-for-byte
    // unchanged. Tokens: --ai-grad / --ai-strip / .ai-avatar (dashboard CSS).
    var ai = !!opts.ai;
    var _spk = '<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg>';
    var field = multi
      ? '<textarea id="rsms-prompt-in" rows="4" placeholder="' + esc(opts.placeholder || '') + '" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--hairline-strong,#d8dee9);border-radius:10px;font:inherit;font-size:14px;resize:vertical">' + esc(opts.value || '') + '</textarea>'
      : '<input id="rsms-prompt-in" type="' + (opts.type || 'text') + '" placeholder="' + esc(opts.placeholder || '') + '" value="' + esc(opts.value) + '" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--hairline-strong,#d8dee9);border-radius:10px;font:inherit;font-size:14px">';
    var header = ai
      ? '<div style="display:flex;align-items:flex-start;gap:11px;padding:18px 20px 4px"><span class="ai-avatar" style="width:32px;height:32px;flex:none"><span style="width:17px;height:17px;display:block">' + _spk + '</span></span><div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:650;color:var(--ink,#111);line-height:1.25">' + esc(opts.title || '') + '</div>' + (opts.body ? '<div style="font-size:12.5px;color:var(--muted,#6b7280);line-height:1.5;margin-top:3px">' + esc(opts.body) + '</div>' : '') + '</div></div>'
      : '<div style="padding:18px 20px 4px;font-size:15px;font-weight:650;color:var(--ink,#111)">' + esc(opts.title || '') + '</div>' + (opts.body ? '<div style="padding:4px 20px 0;font-size:12.5px;color:var(--muted,#6b7280);line-height:1.5">' + esc(opts.body) + '</div>' : '');
    var okBg = ai ? 'background:var(--ai-grad);box-shadow:0 2px 8px rgba(37,99,235,.32);' : 'background:var(--accent,#2563EB);';
    var okIcon = ai ? '<span style="width:14px;height:14px;display:inline-flex;margin-right:6px">' + _spk + '</span>' : '';
    ov.innerHTML = '<div style="background:var(--card,#fff);border-radius:14px;width:100%;max-width:430px;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden">'
      + (ai ? '<div style="height:3px;background:var(--ai-strip)"></div>' : '')
      + header
      + '<div style="padding:14px 20px 0">' + field + '</div>'
      + '<div style="padding:16px 20px 18px;display:flex;justify-content:flex-end;gap:8px">'
      + '<button id="rsms-prompt-cancel" type="button" style="padding:9px 14px;border:1px solid var(--hairline-strong,#d8dee9);background:#fff;border-radius:9px;font:inherit;font-size:13px;cursor:pointer">Cancel</button>'
      + '<button id="rsms-prompt-ok" type="button" style="display:inline-flex;align-items:center;padding:9px 16px;border:0;' + okBg + 'color:#fff;border-radius:9px;font:inherit;font-size:13px;font-weight:600;cursor:pointer">' + okIcon + esc(opts.okLabel || 'Save') + '</button>'
      + '</div></div>';
    document.body.appendChild(ov);
    var inp = ov.querySelector('#rsms-prompt-in'); try { inp.focus(); if (inp.select) inp.select(); } catch (_) {}
    var done = false;
    function close(v) { if (done) return; done = true; if (ov.parentNode) ov.parentNode.removeChild(ov); resolve(v); }
    ov.querySelector('#rsms-prompt-cancel').onclick = function () { close(null); };
    ov.querySelector('#rsms-prompt-ok').onclick = function () { close(inp.value); };
    ov.addEventListener('click', function (e) { if (e.target === ov) close(null); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !multi) { e.preventDefault(); close(inp.value); } else if (e.key === 'Escape') close(null); });
  });
};

// Reusable AI feedback-clarifier (Anton 2026-06-24). Given the user's feedback
// text, asks the backend for 0-3 ULTRA-EASY tap-to-answer follow-ups and shows
// them as chips; resolves to an array of {q,a} (answered only). Resolves [] if
// there are no questions or on ANY failure — never blocks the feedback submit.
// Drop it in front of any feedback POST: __rsmsFeedbackClarify(text,type).then(submit)
window.__rsmsFeedbackClarify = function (text, type) {
  return new Promise(function (resolve) {
    var api = (window.api || {});
    if (typeof api.request !== 'function' || !('' + (text || '')).trim()) { resolve([]); return; }
    api.request('POST', '/feedback/clarify', { text: text, type: type || 'idea' }).then(function (r) {
      var qs = (r && r.questions) || [];
      if (!Array.isArray(qs) || !qs.length) { resolve([]); return; }
      qs = qs.slice(0, 3);
      var esc = function (s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
      var answers = {};
      var ov = document.createElement('div'); ov.setAttribute('data-rsms-modal','1');
      ov.style.cssText = 'position:fixed;inset:0;z-index:10012;background:rgba(17,24,39,.45);display:flex;align-items:center;justify-content:center;padding:20px';
      var qHtml = qs.map(function (q, qi) {
        var opts = (q.options || []).map(function (o) {
          return '<button type="button" class="rfc-opt" data-q="'+qi+'" data-o="'+esc(o)+'" style="font-size:13px;font-weight:550;padding:7px 13px;border-radius:20px;cursor:pointer;border:1px solid var(--hairline-strong,#d8dee9);background:#fff;color:var(--ink-2,#374151)">'+esc(o)+'</button>';
        }).join('');
        return '<div style="margin-bottom:14px"><div style="font-size:13.5px;font-weight:600;color:var(--ink,#111);margin-bottom:8px">'+esc(q.q)+'</div><div style="display:flex;gap:7px;flex-wrap:wrap">'+opts+'</div></div>';
      }).join('');
      ov.innerHTML = '<div style="background:var(--card,#fff);border-radius:14px;width:100%;max-width:440px;box-shadow:0 20px 60px rgba(0,0,0,.25)">'
        + '<div style="padding:18px 20px 4px;font-size:15px;font-weight:650;color:var(--ink,#111)">One quick thing 👇</div>'
        + '<div style="padding:4px 20px 0;font-size:12.5px;color:var(--muted,#6b7280);line-height:1.5">A couple of taps so we build this exactly how you want — totally optional.</div>'
        + '<div style="padding:14px 20px 0">'+qHtml+'</div>'
        + '<div style="padding:8px 20px 18px;display:flex;justify-content:flex-end;gap:8px">'
        + '<button type="button" class="rfc-skip" style="padding:9px 14px;border:1px solid var(--hairline-strong,#d8dee9);background:#fff;border-radius:9px;font:inherit;font-size:13px;cursor:pointer">Skip</button>'
        + '<button type="button" class="rfc-send" style="padding:9px 16px;border:0;background:var(--accent,#2563EB);color:#fff;border-radius:9px;font:inherit;font-size:13px;font-weight:600;cursor:pointer">Send feedback</button>'
        + '</div></div>';
      document.body.appendChild(ov);
      var settled = false;
      function finish(skip) {
        if (settled) return; settled = true; if (ov.parentNode) ov.parentNode.removeChild(ov);
        var out = []; if (!skip) qs.forEach(function (q, qi) { if (answers[qi]) out.push({ q: q.q, a: answers[qi] }); });
        resolve(out);
      }
      ov.addEventListener('click', function (e) {
        if (e.target === ov || e.target.closest('.rfc-skip')) { finish(true); return; }
        if (e.target.closest('.rfc-send')) { finish(false); return; }
        var opt = e.target.closest('.rfc-opt');
        if (opt) {
          var qi = opt.getAttribute('data-q'); answers[qi] = opt.getAttribute('data-o');
          ov.querySelectorAll('.rfc-opt[data-q="'+qi+'"]').forEach(function (c) {
            var on = c === opt;
            c.style.borderColor = on ? 'var(--accent,#2563EB)' : 'var(--hairline-strong,#d8dee9)';
            c.style.background = on ? 'var(--accent,#2563EB)' : '#fff';
            c.style.color = on ? '#fff' : 'var(--ink-2,#374151)';
          });
        }
      });
    }).catch(function () { resolve([]); });
  });
};

try { (function(){
  'use strict';
  function live(){ return !!document.documentElement.getAttribute('data-rsms-live'); }
  document.addEventListener('click', function(e){
    var fb = e.target.closest('.nav-feedback'); if(!fb) return;
    if(!live()) return;
    e.preventDefault(); e.stopPropagation();
    var api = (window.api||{});
    window.__rsmsPrompt({ title:'Send feedback', body:'Share a bug, idea, or request — the team reads every one.', multiline:true, placeholder:'What’s on your mind?', okLabel:'Send feedback' }).then(function(msg){
    if(msg==null) return;
    msg = (''+msg).trim(); if(!msg){ return; }
    function done(ok){ if(window.__rsmsToast) window.__rsmsToast(ok?'Thanks — feedback sent to the team':'Could not send — please try again'); }
    function submit(clar){
      try {
        if(typeof api.request==='function'){
          api.request('POST','/feedback',{ type:'idea', title:'In-app feedback', description: msg, priority:'normal', clarifications: clar||[] })
            .then(function(r){ done(!(r&&r.success===false)); })
            .catch(function(){ done(false); });
        } else { window.__rsmsOpenClassic('?page=feedback', 'Feedback'); }
      } catch(_e){ done(false); }
    }
    if(typeof window.__rsmsFeedbackClarify==='function'){ window.__rsmsFeedbackClarify(msg,'idea').then(submit).catch(function(){ submit([]); }); }
    else submit([]);
    });
  }, true);
})(); } catch(e){ console.warn('[mercury-buttons] feedback failed', e); }

// ===== Offboarding / cancel-account (max friction; NEVER auto-cancels — files a
// human-gated request via /offboarding/*). Settings → "Cancel account…" =========
try { (function(){
  'use strict';
  var esc=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
  function toast(m,t){ try{ if(window.__rsmsToast) window.__rsmsToast(m,t); }catch(e){} }
  // PostHog: anchor the cancellation funnel. Autocapture already records every click/
  // pageview, so emitting a start + request event lets "what the user did JUST before
  // cancelling" be answered via PostHog Paths/funnels (events preceding these). Guarded
  // so it's a no-op if posthog hasn't loaded.
  function phCap(ev, props){ try{ if(window.posthog && posthog.capture) posthog.capture(ev, props||{}); }catch(_){} }
  var REASONS=[['too_expensive','Too expensive'],['switched_competitor','Switched to a competitor'],['missing_features','Missing features I need'],['too_complex','Too complex / hard to use'],['strategy_changed','Our SMS strategy changed'],['business_closed','Business closed or pivoted'],['not_using','Just not using it enough'],['other','Other']];
  document.addEventListener('click', function(e){
    if(!e.target.closest||!e.target.closest('#set-cancel-account')) return;
    e.preventDefault();
    var api=window.api||{}; if(typeof api.request!=='function'){ toast('Please reload and try again'); return; }
    phCap('subscription_cancel_started');
    open(api);
  });
  function open(api){
    var ov=document.createElement('div'); ov.setAttribute('data-rsms-modal','1');
    ov.style.cssText='position:fixed;inset:0;z-index:10020;background:rgba(17,24,39,.5);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto';
    var box=document.createElement('div'); box.style.cssText='background:var(--card,#fff);border-radius:16px;max-width:480px;width:100%;box-shadow:0 24px 70px rgba(0,0,0,.3);overflow:hidden';
    ov.appendChild(box); document.body.appendChild(ov);
    var ctx=null, step='loading', nps=null;
    function close(){ if(ov.parentNode) ov.parentNode.removeChild(ov); }
    ov.addEventListener('click',function(e){ if(e.target===ov) close(); });
    function hdr(t){ return '<div style="display:flex;align-items:flex-start;gap:10px;padding:18px 20px 0"><div style="flex:1;font-size:17px;font-weight:680;color:var(--ink,#111)">'+esc(t)+'</div><button type="button" class="ofb-x" aria-label="Close" style="border:0;background:none;font-size:24px;line-height:.8;color:var(--muted);cursor:pointer">&times;</button></div>'; }
    var btnGray='height:38px;padding:0 14px;border:1px solid var(--hairline-strong,#d8dee9);background:var(--card,#fff);border-radius:9px;font:inherit;font-size:13px;color:var(--muted);cursor:pointer';
    function render(){
      if(step==='loading'){ box.innerHTML=hdr('Close your account')+'<div style="padding:18px 20px 24px;color:var(--muted)">Loading…</div>'; return; }
      if(step==='wall'){
        var d=ctx||{}, lose=[];
        if(d.numbers) lose.push('Your '+d.numbers+' phone number'+(d.numbers===1?'':'s')+' — released permanently (you can’t get the same one back)');
        if(d.registrations) lose.push('Your 10DLC registration — deregistered (1–3 weeks + carrier fees to redo)');
        if(d.balance_usd>0) lose.push('Your $'+Number(d.balance_usd).toFixed(2)+' remaining balance — forfeited');
        lose.push('Your AI reply agents, automations & drips — stopped');
        box.innerHTML=hdr('Before you go…')
          +'<div style="padding:8px 20px 0;font-size:13.5px;color:var(--ink-2,#374151);line-height:1.55">Cancelling can’t be undone. Here’s what you’d lose:</div>'
          +'<ul style="margin:12px 20px 0;padding-left:20px;font-size:13px;color:var(--ink-2,#374151);line-height:1.7">'+lose.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>'
          +(d.pause_available?'<div style="padding:16px 20px 4px"><button type="button" class="ofb-pause" style="width:100%;height:40px;border:1px solid #15803D;background:var(--green-tint,#ECFDF3);color:#15803D;border-radius:9px;font:inherit;font-size:13px;font-weight:700;cursor:pointer">⏸ Pause billing instead — keep my number</button><div style="font-size:11.5px;color:var(--muted);text-align:center;margin-top:6px">Stops your monthly charges &amp; auto-refill. Resume anytime.</div></div>':'')
          +'<div style="display:flex;gap:10px;padding:14px 20px 20px;justify-content:flex-end"><button type="button" class="ofb-next" style="'+btnGray+'">Continue cancelling</button><button type="button" class="ofb-keep" style="height:38px;padding:0 18px;border:0;background:var(--accent,#2563EB);color:#fff;border-radius:9px;font:inherit;font-size:13px;font-weight:700;cursor:pointer">Keep my account</button></div>'; return;
      }
      if(step==='offer'){
        var cr=(ctx&&ctx.save_offer&&ctx.save_offer.credits)||0;
        box.innerHTML=hdr('Wait — '+cr+' message credits on us')
          +'<div style="padding:8px 20px 0;font-size:13.5px;color:var(--ink-2,#374151);line-height:1.6">We’d hate to see you go. Stay and we’ll drop <b>'+cr+' message credits</b> into your account right now.</div>'
          +'<div style="display:flex;gap:10px;padding:20px;justify-content:flex-end"><button type="button" class="ofb-next" style="'+btnGray+'">No thanks, cancel</button><button type="button" class="ofb-claim" style="height:38px;padding:0 18px;border:0;background:#15803D;color:#fff;border-radius:9px;font:inherit;font-size:13px;font-weight:700;cursor:pointer">Claim '+cr+' credits & stay</button></div>'; return;
      }
      if(step==='survey'){
        box.innerHTML=hdr('Help us improve')
          +'<div style="padding:6px 20px 0;font-size:12.5px;color:var(--muted);line-height:1.5">Quick — your feedback genuinely helps. Then a specialist follows up to finalize.</div>'
          +'<div style="padding:14px 20px 0">'
          +'<label style="font-size:12px;font-weight:600;color:var(--ink-2)">Main reason</label><select id="ofb-reason" class="bm-input" style="width:100%;margin:5px 0 12px">'+REASONS.map(function(r){return '<option value="'+r[0]+'">'+esc(r[1])+'</option>';}).join('')+'</select>'
          +'<label style="font-size:12px;font-weight:600;color:var(--ink-2)">Switching to? (optional)</label><input id="ofb-comp" class="bm-input" type="text" placeholder="e.g. Twilio, EZ Texting…" style="width:100%;margin:5px 0 12px">'
          +'<label style="font-size:12px;font-weight:600;color:var(--ink-2)">What could we have done better? (optional)</label><textarea id="ofb-improve" class="bm-input" rows="2" placeholder="Tell us anything…" style="width:100%;margin:5px 0 12px;resize:vertical"></textarea>'
          +'<label style="font-size:12px;font-weight:600;color:var(--ink-2)">How likely were you to recommend us? (0–10)</label>'
          +'<div style="display:flex;gap:4px;flex-wrap:wrap;margin:6px 0 12px">'+Array.from({length:11},function(_,i){return '<button type="button" class="ofb-nps-b" data-n="'+i+'" style="width:30px;height:30px;border:1px solid var(--hairline-strong,#d8dee9);background:var(--card,#fff);border-radius:7px;font:inherit;font-size:12px;cursor:pointer">'+i+'</button>';}).join('')+'</div>'
          +'<textarea id="ofb-comments" class="bm-input" rows="2" placeholder="Anything else?" style="width:100%;resize:vertical"></textarea></div>'
          +'<div style="display:flex;gap:10px;padding:18px 20px;justify-content:flex-end"><button type="button" class="ofb-keep" style="'+btnGray+'">Never mind</button><button type="button" class="ofb-submit" style="height:38px;padding:0 16px;border:0;background:#B3403E;color:#fff;border-radius:9px;font:inherit;font-size:13px;font-weight:700;cursor:pointer">Cancel my subscription</button></div>'; return;
      }
      if(step==='done'){
        var endTxt = (ctx&&ctx.period_end) ? (' until '+new Date(ctx.period_end*1000).toLocaleDateString()) : ' until the end of your current billing period';
        box.innerHTML=hdr('You’re cancelled')+'<div style="padding:10px 20px 24px;font-size:13.5px;color:var(--ink-2,#374151);line-height:1.6"><b>Your subscription is cancelled — you won’t be charged again.</b> You keep access'+esc(endTxt)+'. Thanks for the feedback — if you change your mind before then, just reach out and we’ll bring you back.</div><div style="display:flex;padding:0 20px 20px;justify-content:flex-end"><button type="button" class="ofb-keep" style="height:38px;padding:0 18px;border:0;background:var(--accent,#2563EB);color:#fff;border-radius:9px;font:inherit;font-size:13px;font-weight:700;cursor:pointer">Done</button></div>'; return;
      }
      if(step==='paused'){
        box.innerHTML=hdr('Your account is paused')+'<div style="padding:10px 20px 22px;font-size:13.5px;color:var(--ink-2,#374151);line-height:1.6">Billing is paused — your monthly charges are stopped and auto-refill is off, but <b>you kept your number</b> and registration. Resume whenever you’re ready.</div><div style="display:flex;gap:10px;padding:0 20px 20px;justify-content:flex-end"><button type="button" class="ofb-keep" style="'+btnGray+'">Close</button><button type="button" class="ofb-resume" style="height:38px;padding:0 18px;border:0;background:var(--accent,#2563EB);color:#fff;border-radius:9px;font:inherit;font-size:13px;font-weight:700;cursor:pointer">Resume account</button></div>'; return;
      }
    }
    box.addEventListener('click', function(e){
      if(e.target.closest('.ofb-x')||e.target.closest('.ofb-keep')){ close(); return; }
      if(e.target.closest('.ofb-next')){ if(step==='wall') step=(ctx&&ctx.save_offer&&ctx.save_offer.eligible)?'offer':'survey'; else if(step==='offer') step='survey'; render(); return; }
      if(e.target.closest('.ofb-pause')){ var pb=e.target.closest('.ofb-pause'); pb.disabled=true; pb.textContent='Pausing…'; api.request('POST','/offboarding/pause',{}).then(function(r){ if(r&&r.success){ close(); toast('Billing paused — your number’s safe. Resume anytime from Settings → Cancel account.','success'); } else { pb.disabled=false; pb.textContent='Pause billing instead'; toast((r&&r.error==='already_paused')?'Already paused':'Could not pause — try again','error'); } }).catch(function(){ pb.disabled=false; pb.textContent='Pause billing instead'; toast('Could not pause — try again','error'); }); return; }
      if(e.target.closest('.ofb-resume')){ var rb=e.target.closest('.ofb-resume'); rb.disabled=true; rb.textContent='Resuming…'; api.request('POST','/offboarding/resume',{}).then(function(r){ if(r&&r.success){ close(); toast('Welcome back — your account is active again. (Re-enable auto-refill in Billing if you want it.)','success'); } else { rb.disabled=false; rb.textContent='Resume account'; toast('Could not resume — try again','error'); } }).catch(function(){ rb.disabled=false; rb.textContent='Resume account'; toast('Could not resume — try again','error'); }); return; }
      var nb=e.target.closest('.ofb-nps-b'); if(nb){ nps=parseInt(nb.getAttribute('data-n'),10); box.querySelectorAll('.ofb-nps-b').forEach(function(b){ var on=b===nb; b.style.background=on?'var(--accent,#2563EB)':'var(--card,#fff)'; b.style.color=on?'#fff':''; b.style.borderColor=on?'var(--accent,#2563EB)':'var(--hairline-strong,#d8dee9)'; }); return; }
      if(e.target.closest('.ofb-claim')){ var cb=e.target.closest('.ofb-claim'); cb.disabled=true; cb.textContent='Adding credits…';
        api.request('POST','/offboarding/claim-save',{}).then(function(r){ if(r&&r.success){ close(); toast('Done — '+(r.credits||'')+' free credits added. Glad you’re staying! 🎉','success'); } else { cb.disabled=false; cb.textContent='Claim & stay'; if(r&&r.error==='already_claimed'){ toast('You’ve already claimed this offer','error'); step='survey'; render(); } else toast('Could not add credits','error'); } }).catch(function(){ cb.disabled=false; cb.textContent='Claim & stay'; toast('Could not add credits','error'); }); return; }
      if(e.target.closest('.ofb-submit')){ var sb=e.target.closest('.ofb-submit'); sb.disabled=true; sb.textContent='Sending…';
        var body={ reason:(box.querySelector('#ofb-reason')||{}).value||'', competitor:(box.querySelector('#ofb-comp')||{}).value||'', improvement:(box.querySelector('#ofb-improve')||{}).value||'', nps:nps, comments:(box.querySelector('#ofb-comments')||{}).value||'' };
        api.request('POST','/offboarding/request',body).then(function(r){ if(r&&r.period_end&&ctx) ctx.period_end=r.period_end; phCap('subscription_cancel_requested',{ reason:body.reason||null, competitor:body.competitor||null, nps:(typeof nps==='number'?nps:null) }); step='done'; render(); }).catch(function(){ sb.disabled=false; sb.textContent='Cancel my subscription'; toast('Could not submit — try again','error'); }); return; }
    });
    render();
    api.request('GET','/offboarding/context').then(function(r){ ctx=(r&&r.data)||{}; if(ctx.is_sub_account){ box.innerHTML=hdr('Close your account')+'<div style="padding:12px 20px 24px;font-size:13.5px;color:var(--ink-2);line-height:1.6">You’re a sub-account. Ask your account owner to manage cancellation.</div>'; return; } step=ctx.paused?'paused':'wall'; render(); }).catch(function(){ ctx={numbers:0,registrations:0,balance_usd:0,save_offer:{eligible:false}}; step='wall'; render(); });
  }
})(); } catch(e){ console.warn('[mercury-buttons] offboard failed', e); }

/* ---- pane: inbox (handled 16, routed 8) ---- */
try {
(function () {
  'use strict';
  var api = (window.api || {});
  var PANE = '#pane-inbox';

  function live() { return !!document.documentElement.getAttribute('data-rsms-live'); }
  function toast(m) { try { if (window.__rsmsToast) window.__rsmsToast(m); } catch (e) {} }
  function activeRow() { return document.querySelector(PANE + ' .conv-row.conv-active[data-conv-id]'); }
  // Fall back to the OPEN conversation id (set by loadThread in mercury-live.js) when
  // there's no .conv-active row — e.g. the conversation was opened via search / deep
  // link and isn't in the visible list. Fixes Block/Archive/Snooze "no conversation
  // selected" while a conversation is clearly open.
  function activeConvId() { var r = activeRow(); return (r ? r.getAttribute('data-conv-id') : '') || window.__rsmsInboxConvId || ''; }
  function activeContactId() { var r = activeRow(); return (r ? (r.getAttribute('data-contact-id') || '') : '') || window.__rsmsInboxContactId || ''; }
  // ---- Scheduled-send pill: render + load-from-backend (persists across reloads) ----
  function rsmsRenderSchedPill(when, schedId, msgText) {
    var composer = document.querySelector(PANE + ' .conv-composer'); if (!composer) return;
    var old = document.getElementById('rsms-sched-pill'); if (old) old.remove();
    var pill = document.createElement('div'); pill.id = 'rsms-sched-pill';
    pill.style.cssText = 'margin:0 0 8px;padding:8px 12px;border-radius:10px;background:var(--accent-tint,#EFF4FF);border:1px solid var(--accent,#2563EB)';
    var whenStr = when.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    function escp(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    var preview = msgText ? escp(msgText.length > 160 ? msgText.slice(0, 160) + '\u2026' : msgText) : '';
    pill.innerHTML =
      '<div style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--accent-deep,#1D4ED8);font-weight:600">'
      + '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
      + '<span>Scheduled for ' + whenStr + '</span>'
      + '<button type="button" id="rsms-sched-pill-x" style="margin-left:auto;border:0;background:none;color:var(--accent-deep,#1D4ED8);font:inherit;font-size:12px;font-weight:600;cursor:pointer;text-decoration:underline">Cancel</button>'
      + '</div>'
      + (preview ? '<div style="margin-top:5px;padding-left:22px;font-size:12.5px;font-weight:500;color:var(--ink-2,#374151);line-height:1.4">\u201c' + preview + '\u201d</div>' : '');
    composer.insertBefore(pill, composer.firstChild);
    var x = pill.querySelector('#rsms-sched-pill-x');
    if (x) x.addEventListener('click', function () {
      var a = window.api;
      if (!(schedId && a && a.request)) { pill.remove(); return; }
      // Only remove the pill + claim "canceled" if the DELETE actually succeeded.
      // api.request returns {success:false} (not a throw) on failure — if we
      // removed the pill unconditionally the blast would still fire while the
      // user believed it was canceled. Money + compliance, so confirm first.
      x.disabled = true; x.textContent = 'Canceling…';
      function _failed() { x.disabled = false; x.textContent = 'Cancel'; if (window.__rsmsToast) window.__rsmsToast('Couldn’t cancel — the send may still go out. Try again.'); }
      Promise.resolve(a.request('DELETE', '/sms/schedule/' + schedId)).then(function (r) {
        if (r && r.success === false) { _failed(); return; }
        pill.remove();
        if (window.__rsmsToast) window.__rsmsToast('Scheduled send canceled');
      }).catch(_failed);
    });
  }
  function rsmsLoadSchedPills() {
    var a = window.api; if (!a || !a.request) return;
    var row = activeRow();
    var convId = row ? row.getAttribute('data-conv-id') : '';
    var contactId = row ? (row.getAttribute('data-contact-id') || '') : '';
    var old = document.getElementById('rsms-sched-pill'); if (old) old.remove();
    if (!convId && !contactId) return;
    Promise.resolve(a.request('GET', '/sms/scheduled')).then(function (r) {
      var rows = (r && r.data) || []; if (!Array.isArray(rows) || !rows.length) return;
      var cur = activeRow(); var curConv = cur ? cur.getAttribute('data-conv-id') : '';
      if (String(curConv) !== String(convId)) return; // user moved to another thread
      var mine = rows.filter(function (x) { return (convId && String(x.conversation_id) === String(convId)) || (contactId && String(x.contact_id) === String(contactId)); });
      if (!mine.length) return;
      var m = mine[0]; // soonest (GET orders by send_at ASC)
      rsmsRenderSchedPill(new Date(m.send_at), m.id, m.body);
    }).catch(function () {});
  }
  // Load any pending scheduled pill when a conversation opens.
  if (!window.__rsmsSchedPillGuard) { window.__rsmsSchedPillGuard = true; document.addEventListener('click', function (e) { if (e.target.closest('#pane-inbox .conv-row')) setTimeout(rsmsLoadSchedPills, 400); }, true); }

  // ---- Conversation snooze: presets + a dropdown anchored to the Snooze button ----
  function snoozePresets() {
    var now = new Date();
    function addDays(base, n) { var x = new Date(base); x.setDate(x.getDate() + n); return x; }
    function at(base, h, m) { var x = new Date(base); x.setHours(h, m || 0, 0, 0); return x; }
    var later = new Date(now.getTime() + 3 * 3600 * 1000);
    var eve = at(now, 18, 0); if (eve <= now) eve = at(addDays(now, 1), 18, 0);
    var tom = at(addDays(now, 1), 8, 0);
    var dow = now.getDay(); var toMon = (1 - dow + 7) % 7; if (toMon === 0) toMon = 7; // upcoming Monday
    var mon = at(addDays(now, toMon), 8, 0);
    return [
      ['Later today', later, 'about 3 hours'],
      ['This evening', eve, '6:00 PM'],
      ['Tomorrow', tom, '8:00 AM'],
      ['Next week', mon, 'Mon 8:00 AM'],
    ];
  }
  function snoozeWhenLabel(d) {
    try { return d.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
    catch (e) { return 'later'; }
  }
  function openConvSnoozeMenu(anchor) {
    var existing = document.getElementById('conv-snooze-menu');
    if (existing) { existing.remove(); return; } // toggle off
    var convId = activeConvId();
    if (!convId) { toast('Open a conversation first'); return; }
    var presets = snoozePresets();
    var menu = document.createElement('div'); menu.id = 'conv-snooze-menu';
    menu.style.cssText = 'position:absolute;z-index:1000;min-width:212px;background:#fff;border:1px solid var(--hairline,#e3e8f2);border-radius:10px;box-shadow:0 16px 44px rgba(16,20,38,.22);padding:6px';
    menu.innerHTML = presets.map(function (p, i) {
      return '<button type="button" class="cs-opt" data-i="' + i + '" style="display:flex;justify-content:space-between;align-items:center;gap:14px;width:100%;text-align:left;border:0;background:none;font:inherit;font-size:13px;color:var(--ink,#111);padding:8px 10px;border-radius:7px;cursor:pointer"><span style="font-weight:600">' + p[0] + '</span><span style="font-size:11.5px;color:var(--muted,#6b7280)">' + p[2] + '</span></button>';
    }).join('')
      + '<div style="height:1px;background:var(--hairline,#eef1f6);margin:5px 2px"></div>'
      + '<button type="button" class="cs-unsnooze" style="display:block;width:100%;text-align:left;border:0;background:none;font:inherit;font-size:13px;color:var(--accent-deep,#1d4ed8);font-weight:600;padding:8px 10px;border-radius:7px;cursor:pointer">Unsnooze (bring back now)</button>';
    document.body.appendChild(menu);
    var r = anchor.getBoundingClientRect();
    menu.style.top = (window.scrollY + r.bottom + 6) + 'px';
    menu.style.left = (window.scrollX + Math.max(8, Math.min(r.left, window.innerWidth - 230))) + 'px';
    menu.addEventListener('mouseover', function (e) { var b = e.target.closest('button'); if (b) b.style.background = 'var(--bg-soft,#f3f5f9)'; });
    menu.addEventListener('mouseout', function (e) { var b = e.target.closest('button'); if (b) b.style.background = 'none'; });
    function close() { var m = document.getElementById('conv-snooze-menu'); if (m) m.remove(); document.removeEventListener('click', onDoc, true); }
    function dropRow() { var row = document.querySelector(PANE + ' .conv-row[data-conv-id="' + convId + '"]'); if (row) row.remove(); }
    menu.addEventListener('click', function (e) {
      var opt = e.target.closest('.cs-opt');
      if (opt) {
        var p = presets[+opt.getAttribute('data-i')]; close();
        Promise.resolve(api.snoozeConversation(convId, p[1])).then(function (res) {
          if (res && res.success === false) { toast(res.error || 'Could not snooze'); return; }
          toast('Snoozed — back ' + snoozeWhenLabel(p[1])); dropRow();
        }).catch(function () { toast('Could not snooze — try again'); });
        return;
      }
      if (e.target.closest('.cs-unsnooze')) {
        close();
        Promise.resolve(api.unsnoozeConversation(convId)).then(function (res) {
          if (res && res.success === false) { toast(res.error || 'Could not unsnooze'); return; }
          toast('Unsnoozed — back in your inbox'); dropRow();
        }).catch(function () { toast('Could not unsnooze — try again'); });
        return;
      }
    });
    function onDoc(ev) { if (!ev.target.closest('#conv-snooze-menu') && !ev.target.closest('.cd-action')) close(); }
    setTimeout(function () { document.addEventListener('click', onDoc, true); }, 0);
  }
  function parseTags(t) {
    if (!t) return [];
    if (Array.isArray(t)) return t.filter(Boolean);
    try { var a = JSON.parse(t); if (Array.isArray(a)) return a.filter(Boolean); } catch (e) {}
    return ('' + t).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function currentTags() {
    var r = activeRow();
    if (r) return parseTags(r.getAttribute('data-tags'));
    // No active list row (e.g. detail panel open after a list re-render) — read
    // the tags shown in the panel so we don't overwrite existing tags with [].
    var wrap = document.querySelector(PANE + ' #cd-tags');
    if (wrap) return [].slice.call(wrap.querySelectorAll('.cd-tag')).map(function (c) { return (c.textContent || '').replace(/×\s*$/, '').replace(/\s+$/, '').trim(); }).filter(Boolean);
    return [];
  }
  function setRowTags(tags) {
    var r = activeRow(); if (!r) return;
    try { r.setAttribute('data-tags', JSON.stringify(tags)); } catch (e) { r.setAttribute('data-tags', tags.join(',')); }
  }
  function esc(s) { return (s == null ? '' : '' + s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // Re-render the contact panel's tag chips from a tags array (mirrors mercury-live's renderPanelTags shape).
  function renderTagChips(tags) {
    var wrap = document.querySelector(PANE + ' #cd-tags'); if (!wrap) return;
    var add = wrap.querySelector('#cd-tag-add');
    [].slice.call(wrap.querySelectorAll('.cd-tag')).forEach(function (t) { if (t.parentNode) t.parentNode.removeChild(t); });
    var html = (tags || []).map(function (t) {
      return '<span class="cd-tag" data-tag><i></i>' + esc(t) + '<button class="cd-tag-x" type="button" aria-label="Remove ' + esc(t) + '">×</button></span>';
    }).join('');
    if (add) add.insertAdjacentHTML('beforebegin', html);
    else wrap.insertAdjacentHTML('afterbegin', html);
  }

  function saveTags(tags, okMsg) {
    // Fall back to the open contact (set by the inbox when a thread loads) when
    // the list row lost its .conv-active class — without this, adding a tag with
    // a conversation open wrongly errored "Open a conversation first" (Alex).
    var cid = activeContactId() || window.__rsmsInboxContactId || '';
    if (!cid) { toast('Open a conversation first'); return; }
    setRowTags(tags);
    renderTagChips(tags);
    if (typeof api.updateContact !== 'function') { toast('Saved'); return; }
    try {
      api.updateContact(cid, { tags: tags }).then(function (res) {
        if (res && res.success === false) toast('Could not save tags');
        else toast(okMsg || 'Tags updated');
      }).catch(function () { toast('Could not save tags'); });
    } catch (e) { toast('Could not save tags'); }
  }

  // ===== CLICK (capture) =====
  document.addEventListener('click', function (e) {
    if (!live()) return;
    var t = e.target;

    // ---- Call button → open dialer dock side panel with number pre-filled ----
    var callBtn = t.closest(PANE + ' .conv-head-actions .conv-iconbtn[aria-label^="Call"], ' + PANE + ' .conv-head-actions .conv-iconbtn[title="Call"]');
    if (callBtn) {
      e.preventDefault(); e.stopPropagation();
      var row = document.querySelector('#pane-inbox .conv-row.conv-active');
      var to = row ? (row.getAttribute('data-raw-phone') || row.getAttribute('data-phone') || '') : '';
      var nm = row ? (row.getAttribute('data-name') || '') : '';
      var cid = row ? (row.getAttribute('data-contact-id') || '') : '';
      if (!to) { toast('No phone number on this contact'); return; }
      // Place the call via the SAME path the Redial / Call-now buttons use
      // (createCall + WebRTC). dockCall now opens the dialer dock itself
      // (window.__rsmsOpenDock('dial')), so we no longer .click() the rdock
      // button here — that TOGGLED the dock and closed it when already open.
      if (typeof window.__rsmsDockCall === 'function') {
        window.__rsmsDockCall({ to: to, name: nm, contactId: cid || null, meta: 'From SMS thread' });
      } else {
        toast('Dialer is not available on this account');
      }
      return;
    }

    // ---- Assign dropdown → open assign submenu directly ----
    if (t.closest(PANE + ' .conv-assign')) {
      e.preventDefault(); e.stopPropagation();
      var btn = t.closest(PANE + ' .conv-assign');
      var rect = btn.getBoundingClientRect();
      // Build a temporary menu with just the assign submenu
      var existing = document.querySelector('.conv-menu');
      if (existing) existing.remove();
      var m = document.createElement('div'); m.className = 'conv-menu';
      m.style.position = 'fixed'; m.style.zIndex = '60';
      m.innerHTML = '<div style="padding:8px;color:var(--muted);font-size:12px">Loading team...</div>';
      document.body.appendChild(m);
      m.style.left = Math.min(rect.left, window.innerWidth - 200) + 'px';
      m.style.top = (rect.bottom + 4) + 'px';
      // Load team
      var me = JSON.parse(localStorage.getItem('readysms_user') || '{}');
      var CK2 = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0M19 8v6M22 11h-6"/></svg>';
      // type=team → only real team members, not isolated sub-accounts (Alex).
      (typeof api !== 'undefined' ? api.request('GET', '/sub-accounts?type=team') : Promise.reject()).then(function (r) {
        var d = r && r.success ? (r.data || {}) : {};
        var subs = d.sub_accounts || d.data || [];
        if (!Array.isArray(subs)) subs = [];
        var agency = d.agency || null;
        var team = [];
        var seenIds = {}, seenEmails = {};
        var meEmail = (me.email || '').toLowerCase();
        var meName = ([me.first_name, me.last_name].filter(Boolean).join(' ') || me.name || '').trim().toLowerCase();
        // Same human as the current user? Match by id, email, OR display name. The
        // agency/owner record carries a different id than the logged-in owner's user
        // row (and under admin "Login as" a different email too), which listed the
        // owner twice ("Anton" + "Me"). Name is the last-resort collapse — its only
        // risk is merging two DIFFERENT people who share an identical name (rare).
        function isMe(p) {
          if (!p) return false;
          if (String(p.id) === String(me.id)) return true;
          if (p.email && meEmail && p.email.toLowerCase() === meEmail) return true;
          var pn = (p.name || [p.first_name, p.last_name].filter(Boolean).join(' ') || '').trim().toLowerCase();
          return !!(pn && meName && pn === meName);
        }
        // Current user always appears exactly once, labeled "Me".
        team.push({ id: me.id, name: 'Me' });
        seenIds[me.id] = 1; if (meEmail) seenEmails[meEmail] = 1;
        // Agency/owner — only when it's a DIFFERENT person than the current user.
        if (agency && agency.id && !isMe(agency)) {
          team.push({ id: agency.id, name: agency.name || [agency.first_name, agency.last_name].filter(Boolean).join(' ') || agency.email || 'Owner' });
          seenIds[agency.id] = 1; if (agency.email) seenEmails[agency.email.toLowerCase()] = 1;
        }
        subs.forEach(function (s) {
          if (isMe(s)) return;
          // TEAM members only — exclude workspace-isolated sub-accounts (you assign a
          // conversation to a teammate, not to a managed sub-account/client org).
          if (s.workspace_isolated === 1 || s.workspace_isolated === true) return;
          if (seenIds[s.id] || (s.email && seenEmails[s.email.toLowerCase()])) return; // de-dupe by id + email
          team.push({ id: s.id, name: [s.first_name, s.last_name].filter(Boolean).join(' ') || s.email || 'Team member' });
          seenIds[s.id] = 1; if (s.email) seenEmails[s.email.toLowerCase()] = 1;
        });
        team.push({ id: null, name: 'Unassigned' });
        m.innerHTML = '<div class="conv-menu-head">Assign to</div>' + team.map(function (t) { return '<button type="button" data-cassign="' + (t.id || '') + '" data-cassign-name="' + t.name + '">' + CK2 + '<span>' + t.name + '</span></button>'; }).join('');
      }).catch(function () {
        m.innerHTML = '<div class="conv-menu-head">Assign to</div>'
          + '<button type="button" data-cassign="' + (me.id || '') + '" data-cassign-name="Me">' + CK2 + '<span>Me</span></button>'
          + '<button type="button" data-cassign="" data-cassign-name="Unassigned">' + CK2 + '<span>Unassigned</span></button>';
      });
      // Handle assign click + close on outside click
      m.addEventListener('click', function (ev) {
        var ca = ev.target.closest('[data-cassign]'); if (!ca) return;
        ev.preventDefault(); ev.stopPropagation();
        var repId = ca.getAttribute('data-cassign'), repName = ca.getAttribute('data-cassign-name') || 'Unassigned';
        var row = activeRow();
        var convId = row ? row.getAttribute('data-conv-id') : '';
        // Update header label
        var an = document.querySelector('#pane-inbox .conv-assign-name'); if (an) an.textContent = repName;
        // Persist via API
        if (convId && typeof api.assignConversation === 'function') api.assignConversation(convId, repId || null).catch(function () {});
        m.remove();
        toast(repId ? ('Assigned to ' + repName) : 'Unassigned');
      });
      setTimeout(function () {
        document.addEventListener('click', function closer(ev) {
          if (!ev.target.closest('.conv-menu')) { m.remove(); document.removeEventListener('click', closer); }
        });
      }, 50);
      return;
    }

    // ---- Summarize with AI ----
    if (t.closest(PANE + ' #conv-summarize')) {
      e.preventDefault(); e.stopPropagation();
      // Resolve the open conversation via the shared helper, which falls back to
      // window.__rsmsInboxConvId — so summarize works even when the thread was
      // opened by search/deep-link and has no .conv-active list row (was wrongly
      // toasting "Open a conversation first").
      var convId = activeConvId();
      if (!convId) { toast('Open a conversation first'); return; }
      var sumBox = document.getElementById('conv-summary');
      var sumP = sumBox ? sumBox.querySelector('p') : null;
      if (sumBox) { sumBox.hidden = false; if (sumP) sumP.textContent = 'Generating summary…'; }
      (typeof api !== 'undefined' ? api.request('GET', '/conversations/' + convId + '/summary') : Promise.reject())
        .then(function (r) {
          var text = (r && (r.summary || (r.data && r.data.summary))) || 'No summary available.';
          if (sumP) sumP.textContent = text;
          var meta = sumBox ? sumBox.querySelector('.conv-summary-meta') : null;
          if (meta) meta.textContent = 'Just now';
        })
        .catch(function () { if (sumP) sumP.textContent = 'Could not generate summary.'; });
      return;
    }

    // ---- AI reply button → generate AI draft into the composer ----
    if (t.closest(PANE + ' #conv-ai-btn')) {
      e.preventDefault(); e.stopPropagation();
      var ta = document.querySelector(PANE + ' .conv-composer-box textarea'); if (!ta) return;
      // Same fix as summarize: activeConvId() falls back to window.__rsmsInboxConvId
      // so a search/deep-link thread (no .conv-active row) still drafts a reply.
      var cid = activeConvId();
      if (!cid) { toast('Open a conversation first'); return; }
      ta.value = 'Drafting reply…'; ta.disabled = true;
      api.request('POST', '/ai-agents/draft-reply', { conversation_id: cid }).then(function (r) {
        ta.disabled = false;
        var draft = r && (r.reply || r.message || r.draft || (r.data && (r.data.reply || r.data.message || r.data.draft)));
        if (draft) { ta.value = draft; ta.focus(); toast('AI draft ready — review and send'); }
        else {
          ta.value = '';
          // Backend returns raw codes (e.g. no_user_message) — users have no idea what
          // those mean (Anton). Translate the ones we know into plain English.
          var _code = (r && r.error) || '';
          var _msg = ({
            'no_user_message': "Nothing to reply to yet — this contact hasn't texted back. AI replies need an inbound message first.",
            'no_messages': "No messages here yet — AI replies need an inbound text to work from.",
            'no_inbound': "This contact hasn't texted back yet, so there's nothing for AI to reply to.",
            'no_agent': 'No AI reply agent set up yet — create one in Automations → AI Replies.',
            'rate_limited': 'Too many AI requests just now — give it a few seconds and try again.'
          })[_code] || (/^[a-z0-9_]+$/.test(_code) ? 'AI could not generate a reply right now.' : (_code || 'AI could not generate a reply.'));
          toast(_msg);
        }
      }).catch(function () { ta.disabled = false; ta.value = ''; toast('AI draft failed'); });
      return;
    }
    // AI suggestion Use/Tone buttons
    if (t.closest(PANE + ' .conv-ai-use') || t.closest(PANE + ' .conv-ai-tone') || t.closest(PANE + ' .conv-ai-tones button[data-tone]')) {
      e.preventDefault(); e.stopPropagation(); return;
    }

    // ---- composer toolbar: Template / Schedule / Attach / Quick replies ----
    var tool = t.closest(PANE + ' .conv-composer-tools .conv-tool-btn');
    if (tool && !tool.id) {
      var lbl = (tool.getAttribute('aria-label') || tool.getAttribute('title') || tool.textContent || '').toLowerCase();
      if (/merge field|\{/.test(lbl)) return; // let the build's merge-field popover work
      if (/template/.test(lbl)) {
        e.preventDefault(); e.stopPropagation();
        var ta = document.querySelector(PANE + ' .conv-composer-box textarea'); if (!ta) { toast('No composer'); return; }
        // Load templates and show a picker
        api.getTemplates().then(function (r) {
          var list = r && r.success ? (r.data || []) : [];
          if (!list.length) { toast('No templates yet — create one in SMS Blasts'); return; }
          var existing = document.querySelector('.conv-menu'); if (existing) existing.remove();
          var m = document.createElement('div'); m.className = 'conv-menu';
          m.style.cssText = 'position:fixed;z-index:60;max-height:300px;overflow-y:auto';
          m.innerHTML = '<div class="conv-menu-head">Templates</div>' + list.slice(0, 15).map(function (t) {
            return '<button type="button" data-tpl-body="' + esc(t.body || t.message || '') + '"><span>' + esc(t.name || 'Untitled') + '</span></button>';
          }).join('');
          var rect = tool.getBoundingClientRect();
          document.body.appendChild(m);
          m.style.left = Math.min(rect.left, window.innerWidth - 220) + 'px';
          m.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
          m.addEventListener('click', function (ev) { var b = ev.target.closest('[data-tpl-body]'); if (!b) return; ta.value = b.getAttribute('data-tpl-body'); ta.focus(); m.remove(); toast('Template inserted'); });
          setTimeout(function () { document.addEventListener('click', function cl(ev) { if (!ev.target.closest('.conv-menu')) { m.remove(); document.removeEventListener('click', cl); } }); }, 50);
        }).catch(function () { toast('Could not load templates'); });
        return;
      }
      if (/schedule/.test(lbl)) {
        e.preventDefault(); e.stopPropagation();
        var ta2 = document.querySelector(PANE + ' .conv-composer-box textarea');
        var msg2 = ta2 ? ta2.value.trim() : '';
        if (!msg2) { toast('Write a message first'); return; }
        var sr = activeRow(); var sphone = sr ? sr.getAttribute('data-raw-phone') : '';
        if (!sphone) { toast('No contact selected'); return; }
        // Remove existing schedule picker
        var ep = document.getElementById('rsms-sched-pop'); if (ep) { ep.remove(); return; }
        var pop = document.createElement('div'); pop.id = 'rsms-sched-pop';
        pop.style.cssText = 'position:fixed;z-index:10001;background:var(--card,#fff);border:1px solid var(--hairline,#e5e7eb);border-radius:14px;box-shadow:0 18px 48px -12px rgba(15,23,42,.30),0 4px 12px rgba(15,23,42,.06);padding:16px 16px 14px;width:288px';
        var rect = tool.getBoundingClientRect();
        pop.style.left = Math.min(rect.left, window.innerWidth - 300) + 'px';
        pop.style.bottom = (window.innerHeight - rect.top + 6) + 'px';
        // Default to tomorrow 9am
        var tmrw = new Date(); tmrw.setDate(tmrw.getDate() + 1); tmrw.setHours(9, 0, 0, 0);
        var dateVal = tmrw.getFullYear() + '-' + String(tmrw.getMonth() + 1).padStart(2, '0') + '-' + String(tmrw.getDate()).padStart(2, '0');
        var _schLbl = 'display:block;font-size:11.5px;font-weight:600;color:var(--ink-2,#374151);margin-bottom:5px';
        var _schInp = 'width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--hairline-strong,#d8dee9);border-radius:9px;font:inherit;font-size:13px;color:var(--ink,#111);background:var(--bg-soft,#f8fafc);accent-color:var(--accent,#2563EB);outline:none;transition:border-color .12s,background .12s';
        pop.innerHTML = '<div style="font-size:14px;font-weight:650;letter-spacing:-.01em;color:var(--ink,#111);margin-bottom:13px">Schedule send</div>'
          + '<label style="' + _schLbl + '">Date</label>'
          + '<div id="rsms-sched-cal" style="border:1px solid var(--hairline-strong,#d8dee9);border-radius:10px;padding:8px 9px;margin-bottom:12px;background:var(--card,#fff)"></div>'
          + '<input type="hidden" id="rsms-sched-date" value="' + dateVal + '">'
          + '<label style="' + _schLbl + '">Time</label>'
          + '<div id="rsms-sched-timewrap" style="display:flex;gap:6px;align-items:center;margin-bottom:15px"></div>'
          + '<input type="hidden" id="rsms-sched-time" value="09:00">'
          + '<div id="rsms-sched-best" style="display:none;margin:-2px 0 13px"></div>'
          + '<div style="display:flex;gap:8px;justify-content:flex-end">'
          + '<button type="button" id="rsms-sched-cancel" style="padding:8px 15px;border:1px solid var(--hairline-strong,#d8dee9);border-radius:9px;background:var(--card,#fff);font:inherit;font-size:12.5px;font-weight:600;color:var(--ink-2,#374151);cursor:pointer">Cancel</button>'
          + '<button type="button" id="rsms-sched-go" style="padding:8px 16px;border:0;border-radius:9px;background:var(--accent,#2563EB);color:#fff;font:inherit;font-size:12.5px;font-weight:650;cursor:pointer;box-shadow:0 1px 2px rgba(37,99,235,.3)">Schedule</button>'
          + '</div>';
        document.body.appendChild(pop);
        pop.querySelectorAll('input').forEach(function (i) { i.addEventListener('focus', function () { i.style.borderColor = 'var(--accent,#2563EB)'; i.style.background = 'var(--card,#fff)'; }); i.addEventListener('blur', function () { i.style.borderColor = 'var(--hairline-strong,#d8dee9)'; i.style.background = 'var(--bg-soft,#f8fafc)'; }); });
        // Custom Mercury month-calendar feeding the hidden #rsms-sched-date (YYYY-MM-DD).
        // Replaces the OS-native date picker so the grid matches the app.
        (function buildSchedCal() {
          var calWrap = pop.querySelector('#rsms-sched-cal'), hidden = pop.querySelector('#rsms-sched-date');
          if (!calWrap || !hidden) return;
          var sel = new Date(tmrw.getFullYear(), tmrw.getMonth(), tmrw.getDate());
          var vY = sel.getFullYear(), vM = sel.getMonth();
          var today = new Date(); today.setHours(0, 0, 0, 0);
          var MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
          function pad(n) { return String(n).padStart(2, '0'); }
          function setHidden() { hidden.value = sel.getFullYear() + '-' + pad(sel.getMonth() + 1) + '-' + pad(sel.getDate()); }
          function render() {
            var startDow = new Date(vY, vM, 1).getDay();
            var days = new Date(vY, vM + 1, 0).getDate();
            var selKey = new Date(sel.getFullYear(), sel.getMonth(), sel.getDate()).getTime();
            var cells = '';
            for (var b = 0; b < startDow; b++) cells += '<span></span>';
            for (var d = 1; d <= days; d++) {
              var dt = new Date(vY, vM, d);
              var isSel = dt.getTime() === selKey, isPast = dt < today, isToday = dt.getTime() === today.getTime();
              var st = 'display:grid;place-items:center;height:30px;border-radius:8px;font-size:12.5px;border:0;background:none;cursor:' + (isPast ? 'default' : 'pointer') + ';';
              if (isSel) st += 'background:var(--accent,#2563EB);color:#fff;font-weight:650;';
              else if (isPast) st += 'color:var(--faint,#c0c7d2);';
              else { st += 'color:var(--ink,#111);'; if (isToday) st += 'box-shadow:inset 0 0 0 1px var(--hairline-strong,#d8dee9);'; }
              cells += '<button type="button" data-d="' + (isPast ? '' : d) + '"' + (isPast ? ' disabled' : '') + ' style="' + st + '">' + d + '</button>';
            }
            var navBtn = 'width:26px;height:26px;border:0;background:none;border-radius:7px;cursor:pointer;color:var(--ink-2,#374151);font-size:17px;line-height:1';
            calWrap.innerHTML =
              '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
              + '<button type="button" data-nav="-1" aria-label="Previous month" style="' + navBtn + '">\u2039</button>'
              + '<div style="font-size:13px;font-weight:650;color:var(--ink,#111)">' + MON[vM] + ' ' + vY + '</div>'
              + '<button type="button" data-nav="1" aria-label="Next month" style="' + navBtn + '">\u203a</button>'
              + '</div>'
              + '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center;font-size:10.5px;font-weight:600;color:var(--muted,#8892a0);margin-bottom:4px">'
              + ['S','M','T','W','T','F','S'].map(function (w) { return '<span>' + w + '</span>'; }).join('')
              + '</div>'
              + '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">' + cells + '</div>';
          }
          setHidden(); render();
          calWrap.addEventListener('click', function (ev) {
            var nav = ev.target.closest('[data-nav]');
            if (nav) { ev.preventDefault(); vM += parseInt(nav.getAttribute('data-nav'), 10); if (vM < 0) { vM = 11; vY--; } else if (vM > 11) { vM = 0; vY++; } render(); return; }
            var day = ev.target.closest('button[data-d]'); if (!day) return;
            var dv = day.getAttribute('data-d'); if (!dv) return;
            ev.preventDefault(); sel = new Date(vY, vM, parseInt(dv, 10)); setHidden(); render();
          });
        })();
        // Custom time picker (hour / minute / AM-PM selects) feeding the hidden
        // #rsms-sched-time as 24h HH:MM. Replaces the OS-native time spinner.
        (function buildTimePicker() {
          var wrap = pop.querySelector('#rsms-sched-timewrap'), hid = pop.querySelector('#rsms-sched-time');
          if (!wrap || !hid) return;
          var selCss = 'padding:9px 10px;border:1px solid var(--hairline-strong,#d8dee9);border-radius:9px;font:inherit;font-size:13px;color:var(--ink,#111);background:var(--bg-soft,#f8fafc);cursor:pointer;outline:none';
          function opts(arr, selV) { return arr.map(function (o) { return '<option value="' + o + '"' + (o === selV ? ' selected' : '') + '>' + o + '</option>'; }).join(''); }
          var hours = []; for (var h = 1; h <= 12; h++) hours.push(String(h));
          var mins = []; for (var m = 0; m < 60; m += 5) mins.push(String(m).padStart(2, '0'));
          wrap.innerHTML =
            '<select id="sched-h" style="' + selCss + '">' + opts(hours, '9') + '</select>'
            + '<span style="color:var(--muted,#8892a0);font-weight:700">:</span>'
            + '<select id="sched-m" style="' + selCss + '">' + opts(mins, '00') + '</select>'
            + '<select id="sched-ap" style="' + selCss + '">' + opts(['AM', 'PM'], 'AM') + '</select>';
          // Replace the bare OS <select>s with the app's custom .rds dropdowns — the
          // native control rendered as an ugly dark dropdown on mobile (Anton #110).
          // Change events still bubble from the hidden select, so sync() keeps working.
          if (window.__rdsEnhance) { try { wrap.querySelectorAll('select').forEach(window.__rdsEnhance); } catch (e) {} }
          function sync() {
            var h = parseInt(wrap.querySelector('#sched-h').value, 10);
            var m = wrap.querySelector('#sched-m').value;
            var ap = wrap.querySelector('#sched-ap').value;
            var h24 = ap === 'PM' ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
            hid.value = String(h24).padStart(2, '0') + ':' + m;
          }
          wrap.addEventListener('change', sync); sync();
        })();
        // "Best time to send" chip — same data the bulk/blast time popover uses
        // (GET /reports/hourly-pattern returns a computed .best window from the
        // account's own reply history, cached in window.__rsmsBestSend). Tapping it
        // sets the hour/min/AM-PM selects. Hidden if there's no window to suggest.
        (function buildBestChip() {
          var host = pop.querySelector('#rsms-sched-best'); if (!host) return;
          function setTime(hhmm) {
            var m = (hhmm || '').match(/^(\d{1,2}):(\d{2})/); if (!m) return;
            var H = parseInt(m[1], 10), mnum = Math.round(parseInt(m[2], 10) / 5) * 5; if (mnum >= 60) mnum = 55;
            var ap = H < 12 ? 'AM' : 'PM', h12 = (H % 12) || 12, MM = String(mnum).padStart(2, '0');
            function setSel(id, val) {
              var s = pop.querySelector('#' + id); if (!s) return;
              s.value = val;
              var rds = s.closest && s.closest('.rds');
              if (rds) {
                var opt = s.options[s.selectedIndex];
                var lbl = rds.querySelector('.rds-val'); if (lbl && opt) lbl.textContent = opt.text;
                var menu = rds.querySelector('.rds-menu'); if (menu) { var os = menu.querySelectorAll('.rds-o'); for (var i = 0; i < os.length; i++) os[i].classList.toggle('rds-on', i === s.selectedIndex); }
              }
              try { s.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
            }
            setSel('sched-h', String(h12)); setSel('sched-m', MM); setSel('sched-ap', ap);
          }
          function paint(best) {
            if (!best || !best.start_hhmm) return;
            // Honest about WHERE the window comes from. It's account-wide (or an SMS
            // best-practice default), NOT specific to this one contact — so a contact
            // who never replied still shows the account/general window. The subtitle
            // says so plainly so it never reads as fake per-contact magic.
            var src = best.source;
            var contactSrc = src === 'contact';
            var dataDriven = contactSrc || src === 'data'; // bolt icon when grounded in real replies
            var lead = contactSrc ? 'Best time to reach them'
                     : src === 'data' ? 'Best time to send'
                     : 'Suggested send time';
            var sub = contactSrc ? 'When this contact has replied to you before'
                     : src === 'data' ? 'When your contacts usually reply (account-wide)'
                     : 'General SMS best practice — not enough reply history yet';
            host.style.display = 'block';
            host.innerHTML = '<button type="button" id="rsms-sched-bestbtn" title="' + sub + '" style="width:100%;display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid rgba(37,99,235,.25);border-radius:9px;background:var(--accent-tint,#eff4ff);color:var(--accent-deep,#1d4ed8);font:inherit;font-size:12px;font-weight:600;cursor:pointer;text-align:left">'
              + '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="flex:none;margin-top:1px">' + (dataDriven ? '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>' : '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>') + '</svg>'
              + '<span style="flex:1;min-width:0;line-height:1.3"><span style="display:block">' + lead + ' · ' + (best.label || '') + '</span><span style="display:block;font-weight:400;font-size:10.5px;opacity:.72">' + sub + '</span></span>'
              + '<span id="rsms-sched-bestuse" style="font-weight:700;align-self:center">Use</span></button>';
            var b = host.querySelector('#rsms-sched-bestbtn');
            if (b) b.addEventListener('click', function () { setTime(best.start_hhmm); var u = host.querySelector('#rsms-sched-bestuse'); if (u) u.textContent = '✓'; });
          }
          var contactId = sr ? sr.getAttribute('data-contact-id') : '';
          // In a 1:1 conversation we ONLY suggest a time when it's genuinely derived
          // from THIS contact's own replies (>=3). No account-wide fallback here — an
          // account average next to one person reads as fake per-contact magic. (The
          // account-wide window still shows in the bulk/blast time popover, where it
          // belongs.) Not enough contact data → no chip.
          if (!contactId) return;
          try {
            api.request('GET', '/conversations/by-contact/' + encodeURIComponent(contactId) + '/best-time', null, { silent: true }).then(function (r) {
              var cb = (r && r.best) || null;
              if (cb && cb.source === 'contact') paint(cb);
            }).catch(function () {});
          } catch (e) {}
        })();
        document.getElementById('rsms-sched-cancel').addEventListener('click', function () { pop.remove(); });
        document.getElementById('rsms-sched-go').addEventListener('click', function () {
          var d = document.getElementById('rsms-sched-date').value;
          var t2 = document.getElementById('rsms-sched-time').value;
          if (!d || !t2) { toast('Pick a date and time'); return; }
          var sdt = new Date(d + 'T' + t2);
          if (isNaN(sdt.getTime()) || sdt <= new Date()) { toast('Pick a future date/time'); return; }
          var goBtn = document.getElementById('rsms-sched-go'); goBtn.textContent = 'Scheduling\u2026'; goBtn.disabled = true;
          var convId = sr ? sr.getAttribute('data-conv-id') : '';
          var contactId = sr ? sr.getAttribute('data-contact-id') : '';
          api.request('POST', '/sms/schedule', { to: sphone, message: msg2, send_at: sdt.toISOString(), conversation_id: convId || undefined, contact_id: contactId || undefined }).then(function (r) {
            pop.remove();
            if (r && r.success !== false) { ta2.value = ''; rsmsRenderSchedPill(sdt, r && r.data && r.data.id, msg2); toast('Scheduled for ' + sdt.toLocaleString()); }
            else { toast('Could not schedule: ' + ((r && r.error) || '')); }
          }).catch(function () { pop.remove(); toast('Could not schedule'); });
        });
        setTimeout(function () { document.addEventListener('click', function cl(ev) { if (!pop.contains(ev.target) && !ev.target.closest('[aria-label="Schedule send"]')) { pop.remove(); document.removeEventListener('click', cl); } }); }, 50);
        return;
      }
    }

    // ---- contact-detail quick actions: Block / Archive / Mark unread / Snooze ----
    var qa = t.closest(PANE + ' .cd-actions .cd-action');
    if (qa) {
      var ql = (qa.textContent || '').trim().toLowerCase();
      e.preventDefault(); e.stopPropagation();
      // Helper: swap the single text node inside a .cd-action button.
      function setActionLabel(btn, label) { var nodes = btn.childNodes; for (var i = 0; i < nodes.length; i++) { if (nodes[i].nodeType === 3 && nodes[i].textContent.trim()) { nodes[i].textContent = '\n            ' + label + '\n          '; break; } } }
      if (/block|unblock/.test(ql)) {
        var cid = activeContactId();
        if (!cid) { toast('No contact selected'); return; }
        var isUnblock = /unblock/.test(ql);
        var payload = isUnblock ? { status: 'active', dnd_sms: 0 } : { status: 'blocked', dnd_sms: 1 };
        // Optimistic: flip label + confirm instantly; reconcile only on failure.
        setActionLabel(qa, isUnblock ? 'Block' : 'Unblock');
        toast(isUnblock ? 'Contact unblocked' : 'Contact blocked — they won’t receive messages');
        api.updateContact(cid, payload).then(function (res) {
          if (!(res && res.success !== false)) { setActionLabel(qa, isUnblock ? 'Unblock' : 'Block'); toast('Failed: ' + ((res && res.error) || 'unknown error')); }
        }).catch(function () { setActionLabel(qa, isUnblock ? 'Unblock' : 'Block'); toast('Failed: network error'); });
        return;
      }
      if (/archive|unarchive/.test(ql)) {
        var aid = activeConvId();
        if (!aid) { toast('No conversation selected'); return; }
        var isUnarchive = /unarchive/.test(ql);
        var arow = activeRow();
        // Optimistic: flip label + row state + confirm instantly; reconcile on failure.
        setActionLabel(qa, isUnarchive ? 'Archive' : 'Unarchive');
        if (arow) arow.setAttribute('data-archived', isUnarchive ? '0' : '1');
        toast(isUnarchive ? 'Conversation unarchived' : 'Conversation archived');
        var archiveCall = isUnarchive ? api.unarchiveConversation(aid) : api.archiveConversation(aid);
        archiveCall.then(function (res) {
          if (!(res && res.success !== false)) { setActionLabel(qa, isUnarchive ? 'Unarchive' : 'Archive'); if (arow) arow.setAttribute('data-archived', isUnarchive ? '1' : '0'); toast('Failed: ' + ((res && res.error) || 'unknown error')); }
        }).catch(function () { setActionLabel(qa, isUnarchive ? 'Unarchive' : 'Archive'); if (arow) arow.setAttribute('data-archived', isUnarchive ? '1' : '0'); toast('Failed: network error'); });
        return;
      }
      if (/unread|read/.test(ql)) {
        var urow = activeRow();
        var convId = activeConvId();
        var markingUnread = /unread/.test(ql);
        if (urow) {
          if (markingUnread) { urow.classList.add('conv-unread'); var um = urow.querySelector('.conv-row-meta'); if (um && !urow.querySelector('.conv-badge')) { var ub = document.createElement('span'); ub.className = 'conv-badge'; ub.textContent = '1'; um.appendChild(ub); } if (convId) api.request('PUT', '/conversations/' + convId + '/unread').catch(function () {}); }
          else { urow.classList.remove('conv-unread'); var ob = urow.querySelector('.conv-badge'); if (ob && ob.parentNode) ob.parentNode.removeChild(ob); if (convId) api.bulkMarkRead([convId]).catch(function () {}); }
        }
        toast(markingUnread ? 'Marked unread' : 'Marked read');
        // Toggle button text
        var nodes = qa.childNodes;
        for (var i = 0; i < nodes.length; i++) { if (nodes[i].nodeType === 3 && nodes[i].textContent.trim()) { nodes[i].textContent = markingUnread ? '\n            Mark read\n          ' : '\n            Mark unread\n          '; break; } }
        return;
      }
      if (/snooze/.test(ql)) {
        openConvSnoozeMenu(qa);
        return;
      }
      return;
    }

    // ---- tag remove (X on a chip) ----
    var tagX = t.closest(PANE + ' #cd-tags .cd-tag .cd-tag-x');
    if (tagX) {
      e.preventDefault(); e.stopPropagation();
      var chip = tagX.closest('.cd-tag');
      var name = chip ? (chip.textContent || '').replace(/×\s*$/, '').trim() : '';
      if (!name) return;
      var next = currentTags().filter(function (x) { return x !== name; });
      saveTags(next, 'Tag removed');
      return;
    }

    // ---- tag add: suggestion chips ----
    var sug = t.closest(PANE + ' #cd-tag-sugs [data-tagsug], ' + PANE + ' #cd-tagpop [data-tagsug]');
    if (sug) {
      e.preventDefault(); e.stopPropagation();
      // The "+ Create "x"" button carries the real tag in data-tagval; its
      // textContent is the label. Prefer data-tagval so we never save "+ Create…".
      var v = (sug.getAttribute('data-tagval') || sug.textContent || '').trim();
      if (!v) return;
      var cur = currentTags();
      if (cur.indexOf(v) === -1) { cur = cur.concat([v]); saveTags(cur, 'Tag added'); }
      else toast('Already tagged');
      return;
    }

    // ---- bulk bar: Mark read / Archive / Export ----
    var bulk = t.closest(PANE + ' .conv-bulkbar button[data-bulk]');
    if (bulk) {
      e.preventDefault(); e.stopPropagation();
      var ids = selectedConvIds();
      if (!ids.length) { toast('Select conversations first'); return; }
      var k = bulk.getAttribute('data-bulk');
      if (k === 'read' && typeof api.bulkMarkRead === 'function') {
        try { api.bulkMarkRead(ids).then(function () { toast(ids.length + ' marked read'); }).catch(function () { toast('Could not mark read'); }); }
        catch (eb) { toast('Could not mark read'); }
        return;
      }
      if (k === 'archive' && typeof api.bulkArchiveConversations === 'function') {
        try { api.bulkArchiveConversations(ids).then(function () { toast(ids.length + ' archived'); }).catch(function () { toast('Could not archive'); }); }
        catch (eb2) { toast('Could not archive'); }
        return;
      }
      if (k === 'export' && typeof api.bulkExportConversations === 'function') {
        try { api.bulkExportConversations(ids); toast('Export started'); }
        catch (eb3) { toast('Could not export'); }
        return;
      }
      toast('Action unavailable');
      return;
    }
  }, true);

  // Collect conv ids checked in select mode.
  function selectedConvIds() {
    return [].slice.call(document.querySelectorAll(PANE + ' .conv-list.is-select .conv-row.is-checked[data-conv-id]'))
      .map(function (r) { return r.getAttribute('data-conv-id'); })
      .filter(Boolean);
  }

  // ===== AI agent toggle (#cd-aiagent-cb) → Automations ▸ AI Replies =====
  // AI replies are configured account-wide (persona / scope / draft-vs-auto),
  // not per-contact, so route to the native setup instead of bouncing to
  // classic. Capture-phase stopPropagation suppresses the cosmetic inline
  // handler that would otherwise flip the label to a misleading "On".
  document.addEventListener('change', function (e) {
    if (!live()) return;
    var cb = e.target.closest(PANE + ' #cd-aiagent-cb');
    if (!cb) return;
    e.stopPropagation();
    cb.checked = false; // not a real per-contact switch — don't leave it half-on
    var lbl = document.querySelector(PANE + ' #cd-aiagent-state');
    if (lbl) lbl.textContent = 'Set up in Automations ▸ AI Replies';
    var sub = document.querySelector(PANE + ' #cd-aiagent-sub');
    if (sub) sub.textContent = 'AI replies are configured account-wide — persona, which conversations to answer, and draft vs auto-send — in Automations → AI Replies.';
    toast('Set up AI replies in Automations → AI Replies');
    var nav = document.querySelector('[data-tab="campaigns"]');
    if (nav) nav.click();
    setTimeout(function () {
      var t = document.querySelector('#pane-campaigns [data-autotab="ai-replies"]');
      if (t) t.click();
    }, 380);
  }, true);

  // ===== Notes: save on Enter (no shift) or on blur of #cd-note-input =====
  function saveNote(ta) {
    var body = (ta.value || '').trim(); if (!body) return;
    var cid = activeContactId();
    if (!cid) { toast('Open a conversation first'); return; }
    if (typeof api.createNote !== 'function') { toast('Could not save note'); return; }
    var status = document.querySelector(PANE + ' #cd-note-status');
    if (status) { status.textContent = 'Saving…'; status.classList.remove('is-saved'); }
    try {
      api.createNote(cid, body).then(function (res) {
        if (res && res.success === false) { if (status) status.textContent = ''; toast('Could not save note'); return; }
        ta.value = '';
        if (status) { status.textContent = 'Saved'; status.classList.add('is-saved'); setTimeout(function () { if (status) { status.textContent = ''; status.classList.remove('is-saved'); } }, 1800); }
        prependNote(body);
        toast('Note saved');
      }).catch(function () { if (status) status.textContent = ''; toast('Could not save note'); });
    } catch (e) { if (status) status.textContent = ''; toast('Could not save note'); }
  }
  function prependNote(body) {
    var list = document.querySelector(PANE + ' .cd-notes-list'); if (!list) return;
    var html = '<div class="cd-note"><div class="cd-note-head"><span class="cd-note-ava">You</span>'
      + '<span class="cd-note-by">You</span><span class="cd-note-time">just now</span></div>'
      + '<div class="cd-note-body">' + esc(body) + '</div></div>';
    list.insertAdjacentHTML('afterbegin', html);
  }
  document.addEventListener('keydown', function (e) {
    if (!live()) return;
    if (e.key !== 'Enter' || e.shiftKey) return;
    var ta = e.target.closest(PANE + ' #cd-note-input'); if (!ta) return;
    e.preventDefault(); e.stopPropagation();
    saveNote(ta);
  }, true);
  document.addEventListener('blur', function (e) {
    if (!live()) return;
    var ta = e.target && e.target.closest && e.target.closest(PANE + ' #cd-note-input'); if (!ta) return;
    if (!(ta.value || '').trim()) return;
    saveNote(ta);
  }, true);

  // ===== Note delete =====
  document.addEventListener('click', function (e) {
    if (!live()) return;
    var del = e.target.closest(PANE + ' [data-del-note]');
    if (!del) return;
    e.preventDefault(); e.stopImmediatePropagation();
    var noteId = del.getAttribute('data-del-note');
    var noteEl = del.closest('.cd-note');
    if (!noteId) return;
    if (noteEl) noteEl.style.opacity = '0.4';
    api.deleteNote(noteId).then(function (r) {
      if (r && r.success !== false) { if (noteEl) noteEl.remove(); toast('Note deleted'); }
      else { if (noteEl) noteEl.style.opacity = ''; toast('Could not delete note'); }
    }).catch(function () { if (noteEl) noteEl.style.opacity = ''; toast('Delete failed'); });
  }, true);

  // ===== tag add: free-text Enter in #cd-tag-input =====
  document.addEventListener('keydown', function (e) {
    if (!live()) return;
    if (e.key !== 'Enter') return;
    var inp = e.target.closest(PANE + ' #cd-tag-input'); if (!inp) return;
    e.preventDefault(); e.stopPropagation();
    var v = (inp.value || '').trim(); if (!v) return;
    var cur = currentTags();
    if (cur.indexOf(v) === -1) { cur = cur.concat([v]); saveTags(cur, 'Tag added'); }
    else toast('Already tagged');
    inp.value = '';
  }, true);
})();
} catch(e){ console.warn('[mercury-buttons] inbox failed', e); }

/* ---- pane: contacts (handled 10, routed 8) ---- */
try {
(function(){
  'use strict';
  var api = (window.api||{});
  var PANE = '#pane-contacts';
  function live(){ try{ return !!document.documentElement.getAttribute('data-rsms-live'); }catch(_){ return false; } }
  function toast(m){ try{ if(window.__rsmsToast) window.__rsmsToast(m); }catch(_){ } }
  function go(section){ try{ var PAGE_MAP = {contacts:'crm',forms:'crm',widgets:'crm',campaigns:'sms-blasts'}; window.__rsmsOpenClassic('?page=' + (PAGE_MAP[section]||section), section.charAt(0).toUpperCase()+section.slice(1)); }catch(_){ } }
  function inPane(el){ return el && el.closest && el.closest(PANE); }
  function txt(el){ try{ return ((el.getAttribute&&el.getAttribute('aria-label'))||el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase(); }catch(_){ return ''; } }

  document.addEventListener('click', function(e){
    if(!live()) return;
    var t = e.target;
    if(!t || !t.closest) return;
    if(!inPane(t)) return;

    // ---- Segment builder: Refresh -> live preview count (previewSegment) ----
    var segRefresh = t.closest('#seg-refresh');
    if(segRefresh){
      e.preventDefault(); e.stopPropagation();
      var ruleEls = [].slice.call(document.querySelectorAll('#crm-seg [data-segrule]'));
      var rules = ruleEls.map(function(r){
        var sels = r.querySelectorAll('select');
        var inp = r.querySelector('input');
        return {
          field: sels[0] ? (sels[0].value||'') : '',
          op: sels[1] ? (sels[1].value||'') : '',
          value: inp ? (inp.value||'') : ''
        };
      });
      try{
        Promise.resolve(api.previewSegment && api.previewSegment(rules)).then(function(res){
          var n = res && (res.count!=null ? res.count : (res.data && res.data.count));
          var pv = document.querySelector('#crm-seg #seg-preview span b');
          if(pv && n!=null) pv.textContent = Number(n).toLocaleString('en-US');
          toast(n!=null ? Number(n).toLocaleString('en-US')+' contacts match' : 'Preview refreshed');
        }).catch(function(){ toast('Could not refresh preview'); });
      }catch(_){ toast('Could not refresh preview'); }
      return;
    }

    // ---- Segment builder: Save -> createSegment ----
    var segSave = t.closest('#seg-save');
    if(segSave){
      e.preventDefault(); e.stopPropagation();
      var nameEl = document.getElementById('seg-name');
      var name = nameEl ? (nameEl.value||'').trim() : '';
      if(!name){ toast('Name your audience first'); if(nameEl) nameEl.focus(); return; }
      var ruleEls2 = [].slice.call(document.querySelectorAll('#crm-seg [data-segrule]'));
      var rules2 = ruleEls2.map(function(r){
        var sels = r.querySelectorAll('select');
        var inp = r.querySelector('input');
        return {
          field: sels[0] ? (sels[0].value||'') : '',
          op: sels[1] ? (sels[1].value||'') : '',
          value: inp ? (inp.value||'') : ''
        };
      });
      try{
        Promise.resolve(api.createSegment && api.createSegment({ name: name, filter_rules: rules2 })).then(function(){
          toast('Audience "'+name+'" saved');
        }).catch(function(){ toast('Could not save audience'); });
      }catch(_){ toast('Could not save audience'); }
      var ov = segSave.closest('.modal-overlay'); if(ov) ov.classList.remove('is-open');
      return;
    }

    var btn = t.closest('button, a, .link-btn, [role="button"]');
    if(!btn || !inPane(btn)) return;
    if(btn.disabled || btn.getAttribute('aria-disabled')==='true') return;

    var key = txt(btn);

    // ---- Header: Sync GoHighLevel (calls backend if connected, else directs to settings) ----
    if(key.indexOf('sync gohighlevel')>-1 || key==='sync now'){
      e.preventDefault(); e.stopPropagation();
      if(typeof api.request==='function'){
        btn.disabled=true; toast('Checking GHL connection…');
        api.request('GET','/integration/ghl/status').then(function(r){
          var d=(r&&r.data)||r||{};
          if(d.connected){
            toast('Syncing contacts from GoHighLevel…');
            return api.request('POST','/integration/ghl/sync').then(function(r){ var s=(r&&r.data)||r||{}; if(s.success===false){ toast(s.error||'GoHighLevel sync failed — try again'); return; } var n=s.synced||0, c=s.created||0; toast(n ? ('GoHighLevel synced — '+n+' contact'+(n===1?'':'s')+(c?(' ('+c+' new)'):'')) : 'GoHighLevel up to date — no new contacts'); }).catch(function(){ toast('GoHighLevel sync failed — try again'); });
          } else { toast('GoHighLevel is not connected — opening Settings → Integrations'); var _st=document.querySelector('[data-tab="settings"]'); if(_st){ _st.click(); setTimeout(function(){ var _it=document.querySelector('#pane-settings [data-stab="integrations"]'); if(_it) _it.click(); }, 250); } }
        }).catch(function(){ toast('Could not reach GoHighLevel — check Settings → Integrations'); }).finally(function(){ btn.disabled=false; });
      } else { toast('GoHighLevel sync is not available — connect GHL in Settings → Integrations'); }
      return;
    }

    // ---- Custom fields: Add field -> classic ----
    if(btn.classList && btn.classList.contains('cd2-sec-add')){
      e.preventDefault(); e.stopPropagation(); toast('Opening custom-field editor'); go('contacts'); return;
    }

    // ---- Segments sub-panel row actions ----
    var segPanel = btn.closest('[data-crmtab-panel="segments"]');
    if(segPanel){
      if(key==='use in blast'){ e.preventDefault(); e.stopPropagation(); toast('Loading audience into blast'); go('campaigns'); return; }
      if(key==='edit'){ e.preventDefault(); e.stopPropagation(); toast('Opening audience editor'); go('contacts'); return; }
      if(key==='duplicate'){ e.preventDefault(); e.stopPropagation(); toast('Opening audiences'); go('contacts'); return; }
    }

    // ---- Lists sub-panel row actions ----
    var listPanel = btn.closest('[data-crmtab-panel="lists"]');
    if(listPanel){
      // 'new list' is handled by the real #crm-newlist modal in mercury-live.js
      // (create list -> /contact-lists). The old "coming soon" toast blocked it.
      if(key==='import csv'){ e.preventDefault(); e.stopPropagation(); var ib=document.getElementById('crm-import-btn'); if(ib) ib.click(); return; }
      if(key==='view'){ e.preventDefault(); e.stopPropagation(); toast('Opening list contacts'); go('contacts'); return; }
      if(key==='export'){ e.preventDefault(); e.stopPropagation(); toast('Opening export'); go('contacts'); return; }
      if(key==='add to blast'){ e.preventDefault(); e.stopPropagation(); toast('Loading list into blast'); go('campaigns'); return; }
    }

    // ---- Capture sub-panel (forms / widgets) -> classic ----
    var capPanel = btn.closest('[data-crmtab-panel="capture"]');
    if(capPanel){
      if(key==='new form'||key==='new widget'||key==='edit'||key==='qr code'||key==='customize'){
        e.preventDefault(); e.stopPropagation(); toast('Opening capture tools'); go('contacts'); return;
      }
      // Embed / Install code copy to clipboard handled elsewhere; leave them.
    }

    // ---- Appointments: Book appointment is now handled by the real calendar module
    // in mercury-live.js (#crm-newappt -> openApptModal -> POST /appointments). The old
    // "coming soon" capture-toast was removed so it no longer swallows that click.
  }, true);

  // ---- Row menu: intercept with real actions (Delete, View profile) --------
  document.addEventListener('click', function(e){
    if(!live()) return;
    var t = e.target;
    if(!t || !t.closest) return;
    var menuBtn = t.closest('#pane-contacts .crm-rowmenu');
    if(!menuBtn) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    var row = menuBtn.closest('.crm-row');
    var cid = row && row.getAttribute('data-id');
    var cname = row && row.getAttribute('data-name');
    if(!cid) return;
    // Build a simple dropdown
    var existing = document.getElementById('rsms-rowmenu-pop');
    if(existing){ existing.remove(); return; }
    var pop = document.createElement('div');
    pop.id = 'rsms-rowmenu-pop';
    pop.style.cssText = 'position:fixed;z-index:10002;background:var(--card,#fff);border:1px solid var(--hairline,#e5e7eb);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.14);padding:4px;min-width:160px';
    var actions = [
      { label: 'View profile', action: 'view' },
      { label: 'Send text', action: 'text' },
      { label: 'Add tag', action: 'tag' },
      { label: 'Delete contact', action: 'delete', danger: true }
    ];
    actions.forEach(function(a){
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = a.label;
      b.setAttribute('data-action', a.action);
      b.style.cssText = 'display:block;width:100%;text-align:left;padding:8px 12px;border:0;background:none;border-radius:7px;font:inherit;font-size:13px;color:' + (a.danger ? 'var(--red,#dc2626)' : 'var(--ink,#111)') + ';cursor:pointer';
      b.onmouseover = function(){ b.style.background = 'var(--hover,#f5f5f5)'; };
      b.onmouseout = function(){ b.style.background = 'none'; };
      b.addEventListener('click', function(ev){
        ev.stopPropagation();
        pop.remove();
        if(a.action === 'delete'){
          (window.__rsmsAsyncConfirm ? window.__rsmsAsyncConfirm({ title: 'Delete contact?', body: 'This permanently deletes ' + (cname || 'this contact') + '. This cannot be undone.', okText: 'Delete', danger: true }) : window.confirmDialog('This permanently deletes ' + (cname || 'this contact') + '. This cannot be undone.', { title: 'Delete contact?', confirmText: 'Delete', danger: true })).then(function(ok){
            if(!ok) return;
            api.request('DELETE', '/contacts/' + cid).then(function(res){
              if(res && res.success !== false){
                if(row) row.remove();
                toast('Contact deleted');
              } else {
                toast('Could not delete — ' + ((res && res.error) || 'try again'));
              }
            }).catch(function(){ toast('Delete failed — network error'); });
          });
        } else if(a.action === 'view'){
          // Click the row to open detail panel
          if(row) row.click();
        } else if(a.action === 'text'){
          var inboxTab = document.querySelector('.nav [data-tab="inbox"]');
          if(inboxTab) inboxTab.click();
        } else if(a.action === 'tag'){
          toast('Select a tag from the contact detail panel');
          if(row) row.click();
        }
      });
      pop.appendChild(b);
    });
    document.body.appendChild(pop);
    var r = menuBtn.getBoundingClientRect();
    pop.style.left = Math.min(r.left, window.innerWidth - 180) + 'px';
    pop.style.top = (r.bottom + 4) + 'px';
    // Land keyboard focus in the menu; remember the trigger to restore focus on close.
    var _trigger = menuBtn;
    try { var _f0 = pop.querySelector('button'); if(_f0) _f0.focus(); } catch(_){}
    // Close on outside click, Escape, OR scroll/resize. The menu is position:fixed at the
    // kebab's rect, so if the list scrolls it would float detached over other rows (user
    // 2026-07). Scroll uses capture so it catches the contact list's own scroll (scroll
    // doesn't bubble). Anchored-repositioning would be fussier + isn't expected here.
    setTimeout(function(){
      function closePop(ev){
        if(ev && ev.type === 'keydown'){ if(ev.key !== 'Escape') return; ev.preventDefault(); }
        else if(ev && ev.type === 'click' && pop.contains(ev.target)) return;
        pop.remove();
        document.removeEventListener('click', closePop, true); document.removeEventListener('keydown', closePop, true);
        document.removeEventListener('scroll', closePop, true); window.removeEventListener('resize', closePop);
        try { if(_trigger && document.contains(_trigger)) _trigger.focus(); } catch(_){}
      }
      document.addEventListener('click', closePop, true);
      document.addEventListener('keydown', closePop, true);
      document.addEventListener('scroll', closePop, true);
      window.addEventListener('resize', closePop);
    }, 0);
  }, true);

  // ---- Bulk delete handler (button is in the HTML with onclick=window._crmBulkDelete) ----
  var _delSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>Delete';
  window._crmBulkDelete = async function(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    var delBtn = document.querySelector('#pane-contacts .crm-bulk-delete');

    var selectAll = window._crmSelectAll;
    var firstN = window._crmSelectFirstN;
    var rows = [].filter.call(document.querySelectorAll('#pane-contacts .crm-table tbody tr.crm-row'), function(r){
      var c = r.querySelector('.crm-check'); return c && c.checked;
    });

    if (!selectAll && !rows.length) { toast('Select one or more contacts first'); return; }

    var ids;
    var n;
    if (selectAll) {
      n = firstN || window._crmTotal || rows.length;
      var confirmFn = window.__rsmsConfirm || window.confirm;
      if (!confirmFn('Permanently delete ' + n.toLocaleString() + ' contacts? This cannot be undone.')) return;
      if (delBtn) { delBtn.disabled = true; delBtn.textContent = 'Fetching…'; }
      try {
        // Unified resolver — segment/list-aware + honors "choose amount". The old path
        // refetched via _crmLastParams (the /contacts filter), which grabs the WRONG
        // contacts on a segment or list view (they load from different endpoints).
        ids = window.crmResolveIds ? await window.crmResolveIds() : [];
        if (!ids.length) { toast('No contacts found'); if (delBtn) { delBtn.disabled = false; delBtn.innerHTML = _delSvg; } return; }
      } catch(err) {
        toast('Failed to fetch contacts for deletion');
        if (delBtn) { delBtn.disabled = false; delBtn.innerHTML = _delSvg; }
        return;
      }
    } else {
      ids = rows.map(function(r){ return r.getAttribute('data-id'); }).filter(Boolean);
      n = ids.length;
      var confirmFn = window.__rsmsConfirm || window.confirm;
      if (!confirmFn('Delete ' + n + ' contact' + (n > 1 ? 's' : '') + '? This cannot be undone.')) return;
      if (delBtn) { delBtn.disabled = true; delBtn.textContent = 'Deleting…'; }
    }

    if (!ids.length) { toast('No contacts found to delete'); if (delBtn) delBtn.disabled = false; return; }

    var totalDeleted = 0;
    var anyFail = false;
    try {
      for (var i = 0; i < ids.length; i += 500) {
        var chunk = ids.slice(i, i + 500);
        var res = await api.request('POST', '/contacts/bulk-delete', { ids: chunk });
        // api.request resolves {success:false} on 403/500/timeout (never throws) — treat that
        // as a failure, not a silent success. Yesterday a batch that FK-failed server-side
        // still hit the optimistic row-removal below, so contacts vanished then reappeared on
        // reload ("it didn't delete / didn't update"). Only claim success for what truly went.
        if (res && res.success === false) anyFail = true;
        else if (res && res.deleted) totalDeleted += res.deleted;
        if (delBtn) delBtn.textContent = 'Deleting… ' + Math.min(i + 500, ids.length) + '/' + ids.length;
      }
      // Only optimistically drop rows if something actually deleted; crmReload() below is the
      // source of truth either way, so a failed delete leaves the rows visibly intact.
      if (totalDeleted > 0) rows.forEach(function(r){ r.remove(); });
      if (window.crmClearSelectAll) window.crmClearSelectAll();
      var bc = document.querySelector('#pane-contacts .crm-bulk-count');
      if (bc) bc.textContent = '0 selected';
      var hc = document.querySelector('#pane-contacts thead .crm-check');
      if (hc) hc.checked = false;
      var bb = document.getElementById('crm-bulkbar'); if (bb) bb.style.display = 'none';
      if (totalDeleted === 0) toast('Couldn’t delete — nothing was removed. Please try again.');
      else if (anyFail) toast('Deleted ' + totalDeleted.toLocaleString() + ' — some couldn’t be removed; refreshing.');
      else toast(totalDeleted.toLocaleString() + ' contact' + (totalDeleted !== 1 ? 's' : '') + ' deleted');
      if (window.crmReload) window.crmReload();
    } catch(err) {
      toast('Some deletes failed — ' + totalDeleted + ' deleted so far');
    } finally {
      if (delBtn) { delBtn.disabled = false; delBtn.innerHTML = _delSvg; }
    }
  };
})();
} catch(e){ console.warn('[mercury-buttons] contacts failed', e); }

/* ---- pane: blasts (handled 2, routed 2) ---- */
try {
(function () {
  'use strict';
  var api = (window.api || {});
  var PANE = '#pane-blasts';

  function live() {
    try { return !!document.documentElement.getAttribute('data-rsms-live'); } catch (e) { return false; }
  }
  function toast(m) {
    try { if (typeof window.__rsmsToast === 'function') window.__rsmsToast(m); } catch (e) {}
  }
  function go(hash) {
    try { location.href = hash; } catch (e) {}
  }

  // Capture-phase, scoped strictly to #pane-blasts. We early-return unless we're in
  // LIVE mode so the design demo is never touched. The build handler marks these
  // buttons with e.rsmsHandled (visual-only mock behaviour); in live mode the
  // fabricated AI-optimize / clone / reschedule suggestions have no real endpoint
  // and operate on real campaigns, so routing to the classic Campaigns app is the
  // correct + safe action (never a wrong/destructive API call).
  document.addEventListener('click', function (e) {
    if (!live()) return;
    var t = e.target;
    if (!t || typeof t.closest !== 'function') return;

    // ---- list-level AI-optimize suggestion buttons (cross-blast review panel) ----
    // data-listopt="clone-top"  -> "Clone" the top performer into a fresh draft
    // data-listopt="reschedule" -> move a scheduled blast to a better window
    // (data-listopt="review-sending" is build-handled: it clicks the Sending row to
    //  open that real blast — leave it alone.)
    var lopt = t.closest(PANE + ' [data-listopt]');
    if (lopt) {
      var act = lopt.getAttribute('data-listopt');
      if (act === 'clone-top') {
        e.preventDefault(); e.stopPropagation();
        window.__rsmsOpenClassic('?page=sms-blasts', 'SMS Campaigns');
        toast('Opening Campaigns to clone your top blast');
        return;
      }
      if (act === 'reschedule') {
        e.preventDefault(); e.stopPropagation();
        window.__rsmsOpenClassic('?page=sms-blasts', 'SMS Campaigns');
        toast('Opening Campaigns to reschedule this blast');
        return;
      }
      // review-sending and anything else: let the build/demo handler run.
      return;
    }
  }, true);
})();
} catch(e){ console.warn('[mercury-buttons] blasts failed', e); }

/* ---- pane: dashboard (handled 7, routed 0) ---- */
try {
(function () {
  'use strict';
  var api = (window.api || {});
  var PANE = '#pane-dashboard';

  function live() {
    try { return !!document.documentElement.getAttribute('data-rsms-live'); }
    catch (e) { return false; }
  }
  function toast(m) { try { if (window.__rsmsToast) window.__rsmsToast(m); } catch (e) {} }
  function go(tab) {
    var _GO_PATHS = { dashboard: '/dashboard', inbox: '/sms', dialer: '/dialer', blasts: '/sms/blasts', campaigns: '/sms/sequences', contacts: '/crm', reports: '/reports', '10dlc': '/10dlc', 'number-health': '/numbers', settings: '/settings' };
    try {
      if (typeof window.__rsmsShowTab === 'function') { window.__rsmsShowTab(tab); }
      else { location.hash = '#' + tab; }
      try { history.replaceState(null, '', _GO_PATHS[tab] || ('/' + tab)); } catch (e) {}
    } catch (e) { try { location.hash = '#' + tab; } catch (e2) {} }
  }
  function goTo(section) { try { var PAGE_MAP = {'book-call':'dashboard','billing':'billing'}; window.__rsmsOpenClassic('?page=' + (PAGE_MAP[section]||section), section.charAt(0).toUpperCase()+section.slice(1)); } catch (e) {} }
  function txt(el) { try { return (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase(); } catch (e) { return ''; } }
  function stop(e) { try { e.preventDefault(); e.stopPropagation(); } catch (x) {} }

  function bookCall() {
    var called = false;
    try {
      if (api && typeof api.getCsmBookingLink === 'function') {
        api.getCsmBookingLink().then(function (link) {
          if (link) { try { window.open(link, '_blank', 'noopener'); } catch (e) {} toast('Opening the booking calendar'); }
          else { goTo('book-call'); }
        }).catch(function () { goTo('book-call'); });
        called = true;
      }
    } catch (e) {}
    if (!called) goTo('book-call');
  }

  // Route a CTA label to the right destination. Returns true if handled.
  function routeLabel(label) {
    if (!label) return false;
    if (label.indexOf('book a call') !== -1 || label.indexOf('book a strategy call') !== -1 || label === 'book') { bookCall(); toast('Booking a call'); return true; }
    if (label.indexOf('registration') !== -1 || label.indexOf('register') !== -1) { go('10dlc'); toast('Opening carrier verification'); return true; }
    if (label.indexOf('start calling') !== -1 || label.indexOf('start dialing') !== -1 || label.indexOf('power dialer') !== -1) { go('dialer'); toast('Opening the Power Dialer'); return true; }
    if (label.indexOf('import contacts') !== -1 || label.indexOf('crm') !== -1) { go('contacts'); toast('Opening your CRM'); return true; }
    if (label.indexOf('ready ai') !== -1 || label.indexOf('set it up') !== -1 || label.indexOf('see how it works') !== -1 || label.indexOf('build one') !== -1 || label.indexOf('automation') !== -1 || label.indexOf('sequence') !== -1) { go('campaigns'); toast('Opening Automations'); return true; }
    if (label.indexOf('create a blast') !== -1 || label.indexOf('blast') !== -1 || label.indexOf('sms blast') !== -1) { go('blasts'); toast('Opening SMS Blasts'); return true; }
    if (label.indexOf('update card') !== -1 || label.indexOf('payment') !== -1 || label.indexOf('billing') !== -1 || label.indexOf('change plan') !== -1) { goTo('billing'); return true; }
    return false;
  }

  document.addEventListener('click', function (e) {
    if (!live()) return;
    var t = e.target;
    if (!t || !t.closest) return;

    // Recent Campaigns "View all" / "See all" -> SMS Blasts
    var va = t.closest(PANE + ' .view-all');
    if (va) {
      stop(e);
      go('blasts');
      toast('Opening SMS Blasts');
      return;
    }

    // Deliverability callout actions
    var deliv = t.closest(PANE + ' .deliv-actions .btn');
    if (deliv) {
      stop(e);
      var dl = txt(deliv);
      if (dl.indexOf('optimize') !== -1 || dl.indexOf('routing') !== -1) { go('number-health'); toast('Opening Number Health'); }
      else { go('reports'); toast('Opening Usage Reports'); }
      return;
    }

    // Recommendation card: primary CTA + ghost link
    var recoBtn = t.closest(PANE + ' .reco-actions .cta-btn, ' + PANE + ' .reco-actions .cta-ghost');
    if (recoBtn) {
      var rl = txt(recoBtn);
      if (routeLabel(rl)) { stop(e); return; }
      // Unknown reco action — leave the build JS toast in place.
    }

    // Billboard (pre-registration) primary + secondary CTA
    var bbBtn = t.closest(PANE + ' .bb-actions .cta-btn, ' + PANE + ' .bb-actions .cta-2');
    if (bbBtn) {
      if (routeLabel(txt(bbBtn))) { stop(e); return; }
    }

    // Billboard specialist "Book a call"
    var specBtn = t.closest(PANE + ' .bb-spec-btn');
    if (specBtn) {
      stop(e);
      bookCall();
      toast('Booking a call');
      return;
    }

    // Billboard feature cards -> route by their CTA label
    var feat = t.closest(PANE + ' .bb-feat');
    if (feat) {
      var fl = '';
      var fc = feat.querySelector('.bb-feat-cta');
      if (fc) fl = txt(fc); else fl = txt(feat);
      if (routeLabel(fl)) { stop(e); return; }
    }
  }, true);
})();
} catch(e){ console.warn('[mercury-buttons] dashboard failed', e); }

/* ---- pane: dialer (handled 10, routed 6) ---- */
try {
(function(){
  'use strict';
  var api = (window.api || {});
  var PANE = '#pane-dialer';

  function live(){ return !!document.documentElement.getAttribute('data-rsms-live'); }
  function toast(m){ try{ if(window.__rsmsToast) window.__rsmsToast(m); }catch(_e){} }
  function gotoDialer(){ try{ window.__rsmsOpenClassic('?page=dialer', 'Dialer'); }catch(_e){} }
  function txt(el){ return ((el && (el.textContent||'')) ).replace(/\s+/g,' ').trim().toLowerCase(); }

  document.addEventListener('click', function(e){
    if(!live()) return;
    var t = e.target;
    if(!t || !t.closest) return;
    // only act inside the dialer pane
    if(!t.closest(PANE)) return;
    // leave the active calling loop alone (already wired elsewhere)
    if(t.closest('#dlr-call')) return;

    var el = t.closest('button, a, .link-btn, [role="button"]');
    if(!el || el.disabled || el.getAttribute('aria-disabled')==='true') return;
    if(!el.closest(PANE)) return;

    var key = txt(el);

    // ---- Team supervisor: Listen / Whisper / Barge (WebRTC -> classic) ----
    if(el.closest('[data-dtab-panel="team"]') && el.getAttribute('data-supervise')){
      e.preventDefault(); e.stopPropagation();
      toast('Opening live monitor in the dialer…');
      gotoDialer();
      return;
    }

    // ---- Numbers: Check / Rotate / Replace / Buy / Swap (no clean endpoint -> classic) ----
    if(el.closest('[data-dtab-panel="numbers"]')){
      if(el.getAttribute('data-numact') || key==='buy a number' || key==='swap'){
        e.preventDefault(); e.stopPropagation();
        toast('Opening number tools in the dialer…');
        gotoDialer();
        return;
      }
    }

    // ---- Callbacks: "Call now" (live call -> classic) + Acknowledge / Dismiss ----
    if(el.closest('[data-dtab-panel="callbacks"]')){
      if(el.classList.contains('dlr-callbtn') || key==='call now'){
        e.preventDefault(); e.stopPropagation();
        toast('Live calling runs in the dialer — opening it.');
        gotoDialer();
        return;
      }
      if(key==='acknowledge' || key==='ack'){
        e.preventDefault(); e.stopPropagation();
        var ackId = el.getAttribute('data-callback-id') || el.getAttribute('data-id');
        if(ackId && typeof api.acknowledgeCallback==='function'){
          try{
            Promise.resolve(api.acknowledgeCallback(ackId))
              .then(function(){ toast('Callback acknowledged'); })
              .catch(function(){ toast('Could not acknowledge — try again'); });
          }catch(_e){ toast('Could not acknowledge — try again'); }
        } else { toast('Callback acknowledged'); }
        return;
      }
      if(key==='dismiss'){
        e.preventDefault(); e.stopPropagation();
        var dId = el.getAttribute('data-callback-id') || el.getAttribute('data-id');
        if(dId && typeof api.dismissCallback==='function'){
          try{
            Promise.resolve(api.dismissCallback(dId))
              .then(function(){ toast('Callback dismissed'); })
              .catch(function(){ toast('Could not dismiss — try again'); });
          }catch(_e){ toast('Could not dismiss — try again'); }
        } else { toast('Callback dismissed'); }
        return;
      }
    }

    // ---- Dial log: Export (real exportDials) ----
    if(el.closest('[data-dtab-panel="logs"]') && key==='export'){
      e.preventDefault(); e.stopPropagation();
      if(typeof api.exportDials==='function'){
        try{
          Promise.resolve(api.exportDials())
            .then(function(){ toast('Dial log export started'); })
            .catch(function(){ toast('Could not export — try again'); });
        }catch(_e){ toast('Could not export — try again'); }
      } else { toast('Dial log export started'); }
      return;
    }

    // ---- Campaigns: New + builder Launch + card edit ----
    if(el.closest('[data-dtab-panel="campaigns"]') || el.closest('#dlc-modal')){
      // builder "Launch campaign" + "Save as draft" are now handled NATIVELY by
      // mercury-live.js (capture-phase → POST /dialer/campaigns). The classic
      // redirect was removed as part of full classic removal. Don't intercept
      // dlc-launch / dlc-draft here.
      if(el.id==='dlc-launch' || el.id==='dlc-draft' || key==='launch campaign'){ return; }
      // Campaign card click is handled natively in mercury-live.js (edit). No classic redirect.
      if(el.matches('[data-dlc]') || el.closest('[data-dlc]')){ return; }
      // any Pause / Resume action on a campaign
      if(key==='pause' || key==='resume'){
        e.preventDefault(); e.stopPropagation();
        var camp = el.closest('[data-dlc]');
        var campId = (camp && (camp.getAttribute('data-campaign-id') || camp.getAttribute('data-id'))) || el.getAttribute('data-campaign-id') || el.getAttribute('data-id');
        var pausing = (key==='pause');
        var fn = pausing ? api.pauseDialerCampaign : api.resumeDialerCampaign;
        if(campId && typeof fn==='function'){
          try{
            Promise.resolve(fn(campId))
              .then(function(){ toast(pausing ? 'Campaign paused' : 'Campaign resumed'); })
              .catch(function(){ toast('Could not update campaign — try again'); });
          }catch(_e){ toast('Could not update campaign — try again'); }
        } else { toast(pausing ? 'Campaign paused' : 'Campaign resumed'); }
        return;
      }
      // "New dial campaign" opens the builder modal (handled by build JS) — leave it.
    }

    // ---- Scripts: New + Edit are now handled NATIVELY by mercury-live.js
    //      (capture-phase → native /dialer-scripts editor modal). No classic redirect.
    if(el.closest('[data-dtab-panel="scripts"]')){
      // "Use script" already loads into the composer via the build JS — leave it.
    }

  }, true);
})();
} catch(e){ console.warn('[mercury-buttons] dialer failed', e); }

/* ---- pane: reports (handled 6, routed 6) ---- */
try {
(function () {
  'use strict';
  var PANE = '#pane-reports';
  var api = (window.api || {});

  function live() { return !!document.documentElement.getAttribute('data-rsms-live'); }
  function toast(m) { try { if (window.__rsmsToast) window.__rsmsToast(m); } catch (e) {} }
  function $(s, r) { try { return (r || document).querySelector(s); } catch (e) { return null; } }
  function $all(s, r) { try { return [].slice.call((r || document).querySelectorAll(s)); } catch (e) { return []; } }
  function unwrap(res) { if (!res) return null; if (res.success === false) return null; if (res.data !== undefined) return res.data; return res; }
  function num(n) { return Number(n || 0).toLocaleString('en-US'); }
  function pct(n) { return (Math.round(Number(n || 0) * 10) / 10) + '%'; }
  function money(v) { return '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  // ---- KPI re-render for a chosen window -----------------------------------
  function renderKpis(ov) {
    if (!ov) return;
    var sent = parseInt(ov.messages_sent, 10) || 0, opt = parseInt(ov.opt_outs, 10) || 0;
    var rmap = {
      'messages sent': num(ov.messages_sent),
      'delivery rate': pct(ov.delivery_rate),
      'reply rate': pct(ov.reply_rate),
      'positive reply rate': pct(ov.positive_reply_rate),
      'opt-out rate': sent ? pct(opt / sent * 100) : '0%',
      'spend': money(ov.total_spent)
    };
    $all(PANE + ' .kpi').forEach(function (card) {
      var labEl = $('.kpi-label', card);
      var label = ((labEl && labEl.textContent) || '').trim().toLowerCase();
      var val = $('.kpi-val', card);
      if (val && rmap[label] != null) val.textContent = rmap[label];
    });
  }

  // ---- chart re-render (matches reports SVG bounds) ------------------------
  function fillDaily(daily, days) {
    var byDate = {};
    (daily || []).forEach(function (r) {
      var k = ('' + (r.date || r.day || '')).slice(0, 10);
      if (k) byDate[k] = parseInt(r.count != null ? r.count : r.sent, 10) || 0;
    });
    var out = [], now = new Date();
    for (var i = days - 1; i >= 0; i--) {
      var dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      var key = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
      out.push({ date: key, count: byDate[key] || 0 });
    }
    return out;
  }
  function niceMax(v) { if (v <= 0) return 10; var p = Math.pow(10, Math.floor(Math.log10(v))); var n = v / p; var m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10; return m * p; }
  function renderChart(series) {
    var svg = $(PANE + ' .rpt-panel[data-rtab-panel="sms"] .rpt-chart') || $(PANE + ' .rpt-chart');
    if (!svg || !series.length) return;
    var x0 = 40, x1 = 628, yTop = 24, yBot = 196;
    var max = niceMax(Math.max.apply(null, series.map(function (s) { return s.count; })) || 1);
    var n = series.length;
    var X = function (i) { return n === 1 ? x1 : x0 + (x1 - x0) * i / (n - 1); };
    var Y = function (v) { return yBot - (yBot - yTop) * Math.min(1, v / max); };
    var line = '';
    series.forEach(function (s, i) { line += (i ? ' L' : 'M') + X(i).toFixed(1) + ',' + Y(s.count).toFixed(1); });
    var area = line + ' L' + X(n - 1).toFixed(1) + ',' + yBot + ' L' + X(0).toFixed(1) + ',' + yBot + ' Z';
    var paths = svg.querySelectorAll('path');
    if (paths.length) {
      var lineEl = paths[paths.length - 1], areaEl = paths[paths.length - 2], mutedEl = paths.length >= 3 ? paths[paths.length - 3] : null;
      if (areaEl) areaEl.setAttribute('d', area);
      if (lineEl) lineEl.setAttribute('d', line);
      if (mutedEl && /C9C|c9c|#C9/.test(mutedEl.getAttribute('stroke') || '')) mutedEl.setAttribute('d', line);
    }
    var dot = svg.querySelector('circle[stroke="#FFFFFF"], circle[stroke="#fff"], circle[r="3.5"]');
    if (dot) { dot.setAttribute('cx', X(n - 1).toFixed(1)); dot.setAttribute('cy', Y(series[n - 1].count).toFixed(1)); }
  }

  function setHeadSub(days) {
    var hsub = $(PANE + ' .rpt-head-sub');
    if (!hsub) return;
    var end = new Date(), start = new Date(Date.now() - (days - 1) * 864e5);
    var f = function (d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
    hsub.textContent = 'Messaging volume, deliverability and spend · ' + f(start) + ' – ' + f(end) + ', ' + end.getFullYear();
  }

  var _busy = false;
  function refetch(days) {
    if (_busy) return; _busy = true;
    setHeadSub(days);
    toast('Loading ' + days + '-day report…');
    var pOv = (typeof api.getReportOverview === 'function') ? api.getReportOverview(days).catch(function () { return null; }) : Promise.resolve(null);
    var pDay = (typeof api.getDailyReport === 'function') ? api.getDailyReport(days).catch(function () { return null; }) : Promise.resolve(null);
    Promise.all([pOv, pDay]).then(function (r) {
      try {
        var ov = unwrap(r[0]); if (ov) renderKpis(ov);
        var d = unwrap(r[1]); var arr = Array.isArray(d) ? d : (d && d.data) || [];
        renderChart(fillDaily(arr, days));
        toast('Showing last ' + days + ' days');
      } catch (e) { toast('Could not refresh report'); }
      _busy = false;
    }, function () { toast('Could not refresh report'); _busy = false; });
  }

  // ---- delegated click handler (capture, pane-scoped) ----------------------
  document.addEventListener('click', function (e) {
    if (!live()) return;
    var t = e.target;
    if (!t || !t.closest) return;

    // Date-range segments (7d / 30d / 90d) — re-fetch the chosen window.
    // (The custom-range button is build-handled — leave it alone.)
    var rng = t.closest(PANE + ' [data-rptrange]');
    if (rng) {
      var days = parseInt(rng.getAttribute('data-rptrange'), 10) || 30;
      e.preventDefault(); e.stopPropagation();
      // keep the seg visual state in sync (capture phase beats GROUPS handler)
      var seg = rng.closest('.seg');
      if (seg) $all('[data-rptrange],[data-rptcustom]', seg).forEach(function (b) {
        var on = b === rng; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      refetch(days);
      return;
    }

    // Export CSV — reporting export lives in the classic app overlay.
    var exp = t.closest(PANE + ' .rpt-ghost-btn');
    if (exp) {
      e.preventDefault(); e.stopPropagation();
      toast('Opening report export…');
      try { window.__rsmsOpenClassic('?page=usage-reports', 'Reports'); } catch (er) {}
      return;
    }

    // Drill-down "View / open" link-buttons that have no data-tab of their own
    // (the ones WITH data-tab are handled by the build's nav layer — skip those).
    var lk = t.closest(PANE + ' .link-btn');
    if (lk && !lk.getAttribute('data-tab')) {
      e.preventDefault(); e.stopPropagation();
      var label = (lk.textContent || '').trim().toLowerCase();
      var dest = 'usage-reports', destTitle = 'Reports';
      if (/billing/.test(label)) { dest = 'billing'; destTitle = 'Billing'; }
      else if (/campaign|blast/.test(label)) { dest = 'sms-blasts'; destTitle = 'Blasts'; }
      else if (/deliverability|failed/.test(label)) { dest = 'number-health'; destTitle = 'Number Health'; }
      else if (/compliance/.test(label)) { dest = 'settings'; destTitle = 'Settings'; }
      toast('Opening ' + (lk.textContent || 'details').trim() + '…');
      try { window.__rsmsOpenClassic('?page=' + dest, destTitle); } catch (er) {}
      return;
    }
  }, true);

  // ---- Natural-language "Ask your data" box → POST /reports/ai-count ----
  function rptEsc(s){ return (s==null?'':''+s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function rptNum(n){ return Number(n||0).toLocaleString('en-US'); }
  // Render the structured deliverability/performance analysis as scannable
  // cards: status pill + headline, metric chips, plain recommendations, and
  // "do it for me" / navigation action buttons.
  function rptRenderAnalysis(a){
    a = a || {};
    var SP = { healthy:['#16a34a','#dcfce7','Healthy'], attention:['#b7791f','#fef3c7','Worth a look'], critical:['#dc2626','#fee2e2','Needs attention'], neutral:['#6b7280','#f3f4f6','Status'] };
    var sp = SP[a.status] || SP.neutral;
    var head = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:11px">'
      + '<span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:'+sp[0]+';background:'+sp[1]+';padding:3px 10px;border-radius:999px">'+sp[2]+'</span>'
      + '<span style="font-size:15px;font-weight:680;color:var(--ink,#1a1d27)">'+rptEsc(a.headline||'')+'</span></div>';
    var TONE = { ok:'#16a34a', warn:'#b7791f', bad:'#dc2626', neutral:'var(--ink-2,#374151)' };
    var chips = (a.metrics&&a.metrics.length) ? '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'
      + a.metrics.map(function(mm){ return '<div style="border:1px solid var(--hairline,#e5e7eb);border-radius:9px;padding:6px 11px;min-width:76px">'
        + '<div style="font-size:11px;color:var(--muted,#8a90a2)">'+rptEsc(mm.label)+'</div>'
        + '<div style="font-size:16px;font-weight:720;color:'+(TONE[mm.tone]||TONE.neutral)+'">'+rptEsc(mm.value)+'</div></div>'; }).join('') + '</div>' : '';
    var recs = (a.recommendations&&a.recommendations.length) ? '<ul style="margin:0 0 12px;padding-left:18px;color:var(--ink-2,#374151);font-size:13px;line-height:1.55">'
      + a.recommendations.map(function(t){ return '<li style="margin-bottom:4px">'+rptEsc(t)+'</li>'; }).join('') + '</ul>' : '';
    var btns = (a.actions&&a.actions.length) ? '<div style="display:flex;gap:8px;flex-wrap:wrap">'
      + a.actions.map(function(ac){ var primary = ac.kind==='fix';
        return '<button type="button" class="rpt-action" data-act-kind="'+rptEsc(ac.kind)+'" data-act-tab="'+rptEsc(ac.tab||'')+'" data-act-confirm="'+rptEsc(ac.confirm||'')+'" '
          + 'style="height:34px;padding:0 14px;font:inherit;font-size:12.5px;font-weight:600;border-radius:8px;cursor:pointer;border:1px solid '+(primary?'var(--accent,#2563eb)':'var(--hairline-strong,#d1d5db)')+';background:'+(primary?'var(--accent,#2563eb)':'var(--card,#fff)')+';color:'+(primary?'#fff':'var(--ink-2,#374151)')+'">'+rptEsc(ac.label)+'</button>'; }).join('') + '</div>' : '';
    return '<div>'+head+chips+recs+btns+'</div>';
  }
  // ---- Follow-up conversation on the AI analysis (POST /reports/ai-chat) ----
  // After the one-shot analysis card, the user can keep asking ("which numbers?",
  // "clean them") and it becomes a grounded chat. History is sent each turn; the
  // backend answers only from the account's real metrics.
  var _rptChat = [];
  function rptAnalysisText(a){ a = a || {}; return (a.headline || '') + ((a.recommendations && a.recommendations.length) ? ('\n' + a.recommendations.join(' ')) : ''); }
  function rptChatUI(){
    return '<div id="rpt-chat" style="margin-top:14px;border-top:1px solid var(--hairline,#eef1f6);padding-top:12px">'
      + '<div id="rpt-chat-thread" style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px"></div>'
      + '<div style="display:flex;gap:8px;align-items:center">'
      + '<input id="rpt-chat-input" placeholder="Ask a follow-up… e.g. which numbers are failing?" style="flex:1;height:34px;padding:0 12px;font:inherit;font-size:13px;border:1px solid var(--hairline-strong,#d1d5db);border-radius:8px">'
      + '<button type="button" id="rpt-chat-send" style="height:34px;padding:0 14px;font:inherit;font-size:12.5px;font-weight:600;border-radius:8px;cursor:pointer;border:1px solid var(--accent,#2563eb);background:var(--accent,#2563eb);color:#fff">Ask</button>'
      + '</div></div>';
  }
  function rptChatBubble(role, text){
    var me = role === 'user';
    return '<div style="align-self:' + (me ? 'flex-end' : 'flex-start') + ';max-width:88%;background:' + (me ? 'var(--accent-tint,#eef2ff)' : 'var(--bg-soft,#f6f7f9)') + ';color:var(--ink-2,#374151);border-radius:10px;padding:8px 11px;font-size:13px;line-height:1.5;white-space:pre-wrap">' + rptEsc(text) + '</div>';
  }
  function runRptChat(){
    var inp = document.getElementById('rpt-chat-input'), thread = document.getElementById('rpt-chat-thread'), send = document.getElementById('rpt-chat-send');
    if(!inp || !thread) return;
    var q = (inp.value || '').trim(); if(!q){ inp.focus(); return; }
    inp.value = '';
    _rptChat.push({ role:'user', content:q });
    thread.insertAdjacentHTML('beforeend', rptChatBubble('user', q));
    var loadId = 'rpt-chat-load-' + (_rptChat.length);
    thread.insertAdjacentHTML('beforeend', '<div id="' + loadId + '" style="align-self:flex-start;color:var(--muted,#8a90a2);font-size:12.5px;padding:3px 2px">Thinking…</div>');
    thread.scrollTop = thread.scrollHeight;
    if(send){ send.disabled = true; send.style.opacity = '.6'; }
    Promise.resolve(api.aiChat ? api.aiChat(_rptChat) : api.request('POST','/reports/ai-chat',{ messages:_rptChat, days:(window.__rsmsReportDays||30), from:(window.__rsmsReportFrom||null), to:(window.__rsmsReportTo||null) })).then(function(r){
      var ld = document.getElementById(loadId); if(ld) ld.remove();
      var reply = (r && r.reply) || ((r && r.success === false && (r.error || '')) || 'Couldn’t answer that — try rephrasing.');
      _rptChat.push({ role:'assistant', content:reply });
      thread.insertAdjacentHTML('beforeend', rptChatBubble('assistant', reply));
    }).catch(function(){
      var ld = document.getElementById(loadId); if(ld) ld.remove();
      thread.insertAdjacentHTML('beforeend', rptChatBubble('assistant', 'Something went wrong — try again.'));
    }).then(function(){ if(send){ send.disabled = false; send.style.opacity = '1'; } thread.scrollTop = thread.scrollHeight; });
  }
  // Shimmering "thinking" indicator (like Claude's status words). The analysis
  // runs a metrics scan + a model call — 6-25s — so a static line looks frozen.
  // Cycle plain-English status phrases with a gradient-sweep shimmer so the wait
  // reads as working. Stopped the instant a response (or error) lands.
  function rptStopThinking(){ if(window._rptThinkTimer){ clearInterval(window._rptThinkTimer); window._rptThinkTimer = null; } }
  function rptStartThinking(out){
    if(!document.getElementById('rpt-think-style')){
      var st = document.createElement('style'); st.id = 'rpt-think-style';
      st.textContent = '@keyframes rptShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}'
        + '.rpt-think-label{background:linear-gradient(90deg,var(--muted,#8a90a2) 18%,var(--ink,#1a1d27) 50%,var(--muted,#8a90a2) 82%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:rptShimmer 1.6s linear infinite;font-size:13px;font-weight:600;letter-spacing:.1px}'
        + '@keyframes rptDot{0%,80%,100%{opacity:.25}40%{opacity:1}}'
        + '.rpt-think-dot{display:inline-block;width:4px;height:4px;border-radius:50%;background:var(--muted,#8a90a2);margin-left:3px;vertical-align:middle;animation:rptDot 1.4s infinite}';
      document.head.appendChild(st);
    }
    var phrases = ['Reading your messages…','Crunching delivery rates…','Checking your numbers…','Sizing up opt-outs…','Spotting what to fix…','Writing your summary…'];
    var i = 0;
    out.innerHTML = '<span id="rpt-think-label" class="rpt-think-label">' + phrases[0] + '</span>'
      + '<span class="rpt-think-dot" style="animation-delay:0s"></span><span class="rpt-think-dot" style="animation-delay:.2s"></span><span class="rpt-think-dot" style="animation-delay:.4s"></span>';
    rptStopThinking();
    window._rptThinkTimer = setInterval(function(){
      i = (i + 1) % phrases.length;
      var el = document.getElementById('rpt-think-label');
      if(el){ el.textContent = phrases[i]; } else { rptStopThinking(); }
    }, 1900);
  }

  window.__rsmsReRunRptAsk = function(){ try { return runRptAsk(); } catch(_){} };
  function runRptAsk(){
    var inp = document.getElementById('rpt-ask-input');
    var out = document.getElementById('rpt-ask-result');
    var btn = document.getElementById('rpt-ask-go');
    if(!inp || !out) return;
    var q = (inp.value||'').trim();
    if(!q){ inp.focus(); return; }
    out.hidden = false;
    rptStartThinking(out);
    if(btn){ btn.disabled = true; btn.style.opacity = '.6'; }
    Promise.resolve(api.aiCountQuery ? api.aiCountQuery(q) : api.request('POST','/reports/ai-count',{query:q,days:(window.__rsmsReportDays||30),from:(window.__rsmsReportFrom||null),to:(window.__rsmsReportTo||null)})).then(function(r){
      rptStopThinking();
      if(btn){ btn.disabled = false; btn.style.opacity = '1'; }
      var d = r && r.data;
      if(!r || r.success===false){ out.innerHTML = '<span style="color:var(--danger,#d24b4b);font-size:13px">Couldn’t read that one — try rephrasing.</span>'; return; }
      if(r.analysis_v2){ _rptChat = [{role:'user',content:q},{role:'assistant',content:rptAnalysisText(r.analysis_v2)}]; out.innerHTML = rptRenderAnalysis(r.analysis_v2) + rptChatUI(); return; }
      if(r.analysis){
        out.innerHTML = '<div style="font-size:13px;color:var(--ink-2,#374151);line-height:1.6;white-space:pre-wrap">' + rptEsc(r.analysis) + '</div>';
        return;
      }
      if(r.not_countable){
        out.innerHTML = '<div style="font-size:13px;color:var(--ink-2,#374151);line-height:1.55">'
          + 'This box <b>counts and filters your messages</b> — it can’t analyze campaign performance or give recommendations yet.'
          + '<div style="margin-top:8px;color:var(--muted,#8a90a2);font-size:12px">Try things like: “how many did I send last month”, “failed messages this week”, “sent to area code 305”, or “delivered to [campaign]”.</div>'
          + '</div>';
        return;
      }
      if(!d){ out.innerHTML = '<span style="color:var(--danger,#d24b4b);font-size:13px">Couldn’t read that one — try rephrasing.</span>'; return; }
      var unsup = r.unsupported || [];
      out.innerHTML =
        '<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">'
        + '<span style="font-size:26px;font-weight:720;color:var(--ink,#1a1d27)">' + rptNum(d.messages) + '</span>'
        + '<span style="font-size:13px;color:var(--muted,#8a90a2)">messages · ' + rptNum(d.segments) + ' segments · $' + Number(d.spend||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) + '</span></div>'
        + (r.interpreted ? '<div style="margin-top:6px;font-size:12px;color:var(--muted,#8a90a2)">Read as: ' + rptEsc(r.interpreted) + '</div>' : '')
        + (r.note ? '<div style="margin-top:6px;font-size:12px;color:var(--amber,#b7791f)">⚠ ' + rptEsc(r.note) + '</div>' : '')
        + (unsup.length ? '<div style="margin-top:6px;font-size:12px;color:var(--amber,#b7791f)">Not filtered yet (coming soon): ' + rptEsc(unsup.join(', ')) + '</div>' : '');
    }).catch(function(){ rptStopThinking(); if(btn){ btn.disabled=false; btn.style.opacity='1'; } out.innerHTML='<span style="color:var(--danger,#d24b4b);font-size:13px">Something went wrong — try again.</span>'; });
  }
  document.addEventListener('click', function(e){
    if(!live()) return;
    if(e.target && e.target.closest && e.target.closest('#rpt-ask-go')){ e.preventDefault(); e.stopPropagation(); runRptAsk(); }
    if(e.target && e.target.closest && e.target.closest('#rpt-chat-send')){ e.preventDefault(); e.stopPropagation(); runRptChat(); }
    var act = e.target && e.target.closest && e.target.closest('.rpt-action');
    if(act){
      e.preventDefault(); e.stopPropagation();
      var kind = act.getAttribute('data-act-kind');
      if(kind==='nav'){
        var tab = act.getAttribute('data-act-tab');
        var nav = tab && document.querySelector('[data-tab="'+tab+'"]');
        if(nav){ nav.click(); } else if(window.__rsmsToast){ window.__rsmsToast('Open it from the left nav'); }
        return;
      }
      if(kind==='fix'){
        var confirmMsg = act.getAttribute('data-act-confirm');
        var runFix = function(){
          var orig = act.textContent; act.disabled = true; act.textContent = 'Working…'; act.style.opacity='.7';
          Promise.resolve(api.request('POST','/deliverability-copilot/fix',{action:'clean_invalid_contacts'})).then(function(res){
            var msg = (res && (res.message || (res.cleaned!=null ? ('Cleaned '+res.cleaned+' contacts') : 'Done'))) || 'Done';
            act.textContent = '✓ Done'; act.style.opacity='1';
            if(window.__rsmsToast) window.__rsmsToast(msg);
          }).catch(function(){ act.disabled=false; act.textContent=orig; act.style.opacity='1'; if(window.__rsmsToast) window.__rsmsToast('Couldn’t run that — try again','error'); });
        };
        if(confirmMsg) window.showConfirm('Please confirm', confirmMsg, runFix, 'Continue');
        else runFix();
        return;
      }
    }
  }, true);
  document.addEventListener('keydown', function(e){
    if(!live()) return;
    if(e.key==='Enter' && e.target && e.target.id==='rpt-ask-input'){ e.preventDefault(); e.stopPropagation(); runRptAsk(); }
    if(e.key==='Enter' && e.target && e.target.id==='rpt-chat-input'){ e.preventDefault(); e.stopPropagation(); runRptChat(); }
  }, true);
})();
} catch(e){ console.warn('[mercury-buttons] reports failed', e); }

/* ---- pane: number-health (handled 10, routed 10) ---- */
try {
(function(){ 'use strict';
  var api = (window.api || {});
  var PANE = '#pane-number-health';
  function live(){ return !!document.documentElement.getAttribute('data-rsms-live'); }
  function toast(m){ try{ if(window.__rsmsToast) window.__rsmsToast(m); }catch(_e){} }
  function go(hash){ try{ var PAGE_MAP = {numbers:'10dlc'}; window.__rsmsOpenClassic('?page=' + (PAGE_MAP[hash]||hash), 'Number Health'); }catch(_e){} }
  function txt(el){ return ((el.getAttribute && el.getAttribute('aria-label')) || (el.textContent||'')).replace(/\s+/g,' ').trim().toLowerCase(); }

  document.addEventListener('click', function(e){
    if(!live()) return;
    var pane = document.querySelector(PANE);
    if(!pane) return;
    var btn = e.target.closest(PANE + ' button, ' + PANE + ' .link-btn, ' + PANE + ' a');
    if(!btn || !pane.contains(btn)) return;

    // Leave the sub-tab switcher (SMS/Dial) and the All/Healthy/Attention .seg
    // filters to the build's generic handlers — they really toggle UI.
    if(btn.closest('[data-nhtab]') || btn.closest('.seg')) return;
    // The AI re-analyze button is a labeled preview (data-paltoast) — leave it.
    if(btn.hasAttribute && btn.hasAttribute('data-paltoast')) return;

    var k = txt(btn);
    if(!k) return;

    // ---- safe reads we can actually do live ----------------------------
    // "Refresh stats" — recompute health from the messages table, then reload.
    if(k === 'refresh stats'){
      e.preventDefault(); e.stopPropagation();
      toast('Refreshing number health…');
      api.request('POST', '/phone-numbers/resync-stats', {})
        .then(function(){ if(typeof window.loadNumberHealth === 'function') window.loadNumberHealth(); toast('Number health refreshed'); })
        .catch(function(){ if(typeof window.loadNumberHealth === 'function') window.loadNumberHealth(); toast('Number health refreshed'); });
      return;
    }
    // Export — download a CSV of every number's health (authed blob).
    if(k === 'export'){
      e.preventDefault(); e.stopPropagation();
      toast('Preparing export…');
      var xTok = '';
      try { xTok = (sessionStorage.getItem('readysms_impersonate_token') || localStorage.getItem('readysms_token') || ''); } catch(_x){}
      fetch(API_BASE + '/phone-numbers/health-export', { headers: { 'Authorization': 'Bearer ' + xTok } })
        .then(function(r){ if(!r.ok) throw new Error('export failed'); return r.blob(); })
        .then(function(blob){ var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'number-health.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href); toast('CSV downloaded'); })
        .catch(function(){ toast('Could not export — try again'); });
      return;
    }

    // ---- Buy number → open the purchase modal RIGHT HERE (no navigation) ----
    // The 4-mode Add-number modal lives in the Settings "Add number" click handler,
    // which fires on any button whose text is "Add number". So synthesize one
    // off-screen and click it — the modal opens in place, without leaving Number
    // Health (it used to bounce the user to Settings, which Anton flagged).
    if(/buy number|buy a number/.test(k)){
      e.preventDefault(); e.stopPropagation();
      if(document.querySelector('[data-rsms-modal]')) return; // already open
      var trig = document.createElement('button');
      trig.type = 'button'; trig.textContent = 'Add number';
      trig.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none';
      // The Add-number handler only fires for clicks INSIDE the Settings Phone-numbers
      // panel, so plant the trigger there (it's in the DOM even while hidden).
      var host = document.querySelector('#pane-settings [data-stab-panel="profile"]') || document.body;
      host.appendChild(trig);
      trig.click();
      setTimeout(function(){ if(trig.parentNode) trig.parentNode.removeChild(trig); }, 0);
      return;
    }
    // ---- Register → classic carrier verification (vetting handled natively below) ----
    if(/register/.test(k)){
      e.preventDefault(); e.stopPropagation(); go('numbers'); return;
    }
    // ---- Rest / Rest 24h / Resume — pause or resume a number ----
    // SMS numbers use /phone-numbers/:id/rest|unrest (pauses it as an auto-
    // selected sender; from-number.js routes to healthy siblings). Dialer (voice)
    // numbers rotate via the dialer-health endpoint. The panel tells us which.
    if(/^rest/.test(k) || k === 'resume'){
      e.preventDefault(); e.stopPropagation();
      var rRow = btn.closest('[data-phone-id]');
      var phoneId = rRow ? rRow.getAttribute('data-phone-id') : btn.getAttribute('data-phone-id');
      if(!phoneId){ toast('Could not identify number'); return; }
      var rPanel = btn.closest('[data-nhtab-panel]');
      if(rPanel && rPanel.getAttribute('data-nhtab-panel') === 'dial'){
        toast('Resting number…');
        api.request('POST', '/dialer-number-health/rotate', { phone_number_id: parseInt(phoneId, 10) })
          .then(function(res){ toast(res && res.data && res.data.message || 'Number is now resting'); if(typeof window.loadNumberHealth === 'function') window.loadNumberHealth(); })
          .catch(function(){ toast('Could not rest number — try again'); });
        return;
      }
      if(k === 'resume'){
        toast('Resuming number…');
        api.request('POST', '/phone-numbers/' + parseInt(phoneId, 10) + '/unrest', {})
          .then(function(){ toast('Number resumed — back in your sending rotation'); if(typeof window.loadNumberHealth === 'function') window.loadNumberHealth(); })
          .catch(function(){ toast('Could not resume — try again'); });
        return;
      }
      var restHours = /24/.test(k) ? 24 : null;
      toast('Resting number…');
      api.request('POST', '/phone-numbers/' + parseInt(phoneId, 10) + '/rest', restHours ? { hours: restHours } : {})
        .then(function(){ toast(restHours ? 'Rested for 24 hours — sends will use your other numbers' : 'Number is now resting — sends will use your other numbers'); if(typeof window.loadNumberHealth === 'function') window.loadNumberHealth(); })
        .catch(function(err){ toast((err && (err.message || err.error)) || 'Could not rest — you may need another active number first'); });
      return;
    }
    // ---- Remediate — caller-ID "Spam Likely" is a sticky carrier label that
    // resting/swapping can't clear; it needs a Free Caller Registry submission.
    // Opens the remediation modal (records the request + hands over the link). ----
    if(k === 'remediate' || k === 'remediating' || k === 'submitted' || (btn.getAttribute && btn.getAttribute('data-nh-action') === 'remediate')){
      e.preventDefault(); e.stopPropagation();
      var remRow = btn.closest('[data-phone-id]');
      var remId = remRow ? remRow.getAttribute('data-phone-id') : btn.getAttribute('data-phone-id');
      if(!remId){ toast('Could not identify number'); return; }
      if(window.nhRemediate){ window.nhRemediate(parseInt(remId, 10)); }
      else { window.open('https://www.freecallerregistry.com/fcr/', '_blank'); }
      return;
    }
    // ---- Swap / Swap now — rest the at-risk number so sends move to healthy
    // siblings (a true number swap = buy a fresh one from Settings → Phone
    // Numbers). Dialer numbers rotate to a replacement ANI. ----
    if(/swap/.test(k)){
      e.preventDefault(); e.stopPropagation();
      var sRow = btn.closest('[data-phone-id]');
      var swapId = sRow ? sRow.getAttribute('data-phone-id') : btn.getAttribute('data-phone-id');
      if(!swapId){ toast('Could not identify number'); return; }
      var sPanel = btn.closest('[data-nhtab-panel]');
      if(sPanel && sPanel.getAttribute('data-nhtab-panel') === 'dial'){
        toast('Swapping number…');
        api.request('POST', '/dialer-number-health/rotate', { phone_number_id: parseInt(swapId, 10) })
          .then(function(res){ toast(res && res.data && res.data.message || 'Number swapped'); if(typeof window.loadNumberHealth === 'function') window.loadNumberHealth(); })
          .catch(function(){ toast('Could not swap number — try again'); });
        return;
      }
      // SMS panel: a real swap = BUY a fresh number, charge the card, rest the
      // old one, and (once the replacement provisions) the backend emails + texts
      // the customer their new number. Open the swap modal (prefill the old
      // number's area code). Falls back to a plain rest if the modal isn't loaded.
      var phTxt = sRow ? ((sRow.querySelector('.nh-phone') || {}).textContent || '') : '';
      var acHint = (phTxt.replace(/\D/g, '').replace(/^1/, '').slice(0, 3)) || '';
      if(window.nhSwapBuy){ window.nhSwapBuy(parseInt(swapId, 10), acHint); return; }
      toast('Resting this number…');
      api.request('POST', '/phone-numbers/' + parseInt(swapId, 10) + '/rest', {})
        .then(function(){ toast('Number rested — sends now use your healthy numbers. Buy a fresh number anytime from Settings.'); if(typeof window.loadNumberHealth === 'function') window.loadNumberHealth(); })
        .catch(function(err){ toast((err && (err.message || err.error)) || 'Could not rest — you may need another active number first'); });
      return;
    }
    // ---- Optimize routing — actually turn ON smart deliverability routing for
    // this account (was a no-op toast claiming it was already automatic). The
    // backend shifts sends off a number whose delivery has collapsed onto a
    // healthy sibling, only when the degradation is provably number-specific.
    if(/rebalance|optimize routing|smart delivery/.test(k)){
      e.preventDefault(); e.stopPropagation();
      if(window.nhEnableSmartRouting){ window.nhEnableSmartRouting(); return; }
      toast('Turning on Smart delivery…');
      api.request('POST', '/phone-numbers/smart-routing', { enabled: true })
        .then(function(r){ toast(r && r.success ? 'Smart delivery on — sends will automatically move off low-delivery numbers to your healthy ones.' : 'Could not enable — try again'); })
        .catch(function(){ toast('Could not enable Smart delivery — try again'); });
      return;
    }
    // ---- Number protection (SMS auto-swap): SMS panel = real toggle (+ authorization,
    //      with cross-promo); Dial panel "Enable auto-swap" / "Dialer settings" → settings. ----
    if(/auto-?swap|dialer settings|number protection/.test(k)){
      e.preventDefault(); e.stopPropagation();
      var asPanel = btn.closest('[data-nhtab-panel]');
      var onDial = !!(asPanel && asPanel.getAttribute('data-nhtab-panel')==='dial') || /dialer settings/.test(k);
      // SMS Number protection (header or SMS panel) is a TOGGLE: on → off, off →
      // the enable/authorization flow. Only the DIAL panel routes to settings.
      if(window.nhToggleNumberProtection && /number protection|auto-?swap/.test(k) && !onDial){
        window.nhToggleNumberProtection(); return;
      }
      // Dialer settings moved into the Dialer surface's "Settings" sub-tab.
      if(window.__rsmsOpenDialerSettings){ window.__rsmsOpenDialerSettings(); }
      else { go('numbers'); }
      return;
    }
    // ---- Daily cap — set/clear this number's per-day SMS ceiling (warmup /
    // pacing). PUT /phone-numbers/:id/daily-cap; from-number.js spills to a
    // non-capped sibling, infobip-sms.js enforces the hard ceiling. ----
    if(k === 'cap'){
      e.preventDefault(); e.stopPropagation();
      var capRow = btn.closest('[data-phone-id]');
      var capId = capRow ? capRow.getAttribute('data-phone-id') : btn.getAttribute('data-phone-id');
      if(!capId){ toast('Could not identify number'); return; }
      var curCap = btn.getAttribute('data-cap') || '';
      if(curCap === '0') curCap = '';
      window.__rsmsPrompt({ title:'Daily SMS cap', body:'The most texts this number will send per day. Leave blank (or 0) for no limit — when it’s reached, sends spill to your other numbers.', type:'number', placeholder:'e.g. 500', value:curCap, okLabel:'Save cap' }).then(function(ans){
        if(ans === null) return; // cancelled
        ans = ('' + ans).trim();
        var capVal = ans === '' ? 0 : parseInt(ans, 10);
        if(ans !== '' && (!isFinite(capVal) || capVal < 0)){ toast('Enter a whole number (or blank for no limit)'); return; }
        toast('Saving daily cap…');
        api.request('PUT', '/phone-numbers/' + parseInt(capId, 10) + '/daily-cap', { cap: capVal })
          .then(function(res){
            if(res && res.success === false){ toast(res.error || 'Could not save the cap'); return; }
            toast(capVal > 0 ? ('Daily cap set: ' + capVal + ' texts/day') : 'Daily cap removed — no limit');
            if(typeof window.loadNumberHealth === 'function') window.loadNumberHealth();
          })
          .catch(function(err){ toast((err && (err.message || err.error)) || 'Could not save the cap'); });
      });
      return;
    }
    // Pagination Prev/Next reuse the .nh-act class but ARE wired (mercury-live
    // pager handlers) — must NOT be swallowed by this "not available yet" fallback.
    if(btn.closest('#nh-pager') || btn.closest('#nhdial-pager') || btn.id==='nh-pg-prev' || btn.id==='nh-pg-next' || btn.id==='nhdial-pg-prev' || btn.id==='nhdial-pg-next'){
      return; // let the real pager handler run
    }
    // The per-number row actions (Rest/Swap/Remediate/Resume + the kebab menu) ARE
    // wired in mercury-live — don't fire the bogus "not available yet" toast on them.
    if(btn.hasAttribute('data-nh-action') || btn.hasAttribute('data-nh-more') || (btn.closest && (btn.closest('[data-nh-more]') || btn.closest('[data-nhm]')))){
      return;
    }
    // Any other actionable button inside the number rows / cards → no-op toast.
    if(btn.closest('.nh-act') || btn.classList.contains('nh-act') ||
       btn.classList.contains('nh-ghost') || btn.classList.contains('nh-tip-action') ||
       btn.classList.contains('nh-cap-edit')){
      e.preventDefault(); e.stopPropagation();
      toast('This action is not available yet');
      return;
    }
  }, true);
})();
} catch(e){ console.warn('[mercury-buttons] number-health failed', e); }

/* ---- pane: campaigns (handled 4, routed 4) ---- */
try {
(function(){
  'use strict';
  var api = (window.api || {});
  function live(){ return !!document.documentElement.getAttribute('data-rsms-live'); }
  function toast(m){ try { if (typeof window.__rsmsToast === 'function') window.__rsmsToast(m); } catch (e) {} }

  // Automations LIST card kebab actions (Rename / Duplicate / Pause-Resume / Delete).
  // The build JS renders these as DOM-only / toast-only fakes, and the live cards do
  // NOT carry the automation id needed to safely call updateAutomation/deleteAutomation
  // against a specific record. Per the routing-over-wrong-call rule, every list-menu
  // action is sent to the classic Automations screen where it operates on the real
  // automation. Delete is also destructive, so routing is doubly correct.
  //
  // The kebab menu is appended to <body> by the build, with class .auto-menu — that
  // class is used ONLY by the campaigns-pane automations list (the whiteboard uses
  // .wb-menu), so matching `.auto-menu [data-aact]` is effectively scoped to this pane.
  // Kebab actions (rename/pause/delete/duplicate) are now handled NATIVELY by the
  // automations inline handler in dashboard-mercury-app.html (autoAction → real
  // PUT/DELETE /automations calls). The old capture-phase redirect to classic was
  // removed as part of the classic-removal effort — it stopPropagation()'d and
  // hijacked every kebab click to the classic dashboard.
})();
} catch(e){ console.warn('[mercury-buttons] campaigns failed', e); }

/* ---- pane: settings ---- */
/* Most settings buttons are now wired natively by mercury-live.js (team invite/edit/resend,
   notifications auto-save, integrations GHL/webhooks/API keys/custom fields, compliance
   auto-save, dialer webhooks/dispositions/priority). Only a few actions still need the
   classic app (exports, device sessions, number provisioning). */
try {
(function () {
  'use strict';
  var api = (window.api || {});
  var PANE = '#pane-settings';

  function live() { try { return !!document.documentElement.getAttribute('data-rsms-live'); } catch (e) { return false; } }
  function toast(m) { try { if (typeof window.__rsmsToast === 'function') window.__rsmsToast(m); } catch (e) {} }
  function txt(el) { return ((el && el.textContent) || '').trim().toLowerCase(); }

  document.addEventListener('click', function (e) {
    if (!live()) return;
    var t = e.target;
    if (!t || !t.closest) return;
    var pane = t.closest(PANE);
    if (!pane) return;

    // ---- NOTIFICATIONS: "Mark all read" (real endpoint) ----------------------
    var notifPanel = t.closest(PANE + ' [data-stab-panel="notifications"]');
    if (notifPanel) {
      var mark = t.closest('button');
      if (mark && txt(mark) === 'mark all read') {
        e.preventDefault(); e.stopPropagation();
        try {
          // Mark user_notifications read (settings feed)
          var p = api.request('POST', '/notifications/read-all');
          if (p && p.then) p.then(function () { toast('All marked read'); }).catch(function () { toast('Could not mark all read'); });
          // Also mark old SMS notifications read (inbox badge)
          if (typeof api.markAllNotificationsRead === 'function') try { api.markAllNotificationsRead(); } catch (_) {}
        } catch (err) { toast('Could not mark all read'); }
        return;
      }
      // Notification preference toggles are auto-saved by mercury-live.js — let them through.
    }

    // ---- PROFILE: only intercept actions that have no native handler ---------
    var profPanel = t.closest(PANE + ' [data-stab-panel="profile"]');
    if (profPanel) {
      var pf = t.closest('button');
      if (pf) {
        var lp = txt(pf);
        if (lp === 'sign out other devices') {
          e.preventDefault(); e.stopPropagation();
          pf.disabled = true;
          var p2 = api.request && api.request('POST', '/auth/sign-out-devices');
          if (p2 && p2.then) p2.then(function () { toast('Signed out other devices'); }).catch(function () { toast('Could not sign out other devices'); }).finally(function () { pf.disabled = false; });
          else { toast('Signed out other devices'); pf.disabled = false; }
          return;
        }
        if (lp === 'add number') {
          e.preventDefault(); e.stopPropagation();
          // ---- Add Number modal: dialer-style mode cards + chips, optimized for SMS ----
          (function () {
            var ov = document.createElement('div'); ov.setAttribute('data-rsms-modal', '1');
            ov.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(17,24,39,.45);display:flex;align-items:center;justify-content:center;padding:20px';
            var AREA = window.RSMS_AREA_CODES || [];
            var METROS = ['212','213','312','305','404','415','214','206','617','602','303','512','702','619','646','816','215','480','972','404'];
            METROS = METROS.filter(function (v, i) { return METROS.indexOf(v) === i; });
            var mode = 'audience', chips = [], codeQty = {}, qty = 3, shown = [], hl = -1;
            var smartMeta = {}, smartBest = null, smartContacts = null, smartBiz = null, smartReady = false;
            function modeCard(k, icon, title, sub, rec) {
              return '<label class="bm-mode' + (rec ? ' sel' : '') + '" data-mode="' + k + '">'
                + '<input type="radio" name="bm-mode" value="' + k + '"' + (rec ? ' checked' : '') + ' style="position:absolute;opacity:0;width:0;height:0;pointer-events:none">'
                + '<span class="bm-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="19" height="19">' + icon + '</svg></span>'
                + '<span class="bm-mode-body"><span class="bm-mode-t">' + title + (rec ? '<span class="bm-rec">Recommended</span>' : '') + '</span><span class="bm-mode-s">' + sub + '</span></span>'
                + '<span class="bm-tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M20 6 9 17l-5-5"/></svg></span>'
                + '</label>';
            }
            ov.innerHTML =
              '<div style="background:var(--card,#fff);border-radius:16px;width:100%;max-width:460px;max-height:92vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.28)">'
              + '<div style="padding:18px 22px 3px;font-size:16px;font-weight:680;color:var(--ink,#111)">Add a phone number</div>'
              + '<div style="padding:2px 22px 14px;font-size:12.5px;color:var(--muted,#6b7280)">Choose how to pick your numbers &mdash; $5/mo each.</div>'
              + '<div style="padding:0 22px;display:flex;flex-direction:column;gap:9px">'
              + modeCard('audience', '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', 'Match my audience', 'Local numbers where most of your contacts are — best for replies.', true)
              + modeCard('best', '<path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/>', 'Best delivery', 'Buy more in the area codes where your texts already land best.', false)
              + modeCard('spread', '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18"/>', 'Local spread', 'A natural spread across major US metros for broad local presence.', false)
              + modeCard('specific', '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".6" fill="currentColor" stroke="none"/>', 'Choose specific', 'Search by code, city or state and add the exact area codes you want.', false)
              + '</div>'
              + '<div id="bm-pane" style="padding:15px 22px 2px"></div>'
              + '<div id="bm-msg" style="padding:0 22px;font-size:12.5px;min-height:15px;color:var(--muted)"></div>'
              + '<div style="padding:14px 22px 18px;display:flex;align-items:center;gap:10px">'
              + '<button id="bm-cancel" type="button" style="padding:9px 15px;border:1px solid var(--hairline-strong,#d8dee9);background:var(--card,#fff);border-radius:9px;font:inherit;font-size:13px;cursor:pointer">Close</button>'
              + '<span style="flex:1"></span>'
              + '<button id="bm-go" type="button" style="padding:10px 20px;border:0;background:var(--accent,#2563EB);color:#fff;border-radius:9px;font:inherit;font-size:13px;font-weight:700;cursor:pointer">Add number</button>'
              + '</div></div>';
            document.body.appendChild(ov);
            var pane = ov.querySelector('#bm-pane'), msgEl = ov.querySelector('#bm-msg'), goBtn = ov.querySelector('#bm-go');
            ov.querySelector('#bm-cancel').onclick = function () { ov.remove(); };
            ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
            function setMsg(t, bad) { msgEl.textContent = t || ''; msgEl.style.color = bad ? '#dc2626' : (bad === false ? '#16a34a' : 'var(--muted)'); }
            function refreshList() { var panel = document.querySelector('#pane-settings [data-stab-panel="profile"]'); if (panel) { panel.__pnLoaded = 0; try { window.__rsmsSettingsPhoneNumbers && window.__rsmsSettingsPhoneNumbers(); } catch (_) {} } }
            function placeOf(code) { var a = AREA.filter(function (x) { return x.code === code; })[0]; return a ? (a.city + ', ' + a.state) : ''; }
            async function provision(ac) {
              var ck = await api.request('POST', '/phone-numbers/checkout', { area_code: ac });
              if (ck && ck.error_code === 'area_code_unavailable') {
                var oos = new Error(ck.error || ('Area code ' + ac + ' isn’t available right now.'));
                oos.code = 'area_code_unavailable'; oos.alternatives = ck.alternatives || []; throw oos;
              }
              var d = (ck && ck.data) || ck || {};
              var piId = d.payment_intent_id || (d.client_secret && d.client_secret.split('_secret_')[0]) || null;
              if (d.free) piId = 'free';
              if (!piId && d.client_secret) throw new Error('Card required — add a card in Billing first.');
              var buy = await api.request('POST', '/phone-numbers/buy', { area_code: ac, payment_intent_id: piId === 'free' ? undefined : piId });
              if (buy && buy.success === false) throw new Error(buy.error || 'Could not provision number');
              return ((buy && buy.data) || buy || {}).phone_number || '';
            }
            function poolFor() {
              if (mode === 'audience') return (smartContacts && smartContacts.length) ? smartContacts : (smartBiz ? [smartBiz] : []).concat(METROS);
              if (mode === 'best') return (smartBest && smartBest.length) ? smartBest : (smartBiz ? [smartBiz] : []).concat(METROS);
              return METROS;
            }
            async function loadSmart() {
              if (smartReady) return;
              try {
                // Fast signals (delivery health + business area) first. Contact geography
                // is a heavy (server-cached) aggregation, so we DON'T block on it — it
                // folds into the audience mode when it lands.
                var rr = await Promise.all([
                  api.request('GET', '/phone-numbers/area-code-health').catch(function () { return null; }),
                  api.request('GET', '/phone-numbers/suggested').catch(function () { return null; })
                ]);
                var hr = rr[0], sg = rr[1];
                var healthRows = (hr && hr.data && hr.data.area_codes) || [];
                healthRows.forEach(function (a) { var m = smartMeta[a.area_code] || (smartMeta[a.area_code] = {}); m.rate = a.delivery_rate; m.numbers = a.numbers; m.best = true; });
                smartBest = healthRows.map(function (a) { return a.area_code; });
                smartBiz = (sg && sg.data && sg.data.area_code) || null;
                if (smartBiz) { (smartMeta[smartBiz] || (smartMeta[smartBiz] = {})).biz = true; }
                METROS.forEach(function (c) { (smartMeta[c] || (smartMeta[c] = {})).metro = true; });
                smartReady = true;
                if (mode === 'best') updatePrev();
                api.request('GET', '/phone-numbers/contact-area-codes').then(function (ca) {
                  var rows = (ca && ca.data && ca.data.area_codes) || [];
                  rows.forEach(function (a) { (smartMeta[a.area_code] || (smartMeta[a.area_code] = {})).contacts = a.contacts; });
                  smartContacts = rows.map(function (a) { return a.area_code; });
                  if (mode === 'audience') updatePrev();
                }).catch(function () { smartContacts = []; if (mode === 'audience') updatePrev(); });
              } catch (_) { smartBest = []; smartContacts = []; smartReady = true; }
            }
            function tagFor(c) {
              var m = smartMeta[c] || {};
              if (mode === 'best') {
                if (m.rate != null) return m.rate + '% delivered' + (m.numbers ? ' &middot; ' + m.numbers + ' yours' : '');
                if (m.contacts) return m.contacts.toLocaleString() + ' contacts here';
                return m.numbers ? m.numbers + ' yours' : 'available';
              }
              // audience: contacts lead, append delivery when the code also has history.
              if (m.contacts) return m.contacts.toLocaleString() + ' contacts here' + (m.rate != null ? ' &middot; ' + m.rate + '% delivered' : '');
              if (m.best) { var t = (m.rate != null ? m.rate + '% delivered' : 'in use'); return m.numbers ? t + ' &middot; ' + m.numbers + ' yours' : t; }
              if (m.biz) return 'your business area';
              return 'popular metro';
            }
            function updatePrev() {
              var prev = pane.querySelector('#bm-prev'); if (!prev) return;
              if (mode === 'spread') {
                var mc = METROS.slice(0, Math.min(qty, 6));
                var lbl = mc.map(function (c) { var city = placeOf(c).split(',')[0]; return c + (city ? ' (' + city + ')' : ''); }).join(' &middot; ');
                prev.innerHTML = '<b style="color:var(--ink,#111)">Metros:</b> ' + lbl + (qty > mc.length ? ' …' : '');
                return;
              }
              if (mode === 'audience' && smartContacts === null) { prev.innerHTML = '<span style="color:var(--muted,#6F7287)">Finding where your contacts are…</span>'; return; }
              if (mode === 'best' && !smartReady) { prev.innerHTML = '<span style="color:var(--muted,#6F7287)">Checking your delivery…</span>'; return; }
              var codes = poolFor().slice(0, Math.min(qty, 6));
              var head;
              if (mode === 'audience') head = (smartContacts && smartContacts.length) ? 'Local numbers for where your contacts are:' : 'No contacts to match yet — starting with your area + major metros:';
              else head = (smartBest && smartBest.length) ? 'Your best-delivering area codes:' : 'No sending history yet — starting with your area + major metros:';
              var rows = codes.map(function (c) {
                return '<div style="display:flex;align-items:center;gap:9px;padding:6px 0;border-top:1px solid var(--hairline,#EAEBEF)">'
                  + '<span style="font-weight:700;font-variant-numeric:tabular-nums;color:var(--ink,#1A1A2E);font-size:12.5px;min-width:30px">' + c + '</span>'
                  + '<span style="flex:1;min-width:0;color:var(--muted,#6F7287);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (placeOf(c) || '') + '</span>'
                  + '<span style="color:var(--faint,#9A9DAF);font-size:11.5px;white-space:nowrap">' + tagFor(c) + '</span>'
                  + '<button type="button" data-buy1="' + c + '" title="Buy one number in ' + c + '" style="flex:0 0 auto;padding:3px 9px;border:1px solid var(--hairline-strong,#E2E4E9);background:var(--card,#fff);color:var(--accent,#2563EB);border-radius:7px;font:inherit;font-size:11px;font-weight:650;cursor:pointer">Buy</button></div>';
              }).join('');
              var more = qty > codes.length ? '<div style="padding-top:6px;color:var(--faint,#9A9DAF);font-size:11.5px">+ ' + (qty - codes.length) + ' more, spread across these codes</div>' : '';
              prev.innerHTML = '<div style="font-size:11.5px;color:var(--muted,#6F7287);margin-bottom:1px">' + head + '</div>' + rows + more;
            }
            function renderQty() {
              var loadingText = mode === 'audience' ? 'Finding where your contacts are…' : (mode === 'best' ? 'Checking your delivery…' : 'A spread across major metros.');
              pane.innerHTML = '<div style="font-size:12.5px;font-weight:600;color:var(--ink,#111);margin-bottom:8px">How many numbers?</div>'
                + '<div class="bm-step"><button type="button" data-q="-1" aria-label="Fewer">&minus;</button><input id="bm-qty" type="number" min="1" max="50" value="' + qty + '" inputmode="numeric" aria-label="How many numbers"><button type="button" data-q="1" aria-label="More">+</button></div>'
                + '<div id="bm-prev" style="font-size:12px;color:var(--muted);margin-top:11px;line-height:1.5;min-height:17px">' + loadingText + '</div>';
              var qi = pane.querySelector('#bm-qty');
              qi.addEventListener('input', function () { qty = Math.max(1, Math.min(50, parseInt(qi.value, 10) || 1)); updatePrev(); syncGo(); });
              if (mode === 'spread') updatePrev(); else loadSmart().then(updatePrev);
              syncGo();
            }
            function listFor(q) {
              var L = pane.querySelector('#bm-list'); if (!L) return;
              var f = (q || '').trim().toLowerCase();
              shown = !f ? AREA.slice(0, 60) : AREA.filter(function (a) { return a.code.indexOf(f) === 0 || a.city.toLowerCase().indexOf(f) >= 0 || a.state.toLowerCase() === f || (a.label || '').toLowerCase().indexOf(f) >= 0; }).slice(0, 60);
              hl = -1;
              L.innerHTML = shown.length ? shown.map(function (a, i) { var on = chips.indexOf(a.code) >= 0; return '<div class="bm-combo-opt" data-i="' + i + '" style="align-items:center"><span class="c">' + a.code + '</span><span class="l" style="flex:1">' + a.city + ', ' + a.state + (on ? ' &#10003;' : '') + '</span><button type="button" data-optbuy="' + a.code + '" title="Buy one number in ' + a.code + '" style="flex:0 0 auto;padding:2px 9px;border:1px solid var(--hairline-strong,#E2E4E9);background:var(--card,#fff);color:var(--accent,#2563EB);border-radius:6px;font:inherit;font-size:10.5px;font-weight:650;cursor:pointer">Buy 1</button></div>'; }).join('') : '<div class="bm-combo-empty">No matching area codes</div>';
              L.classList.add('open');
            }
            function hlPaint() { var L = pane.querySelector('#bm-list'); if (!L) return; Array.prototype.forEach.call(L.querySelectorAll('.bm-combo-opt'), function (o, i) { o.classList.toggle('hl', i === hl); if (i === hl) o.scrollIntoView({ block: 'nearest' }); }); }
            function addChip(code) { if (chips.indexOf(code) < 0) { chips.push(code); codeQty[code] = 1; } var si = pane.querySelector('#bm-search'); if (si) { si.value = ''; si.focus(); } renderChips(); listFor(''); }
            function renderChips() {
              var el = pane.querySelector('#bm-chips'); if (!el) return;
              el.innerHTML = chips.map(function (c) {
                var city = placeOf(c).split(',')[0];
                return '<span class="bm-chip">' + c + (city ? '<span style="font-weight:500;font-size:11px;opacity:.85">' + city + '</span>' : '')
                  + '<span class="bm-chip-q"><button type="button" data-cq="-1" data-c="' + c + '">&minus;</button><input type="number" min="1" max="50" value="' + (codeQty[c] || 1) + '" data-cqi="' + c + '"><button type="button" data-cq="1" data-c="' + c + '">+</button></span>'
                  + '<button type="button" class="rm" data-rm="' + c + '" aria-label="Remove">&times;</button></span>';
              }).join('');
              syncGo();
            }
            function renderSpecific() {
              pane.innerHTML = '<div style="font-size:12.5px;font-weight:600;color:var(--ink,#111);margin-bottom:6px">Add area codes</div>'
                + '<div class="bm-combo"><input id="bm-search" type="text" autocomplete="off" role="combobox" aria-autocomplete="list" placeholder="Search by code, city, or state…" style="width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid var(--hairline-strong,#d8dee9);border-radius:9px;font:inherit;font-size:14px"><div id="bm-list" class="bm-combo-list"></div></div>'
                + '<div style="font-size:11.5px;color:var(--muted,#6F7287);margin-top:7px">Tap a result to queue it up, or <b style="color:var(--ink,#1A1A2E);font-weight:600">Buy 1</b> to grab one number there instantly.</div>'
                + '<div id="bm-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:9px"></div>';
              var si = pane.querySelector('#bm-search');
              si.addEventListener('focus', function () { listFor(si.value); });
              si.addEventListener('input', function () { if (/^\d+$/.test(si.value) && si.value.length > 3) si.value = si.value.slice(0, 3); listFor(si.value); });
              si.addEventListener('keydown', function (e) {
                var L = pane.querySelector('#bm-list'); if (!L.classList.contains('open')) return;
                if (e.key === 'ArrowDown') { e.preventDefault(); hl = Math.min(shown.length - 1, hl + 1); hlPaint(); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); hl = Math.max(0, hl - 1); hlPaint(); }
                else if (e.key === 'Enter') { if (hl >= 0 && shown[hl]) { e.preventDefault(); addChip(shown[hl].code); } }
                else if (e.key === 'Escape') { L.classList.remove('open'); }
              });
              renderChips();
              setTimeout(function () { si.focus(); }, 30);
              syncGo();
            }
            function specificTotal() { return chips.reduce(function (s, c) { return s + (codeQty[c] || 1); }, 0); }
            function totalCount() { return mode === 'specific' ? specificTotal() : qty; }
            function syncGo() { var n = totalCount(); goBtn.textContent = 'Add ' + n + ' number' + (n === 1 ? '' : 's'); goBtn.disabled = (mode === 'specific' && n === 0); goBtn.style.opacity = goBtn.disabled ? '.5' : '1'; }
            function switchMode(k) {
              mode = k;
              Array.prototype.forEach.call(ov.querySelectorAll('.bm-mode'), function (c) { var on = c.getAttribute('data-mode') === k; c.classList.toggle('sel', on); var r = c.querySelector('input'); if (r) r.checked = on; });
              setMsg('');
              if (k === 'specific') renderSpecific(); else renderQty();
            }
            ov.addEventListener('click', function (e) {
              var card = e.target.closest('.bm-mode'); if (card) { switchMode(card.getAttribute('data-mode')); return; }
              var qb = e.target.closest('button[data-q]'); if (qb) { qty = Math.max(1, Math.min(50, qty + parseInt(qb.getAttribute('data-q'), 10))); var qi = pane.querySelector('#bm-qty'); if (qi) qi.value = qty; updatePrev(); syncGo(); return; }
              var cq = e.target.closest('button[data-cq]'); if (cq) { var cc = cq.getAttribute('data-c'); codeQty[cc] = Math.max(1, Math.min(50, (codeQty[cc] || 1) + parseInt(cq.getAttribute('data-cq'), 10))); renderChips(); return; }
              var rm = e.target.closest('button[data-rm]'); if (rm) { var rc = rm.getAttribute('data-rm'); chips = chips.filter(function (x) { return x !== rc; }); delete codeQty[rc]; renderChips(); return; }
              var b1 = e.target.closest('button[data-buy1]'); if (b1) { buyOne(b1.getAttribute('data-buy1'), b1); return; }
            });
            async function buyOne(code, btn) {
              if (!/^\d{3}$/.test(code)) return;
              var city = placeOf(code).split(',')[0];
              if (!(await window.confirmDialog('Add one number in ' + code + (city ? ' (' + city + ')' : '') + '? $5/mo.', { title: 'Add number', confirmText: 'Add number' }))) return;
              if (btn) { btn.disabled = true; btn.textContent = '…'; btn.style.opacity = '.6'; }
              setMsg('Provisioning (' + code + ')…');
              try { var num = await provision(code); toast('Number added' + (num ? ' — ' + num : '')); refreshList(); setTimeout(function () { ov.remove(); }, 700); }
              catch (e) {
                if (btn) { btn.disabled = false; btn.textContent = 'Buy'; btn.style.opacity = '1'; }
                if (e && e.code === 'area_code_unavailable') {
                  // Out of stock — show the message + closest serviceable area codes as
                  // one-tap chips (each re-runs the buy for that code, no re-typing).
                  var alts = (e.alternatives || []).map(function (a) { return a.area_code; });
                  msgEl.innerHTML = '';
                  var t = document.createElement('span');
                  t.textContent = '(' + code + ') isn’t available right now.' + (alts.length ? ' Try a nearby one: ' : ' Try a different area code.');
                  msgEl.appendChild(t); msgEl.style.color = '#dc2626';
                  alts.forEach(function (ac2) {
                    var b2 = document.createElement('button'); b2.type = 'button'; b2.textContent = ac2;
                    b2.style.cssText = 'margin:0 3px;padding:2px 9px;border:1px solid var(--accent,#2563EB);background:#fff;color:var(--accent,#2563EB);border-radius:99px;font:inherit;font-size:12px;font-weight:600;cursor:pointer';
                    b2.onmousedown = function (ev) { ev.preventDefault(); buyOne(ac2); };
                    msgEl.appendChild(b2);
                  });
                  return;
                }
                setMsg((e && e.message) || 'Could not add number', true);
              }
            }
            ov.addEventListener('input', function (e) { var ci = e.target.closest('input[data-cqi]'); if (ci) { codeQty[ci.getAttribute('data-cqi')] = Math.max(1, Math.min(50, parseInt(ci.value, 10) || 1)); syncGo(); } });
            ov.addEventListener('mousedown', function (e) {
              var ob = e.target.closest('button[data-optbuy]');
              if (ob) { e.preventDefault(); buyOne(ob.getAttribute('data-optbuy'), ob); return; }
              var opt = e.target.closest('.bm-combo-opt');
              if (opt) { e.preventDefault(); var a = shown[parseInt(opt.getAttribute('data-i'), 10)]; if (a) addChip(a.code); return; }
              if (!e.target.closest('.bm-combo')) { var L = pane.querySelector('#bm-list'); if (L) L.classList.remove('open'); }
            });
            function codesToBuy() {
              if (mode === 'specific') { var out = []; chips.forEach(function (c) { var q = codeQty[c] || 1; for (var i = 0; i < q; i++) out.push(c); }); return out; }
              var pool = poolFor(), o = []; for (var i = 0; i < qty; i++) o.push(pool[i % pool.length]); return o;
            }
            goBtn.onclick = async function () {
              if (mode === 'optimize') await loadSmart();
              var list = codesToBuy();
              if (!list.length) { setMsg('Add at least one area code.', true); return; }
              if (!(await window.confirmDialog('Add ' + list.length + ' number' + (list.length === 1 ? '' : 's') + '? $5/mo each.', { title: 'Add numbers', confirmText: 'Add numbers' }))) return;
              goBtn.disabled = true; goBtn.style.opacity = '.6';
              var done = 0, fail = 0;
              for (var i = 0; i < list.length; i++) { setMsg('Provisioning ' + (i + 1) + ' of ' + list.length + ' (' + list[i] + ')…'); try { await provision(list[i]); done++; } catch (e) { fail++; if (/card required/i.test(e.message || '')) { setMsg(e.message, true); break; } } }
              setMsg(done + ' number' + (done === 1 ? '' : 's') + ' added' + (fail ? ', ' + fail + ' failed' : '') + '.', fail ? true : false);
              if (window.__rsmsToast) window.__rsmsToast(done + ' number' + (done === 1 ? '' : 's') + ' added');
              refreshList();
              if (done && !fail) setTimeout(function () { ov.remove(); }, 1300); else { goBtn.disabled = false; goBtn.style.opacity = '1'; }
            };
            switchMode('audience');
          })();
          return;
        }
        // "Manage" on phone number rows → toast directing to Numbers page
        if (lp === 'manage' && pf.closest('.set-num')) {
          e.preventDefault(); e.stopPropagation();
          toast('Use the Numbers page in the sidebar to manage numbers');
          return;
        }
        // "Save changes", "Cancel", "Change photo" are wired by mercury-live.js — let them through.
      }
    }

    // ---- COMPLIANCE: export, schedule, save/cancel ----
    var compPanel = t.closest(PANE + ' [data-stab-panel="compliance"]');
    if (compPanel) {
      var cb = t.closest('button');
      if (cb) {
        var lc = txt(cb);
        if (lc === 'export csv' || lc === 'export json') {
          e.preventDefault(); e.stopPropagation();
          var fmt = lc === 'export json' ? 'json' : 'csv';
          cb.disabled = true;
          toast('Exporting ' + fmt.toUpperCase() + '\u2026');
          var authTok = '';
          try { authTok = (sessionStorage.getItem('readysms_impersonate_token') || localStorage.getItem('readysms_token') || ''); } catch (_) {}
          fetch(API_BASE + '/settings/compliance', {
            headers: { 'Authorization': 'Bearer ' + authTok }
          }).then(function (r) {
            if (!r.ok) throw new Error('status ' + r.status);
            return r.json();
          }).then(function (json) {
            var d = json.data || {};
            var content, mime;
            if (fmt === 'json') {
              content = JSON.stringify(d, null, 2);
              mime = 'application/json';
            } else {
              var keys = Object.keys(d).filter(function (k) { return k !== 'defaults'; });
              var vals = keys.map(function (k) {
                var v = d[k];
                if (Array.isArray(v)) return '"' + v.join(', ') + '"';
                if (v === null || v === undefined) return '';
                if (typeof v === 'string' && v.indexOf(',') !== -1) return '"' + v + '"';
                return String(v);
              });
              content = keys.join(',') + '\n' + vals.join(',');
              mime = 'text/csv';
            }
            var blob = new Blob([content], { type: mime });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'readysms-compliance.' + fmt;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            toast(fmt.toUpperCase() + ' downloaded');
          }).catch(function () {
            toast('Could not download ' + fmt.toUpperCase() + ' export');
          }).finally(function () { cb.disabled = false; });
          return;
        }
        // "Edit schedule" is now wired natively in mercury-live.js
        // (settingsCompliance → inline business-hours editor → PUT
        // /settings/auto-reply). Do NOT intercept it here — let the click
        // bubble to that handler.
        if (lc === 'save changes') {
          e.preventDefault(); e.stopPropagation();
          // Trigger the gatherAndSave exposed by settingsCompliance in mercury-live.js
          if (window.__rsmsSaveCompliance) { window.__rsmsSaveCompliance(); }
          else { toast('Settings auto-saved'); }
          return;
        }
        if (lc === 'cancel') {
          e.preventDefault(); e.stopPropagation();
          // Reload compliance defaults by resetting the loaded flag and re-running
          compPanel.__compLoaded = 0;
          if (window.__rsmsReloadCompliance) { window.__rsmsReloadCompliance(); }
          else { toast('Changes discarded'); }
          return;
        }
      }
    }

    // ---- SUB-ACCOUNTS: wired by mercury-live.js — no fallback needed. --------
    // ---- TEAM: invite/edit/resend wired natively by mercury-live.js. ---------
    // ---- INTEGRATIONS: GHL, webhooks, API keys, custom fields all native. ----
    // Connected Apps grid buttons (HubSpot, Sheets, Slack, Zapier, etc.)
    var intPanel = t.closest(PANE + ' [data-stab-panel="integrations"]');
    if (intPanel) {
      var appBtn = t.closest('.set-app-btn');
      if (appBtn) {
        e.preventDefault(); e.stopPropagation();
        var appCard = appBtn.closest('.set-app');
        var appNameEl = appCard && appCard.querySelector('.set-app-name');
        var appName = appNameEl ? appNameEl.textContent.trim() : '';
        // Zapier: open their app directory page
        if (/zapier/i.test(appName)) {
          window.open('https://zapier.com/apps/readysms', '_blank');
          return;
        }
        var action = appBtn.classList.contains('connect') ? 'Connect' : 'Manage';
        toast(action + ' ' + (appName || 'this app') + ' from the Integrations page');
        return;
      }
      // "Browse all apps" button
      var browseBtn = t.closest('button');
      if (browseBtn && txt(browseBtn) === 'browse all apps') {
        e.preventDefault(); e.stopPropagation();
        toast('App marketplace coming soon');
        return;
      }
    }
    // ---- AFFILIATES: Payout history button -----------------------------------
    var affPanel = t.closest(PANE + ' [data-stab-panel="affiliates"]');
    if (affPanel) {
      var ab = t.closest('button');
      if (ab && txt(ab) === 'payout history') {
        e.preventDefault(); e.stopPropagation();
        toast('Payout history coming soon');
        return;
      }
    }
    // ---- DIALER: webhooks, dispositions, priority all native. ----------------
  }, true);
})();
} catch(e){ console.warn('[mercury-buttons] settings failed', e); }

/* ---- pane: 10dlc (handled 3, routed 5) ---- */
try {
(function () {
  'use strict';
  var api = (window.api || {});
  var PANE = '#pane-10dlc';

  function live() { return !!document.documentElement.getAttribute('data-rsms-live'); }
  function toast(m) { try { if (window.__rsmsToast) window.__rsmsToast(m); } catch (e) {} }
  function go(section) { try { var PAGE_MAP = {numbers:'10dlc'}; window.__rsmsOpenClassic('?page=' + (PAGE_MAP[section]||section), '10DLC Registration'); } catch (e) {} }

  // 10DLC registration, brand vetting (Stripe $79), number purchase/management
  // are all classic flows. In Mercury LIVE mode every actionable button here that
  // isn't already routed (data-obw) or a pure UI toggle (the accordion) should
  // route the user to the classic registration/numbers screen — never call a
  // billing/destructive endpoint from this preview pane.
  // Native brand-vetting modal — picks a brand, shows Standard ($79) / Enhanced
  // ($179), and calls POST /10dlc/:id/vet/checkout (charges the card on file,
  // idempotent + auto-refunds on failure). Replaces the old bounce-to-classic.
  function vetEsc(s){ return (s==null?'':''+s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function openVetModal(preBrandId){
    Promise.resolve(api.request('GET','/10dlc/status')).then(function(r){
      var regs = (r && (r.data!=null ? r.data : r)) || [];
      if(!Array.isArray(regs)) regs = (regs && regs.data) || [];
      var brands = regs.filter(function(b){ return (b && (b.type==='brand'||!b.type)); });
      // Opened from a specific brand card → scope to just that brand.
      if(preBrandId != null) brands = brands.filter(function(b){ return String(b.id) === String(preBrandId); });
      if(!brands.length){ toast('Register a business first, then you can vet it.'); return; }
      // Per-brand vetting state from the real fields: linked = has a carrier
      // (Infobip) brand id (required to vet); tier = current vetting from extra_fields.
      function stateOf(b){
        var linked = !!(b.carrier_brand_id);
        var ef = {}; try { ef = JSON.parse(b.extra_fields || '{}'); } catch(_){ }
        var vt = ('' + (ef.vet_type || '')).toUpperCase();
        var active = !!(ef.vet_submitted_at && !ef.vet_failed_at);
        return { linked: linked, tier: active ? (vt === 'ENHANCED' ? 'enhanced' : 'standard') : 'none' };
      }
      var enriched = brands.map(function(b){ return { id: b.id, name: (b.company_name || b.dba || ('Brand ' + b.id)), st: stateOf(b) }; });
      // Vettable = linked to the carrier AND not already at the top tier.
      var vettable = enriched.filter(function(x){ return x.st.linked && x.st.tier !== 'enhanced'; });

      var ov = document.createElement('div'); ov.setAttribute('data-rsms-modal','1');
      ov.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(17,24,39,.45);display:flex;align-items:center;justify-content:center;padding:20px';
      function close(){ try{ document.body.removeChild(ov); }catch(_){} }

      // Nothing to vet — explain why instead of charging into a "not linked" error.
      if(!vettable.length){
        var allEnh = enriched.every(function(x){ return x.st.tier === 'enhanced'; });
        var anyUnlinked = enriched.some(function(x){ return !x.st.linked; });
        var msg = allEnh
          ? 'Every one of your brands is already <b>Enhanced-vetted</b> — the highest tier. There’s nothing more to vet.'
          : anyUnlinked
            ? 'This brand isn’t linked to the carrier yet, so it can’t be vetted. That link is usually created automatically within a day of approval — if it’s been longer, reach out to support and we’ll fix it.'
            : 'Your brands are already vetted — nothing to do here right now.';
        ov.innerHTML = '<div style="background:var(--card,#fff);border-radius:14px;width:100%;max-width:440px;box-shadow:0 20px 60px rgba(0,0,0,.25)">'
          + '<div style="padding:18px 22px;border-bottom:1px solid var(--hairline,#e5e7eb);font-size:16px;font-weight:700;color:var(--ink,#1a1d27)">Vet a brand</div>'
          + '<div style="padding:18px 22px;font-size:13px;line-height:1.6;color:var(--ink-2,#374151)">' + msg + '</div>'
          + '<div style="padding:14px 22px;border-top:1px solid var(--hairline);display:flex;justify-content:flex-end"><button type="button" id="vet-ok" style="height:38px;padding:0 18px;font:inherit;font-size:13px;font-weight:600;color:#fff;background:var(--accent,#2563eb);border:0;border-radius:8px;cursor:pointer">Got it</button></div></div>';
        document.body.appendChild(ov);
        ov.addEventListener('click', function(ev){ if(ev.target===ov) close(); });
        ov.querySelector('#vet-ok').addEventListener('click', close);
        return;
      }

      // Always a dropdown so the brand is clearly switchable (never a locked
      // label). List EVERY brand — vettable ones selectable, the rest shown but
      // disabled with the reason — so a multi-brand account can pick which to
      // vet and a single-brand account still sees a real selector.
      var firstVet = vettable[0];
      function brandSub(x){
        return !x.st.linked ? 'Not linked to carrier yet'
          : x.st.tier === 'enhanced' ? 'Already Enhanced — top tier'
          : x.st.tier === 'standard' ? 'Standard vetted — upgrade to Enhanced'
          : 'Not vetted yet';
      }
      function brandDis(x){ return !(x.st.linked && x.st.tier !== 'enhanced'); }
      var brandPick = '<style>'
        + '.vetbd{position:relative;margin-bottom:14px}'
        + '.vetbd-trigger{width:100%;display:flex;align-items:center;gap:10px;text-align:left;font:inherit;padding:9px 12px;border:1px solid var(--hairline-strong,#d1d5db);border-radius:9px;background:var(--card,#fff);cursor:pointer}'
        + '.vetbd-trigger:hover{border-color:var(--accent,#2563eb)}'
        + '.vetbd-cur{flex:1;min-width:0}'
        + '.vetbd-cur-name{display:block;font-size:13.5px;font-weight:600;color:var(--ink,#111);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
        + '.vetbd-cur-sub{display:block;font-size:11.5px;color:var(--muted,#6b7280);margin-top:1px}'
        + '.vetbd-trigger svg{width:16px;height:16px;stroke:var(--muted);flex:none;transition:transform .15s}'
        + '.vetbd-trigger[aria-expanded="true"] svg{transform:rotate(180deg)}'
        + '.vetbd-menu{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:30;background:var(--card,#fff);border:1px solid var(--hairline,#e5e7eb);border-radius:10px;box-shadow:0 14px 36px rgba(17,24,39,.18);padding:5px;max-height:240px;overflow:auto}'
        + '.vetbd-opt{display:flex;align-items:flex-start;gap:8px;padding:9px;border-radius:7px;cursor:pointer}'
        + '.vetbd-opt:hover{background:var(--bg-soft,#f1f3f9)}'
        + '.vetbd-opt[data-dis="1"]{cursor:not-allowed;opacity:.5}'
        + '.vetbd-opt[data-dis="1"]:hover{background:none}'
        + '.vetbd-check{width:14px;flex:none;color:var(--accent,#2563eb);font-weight:800;font-size:13px;line-height:1.45;visibility:hidden}'
        + '.vetbd-opt.is-sel .vetbd-check{visibility:visible}'
        + '.vetbd-opt-name{display:block;font-size:13.5px;font-weight:600;color:var(--ink,#111)}'
        + '.vetbd-opt-sub{display:block;font-size:11.5px;color:var(--muted,#6b7280);margin-top:1px}'
        + '</style>'
        + '<label style="display:block;font-size:12px;font-weight:600;color:var(--ink-2);margin-bottom:4px">Brand</label>'
        + '<div class="vetbd" id="vetbd">'
        +   '<button type="button" class="vetbd-trigger" id="vetbd-trigger" aria-haspopup="listbox" aria-expanded="false">'
        +     '<span class="vetbd-cur"><span class="vetbd-cur-name" id="vetbd-cur-name">'+vetEsc(firstVet.name)+'</span><span class="vetbd-cur-sub" id="vetbd-cur-sub">'+vetEsc(brandSub(firstVet))+'</span></span>'
        +     '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
        +   '</button>'
        +   '<input type="hidden" id="vet-brand" value="'+vetEsc(firstVet.id)+'">'
        +   '<div class="vetbd-menu" id="vetbd-menu" role="listbox" hidden>'
        +     enriched.map(function(x){ var dis=brandDis(x); var sel=String(x.id)===String(firstVet.id);
              return '<div class="vetbd-opt'+(sel?' is-sel':'')+'" role="option" data-bid="'+vetEsc(x.id)+'" data-dis="'+(dis?'1':'0')+'"><span class="vetbd-check">✓</span><span><span class="vetbd-opt-name">'+vetEsc(x.name)+'</span><span class="vetbd-opt-sub">'+vetEsc(brandSub(x))+'</span></span></div>';
            }).join('')
        +   '</div>'
        + '</div>';

      ov.innerHTML = '<div style="background:var(--card,#fff);border-radius:14px;width:100%;max-width:480px;box-shadow:0 20px 60px rgba(0,0,0,.25)">'
        + '<div style="padding:18px 22px;border-bottom:1px solid var(--hairline,#e5e7eb);font-size:16px;font-weight:700;color:var(--ink,#1a1d27)">Vet a brand</div>'
        + '<div style="padding:18px 22px">'
        + '<p style="margin:0 0 12px;font-size:13px;line-height:1.55;color:var(--ink-2,#374151)">Raise the daily sending limit for this brand. Carriers &mdash; <b>especially T-Mobile</b> &mdash; cap how many texts a brand can send per day, based on a one-time trust check. The deeper the vetting, the higher the cap: <b>up to ~600k/day</b>. <span style="color:var(--muted)">(Only affects the T-Mobile limit; other carriers are not capped by it.)</span></p>'
        + '<div style="display:flex;gap:8px;align-items:flex-start;background:var(--accent-tint,#eff4ff);border-radius:9px;padding:9px 12px;margin-bottom:14px;font-size:12.5px;color:var(--ink-2,#374151);line-height:1.5">⏱ <div>Most vettings come back in <b>a business day or two</b>, and your cap updates automatically once it’s approved — we’ll email you.</div></div>'
        + brandPick
        + '<div id="vet-curcap" style="font-size:12.5px;color:var(--ink-2,#374151);margin:2px 0 12px"></div>'
        + '<label style="display:block;font-size:12px;font-weight:600;color:var(--ink-2);margin-bottom:6px">Choose a vetting level</label>'
        + '<div id="vet-tiers"></div>'
        + '</div>'
        + '<div style="padding:14px 22px;border-top:1px solid var(--hairline);display:flex;justify-content:flex-end;gap:10px">'
        + '<button type="button" id="vet-cancel" style="height:38px;padding:0 16px;font:inherit;font-size:13px;font-weight:600;color:var(--ink-2);background:var(--card);border:1px solid var(--hairline-strong);border-radius:8px;cursor:pointer">Cancel</button>'
        + '<button type="button" id="vet-go" style="height:38px;padding:0 18px;font:inherit;font-size:13px;font-weight:600;color:#fff;background:var(--accent,#2563eb);border:0;border-radius:8px;cursor:pointer">Vet</button>'
        + '</div></div>';
      document.body.appendChild(ov);

      function selSt(){ var id = ov.querySelector('#vet-brand').value; var x = vettable.filter(function(v){ return String(v.id)===String(id); })[0]; return x ? x.st : { tier:'none' }; }
      function tier(){ var c = ov.querySelector('input[name="vet-tier"]:checked'); return c ? c.value : 'STANDARD'; }
      function chargeFor(st, t){ if(st.tier === 'standard') return 100; return t === 'ENHANCED' ? 179 : 79; }
      function opt(val, checked, title, desc){
        return '<label style="display:flex;gap:10px;align-items:flex-start;border:1px solid var(--hairline-strong);border-radius:9px;padding:11px 13px;margin-bottom:8px;cursor:pointer"><input type="radio" name="vet-tier" value="'+val+'"'+(checked?' checked':'')+' style="margin-top:3px"><div><div style="font-size:13px;font-weight:600;color:var(--ink)">'+title+'</div><div style="font-size:12px;color:var(--muted);line-height:1.45;margin-top:1px">'+desc+'</div></div></label>';
      }
      function tiersHtml(st){
        if(st.tier === 'standard'){
          return opt('ENHANCED', true, 'Upgrade to Enhanced — $100', 'You’ve already paid for Standard, so you only pay the difference to jump to the highest trust tier — the biggest cap (up to ~600k/day &mdash; T-Mobile sets it from your final trust score, not guaranteed).');
        }
        return opt('STANDARD', true, 'Standard — $79', 'A solid trust-score bump. Good for most senders — lifts your T-Mobile cap well above the un-vetted 2k–10k/day range.')
          + opt('ENHANCED', false, 'Enhanced — $179', 'The deepest vetting and highest trust tier. Best if you send at high volume and want the biggest possible cap (up to ~600k/day &mdash; T-Mobile sets it from your final trust score, not guaranteed).');
      }
      function updateBtn(){ var g = ov.querySelector('#vet-go'); g.disabled=false; g.style.opacity='1'; g.textContent = 'Vet for $' + chargeFor(selSt(), tier()); }
      function curCapText(st){
        if(!st.linked) return 'This brand is not linked to a carrier yet.';
        if(st.tier==='enhanced') return 'Current T-Mobile limit: <b>up to ~600k/day</b> &mdash; already the top (Enhanced) tier.';
        if(st.tier==='standard') return 'Current T-Mobile limit: <b>~40k/day</b> (Standard vetted).';
        return 'Current T-Mobile limit: <b>~2k&ndash;10k/day</b> &mdash; this brand is not vetted yet.';
      }
      function fillTiers(){
        var _cc = ov.querySelector('#vet-curcap'); if(_cc) _cc.innerHTML = curCapText(selSt());
        ov.querySelector('#vet-tiers').innerHTML = tiersHtml(selSt());
        Array.prototype.forEach.call(ov.querySelectorAll('input[name="vet-tier"]'), function(rb){ rb.addEventListener('change', updateBtn); });
        updateBtn();
      }
      fillTiers();
      // Custom brand dropdown: trigger toggles the popover; picking an enabled
      // brand updates the hidden #vet-brand, re-renders the tier options, closes.
      (function(){
        var trig = ov.querySelector('#vetbd-trigger'), menu = ov.querySelector('#vetbd-menu'), hid = ov.querySelector('#vet-brand');
        if(!trig || !menu) return;
        function openMenu(o){ menu.hidden = !o; trig.setAttribute('aria-expanded', o ? 'true' : 'false'); }
        trig.addEventListener('click', function(e){ e.stopPropagation(); openMenu(menu.hidden); });
        menu.addEventListener('click', function(e){
          var opt = e.target.closest('.vetbd-opt'); if(!opt || opt.getAttribute('data-dis') === '1') return;
          var id = opt.getAttribute('data-bid'); hid.value = id;
          Array.prototype.forEach.call(menu.querySelectorAll('.vetbd-opt'), function(o){ o.classList.toggle('is-sel', o === opt); });
          var x = enriched.filter(function(v){ return String(v.id) === String(id); })[0];
          if(x){ ov.querySelector('#vetbd-cur-name').textContent = x.name; ov.querySelector('#vetbd-cur-sub').textContent = brandSub(x); }
          openMenu(false); fillTiers();
        });
        ov.addEventListener('click', function(e){ if(!e.target.closest('#vetbd')) openMenu(false); });
      })();
      ov.addEventListener('click', function(ev){ if(ev.target===ov) close(); });
      ov.querySelector('#vet-cancel').addEventListener('click', close);
      ov.querySelector('#vet-go').addEventListener('click', function(){
        var brandId = ov.querySelector('#vet-brand').value; var t = tier();
        var g = ov.querySelector('#vet-go'); g.disabled=true; g.style.opacity='.7'; g.textContent='Submitting…';
        Promise.resolve(api.request('POST','/10dlc/'+encodeURIComponent(brandId)+'/vet/checkout',{vetting_type:t})).then(function(res){
          res = res || {};
          if(res.charged || res.free){ toast('Vetting submitted — your trust score and sending limit update in a few days.'); close(); return; }
          if(res.client_secret && !res.charged){ updateBtn(); toast('Add a payment method in Settings → Billing, then vet again.'); return; }
          updateBtn(); toast(res.message || res.error || 'Couldn’t start vetting — please try again.');
        }).catch(function(){ updateBtn(); toast('Couldn’t start vetting — please try again.'); });
      });
    }).catch(function(){ toast('Couldn’t load your brands — please try again.'); });
  }
  document.addEventListener('click', function (e) {
    if (!live()) return;
    var t = e.target;
    if (!t || typeof t.closest !== 'function') return;

    // Already-handled buttons: leave them alone.
    //  - [data-obw]  -> mercury-live routes these to /classic
    //  - [data-dlctoggle] -> build JS handles the brand accordion
    if (t.closest(PANE + ' [data-obw]')) return;
    if (t.closest(PANE + ' [data-dlctoggle]')) return;

    // Per-brand "Boost limits" / "Upgrade vetting" on a brand card → modal scoped
    // to that brand. stopPropagation so it doesn't toggle the card accordion.
    var perVet = t.closest(PANE + ' [data-vet-brand]');
    if (perVet) {
      e.preventDefault(); e.stopPropagation();
      openVetModal(perVet.getAttribute('data-vet-brand'));
      return;
    }

    // "Vet a brand" — one-time Stripe brand-vetting flow (native modal).
    var vet = t.closest(PANE + ' .dlc-vet .dlc-btn');
    if (vet) {
      e.preventDefault(); e.stopPropagation();
      openVetModal();
      return;
    }

    // Per-use-case / per-brand "View" detail buttons.
    // Per-number "Manage" buttons. "Register another number" buy flow.
    // All live in the classic registration/numbers screen.
    var act = t.closest(PANE + ' .link-btn, ' + PANE + ' .dlc-btn');
    if (act) {
      // Skip anything already claimed above (defensive — closest order).
      if (act.closest('[data-obw]') || act.closest('[data-dlctoggle]')) return;
      // In live mode the real handler (mercury-live) opens the number-activation
      // modal for "Buy a number"; don't ALSO fire this demo toast/redirect (which
      // wrongly said "Opening number registration…" and ran go('numbers')).
      if (live() && act.id === 'dlcAddNumberBtn') return;
      var lbl = (act.textContent || '').trim().toLowerCase();
      e.preventDefault(); e.stopPropagation();
      if (/manage/.test(lbl)) toast('Opening number settings…');
      else if (/register|number/.test(lbl)) toast('Opening number registration…');
      else toast('Opening details…');
      go('numbers');
      return;
    }
  }, true);

  // Auto-unlock toggle (auto-vet preference) — flipping it arms a $79 charge path,
  // so don't silently toggle a billing preference from the preview. Route to classic.
  document.addEventListener('change', function (e) {
    if (!live()) return;
    var t = e.target;
    if (!t || typeof t.closest !== 'function') return;
    var tog = t.closest(PANE + ' .dlc-vet-toggle input[type="checkbox"]');
    if (!tog) return;
    e.preventDefault(); e.stopPropagation();
    try { tog.checked = !tog.checked; } catch (err) {}
    toast('Manage auto-unlock in registration…');
    go('10dlc');
  }, true);
})();
} catch(e){ console.warn('[mercury-buttons] 10dlc failed', e); }


/* ============================================================================
   PURGE LAYER — removes hardcoded sample/mock data in LIVE mode across panes.
   (10dlc handled by mercury-live loadTenDlc, not here.) Each block try/caught.
   ========================================================================== */

/* purge: inbox */
try {
/* ===== Mercury inbox pane — purge hardcoded sample data (live mode) ===== */
(function () {
  'use strict';
  var api = (window.api || {});
  function live() { try { return !!document.documentElement.getAttribute('data-rsms-live'); } catch (e) { return false; } }
  var PANE = '#pane-inbox';

  function $(sel, root) { try { return (root || document).querySelector(sel); } catch (e) { return null; } }
  function esc(s) { return ('' + (s == null ? '' : s)).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function unwrap(r) { if (r && typeof r === 'object' && 'data' in r) return r.data; return r; }

  function fmtPhone(p) {
    var d = ('' + (p || '')).replace(/[^0-9]/g, '');
    if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
    if (d.length === 10) return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
    return '' + (p || '');
  }
  function fmtTime(ts) {
    if (!ts) return '';
    var t = (typeof ts === 'number') ? ts : Date.parse(ts);
    if (!t || isNaN(t)) return '';
    var d = new Date(t), now = new Date();
    var sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    try {
      var tm = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      if (sameDay) return 'Today ' + tm;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + tm;
    } catch (e) { return ''; }
  }
  function cap(s) { s = '' + (s || ''); return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

  // ---- 1. page subhead ("248 threads · 1 unread") — fabricated, no clean count source here.
  function clearPagesub() {
    var sub = $(PANE + ' .conv-pagesub');
    // Only blank it while it still carries the demo copy; loadInbox owns the list itself.
    if (sub && /\d/.test(sub.textContent || '') && /thread|unread/i.test(sub.textContent || '')) {
      sub.textContent = 'Conversations';
    }
  }

  // ---- 2. composer character counter ("124 / 160 · 1 segment") — demo value.
  // loadInbox repurposes this node to "N conversations" once a list loads; on an
  // empty account it early-returns and never touches it, so wipe the fabricated text.
  function clearComposerCounter() {
    var ctr = $(PANE + ' .conv-counter');
    if (ctr && /\/\s*160|segment/i.test(ctr.textContent || '')) ctr.textContent = '';
  }

  // ---- 3. fabricated AI-suggest + summary + composer default text in the thread.
  function clearThreadDemos() {
    // Composer ships a hardcoded "Perfect, you're confirmed for Saturday…" draft.
    var ta = $(PANE + ' .conv-composer-box textarea');
    if (ta && /Saturday|412 Maple|confirmed/i.test(ta.value || '')) ta.value = '';
    // The AI-suggest card is a static fabricated reply (Dana / 412 Maple St) with no
    // live wiring — keep it permanently hidden (was only hidden when no thread was
    // open, so it reappeared on every conversation). Its trigger button was removed.
    var ai = document.getElementById('conv-aisuggest');
    if (ai) ai.hidden = true;
    var aiTones = document.getElementById('conv-ai-tones');
    if (aiTones) aiTones.hidden = true;
    var sum = document.getElementById('conv-summary');
    // Only purge the summary when NO conversation is open. The desktop check was
    // ".conv-row.conv-active", but on the mobile single-column inbox the active row is
    // in the hidden list — so a poll's purge() killed the summary the instant you opened
    // it (Anton #111). Also honor the mobile conv-has-active state + deep-link convId.
    var _ip = document.getElementById('pane-inbox');
    var _convOpen = $(PANE + ' .conv-row.conv-active') || (_ip && _ip.classList.contains('conv-has-active')) || window.__rsmsInboxConvId;
    if (sum && !_convOpen) sum.hidden = true;
  }

  // ---- 4. Message-log sub-view (#conv-view-log) — full table of fabricated rows.
  var mlogLoaded = false, mlogLoading = false;
  function mlogTbody() { return document.getElementById('mlog-tbody'); }
  function mlogVisible() {
    var v = document.getElementById('conv-view-log');
    return v && !v.hidden;
  }
  function setMlogMsg(html) {
    var tb = mlogTbody(); if (!tb) return;
    tb.innerHTML = '<tr><td colspan="7"><div class="mlog-empty" style="padding:34px 16px;text-align:center;color:var(--muted);font-size:13px">' + html + '</div></td></tr>';
  }
  function mlogRow(m) {
    var dir = ('' + (m.direction || '')).toLowerCase();
    var out = /out/.test(dir);
    var counterparty = out ? (m.to_number || m.to || '') : (m.from_number || m.from || '');
    var phone = fmtPhone(counterparty);
    var body = m.body || m.message || '';
    var status = ('' + (m.status || '')).toLowerCase();
    var stClass = (status === 'delivered' || status === 'sent' || status === 'received') ? 'ok'
      : (status === 'failed' || status === 'undelivered') ? 'fail' : '';
    var stLabel = m.status ? cap(m.status) : (out ? 'Sent' : 'Received');
    var rawTs = m.sent_at || m.created_at || m.delivered_at || '';
    var when = fmtTime(rawTs);
    var tsEpoch = rawTs ? new Date(rawTs).getTime() : 0;
    var dirSvg = out
      ? '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>';
    // Detail row (hidden until the .mrow is clicked). Each .mrow MUST be followed by
    // its .mlog-detail-row sibling — the expand toggle (app.html) shows/hides it and
    // makeFB's sort keeps the pair glued. Without it, clicking a row rotated the caret
    // but nothing expanded (the live renderer used to emit only the .mrow — Anton
    // 2026-06-28; the rich dynamic version lived in the orphaned, never-loaded mlog.js).
    var _CARR = { verizon: 'Verizon', att: 'AT&T', tmobile: 'T-Mobile', sprint: 'Sprint', uscellular: 'U.S. Cellular', other: 'Other', international: 'International', unknown: 'Unknown' };
    var carrier = m.carrier ? (_CARR[('' + m.carrier).toLowerCase()] || cap('' + m.carrier)) : '';
    var fromTo = (m.from_number || m.to_number) ? (esc(fmtPhone(m.from_number) || m.from_number || '—') + ' &rarr; ' + esc(fmtPhone(m.to_number) || m.to_number || '—')) : '';
    var seg = (m.segments != null ? Number(m.segments) : 1);
    var costRaw = (m.cost_usd != null) ? m.cost_usd : (m.cost != null ? m.cost : null);
    var hasCost = (costRaw != null && !isNaN(Number(costRaw)));
    var usd = function (n) { n = Number(n); return '$' + n.toFixed(n > 0 && n < 0.01 ? 4 : 2); };
    var carrierFee = seg * 0.0045, readyFee = hasCost ? Math.max(0, Number(costRaw) - carrierFee) : 0;
    var campaign = m.campaign_name ? esc(m.campaign_name) : (m.drip_name ? esc(m.drip_name) + ' (drip)' : '');
    var cell = function (label, val, cls) { if (val == null || val === '') return ''; return '<div class="mld-cell"><span>' + label + '</span><b' + (cls ? ' class="' + cls + '"' : '') + '>' + val + '</b></div>'; };
    var detail = '<tr class="mlog-detail-row" hidden><td colspan="7">'
      + '<div style="padding:13px 18px 15px">'
      + '<div class="mld-bubble">' + (esc(body) || '<span style="color:var(--faint)">(no message body)</span>') + '</div>'
      + '<div class="mld-grid" style="margin-top:12px">'
      + cell('Status', esc(stLabel), stClass)
      + cell('Sent', m.sent_at ? esc(fmtTime(m.sent_at)) : '')
      + cell('Delivered', m.delivered_at ? esc(fmtTime(m.delivered_at)) : '')
      + cell('Direction', out ? 'Outbound' : 'Inbound')
      + cell('From &rarr; To', fromTo)
      + cell('Carrier', esc(carrier))
      + (m.segments != null ? cell('Segments', esc('' + m.segments)) : '')
      + cell('Campaign', campaign)
      + (hasCost ? cell('ReadySMS fee', usd(readyFee)) : '')
      + (hasCost ? cell('Carrier fee', usd(carrierFee)) : '')
      + '</div>'
      + (counterparty ? '<div class="mld-actions"><button type="button" class="mlog-open-conv" data-phone="' + esc(counterparty) + '" data-name="' + esc(phone || counterparty) + '" style="display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 14px;font:inherit;font-size:12.5px;font-weight:600;border:1px solid var(--accent,#2563EB);background:var(--accent,#2563EB);color:#fff;border-radius:8px;cursor:pointer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>View conversation</button></div>' : '')
      + '</div></td></tr>';
    return '<tr class="mrow" style="cursor:pointer" data-mbody="' + esc(body) + '" data-status="' + esc(status) + '" data-dir="' + esc(dir) + '" data-ts="' + tsEpoch + '" title="Click to expand">'
      + '<td class="mlog-time">' + esc(when) + '</td>'
      + '<td><div class="mlog-who"><b>' + esc(phone || '—') + '</b></div></td>'
      + '<td class="mlog-camp"><span style="color:var(--faint)">&mdash;</span></td>'
      + '<td><span class="mlog-dir ' + (out ? 'out' : 'in') + '">' + dirSvg + (out ? 'Outbound' : 'Inbound') + '</span></td>'
      + '<td class="mlog-body">' + esc(body) + '</td>'
      + '<td><span class="mlog-st ' + stClass + '"><i></i>' + esc(stLabel) + '</span></td>'
      + '<td class="mlog-caret-cell"><span class="mlog-caret"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></span></td>'
      + '</tr>'
      + detail;
  }
  // The message-log filter (makeFB) runs apply() at page-load on the DEMO rows,
  // then loadMessageLog REPLACES the tbody with real rows and never re-applies —
  // so "Direction is Inbound" set before/around load was ignored (Kevin 2026-06-15).
  // Re-apply the persisted filter to the freshly-rendered rows. We can only honor
  // fields the real rows actually carry data for (direction, status) + the search
  // box; unsupported demo-only fields (campaign/carrier/sender/tags) are skipped
  // rather than hiding everything.
  function applyMlogFilter() {
    var tb = mlogTbody(); if (!tb) return;
    var st; try { st = JSON.parse(localStorage.getItem('rsms_mlog_filter') || 'null'); } catch (e) { return; }
    if (!st) return;
    var SUPPORTED = { dir: 'data-dir', status: 'data-status' };
    var match = st.match || 'and';
    var q = ('' + (st.q || '')).trim().toLowerCase();
    var active = (st.conds || []).filter(function (c) {
      return c && c.field && c.op && SUPPORTED[c.field] && c.value != null && c.value !== '' && (!Array.isArray(c.value) || c.value.length);
    });
    Array.prototype.forEach.call(tb.querySelectorAll('tr.mrow'), function (r) {
      var ok = true;
      if (active.length) {
        var results = active.map(function (c) {
          var rv = (r.getAttribute(SUPPORTED[c.field]) || '').toLowerCase();
          var vals = (Array.isArray(c.value) ? c.value : [c.value]).map(function (v) { return ('' + v).toLowerCase(); });
          var inSet = vals.indexOf(rv) >= 0;
          switch (c.op) {
            case 'is': return rv === vals[0];
            case 'is not': return rv !== vals[0];
            case 'is any of': return inSet;
            case 'is none of': return !inSet;
            default: return true;
          }
        });
        ok = match === 'or' ? results.some(Boolean) : results.every(Boolean);
      }
      if (ok && q) ok = ('' + (r.textContent || '')).toLowerCase().indexOf(q) >= 0;
      r.style.display = ok ? '' : 'none';
    });
  }
  // After any message-log filter interaction, re-apply ours AFTER the demo
  // makeFB handler (which over-hides every row when an unsupported demo field
  // like Campaign is set, since real rows carry no data-campaign). setTimeout
  // runs us last so the log shows correct dir/status results instead of blank.
  if (!window.__mlogFilterHooked) {
    window.__mlogFilterHooked = 1;
    ['change', 'click', 'input'].forEach(function (ev) {
      document.addEventListener(ev, function (e) {
        if (e.target && e.target.closest && e.target.closest('#mlog-builder, #mlog-chips, #mlog-fbtn')) setTimeout(applyMlogFilter, 0);
      });
    });
  }
  // "View conversation" inside an expanded log row → jump to that contact's inbox
  // thread. (The expand toggle ignores clicks inside the detail row, so stopProp
  // here just prevents any other delegated handler from also firing.)
  if (!window.__mlogOpenConvWired) {
    window.__mlogOpenConvWired = 1;
    document.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest && e.target.closest('.mlog-open-conv'); if (!btn) return;
      e.preventDefault(); e.stopPropagation();
      var phone = btn.getAttribute('data-phone'); if (!phone) return;
      var nm = btn.getAttribute('data-name') || '';
      if (window.__rsmsShowTab) { try { window.__rsmsShowTab('inbox'); } catch (_) {} }
      var digits = ('' + phone).replace(/\D/g, '').slice(-10);
      api.request('GET', '/conversations?search=' + encodeURIComponent(phone) + '&limit=10').then(function (r) {
        var list = (r && (r.conversations || r.data || r)) || []; if (!Array.isArray(list)) list = [];
        var c = list.find(function (x) { return ('' + (x.phone || x.phone_number || '')).replace(/\D/g, '').slice(-10) === digits; }) || list[0];
        if (c && c.id && window.__rsmsOpenConversation) { try { window.__rsmsOpenConversation(c.id, nm || null, phone); } catch (_) {} }
        else if (window.__rsmsToast) window.__rsmsToast('No conversation found for ' + phone);
      }).catch(function () { if (window.__rsmsToast) window.__rsmsToast('Could not open conversation'); });
    });
  }
  function loadMessageLog(force) {
    var tb = mlogTbody(); if (!tb) return;
    if (mlogLoading) return;
    if (mlogLoaded && !force) return;
    if (typeof api.getMessageLogs !== 'function') {
      setMlogMsg('No messages yet.');
      mlogLoaded = true;
      return;
    }
    mlogLoading = true;
    setMlogMsg('Loading messages…');
    // hide demo filter chips
    var chips = document.getElementById('mlog-chips'); if (chips) { chips.hidden = true; chips.innerHTML = ''; }
    Promise.resolve(api.getMessageLogs({ limit: 100, offset: 0 })).then(function (res) {
      var list = unwrap(res);
      if (!Array.isArray(list)) list = (list && (list.data || list.messages || list.logs)) || [];
      if (!list.length) { setMlogMsg('No messages yet.'); mlogLoaded = true; return; }
      tb.innerHTML = list.map(mlogRow).join('');
      // Re-assign data-oi so the makeFB sort system can reorder real rows
      var oi = 0;
      Array.prototype.forEach.call(tb.querySelectorAll('tr.mrow'), function (r) { r.setAttribute('data-oi', oi++); });
      // Re-trigger the active sort (if user picked one before data loaded)
      var sortSel = document.getElementById('mlog-sort');
      if (sortSel && sortSel.value) { sortSel.dispatchEvent(new Event('change', { bubbles: true })); }
      applyMlogFilter(); // honor any active Direction/Status filter on the real rows
      mlogLoaded = true;
    }).catch(function () {
      setMlogMsg('No messages yet.');
      mlogLoaded = true;
    }).finally(function () { mlogLoading = false; });
  }
  function purgeMessageLogSample() {
    // Always strip the bundled sample rows immediately (before async load resolves)
    // so a real user never flashes "Dana Whitfield (704) 555-0148".
    var tb = mlogTbody(); if (!tb) return;
    if (!mlogLoaded && !mlogLoading && tb.querySelector('.mrow, .mlog-detail-row')) {
      setMlogMsg('Loading messages…');
    }
  }

  // ---- master purge — idempotent, never throws.
  function purge(force) {
    if (!live()) return;
    if (!document.getElementById('pane-inbox')) return;
    try { clearPagesub(); } catch (e) {}
    try { clearComposerCounter(); } catch (e) {}
    try { clearThreadDemos(); } catch (e) {}
    try {
      // Prefer the paginated loader in mercury-live.js (20/page + real total). This
      // old loadMessageLog fetched limit:100 and rendered ~100 rows, stomping the
      // paginated table; only fall back to it if the live loader isn't present.
      if (mlogVisible()) {
        // The paginated live loader (mercury-live.js) owns the Logs table. Only (re)load
        // on a deliberate reveal/refresh (force) — reloading on EVERY incidental pane
        // click was wiping an expanded log row straight back to "Loading messages…".
        if (window.__rsmsLoadMsgLog) { if (force) window.__rsmsLoadMsgLog(); }
        else { purgeMessageLogSample(); loadMessageLog(force); }
      }
      else { purgeMessageLogSample(); }
    } catch (e) {}
  }

  // run when the inbox pane becomes active
  function paneActive() {
    var p = document.getElementById('pane-inbox');
    return p && !p.hidden;
  }
  function maybePurge(force) { if (paneActive()) purge(force); }

  // initial + delayed (loaders may paint slightly after pane reveal)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { maybePurge(); });
  } else { maybePurge(); }
  setTimeout(function () { maybePurge(); }, 400);
  setTimeout(function () { maybePurge(); }, 1500);

  // sub-tab / view-toggle clicks (Inbox | Message log, filter tabs) — capture phase,
  // scoped to the pane. Re-purge after the click settles.
  document.addEventListener('click', function (e) {
    if (!live()) return;
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest(PANE + ' [data-convview]')) {
      // run after the base toggle flips visibility
      setTimeout(function () { purge(true); }, 0);
      setTimeout(function () { purge(false); }, 250);
      return;
    }
    // any other interaction inside the pane (filter tabs, rows) — keep the
    // fabricated thread/composer demos cleared.
    if (t.closest(PANE)) { setTimeout(function () { purge(false); }, 0); }
  }, true);

  // tab switches into Inbox from the main nav
  document.addEventListener('click', function (e) {
    var nav = e.target && e.target.closest && e.target.closest('[data-tab="inbox"]');
    if (nav) { setTimeout(function () { maybePurge(true); }, 60); setTimeout(function () { maybePurge(false); }, 600); }
  }, true);
})();
} catch(e){ console.warn('[mercury-purge] inbox', e); }

/* purge: contacts */
try {
(function(){ 'use strict';
  var api = (window.api || {});
  function live(){ try { return !!document.documentElement.getAttribute('data-rsms-live'); } catch(e){ return false; } }
  function pane(){ return document.getElementById('pane-contacts'); }
  function $1(root, sel){ try { return (root || document).querySelector(sel); } catch(e){ return null; } }
  function $A(root, sel){ try { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); } catch(e){ return []; } }
  function esc(s){ return (s == null ? '' : '' + s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function num(n){ try { return Number(n || 0).toLocaleString('en-US'); } catch(e){ return '' + (n || 0); } }
  function unwrap(res){ if (!res) return null; if (res.success === false) return null; if (res.data !== undefined) return res.data; return res; }
  function arr(d, keys){
    if (Array.isArray(d)) return d;
    if (!d || typeof d !== 'object') return [];
    for (var i=0;i<keys.length;i++){ if (Array.isArray(d[keys[i]])) return d[keys[i]]; }
    return [];
  }
  // Native in-app nav for empty-state links (replaces classic data-openclassic).
  // Global + idempotent so every builder closure can use it; the delegated handler
  // routes [data-rsmsnav] clicks to the native tab via __rsmsShowTab.
  if (!window.__rsmsNavTab) {
    var _RSMS_NAV = { contacts:'contacts', audiences:'contacts', segments:'contacts', appointments:'contacts', lists:'contacts', forms:'contacts', widgets:'contacts', crm:'contacts', templates:'blasts', 'sms-blasts':'blasts', blasts:'blasts', campaigns:'campaigns', automations:'campaigns', dialer:'dialer', numbers:'number-health', 'number-health':'number-health', '10dlc':'10dlc', settings:'settings', inbox:'inbox', conversations:'inbox', reports:'reports' };
    window.__rsmsNavTab = function(section){ return _RSMS_NAV[section] || section; };
    document.addEventListener('click', function(e){
      var n = e.target && e.target.closest ? e.target.closest('[data-rsmsnav]') : null;
      if (!n) return; e.preventDefault();
      try { if (window.__rsmsShowTab) window.__rsmsShowTab(n.getAttribute('data-rsmsnav')); } catch(_){}
    });
  }
  function emptyCard(msg, section){
    var link = section ? ' <a href="#" data-rsmsnav="' + esc(window.__rsmsNavTab(section)) + '" style="color:var(--accent);font-weight:600" onclick="event.preventDefault()">Manage &rarr;</a>' : '';
    return '<div class="card" style="padding:34px 18px;text-align:center;color:var(--muted);font-size:13px">' + esc(msg) + link + '</div>';
  }
  // Value-first empty state (Peter Soung billboard): bold headline + the value +
  // one clear CTA, instead of a bare "No X yet" line.
  function emptyBillboard(headline, body, ctaLabel, ctaTarget){
    var cta = (ctaLabel && ctaTarget) ? '<div style="margin-top:17px"><a href="#" data-rsmsnav="' + esc(window.__rsmsNavTab(ctaTarget)) + '" onclick="event.preventDefault()" style="display:inline-block;padding:9px 18px;background:var(--accent,#2563EB);color:#fff;border-radius:9px;font:inherit;font-size:13px;font-weight:600;text-decoration:none">' + esc(ctaLabel) + '</a></div>' : '';
    return '<div class="card" style="padding:38px 22px;text-align:center"><div style="font-size:15.5px;font-weight:650;color:var(--ink,#111);margin-bottom:7px">' + esc(headline) + '</div><div style="font-size:13px;line-height:1.55;color:var(--ink-2,#374151);max-width:400px;margin:0 auto">' + esc(body) + '</div>' + cta + '</div>';
  }
  // Expose globally: emptyBillboard's 6 callers live in other IIFEs, so a bare
  // reference was a ReferenceError ("emptyBillboard is not defined") on every
  // empty state. A global makes the bare name resolve from any IIFE.
  try { window.emptyBillboard = emptyBillboard; } catch (e) {}

  // ---- LEFT RAIL: smart lists / saved views / tags are fabricated; no list/tag
  // endpoint exists. Blank counts + drop fabricated named entries, leaving only a
  // single honest "All contacts" entry. loadContacts() owns the main table.
  function purgeRail(p){
    var rail = $1(p, '.crm-rail'); if (!rail) return;
    if (rail.getAttribute('data-rsms-purged') === '1') return;
    // Remove fabricated "Saved views" and "Tags" groups entirely (no backing endpoint).
    $A(rail, '.crm-rail-label').forEach(function(lbl){
      var t = (lbl.textContent || '').trim().toLowerCase();
      if (t === 'saved views' || t === 'tags'){
        var wrap = lbl.parentElement; if (wrap) wrap.style.display = 'none';
      }
    });
    // Smart lists: keep only "All contacts"; hide the rest (fabricated named lists).
    var groups = $A(rail, '.crm-rail-group');
    if (groups.length){
      var first = groups[0];
      $A(first, '.crm-rail-item').forEach(function(item, i){
        if (i === 0){
          item.classList.remove('crm-on');
          item.removeAttribute('aria-current');
          var c = $1(item, '.crm-count'); if (c) c.textContent = '';
        } else {
          item.style.display = 'none';
        }
      });
    }
    rail.setAttribute('data-rsms-purged', '1');
  }

  // ---- HEADER + PAGER + BULK counts in the Contacts panel
  function purgeChrome(p){
    var cp = $1(p, '[data-crmtab-panel="contacts"]'); if (!cp) return;
    // Use the real contact count once loadContacts has computed one (else blank
    // the mock "1,284 contacts"). Stops the count flickering away on row clicks.
    var tc = $1(cp, '.crm-title-count'); if (tc) tc.textContent = (window.__rsmsCrmCountLabel || '');
    var pager = $1(cp, '.crm-pager'); if (pager) pager.style.display = 'none';
    // Bulk toolbar: only relevant when rows are selected; live rows render unchecked.
    var bulk = $1(cp, '.crm-bulk');
    if (bulk && !$1(cp, 'table.crm-table tbody input.crm-check:checked')) bulk.style.display = 'none';
  }

  // ---- PIPELINE / KANBAN BOARD: the inline app script (window.__rsmsRenderCrmBoard /
  //      renderLive) already renders the user's REAL pipeline + opportunities with
  //      drag-to-move (PUT /opportunities/:id/move). This function USED to purge the
  //      demo cards to a "Pipeline stages aren't set up here yet" note + classic link,
  //      which raced with and STOMPED the live board (that note is the bug users saw).
  //      Now: defer entirely to the live renderer; just nudge it if the board view is
  //      open (its own liveLoaded guard makes the nudge idempotent). No classic link.
  function purgeBoard(p){
    var board = $1(p, '#crm-board'); if (!board) return;
    if (board.hasAttribute('hidden')) return;           // list view active \u2014 nothing to do
    try { if (typeof window.__rsmsRenderCrmBoard === 'function') window.__rsmsRenderCrmBoard(); } catch(e){}
  }

  // ---- DETAIL PANEL: default-selected sample contact (Dana Whitfield et al).
  // loadContacts renders rows but does not auto-populate the detail aside, so when
  // no contact is selected the markup shows a fabricated person. Replace with an
  // honest empty state until a real row is opened.
  function purgeDetail(p){
    var aside = $1(p, '.crm-detail'); if (!aside) return;
    if (aside.getAttribute('data-rsms-purged') === '1') return;
    // If a real contact has been opened (selected row exists), leave it alone.
    if ($1(p, 'table.crm-table tbody tr.crm-active[data-id]')) return;
    // Keep the real detail markup so the row-click handler (mercury-live.js) can
    // restore + populate it — otherwise replacing innerHTML below destroys the
    // .crm-d-name/.crm-fields it renders into, and clicking a contact does nothing.
    if (!aside.__rsmsDetailTpl) aside.__rsmsDetailTpl = aside.innerHTML;
    aside.setAttribute('data-rsms-purged', '1');
    aside.innerHTML = '<div style="padding:40px 22px;text-align:center;color:var(--muted)">'
      + '<div style="width:48px;height:48px;border-radius:14px;background:var(--accent-tint);display:flex;align-items:center;justify-content:center;margin:0 auto 12px"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>'
      + '<div style="font-size:14px;font-weight:600;color:var(--ink);margin-bottom:4px">No contact selected</div>'
      + '<div style="font-size:12.5px;line-height:1.5">Select a contact from the list to see their details, notes and activity.</div>'
      + '</div>';
  }

  // ---- SEGMENTS panel: real endpoint available.
  var _segDone = false;
  function renderSegments(p){
    var panel = $1(p, '[data-crmtab-panel="segments"]'); if (!panel) return;
    var rows = $1(panel, '.sgl-rows');
    var title = $1(panel, '.crm-title-count');
    if (rows && rows.getAttribute('data-rsms-purged') !== '1'){
      rows.setAttribute('data-rsms-purged', '1');
      rows.innerHTML = '<div class="sgl-row"><div class="sgl-ident"><div class="sgl-sub">Loading audiences…</div></div></div>';
    }
    if (title) title.textContent = '';
    if (_segDone) return; _segDone = true;
    (async function(){
      var list = [];
      try { list = arr(unwrap(await api.getSegments()), ['segments','items','data']); } catch(e){ list = null; }
      var r = $1(pane(), '[data-crmtab-panel="segments"] .sgl-rows'); if (!r) return;
      if (list === null){
        r.outerHTML = emptyCard('Couldn’t load audiences.', 'contacts');
        return;
      }
      if (!list.length){
        r.outerHTML = emptyBillboard('Group contacts into smart audiences', 'An audience auto-updates as people match your rules — text just your hot leads, or everyone who hasn’t replied yet. Build one in about 30 seconds.', 'Create an audience', 'audiences');
        var t2 = $1(pane(), '[data-crmtab-panel="segments"] .crm-title-count'); if (t2) t2.textContent = '';
        return;
      }
      r.innerHTML = list.map(function(s){
        var nm = s.name || s.title || 'Audience';
        var cnt = (s.contact_count != null ? s.contact_count : (s.count != null ? s.count : (s.size != null ? s.size : null)));
        return '<div class="sgl-row"><div class="sgl-ident"><div class="sgl-name">' + esc(nm) + '</div>'
          + '<div class="sgl-filters"><span class="sgl-clause">Live audience</span></div></div>'
          + '<div class="sgl-count">' + (cnt != null ? '<b>' + num(cnt) + '</b><span>contacts</span>' : '<b>&mdash;</b>') + '</div>'
          + '<div class="sgl-meta"></div>'
          + '<div class="sgl-actions"><a class="crm-btn crm-btn-ghost" href="#" data-rsmsnav="contacts" onclick="event.preventDefault()">Open</a></div></div>';
      }).join('');
      var t3 = $1(pane(), '[data-crmtab-panel="segments"] .crm-title-count');
      if (t3) t3.textContent = list.length + ' saved';
    })();
  }

  // ---- LISTS panel: no real list endpoint -> hide fabricated rows + honest state.
  function purgeLists(p){
    var panel = $1(p, '[data-crmtab-panel="lists"]'); if (!panel) return;
    var rows = $1(panel, '.sgl-rows');
    if (rows && rows.getAttribute('data-rsms-purged') !== '1'){
      rows.setAttribute('data-rsms-purged', '1');
      rows.outerHTML = emptyCard('Manage your imported lists.', 'contacts');
    }
    var title = $1(panel, '.crm-title-count'); if (title) title.textContent = '';
  }

  // ---- CAPTURE panel: signup forms + chat widgets (both have real endpoints).
  var _capDone = false;
  function renderCapture(p){
    var panel = $1(p, '[data-crmtab-panel="capture"]'); if (!panel) return;
    var grids = $A(panel, '.cap-grid'); // [0] = forms, [1] = widgets
    grids.forEach(function(g){
      if (g.getAttribute('data-rsms-purged') !== '1'){
        g.setAttribute('data-rsms-purged', '1');
        g.innerHTML = '<div style="padding:26px 16px;color:var(--muted);font-size:13px">Loading…</div>';
      }
    });
    if (_capDone) return; _capDone = true;
    (async function(){
      var formsP = (typeof api.getSignupForms === 'function') ? api.getSignupForms() : Promise.resolve(null);
      var widgetsP = (typeof api.getWidgets === 'function') ? api.getWidgets() : Promise.resolve(null);
      var fRes = await formsP.then(function(r){ return arr(unwrap(r), ['forms','signup_forms','items','data']); }).catch(function(){ return null; });
      var wRes = await widgetsP.then(function(r){ return arr(unwrap(r), ['widgets','items','data']); }).catch(function(){ return null; });
      var g = $A(pane(), '[data-crmtab-panel="capture"] .cap-grid');
      var formsGrid = g[0], widgetsGrid = g[1];
      if (formsGrid){
        if (!fRes || !fRes.length){
          formsGrid.outerHTML = emptyCard(fRes === null ? 'Couldn’t load signup forms.' : 'No signup forms yet.');
        } else {
          formsGrid.innerHTML = fRes.map(function(f){
            var nm = f.name || f.title || 'Form';
            var subs = (f.submission_count != null ? f.submission_count : (f.submissions != null ? f.submissions : 0));
            var live2 = !!(f.is_active || f.active || (('' + (f.status || '')).toLowerCase() === 'live'));
            return '<div class="cap-card"><div class="cap-card-top"><span class="cap-ico"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg></span>'
              + '<div><div class="cap-name">' + esc(nm) + '</div></div>'
              + '<span style="flex:1"></span><span class="status ' + (live2 ? 'st-green' : 'st-gray') + '"><i></i>' + (live2 ? 'Live' : 'Draft') + '</span></div>'
              + '<div class="cap-stat"><div><b>' + num(subs) + '</b><span>Submissions</span></div></div>'
              + '</div>';
          }).join('');
        }
      }
      if (widgetsGrid){
        if (!wRes || !wRes.length){
          widgetsGrid.outerHTML = emptyCard(wRes === null ? 'Couldn’t load chat widgets.' : 'No chat widgets yet.');
        } else {
          widgetsGrid.innerHTML = wRes.map(function(w){
            var nm = w.name || w.domain || w.title || 'Widget';
            var convos = (w.conversation_count != null ? w.conversation_count : (w.conversations != null ? w.conversations : 0));
            var paused = !!(w.paused || (('' + (w.status || '')).toLowerCase() === 'paused'));
            var live2 = !paused && (w.is_active == null ? true : !!w.is_active);
            return '<div class="cap-card"><div class="cap-card-top"><span class="cap-ico is-green"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>'
              + '<div><div class="cap-name">' + esc(nm) + '</div><div class="cap-meta">Web chat &rarr; SMS inbox</div></div>'
              + '<span style="flex:1"></span><span class="status ' + (live2 ? 'st-green' : 'st-amber') + '"><i></i>' + (live2 ? 'Live' : 'Paused') + '</span></div>'
              + '<div class="cap-stat"><div><b>' + num(convos) + '</b><span>Conversations</span></div></div>'
              + '</div>';
          }).join('');
        }
      }
    })();
  }

  // ---- APPOINTMENTS panel: now a REAL month calendar wired to /appointments
  // (mercury-live.js loadAppointments + book/edit/delete). This used to replace the
  // card with a "Calendar integration coming soon" placeholder — that STOMPED the
  // real calendar render and left a dead button. Now a no-op; the live module owns it.
  function purgeAppointments(p){ /* handled by mercury-live.js appointments module */ }

  function purgeAll(){
    if (!live()) return;
    var p = pane(); if (!p) return;
    try { purgeRail(p); } catch(e){}
    try { purgeChrome(p); } catch(e){}
    try { purgeBoard(p); } catch(e){}
    try { purgeDetail(p); } catch(e){}
    try { renderSegments(p); } catch(e){}
    try { purgeLists(p); } catch(e){}
    try { renderCapture(p); } catch(e){}
    try { purgeAppointments(p); } catch(e){}
  }

  // Run on pane load (poll briefly until pane exists) and on every sub-tab click.
  function schedule(){ if (live()) { purgeAll(); setTimeout(purgeAll, 120); setTimeout(purgeAll, 600); } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();

  document.addEventListener('click', function(e){
    try {
      var t = e.target && e.target.closest ? e.target.closest('#pane-contacts [data-crmtab], #pane-contacts .crm-row, #pane-contacts [data-crmview]') : null;
      if (!t) return;
      setTimeout(purgeAll, 0);
      setTimeout(purgeAll, 150);
    } catch(err){}
  }, true);

  // Catch the shell switching INTO the contacts pane (nav clicks elsewhere).
  document.addEventListener('click', function(e){
    try {
      var nav = e.target && e.target.closest ? e.target.closest('[data-tab="contacts"], [data-pane="contacts"], a[href="#contacts"]') : null;
      if (nav){ setTimeout(purgeAll, 60); setTimeout(purgeAll, 400); }
    } catch(err){}
  }, true);
})();
} catch(e){ console.warn('[mercury-purge] contacts', e); }

/* purge: blasts */
try {
/* ===== Mercury "blasts" pane — purge hardcoded sample data across all sub-tabs =====
   Sub-tabs (data-panel-for): blasts | sequences | scheduled | templates.
   loadBlasts() in mercury-live.js already fills the BLASTS table tbody — we DON'T
   touch that. We cover the gaps: the static "AI review" optimize card, the
   Sequences list, the Scheduled (upcoming + month calendar), and the Templates grid.
   Gated to LIVE mode; idempotent; never throws. */
try { (function(){
  'use strict';
  var api = (window.api || {});
  function live(){ try { return !!document.documentElement.getAttribute('data-rsms-live'); } catch(_) { return false; } }
  function $(s, r){ try { return (r||document).querySelector(s); } catch(_) { return null; } }
  function pane(){ return document.getElementById('pane-blasts'); }
  function esc(v){ return ('' + (v == null ? '' : v)).replace(/[&<>"]/g, function(c){ return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]; }); }
  function num(n){ n = parseInt(n, 10) || 0; return n.toLocaleString('en-US'); }
  function unwrap(r){ if (r && typeof r === 'object' && 'data' in r) return r.data; return r; }
  function asArray(r){ var d = unwrap(r); if (Array.isArray(d)) return d; if (d && Array.isArray(d.sequences)) return d.sequences; if (d && Array.isArray(d.templates)) return d.templates; if (d && Array.isArray(d.campaigns)) return d.campaigns; return []; }
  function fmtDate(v){ if (!v) return ''; var d = new Date(v); if (isNaN(d.getTime())) return ''; try { return d.toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }); } catch(_) { return d.toDateString(); } }

  // ---- 1. Static "AI review" optimize card (#blast-listopt) ----------------
  // Sample insights ("…421 replies", "Just Listed is sending at 64%…"). No real
  // cross-blast insight endpoint exists → blank it so the Optimize button can't
  // reveal fabricated specifics to a real user. Idempotent.
  function purgeListOpt(){
    var card = $('#blast-listopt'); if (!card) return;
    if (card.getAttribute('data-rsms-purged') === '1') return;
    card.setAttribute('data-rsms-purged', '1');
    card.setAttribute('hidden', 'hidden');
    var list = $('.bm-opt-list', card);
    if (list) list.innerHTML = '<div class="bm-opt-item"><div class="bm-opt-txt"><span>No AI review yet — insights appear here once you’ve run a few blasts.</span></div></div>';
    var sub = $('.bm-opt-htext span', card); if (sub) sub.textContent = '';
  }

  // ---- generic table empty/error/loading state ----------------------------
  function tableMsg(table, cols, html){
    if (!table) return; var tb = table.tBodies && table.tBodies[0]; if (!tb) tb = $('tbody', table); if (!tb) return;
    tb.innerHTML = '<tr><td colspan="' + cols + '" style="padding:34px 16px;text-align:center;color:var(--muted);font-size:13px">' + html + '</td></tr>';
  }

  // ---- 2. Sequences tab (real drip sequences) ------------------------------
  var SEQ_ST = { active: ['st-green','Active'], paused: ['st-amber','Paused'], draft: ['st-gray','Draft'], archived: ['st-gray','Archived'], completed: ['st-green','Completed'] };
  var seqLoading = false, _seqMap = {};
  // The backend (drip-processor) schedules each step as now()+delay at the moment
  // the PREVIOUS step sends — i.e. the delay is "after the previous step", NOT
  // cumulative from enrollment. Spell that out so the wait isn't ambiguous
  // (Anton: "confused whether the wait is total or after the previous step").
  function seqFmtDelay(st, i){
    if (i === 0) return 'Sends immediately on enrollment';
    var d = parseInt(st.delay_days,10)||0, h = parseInt(st.delay_hours,10)||0, m = parseInt(st.delay_minutes,10)||0;
    if (!d && !h && !m) return 'Sends right after the previous step';
    var p = []; if (d) p.push(d + ' day' + (d>1?'s':'')); if (h) p.push(h + ' hr' + (h>1?'s':'')); if (m) p.push(m + ' min');
    return p.join(' ') + ' after the previous step';
  }
  // Read-only sequence detail (steps + live stats + pause/resume). Full step editing
  // lives in the classic app (linked). Built because the Mercury rows were unclickable.
  // ---- Shared sequence step-editor helpers (used by detail + create modals) ----
  function seqByOrder(a, b){ return (a.step_order||0) - (b.step_order||0); }
  function seqStepClone(st){
    st = st || {};
    return {
      name: st.name || '', message_body: st.message_body || '',
      delay_days: parseInt(st.delay_days,10)||0, delay_hours: parseInt(st.delay_hours,10)||0, delay_minutes: parseInt(st.delay_minutes,10)||0,
      step_type: st.step_type === 'if_else' ? 'if_else' : 'send_sms',
      condition_field: st.condition_field || null, condition_op: st.condition_op || null, condition_value: st.condition_value || null,
      then_step_order: st.then_step_order != null ? st.then_step_order : null,
      else_step_order: st.else_step_order != null ? st.else_step_order : null,
      // Per-step active-lead count from GET /drip-sequences (Kevin Van Patten
      // 2026-06-18: wants to see how many leads sit at each step like classic).
      leads_at_step: parseInt(st.leads_at_step, 10) || 0
    };
  }
  function seqDnum(cls, i, val){ return '<input type="number" min="0" max="365" class="' + cls + '" data-i="' + i + '" value="' + (parseInt(val,10)||0) + '" style="width:48px;box-sizing:border-box;border:1px solid var(--hairline-strong,#d8d8e0);border-radius:6px;padding:4px 6px;font:inherit;font-size:12px;text-align:center;color:var(--ink);background:var(--card,#fff)">'; }
  function seqToolBtn(cls, i, label, disabled, color){ return '<button type="button" class="' + cls + '" data-i="' + i + '"' + (disabled?' disabled':'') + ' style="border:1px solid var(--hairline-strong);background:var(--card);border-radius:6px;width:24px;height:24px;cursor:' + (disabled?'default':'pointer') + ';color:' + (color||'var(--muted)') + ';font-size:13px;line-height:1;padding:0' + (disabled?';opacity:.4':'') + '">' + label + '</button>'; }
  // ---- Native if/else branch editor (replaces the old "edit in classic" link) ----
  // Condition fields = real `contacts` columns; operators = the EXACT strings the
  // drip processor's evalDripCondition() checks (services/drip-processor.js). Any
  // other operator string would silently evaluate false at send time.
  var SEQ_COND_FIELDS = [['tags','Tag'],['pipeline_stage','Pipeline stage'],['first_name','First name'],['last_name','Last name'],['email','Email'],['phone','Phone'],['city','City'],['state','State'],['company','Company'],['source','Source']];
  var SEQ_COND_OPS = [['exists','exists'],['not_exists','does not exist'],['equals','equals'],['not_equals','does not equal'],['contains','contains'],['not_contains','does not contain'],['gt','is greater than'],['gte','is at least'],['lt','is less than'],['lte','is at most']];
  function seqCondNoVal(op){ return op === 'exists' || op === 'not_exists'; }
  function seqSelHtml(cls, i, opts, sel){
    var o = opts.map(function(p){ return '<option value="' + p[0] + '"' + (String(sel) === String(p[0]) ? ' selected' : '') + '>' + esc(p[1]) + '</option>'; }).join('');
    return '<select class="' + cls + '" data-i="' + i + '" style="border:1px solid var(--hairline-strong,#d8d8e0);border-radius:7px;padding:5px 7px;font:inherit;font-size:12.5px;background:var(--card,#fff);color:var(--ink)">' + o + '</select>';
  }
  // then/else target a step by its 1-based step_order (= array index + 1). "" = end.
  function seqTargetOpts(sel, total, selfIdx){
    var o = '<option value=""' + (sel == null || sel === '' ? ' selected' : '') + '>End sequence</option>';
    for (var k = 0; k < total; k++){ var ord = k + 1; o += '<option value="' + ord + '"' + (String(sel) === String(ord) ? ' selected' : '') + '>Step ' + ord + (k === selfIdx ? ' (this)' : '') + '</option>'; }
    return o;
  }
  function seqHasBranch(steps){ return steps.some(function(st){ return st.step_type === 'if_else'; }); }
  function seqStepCardHtml(st, i, total, structural){
    var isBranch = st.step_type === 'if_else';
    var tools = structural
      ? '<span style="margin-left:auto;display:inline-flex;gap:3px">' + seqToolBtn('rsms-seq-up', i, '↑', i===0) + seqToolBtn('rsms-seq-down', i, '↓', i===total-1) + seqToolBtn('rsms-seq-del', i, '×', false, '#DC2626') + '</span>'
      : (isBranch ? '<button type="button" class="rsms-seq-delbranch" data-i="' + i + '" title="Remove this branch" style="margin-left:auto;border:1px solid var(--hairline-strong);background:var(--card);border-radius:6px;width:24px;height:24px;cursor:pointer;color:#DC2626;font-size:13px;line-height:1;padding:0">×</button>' : '');
    var leadBadge = (parseInt(st.leads_at_step,10)||0) > 0
      ? '<span title="Leads currently waiting at this step" style="font-size:11px;font-weight:700;color:var(--accent);background:var(--accent-soft,rgba(37,99,235,.10));border-radius:20px;padding:2px 9px;white-space:nowrap;flex:none">' + num(st.leads_at_step) + (st.leads_at_step===1?' lead':' leads') + '</span>'
      : '';
    var head = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="width:21px;height:21px;border-radius:50%;background:var(--accent);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;flex:none">' + (i+1) + '</span><b style="font-size:13px">' + esc(st.name || (isBranch ? 'If / else' : ('Step ' + (i+1)))) + '</b>' + leadBadge + tools + '</div>';
    if (isBranch) {
      var noVal = seqCondNoVal(st.condition_op);
      var fieldSel = seqSelHtml('rsms-seq-cf', i, SEQ_COND_FIELDS, st.condition_field || 'tags');
      var opSel = seqSelHtml('rsms-seq-co', i, SEQ_COND_OPS, st.condition_op || 'contains');
      var valInp = '<input class="rsms-seq-cv" data-i="' + i + '" value="' + esc(st.condition_value || '') + '" placeholder="value" style="' + (noVal ? 'display:none;' : '') + 'border:1px solid var(--hairline-strong,#d8d8e0);border-radius:7px;padding:5px 8px;font:inherit;font-size:12.5px;min-width:90px;color:var(--ink);background:var(--card,#fff)">';
      var thenSel = '<select class="rsms-seq-then" data-i="' + i + '" style="border:1px solid var(--hairline-strong,#d8d8e0);border-radius:7px;padding:4px 7px;font:inherit;font-size:12px;background:var(--card,#fff);color:var(--ink)">' + seqTargetOpts(st.then_step_order, total, i) + '</select>';
      var elseSel = '<select class="rsms-seq-else" data-i="' + i + '" style="border:1px solid var(--hairline-strong,#d8d8e0);border-radius:7px;padding:4px 7px;font:inherit;font-size:12px;background:var(--card,#fff);color:var(--ink)">' + seqTargetOpts(st.else_step_order, total, i) + '</select>';
      return '<div style="border:1px solid var(--hairline);border-radius:10px;padding:11px 13px;margin-bottom:9px;background:var(--accent-soft,rgba(37,99,235,.05))">' + head
        + '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12.5px;color:var(--ink)"><span style="color:var(--muted)">If contact</span>' + fieldSel + opSel + valInp + '</div>'
        + '<div style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:12.5px"><span style="color:#16A34A;font-weight:700">&#10003; Yes &rarr;</span>' + thenSel + '</div>'
        + '<div style="display:flex;align-items:center;gap:6px;margin-top:6px;font-size:12.5px"><span style="color:#DC2626;font-weight:700">&#10007; No &rarr;</span>' + elseSel + '</div>'
        + '</div>';
    }
    var bodyEl = '<textarea class="rsms-seq-msg" data-i="' + i + '" rows="3" placeholder="Message text…" style="width:100%;box-sizing:border-box;border:1px solid var(--hairline-strong,#d8d8e0);border-radius:8px;padding:8px 10px;font:inherit;font-size:13px;line-height:1.5;color:var(--ink);background:var(--card,#fff);resize:vertical;min-height:60px">' + esc(st.message_body || '') + '</textarea>';
    var delayRow = '<div style="display:flex;align-items:center;gap:5px;margin-top:9px;flex-wrap:wrap;font-size:12px;color:var(--muted)">'
      + '<span style="font-weight:600">' + (i===0 ? 'When enrolled' : 'Wait') + ':</span>'
      + seqDnum('rsms-seq-d', i, st.delay_days||0) + '<span>d</span>'
      + seqDnum('rsms-seq-h', i, st.delay_hours||0) + '<span>h</span>'
      + seqDnum('rsms-seq-m', i, st.delay_minutes||0) + '<span>m</span>'
      + '<span class="rsms-seq-delaylbl" data-i="' + i + '" style="margin-left:6px;font-style:italic;color:var(--faint)">' + esc(seqFmtDelay(st, i)) + '</span>'
      + '</div>';
    // Char/segment estimate, like the composer. ponytail: counts literal text —
    // {{merge}} fields expand at send, so it's an estimate (same as everywhere).
    var _sn = (st.message_body || '').length, _ss = _sn ? (_sn <= 160 ? 1 : Math.ceil(_sn / 153)) : 0;
    var segRow = '<div class="rsms-seq-seg" data-i="' + i + '" style="margin-top:5px;font-size:11px;color:var(--faint,#94a3b8);font-variant-numeric:tabular-nums">' + _sn + ' char' + (_sn === 1 ? '' : 's') + ' &middot; ' + _ss + ' segment' + (_ss === 1 ? '' : 's') + '</div>';
    return '<div style="border:1px solid var(--hairline);border-radius:10px;padding:11px 13px;margin-bottom:9px">' + head + bodyEl + segRow + delayRow + '</div>';
  }
  function seqStepsEditorHtml(steps, structural){
    var cards = steps.length ? steps.map(function(st, i){ return seqStepCardHtml(st, i, steps.length, structural); }).join('') : '<div style="color:var(--muted);font-size:13px;margin-bottom:9px">No steps yet.</div>';
    // Both adds are append-only (safe — never renumber existing steps). Branch
    // condition/targets are edited inline on the card; no classic round-trip.
    var add = '<div style="display:flex;gap:8px;margin-top:2px">'
      + '<button type="button" class="rsms-seq-addstep" style="flex:1;border:1px dashed var(--hairline-strong);background:none;border-radius:10px;padding:10px;font:inherit;font-size:13px;font-weight:600;color:var(--accent);cursor:pointer">+ Add message</button>'
      + '<button type="button" class="rsms-seq-addbranch" style="flex:1;border:1px dashed var(--hairline-strong);background:none;border-radius:10px;padding:10px;font:inherit;font-size:13px;font-weight:600;color:var(--accent);cursor:pointer">+ Add branch (if/else)</button>'
      + '</div>';
    return cards + add;
  }
  function seqRenderSteps(ov, ed, structural){
    // Derive structural LIVE: any if/else step locks reorder/delete-by-index so the
    // 1-based then/else pointers can never be silently shifted (matches load-time rule).
    var struct = structural && !seqHasBranch(ed.steps);
    var c = ov.querySelector('.rsms-seq-steps'); if (c) c.innerHTML = seqStepsEditorHtml(ed.steps, struct);
    var cnt = ov.querySelector('.rsms-seq-count'); if (cnt) cnt.textContent = 'Steps (' + ed.steps.length + ')';
  }
  function seqSyncFromDom(ov, ed){
    Array.prototype.forEach.call(ov.querySelectorAll('.rsms-seq-msg'), function(ta){ var i = parseInt(ta.getAttribute('data-i'),10); if (ed.steps[i]) ed.steps[i].message_body = ta.value; });
    [['rsms-seq-d','delay_days'],['rsms-seq-h','delay_hours'],['rsms-seq-m','delay_minutes']].forEach(function(p){
      Array.prototype.forEach.call(ov.querySelectorAll('.' + p[0]), function(inp){ var i = parseInt(inp.getAttribute('data-i'),10); if (ed.steps[i]) ed.steps[i][p[1]] = Math.max(0, parseInt(inp.value,10)||0); });
    });
    // Branch (if/else) condition + targets.
    [['rsms-seq-cf','condition_field'],['rsms-seq-co','condition_op'],['rsms-seq-cv','condition_value']].forEach(function(p){
      Array.prototype.forEach.call(ov.querySelectorAll('.' + p[0]), function(el){ var i = parseInt(el.getAttribute('data-i'),10); if (ed.steps[i]) ed.steps[i][p[1]] = el.value || null; });
    });
    [['rsms-seq-then','then_step_order'],['rsms-seq-else','else_step_order']].forEach(function(p){
      Array.prototype.forEach.call(ov.querySelectorAll('.' + p[0]), function(el){ var i = parseInt(el.getAttribute('data-i'),10); if (ed.steps[i]) ed.steps[i][p[1]] = (el.value === '' ? null : (parseInt(el.value,10) || null)); });
    });
  }
  function seqWireDelayLabel(ov){
    ov.addEventListener('input', function(e){
      var inp = e.target; if (!inp) return;
      var _cn = inp.className || '';
      // Live-update the per-step char/segment counter as the message is typed.
      if (/rsms-seq-msg/.test(_cn)) { var _mi = inp.getAttribute('data-i'); var _sg = ov.querySelector('.rsms-seq-seg[data-i="' + _mi + '"]'); if (_sg) { var _n = (inp.value || '').length, _s = _n ? (_n <= 160 ? 1 : Math.ceil(_n / 153)) : 0; _sg.innerHTML = _n + ' char' + (_n === 1 ? '' : 's') + ' &middot; ' + _s + ' segment' + (_s === 1 ? '' : 's'); } return; }
      if (!/rsms-seq-(d|h|m)/.test(_cn)) return;
      var i = inp.getAttribute('data-i');
      var d = ov.querySelector('.rsms-seq-d[data-i="' + i + '"]'), h = ov.querySelector('.rsms-seq-h[data-i="' + i + '"]'), m = ov.querySelector('.rsms-seq-m[data-i="' + i + '"]');
      var lbl = ov.querySelector('.rsms-seq-delaylbl[data-i="' + i + '"]');
      if (lbl) lbl.textContent = seqFmtDelay({ delay_days: d && d.value, delay_hours: h && h.value, delay_minutes: m && m.value }, parseInt(i, 10));
    });
    // Hide the branch value input when the operator is exists / not_exists.
    ov.addEventListener('change', function(e){
      var t = e.target; if (!t || !t.className || String(t.className).indexOf('rsms-seq-co') < 0) return;
      var i = t.getAttribute('data-i');
      var v = ov.querySelector('.rsms-seq-cv[data-i="' + i + '"]');
      if (v) v.style.display = seqCondNoVal(t.value) ? 'none' : '';
    });
  }
  // Delete step at index k AND remap every if/else then/else pointer so nothing
  // dangles or misroutes: a pointer at the deleted step -> end; one after it -> -1.
  function seqDeleteStep(ed, k){
    ed.steps.splice(k, 1);
    ed.steps.forEach(function(st){
      if (st.step_type !== 'if_else') return;
      ['then_step_order','else_step_order'].forEach(function(key){
        var v = st[key]; if (v == null) return;
        if (v === k + 1) st[key] = null; else if (v > k + 1) st[key] = v - 1;
      });
    });
  }
  // Returns a click-handler for the step buttons; returns true if it handled the event.
  function seqStructuralClick(ov, ed, structural, setStat){
    return function(e){
      // Append (message or branch) is ALWAYS safe — it never renumbers existing
      // steps, so 1-based then/else pointers stay valid. Reorder/index-delete are
      // the unsafe ops, gated below on a LIVE structural check.
      if (e.target.closest('.rsms-seq-addstep')) { seqSyncFromDom(ov, ed); ed.steps.push(seqStepClone({})); seqRenderSteps(ov, ed, structural); return true; }
      if (e.target.closest('.rsms-seq-addbranch')) { seqSyncFromDom(ov, ed); ed.steps.push(seqStepClone({ step_type:'if_else', condition_field:'tags', condition_op:'contains' })); seqRenderSteps(ov, ed, structural); return true; }
      var db = e.target.closest('.rsms-seq-delbranch'); if (db) { var bi = parseInt(db.getAttribute('data-i'),10); if (ed.steps.length<=1) { setStat('A sequence needs at least one step.', true); return true; } seqSyncFromDom(ov, ed); seqDeleteStep(ed, bi); seqRenderSteps(ov, ed, structural); return true; }
      var liveStructural = structural && !seqHasBranch(ed.steps);
      if (!liveStructural) return false;
      var up = e.target.closest('.rsms-seq-up'); if (up) { var i = parseInt(up.getAttribute('data-i'),10); if (i>0) { seqSyncFromDom(ov, ed); var t = ed.steps[i]; ed.steps[i] = ed.steps[i-1]; ed.steps[i-1] = t; seqRenderSteps(ov, ed, structural); } return true; }
      var dn = e.target.closest('.rsms-seq-down'); if (dn) { var j = parseInt(dn.getAttribute('data-i'),10); if (j<ed.steps.length-1) { seqSyncFromDom(ov, ed); var u = ed.steps[j]; ed.steps[j] = ed.steps[j+1]; ed.steps[j+1] = u; seqRenderSteps(ov, ed, structural); } return true; }
      var dl = e.target.closest('.rsms-seq-del'); if (dl) { var k = parseInt(dl.getAttribute('data-i'),10); if (ed.steps.length<=1) { setStat('A sequence needs at least one step.', true); return true; } seqSyncFromDom(ov, ed); seqDeleteStep(ed, k); seqRenderSteps(ov, ed, structural); return true; }
      return false;
    };
  }
  function seqFirstEmpty(steps){ var idx = -1; steps.forEach(function(p, i){ if (idx<0 && p.step_type!=='if_else' && !String(p.message_body||'').trim()) idx = i; }); return idx; }

  // ---- Sending-window (delivery window) editor — shared by detail + create ----
  var SEQ_DAYS = [['mon','Mon'],['tue','Tue'],['wed','Wed'],['thu','Thu'],['fri','Fri'],['sat','Sat'],['sun','Sun']];
  function seqBrowserTz(){ try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'; } catch(e){ return 'America/New_York'; } }
  function seqTzShort(tz){ if(!tz) return ''; var m={'America/Los_Angeles':'PT','America/Denver':'MT','America/Chicago':'CT','America/New_York':'ET','America/Phoenix':'MST','America/Anchorage':'AKT','Pacific/Honolulu':'HT'}; return m[tz] || tz.split('/').pop().replace(/_/g,' '); }
  function seqDaysArr(csv){ return (csv ? String(csv).split(',') : []).map(function(x){ return x.trim().toLowerCase(); }).filter(Boolean); }
  function seqDaysLabel(days){
    if(!days.length) return '';
    var wd=['mon','tue','wed','thu','fri'], we=['sat','sun'];
    var isWd = wd.every(function(d){ return days.indexOf(d)>=0; }) && !we.some(function(d){ return days.indexOf(d)>=0; });
    if(isWd) return 'Mon–Fri';
    if(days.length===7) return 'Every day';
    return SEQ_DAYS.filter(function(d){ return days.indexOf(d[0])>=0; }).map(function(d){ return d[1]; }).join(', ');
  }
  function seqWinFromSeq(s){ return { start: s.delivery_window_start||'', end: s.delivery_window_end||'', days: seqDaysArr(s.delivery_window_days), tz: s.timezone||seqBrowserTz() }; }
  function seqWinDefault(){ return { start: '09:00', end: '18:00', days: ['mon','tue','wed','thu','fri'], tz: seqBrowserTz() }; }
  function seqTimeOk(t){ return /^([01]?\d|2[0-3]):[0-5]\d$/.test(String(t||'').trim()); }
  function seqWinSummary(win){
    if(!win.start && !win.end && !win.days.length) return '⚠ No window — sends any allowed time (8am–9pm local)';
    if(!(win.start && win.end && win.days.length)) return '⚠ Incomplete — set start, end & a day';
    return 'Sends ' + win.start + '–' + win.end + ', ' + seqDaysLabel(win.days) + (win.tz ? ' ' + seqTzShort(win.tz) : '');
  }
  function seqDayBtnStyle(on){ return 'border:1px solid ' + (on?'var(--accent)':'var(--hairline-strong)') + ';background:' + (on?'var(--accent)':'var(--card)') + ';color:' + (on?'#fff':'var(--muted)') + ';border-radius:7px;min-width:40px;height:30px;font:inherit;font-size:12px;font-weight:600;cursor:pointer'; }
  function seqStyleDay(b, on){ b.style.cssText = seqDayBtnStyle(on); }
  function seqWindowHtml(win){
    var chips = SEQ_DAYS.map(function(d){ var on=win.days.indexOf(d[0])>=0; return '<button type="button" class="rsms-seq-day' + (on?' on':'') + '" data-day="' + d[0] + '" style="' + seqDayBtnStyle(on) + '">' + d[1] + '</button>'; }).join('');
    var tin = function(cls, val, ph){ var disp=(val&&window.__rsmsFmtTime12)?window.__rsmsFmtTime12(val):(val||''); return '<input type="text" readonly class="' + cls + '" data-hhmm="' + esc(val||'') + '" value="' + esc(disp) + '" placeholder="' + esc(ph||'Time') + '" aria-label="' + esc(ph||'time') + '" style="width:104px;box-sizing:border-box;border:1px solid var(--hairline-strong,#d8d8e0);border-radius:7px;padding:6px 8px;font:inherit;font-size:13px;color:var(--ink);background:var(--card,#fff);cursor:pointer">'; };
    return '<div class="rsms-seq-win" data-tz="' + esc(win.tz||'') + '" style="margin-top:18px;border-top:1px solid var(--hairline);padding-top:14px">'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap"><span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--faint)">Sending window</span><span class="rsms-seq-winsum" style="font-size:11.5px;color:var(--muted)">' + esc(seqWinSummary(win)) + '</span></div>'
      + '<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin-bottom:9px">' + chips + '<button type="button" class="rsms-seq-daypreset" data-preset="wd" style="margin-left:6px;border:0;background:none;color:var(--accent);font:inherit;font-size:12px;font-weight:600;cursor:pointer">Weekdays</button><button type="button" class="rsms-seq-daypreset" data-preset="all" style="border:0;background:none;color:var(--accent);font:inherit;font-size:12px;font-weight:600;cursor:pointer">Every day</button></div>'
      + '<div style="display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--muted)"><span>From</span>' + tin('rsms-seq-wstart', win.start, '09:00') + '<span>to</span>' + tin('rsms-seq-wend', win.end, '17:00') + '<span style="color:var(--faint)">' + esc(seqTzShort(win.tz)) + '</span><button type="button" class="rsms-seq-winclear" style="margin-left:auto;border:0;background:none;color:var(--muted);font:inherit;font-size:12px;cursor:pointer;text-decoration:underline">Clear</button></div>'
      + '<div style="font-size:11px;color:var(--faint);margin-top:7px">Outside this window, messages wait for the next open slot. We never send outside 8am–9pm recipient-local regardless. 24-hour times, e.g. 09:00 / 17:30.</div>'
      + '</div>';
  }
  function seqReadWindow(ov){
    var wrap = ov.querySelector('.rsms-seq-win'); if(!wrap) return null;
    var days = []; Array.prototype.forEach.call(ov.querySelectorAll('.rsms-seq-day.on'), function(b){ days.push(b.getAttribute('data-day')); });
    var _ws=ov.querySelector('.rsms-seq-wstart'), _we=ov.querySelector('.rsms-seq-wend'); var st=(_ws&&(_ws.getAttribute('data-hhmm')||_ws.value))||''; var en=(_we&&(_we.getAttribute('data-hhmm')||_we.value))||'';
    return { start: st.trim(), end: en.trim(), days: days, tz: wrap.getAttribute('data-tz') || seqBrowserTz() };
  }
  function seqWinRefresh(ov){ var sum = ov.querySelector('.rsms-seq-winsum'); var w = seqReadWindow(ov); if(sum && w) sum.textContent = seqWinSummary(w); }
  function seqWireWindow(ov){
    ov.addEventListener('input', function(e){ if(e.target && /rsms-seq-(wstart|wend)/.test(e.target.className||'')) seqWinRefresh(ov); });
  }
  // Click router for window controls — returns true if it handled the event.
  function seqWindowClick(ov, e){
    var dc = e.target.closest('.rsms-seq-day');
    if(dc){ var on = !dc.classList.contains('on'); dc.classList.toggle('on', on); seqStyleDay(dc, on); seqWinRefresh(ov); return true; }
    var pp = e.target.closest('.rsms-seq-daypreset');
    if(pp){ var want = pp.getAttribute('data-preset')==='all' ? ['mon','tue','wed','thu','fri','sat','sun'] : ['mon','tue','wed','thu','fri']; Array.prototype.forEach.call(ov.querySelectorAll('.rsms-seq-day'), function(b){ var on = want.indexOf(b.getAttribute('data-day'))>=0; b.classList.toggle('on', on); seqStyleDay(b, on); }); seqWinRefresh(ov); return true; }
    var wc = e.target.closest('.rsms-seq-winclear');
    if(wc){ Array.prototype.forEach.call(ov.querySelectorAll('.rsms-seq-day'), function(b){ b.classList.remove('on'); seqStyleDay(b, false); }); var ws=ov.querySelector('.rsms-seq-wstart'), we=ov.querySelector('.rsms-seq-wend'); if(ws){ ws.value=''; ws.setAttribute('data-hhmm',''); } if(we){ we.value=''; we.setAttribute('data-hhmm',''); } seqWinRefresh(ov); return true; }
    var twin=e.target.closest('.rsms-seq-wstart,.rsms-seq-wend');
    if(twin){ if(window.__rsmsOpenTimePopover){ window.__rsmsOpenTimePopover(twin, twin.getAttribute('data-hhmm')||'', function(h){ twin.setAttribute('data-hhmm',h); twin.value=(window.__rsmsFmtTime12?window.__rsmsFmtTime12(h):h); seqWinRefresh(ov); }); } return true; }
    return false;
  }
  // Validates a read window. Returns {ok:true, payload} | {ok:false, msg} | {ok:true, payload:cleared}
  function seqValidateWindow(win){
    if(!win) return { ok:true, payload:null };
    var any = win.start || win.end || win.days.length;
    if(!any) return { ok:true, payload:{ delivery_window_start:null, delivery_window_end:null, delivery_window_days:null, timezone:null } };
    if(!(win.start && win.end && win.days.length)) return { ok:false, msg:'Set a start, end & at least one day — or Clear the window.' };
    if(!seqTimeOk(win.start) || !seqTimeOk(win.end)) return { ok:false, msg:'Times must be 24-hour HH:MM (e.g. 09:00).' };
    return { ok:true, payload:{ delivery_window_start:win.start, delivery_window_end:win.end, delivery_window_days:win.days.join(','), timezone:win.tz||seqBrowserTz() } };
  }

  // Send-forecast block for the sequence modal: the upcoming-volume chips + a
  // NEXT 14 DAYS calendar, so a sender can prep for when sends go out (Kevin Van
  // Patten 2026-06-18, matching classic). All data comes from GET /drip-sequences
  // (queued_now/tomorrow/7d + schedule_14d = [{date,count}] for days with sends).
  // Build the 14-day calendar cells (today = browser-local) from a {date->count}
  // map. Extracted so the per-assignee filter can re-render the grid in place.
  function seqGridCells(byDate){
    var base = new Date(); base.setHours(12,0,0,0);
    var DOW = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    var cells = '';
    for (var i=0;i<14;i++){
      var d = new Date(base.getTime() + i*86400000);
      var m = d.getMonth()+1, day = d.getDate();
      var key = d.getFullYear() + '-' + (m<10?'0'+m:m) + '-' + (day<10?'0'+day:day);
      var n = byDate[key] || 0, has = n>0;
      // Days with sends are clickable → open that day's scheduled-contacts drawer.
      cells += '<div' + (has?' class="rsms-sched-cell" role="button" tabindex="0" data-schedday="' + key + '" data-schedcount="' + n + '" title="View the ' + num(n) + ' contacts scheduled for ' + m + '/' + day + '"':'') + ' style="text-align:center;padding:6px 3px;border-radius:9px;background:' + (has?'var(--accent-tint,#eef2ff)':'var(--bg-soft,#f8fafc)') + ';border:1px solid ' + (has?'var(--accent,#2563EB)':'var(--hairline,#eee)') + (has?';cursor:pointer':'') + '">'
        + '<div style="font-size:9px;font-weight:700;letter-spacing:.03em;color:var(--faint)">' + DOW[d.getDay()] + '</div>'
        + '<div style="font-size:10px;color:var(--muted);margin-bottom:1px">' + m + '/' + day + '</div>'
        + '<div style="font-size:13px;font-weight:700;color:' + (has?'var(--accent,#2563EB)':'var(--faint)') + '">' + num(n) + '</div></div>';
    }
    return cells;
  }
  // Per-block cache so the assignee filter click handler can rebuild the grid
  // without re-fetching. Keyed by a tiny id stamped on the block.
  var seqSchedCache = {}, seqSchedSeq = 0;
  function asgChipHtml(label, key, active){
    return '<button type="button" class="rsms-asg-chip" data-asg="' + key + '" style="font-size:11px;font-weight:600;padding:4px 11px;border-radius:20px;white-space:nowrap;cursor:pointer;border:1px solid ' + (active?'var(--accent,#2563EB)':'var(--hairline-strong,#E2E4E9)') + ';background:' + (active?'var(--accent,#2563EB)':'var(--card,#fff)') + ';color:' + (active?'#fff':'var(--ink-2,#475569)') + '">' + label + '</button>';
  }

  // Send-forecast block for the sequence modal: upcoming-volume chips, a NEXT 14
  // DAYS calendar, and (Kevin Van Patten 2026-06-24) a per-assignee filter so a
  // sender can see how the scheduled volume splits across the assigned team and
  // filter the calendar to one person. schedule_by_assignee comes from GET
  // /drip-sequences = [{assigned_to,name,total,days:[{date,count}]}].
  function seqScheduleHtml(s){
    var sched = s.schedule_14d;
    if (typeof sched === 'string') { try { sched = JSON.parse(sched); } catch(e){ sched = []; } }
    if (!Array.isArray(sched)) sched = [];
    var byDate = {}; sched.forEach(function(d){ if (d && d.date) byDate[String(d.date).slice(0,10)] = parseInt(d.count,10)||0; });
    var qn = parseInt(s.queued_now,10)||0, qm = parseInt(s.queued_tomorrow,10)||0, q7 = parseInt(s.queued_7d,10)||0;
    function chip(n,label,accent){ return '<span style="font-size:11px;font-weight:650;padding:3px 10px;border-radius:20px;white-space:nowrap;background:' + (accent?accent:'var(--bg-soft,#f1f5f9)') + ';color:' + (accent?'#fff':'var(--ink-2,#475569)') + '">' + num(n) + ' ' + label + '</span>'; }
    var chips = '';
    if (qn) chips += chip(qn,'ready now','#EA580C');
    chips += chip(qm,'tomorrow') + chip(q7,'next 7 days');

    // Assignee breakdown — build per-person {date->count} maps + filter chips.
    var asg = s.schedule_by_assignee;
    if (typeof asg === 'string') { try { asg = JSON.parse(asg); } catch(e){ asg = []; } }
    if (!Array.isArray(asg)) asg = [];
    var asgData = asg.map(function(a){
      var bd = {}; (a.days||[]).forEach(function(x){ if (x && x.date) bd[String(x.date).slice(0,10)] = parseInt(x.count,10)||0; });
      return { name: a.name, total: parseInt(a.total,10)||0, byDate: bd };
    });
    var totalAll = 0; Object.keys(byDate).forEach(function(k){ totalAll += byDate[k]; });
    var sid = 'ssg' + (++seqSchedSeq);
    seqSchedCache[sid] = { all: byDate, asg: asgData };
    var asgRow = '';
    if (asgData.length > 1) { // only worth a filter when >1 bucket
      asgRow = asgChipHtml('All · ' + num(totalAll), '__all', true);
      asgData.forEach(function(a, idx){ asgRow += asgChipHtml(esc(a.name) + ' · ' + num(a.total), String(idx), false); });
      asgRow = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">' + asgRow + '</div>';
    }

    return '<div class="rsms-sched-block" data-sid="' + sid + '" data-seqid="' + esc('' + (s.id != null ? s.id : '')) + '" style="margin-bottom:16px">'
      + (chips ? '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:11px">' + chips + '</div>' : '')
      + (asgRow ? '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);margin-bottom:7px">By assignee</div>' + asgRow : '')
      + '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);margin-bottom:7px">Next 14 days <span style="font-weight:500;text-transform:none;letter-spacing:0;color:var(--faint)">· click a day to see who</span></div>'
      + '<div class="rsms-sched-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px">' + seqGridCells(byDate) + '</div></div>';
  }

  // Click a day cell in the "Next 14 days" grid → in-place drawer listing that day's
  // scheduled contacts for this sequence (GET /drip-sequences/:id/scheduled?date=). Rows
  // open the contact card. [Anton 2026-07-07]
  function openScheduledDay(seqId, dateStr, count){
    if (!seqId || !dateStr || !api || !api.request) return;
    var ov = document.createElement('div');
    ov.setAttribute('data-rsms-modal','1');
    ov.style.cssText = 'position:fixed;inset:0;z-index:10002;background:rgba(20,22,40,.45);display:flex;align-items:flex-start;justify-content:center;padding:44px 16px;overflow:auto';
    var d = new Date(dateStr + 'T12:00:00');
    var DOW = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var title = (isNaN(d.getTime()) ? dateStr : (DOW[d.getDay()] + ', ' + (d.getMonth()+1) + '/' + d.getDate()));
    ov.innerHTML = '<div style="background:var(--card,#fff);border-radius:16px;max-width:520px;width:100%;box-shadow:0 20px 60px rgba(20,22,40,.3);overflow:hidden;display:flex;flex-direction:column;max-height:80vh" role="dialog" aria-label="Scheduled contacts">'
      + '<div style="display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid var(--hairline,#EAEBEF)"><div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:680;color:var(--ink,#1A1A2E)">Scheduled — ' + esc(title) + '</div><div class="sd-sub" style="margin-top:2px;font-size:12.5px;color:var(--muted,#6F7287)">' + num(count||0) + ' contact' + ((count||0)===1?'':'s') + ' set to send</div></div><button type="button" class="sd-x" aria-label="Close" style="border:0;background:none;cursor:pointer;color:var(--muted,#6F7287);font-size:24px;line-height:.8">&times;</button></div>'
      + '<div class="sd-body" style="flex:1;overflow-y:auto;padding:6px 8px 10px;min-height:120px"><div style="padding:26px;text-align:center;color:var(--muted);font-size:13px">Loading…</div></div>'
      + '<div class="sd-more" style="display:none;padding:8px 18px 14px;border-top:1px solid var(--hairline,#EAEBEF)"><button type="button" class="sd-more-btn" style="width:100%;height:36px;border:1px solid var(--hairline-strong,#E2E4E9);background:var(--card,#fff);border-radius:9px;font:inherit;font-size:13px;font-weight:600;cursor:pointer">Load more</button></div>'
      + '</div>';
    document.body.appendChild(ov);
    function close(){ ov.remove(); }
    ov.querySelector('.sd-x').onclick = close;
    ov.addEventListener('click', function(e){ if (e.target===ov) close(); });
    var body = ov.querySelector('.sd-body');
    var offset = 0, loaded = 0, total = count||0, busy = false, PAGE = 100;
    // Local phone formatter — mercury-buttons.js is split into per-pane IIFEs and the
    // global fmtPhone is NOT in this closure (referencing it threw a ReferenceError in
    // the row render → the drawer fell to "Could not load"). Keep it self-contained.
    function _ph(p){ var d=(''+(p==null?'':p)).replace(/\D/g,''); if(d.length===11&&d[0]==='1')d=d.slice(1); return d.length===10?('('+d.slice(0,3)+') '+d.slice(3,6)+'-'+d.slice(6)):(''+(p==null?'':p)); }
    function rowHtml(c){
      var name = [c.first_name,c.last_name].filter(Boolean).join(' ') || _ph(c.phone) || 'Contact';
      var t=''; try{ var dt=new Date(c.next_send_at); if(!isNaN(dt.getTime())) t = dt.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}); }catch(e){}
      return '<button type="button" class="sd-row" data-cid="'+esc(''+c.contact_id)+'" data-nm="'+esc(name)+'" data-ph="'+esc(c.phone||'')+'" style="width:100%;display:flex;align-items:center;gap:10px;padding:9px 12px;border:0;background:none;border-radius:9px;cursor:pointer;text-align:left;font:inherit">'
        + '<span style="flex:1;min-width:0"><span style="display:block;font-size:13px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(name)+'</span><span style="display:block;font-size:11.5px;color:var(--muted)">'+esc(_ph(c.phone)||c.phone||'')+(c.current_step?' · Step '+c.current_step:'')+'</span></span>'
        + (t?'<span style="font-size:11.5px;color:var(--muted);white-space:nowrap">'+esc(t)+'</span>':'')
        + '</button>';
    }
    function load(){
      if (busy) return; busy = true;
      var mb = ov.querySelector('.sd-more-btn'); if (mb) { mb.disabled = true; mb.textContent = 'Loading…'; }
      api.request('GET','/drip-sequences/'+encodeURIComponent(seqId)+'/scheduled?date='+encodeURIComponent(dateStr)+'&limit='+PAGE+'&offset='+offset).then(function(r){
        var dd = (r && r.data) || r || {}; var list = dd.contacts || []; if (dd.total!=null) total = dd.total; // api.request may hand back the unwrapped payload
        if (offset===0){ body.innerHTML=''; if(!list.length){ body.innerHTML='<div style="padding:26px;text-align:center;color:var(--muted);font-size:13px">No contacts scheduled for this day.</div>'; } }
        body.insertAdjacentHTML('beforeend', list.map(rowHtml).join(''));
        loaded += list.length; offset += list.length;
        var sub = ov.querySelector('.sd-sub'); if(sub) sub.textContent = num(total) + ' contact' + (total===1?'':'s') + ' set to send';
        var more = ov.querySelector('.sd-more'); if(more) more.style.display = (loaded < total && list.length) ? '' : 'none';
        if (mb) { mb.disabled = false; mb.textContent = 'Load more'; }
      }).catch(function(){ if(offset===0) body.innerHTML='<div style="padding:26px;text-align:center;color:var(--muted);font-size:13px">Could not load. Try again.</div>'; if (mb) { mb.disabled=false; mb.textContent='Load more'; } })
        .then(function(){ busy = false; });
    }
    var moreBtn = ov.querySelector('.sd-more-btn'); if(moreBtn) moreBtn.onclick = load;
    // Row click → open that contact's card (navigate to Contacts, like the list-detail modal).
    body.addEventListener('click', function(e){
      var row = e.target.closest('.sd-row'); if(!row) return;
      var cid = row.getAttribute('data-cid'); if(!cid) return;
      var seed = { name: row.getAttribute('data-nm')||'', phone: row.getAttribute('data-ph')||'' };
      close();
      try{ if(window.__rsmsShowTab) window.__rsmsShowTab('contacts'); }catch(_){}
      setTimeout(function(){ try{ if(window.__rsmsOpenContactDetail) window.__rsmsOpenContactDetail(cid, seed); }catch(_){} }, 240);
    });
    load();
  }
  // Delegated: click (or Enter/Space) a scheduled-day cell → open the drawer.
  document.addEventListener('click', function(e){
    var cell = e.target.closest && e.target.closest('.rsms-sched-cell[data-schedday]'); if(!cell) return;
    var block = cell.closest('[data-seqid]'); var seqId = block && block.getAttribute('data-seqid');
    if(!seqId) return;
    e.preventDefault();
    openScheduledDay(seqId, cell.getAttribute('data-schedday'), parseInt(cell.getAttribute('data-schedcount'),10)||0);
  });
  document.addEventListener('keydown', function(e){
    if (e.key!=='Enter' && e.key!==' ') return;
    var cell = e.target && e.target.closest && e.target.closest('.rsms-sched-cell[data-schedday]'); if(!cell) return;
    var block = cell.closest('[data-seqid]'); var seqId = block && block.getAttribute('data-seqid'); if(!seqId) return;
    e.preventDefault();
    openScheduledDay(seqId, cell.getAttribute('data-schedday'), parseInt(cell.getAttribute('data-schedcount'),10)||0);
  });
  // "Clear unsent" modal — choose how much to remove (all / keep the oldest N /
  // added-after a date), with a live count preview, before deleting. Backs the
  // /drip-sequences/:id/remove-unsent endpoint (modes all|keep|after).
  function openClearUnsent(seq, parentOv){
    if (!seq || !api.request) return;
    var mode = 'all', keepN = '', afterTs = '';
    function isoToLocal(iso){ try{ var d=new Date(iso); if(isNaN(d.getTime()))return ''; var p=function(n){return ('0'+n).slice(-2);}; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes()); }catch(e){return '';} }
    (function(){ var d = new Date(); d.setHours(0,0,0,0); afterTs = isoToLocal(d.toISOString()); })();
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(20,22,40,.45);display:flex;align-items:flex-start;justify-content:center;padding:44px 16px;overflow:auto';
    function radio(val,label,extra){ return '<label class="cu-opt" data-mode="'+val+'" style="display:flex;align-items:flex-start;gap:11px;padding:12px 13px;border:1px solid var(--hairline-strong,#E2E4E9);border-radius:11px;cursor:pointer;transition:.12s"><span class="cu-dot" style="width:18px;height:18px;border-radius:50%;border:1.5px solid var(--hairline-strong,#E2E4E9);flex:none;margin-top:1px;display:flex;align-items:center;justify-content:center"></span><span style="flex:1;min-width:0"><span style="font-size:13.5px;font-weight:550;color:var(--ink,#1A1A2E)">'+label+'</span>'+(extra||'')+'</span></label>'; }
    var SPARK = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2l1.6 4.6L18 8l-4.4 1.4L12 14l-1.6-4.6L6 8l4.4-1.4L12 2z"/></svg>';
    ov.innerHTML = '<div style="background:var(--card,#fff);border-radius:16px;max-width:440px;width:100%;box-shadow:0 20px 60px rgba(20,22,40,.3);overflow:hidden" role="dialog" aria-label="Clear unsent">'
      + '<div style="display:flex;align-items:flex-start;gap:10px;padding:17px 18px 14px;border-bottom:1px solid var(--hairline,#EAEBEF)"><div style="flex:1"><div style="font-size:16px;font-weight:680;letter-spacing:-.01em;color:var(--ink,#1A1A2E)">Clear unsent</div><div style="margin-top:3px;font-size:12.5px;color:var(--muted,#6F7287);line-height:1.45">Remove people who haven’t been texted yet from “'+esc(seq.name||'this sequence')+'”. Anyone already texted stays in.</div></div><button type="button" class="cu-x" aria-label="Close" style="border:0;background:none;cursor:pointer;color:var(--muted,#6F7287);font-size:24px;line-height:.8">&times;</button></div>'
      + '<div style="padding:16px 18px 4px">'
      // AI helper — just describe it in plain words.
      + '<div style="display:flex;gap:8px;align-items:stretch"><input class="cu-ai" type="text" placeholder="Describe it — e.g. “remove what I added today”" style="flex:1;min-width:0;height:38px;padding:0 12px;border:1px solid var(--hairline-strong,#E2E4E9);border-radius:9px;font:inherit;font-size:13px"><button type="button" class="cu-ai-go" style="height:38px;padding:0 14px;border-radius:9px;border:0;background:var(--accent,#2563EB);color:#fff;font:inherit;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;flex:none">'+SPARK+'Ask</button></div>'
      + '<div class="cu-ai-note" style="display:none;margin-top:8px;font-size:12px;line-height:1.4"></div>'
      + '<div style="display:flex;align-items:center;gap:10px;margin:14px 0 11px"><span style="height:1px;background:var(--hairline,#EAEBEF);flex:1"></span><span style="font-size:11px;color:var(--faint,#9A9DAF);font-weight:550;text-transform:uppercase;letter-spacing:.05em">or choose</span><span style="height:1px;background:var(--hairline,#EAEBEF);flex:1"></span></div>'
      + '<div style="display:flex;flex-direction:column;gap:9px">'
      +   radio('all','Clear all unsent')
      +   radio('keep','Keep the oldest…','<div style="margin-top:8px;display:flex;align-items:center;gap:8px"><input class="cu-keep" type="number" min="0" placeholder="e.g. 2,600" style="width:120px;height:34px;padding:0 10px;border:1px solid var(--hairline-strong,#E2E4E9);border-radius:8px;font:inherit;font-size:13px"><span style="font-size:12.5px;color:var(--muted,#6F7287)">recipients, remove the rest</span></div>')
      +   radio('after','Remove anyone added after…','<div style="margin-top:8px;display:flex;gap:8px"><input class="cu-after-date" type="text" readonly placeholder="Date" style="flex:1;height:34px;padding:0 10px;border:1px solid var(--hairline-strong,#E2E4E9);border-radius:8px;font:inherit;font-size:13px;cursor:pointer;background:var(--card,#fff)"><input class="cu-after-time" type="text" readonly placeholder="Time" style="width:106px;height:34px;padding:0 10px;border:1px solid var(--hairline-strong,#E2E4E9);border-radius:8px;font:inherit;font-size:13px;cursor:pointer;background:var(--card,#fff)"></div>')
      + '</div>'
      + '<div class="cu-summary" style="margin-top:14px;padding:12px 14px;border-radius:11px;background:var(--bg-soft,#F7F8FA);border:1px solid var(--hairline,#EAEBEF);font-size:13.5px;color:var(--ink-2,#3F4150);line-height:1.45">Counting…</div>'
      + '</div>'
      + '<div style="display:flex;gap:10px;align-items:center;padding:14px 18px 16px"><button type="button" class="cu-cancel" style="height:38px;padding:0 16px;border-radius:9px;border:1px solid var(--hairline-strong,#E2E4E9);background:var(--card,#fff);font:inherit;font-size:13px;font-weight:600;cursor:pointer;margin-left:auto">Cancel</button><button type="button" class="cu-go" disabled style="height:38px;padding:0 18px;border-radius:9px;border:0;background:#B3403E;color:#fff;font:inherit;font-size:13px;font-weight:700;cursor:pointer;opacity:.55">Remove</button></div>'
      + '</div>';
    document.body.appendChild(ov);
    var summary = ov.querySelector('.cu-summary'), goBtn = ov.querySelector('.cu-go'), aiNote = ov.querySelector('.cu-ai-note');
    function paramsFor(){ if (mode==='keep') return { mode:'keep', keep_first: parseInt(keepN,10)||0 }; if (mode==='after') return { mode:'after', enrolled_after: afterTs ? new Date(afterTs).toISOString() : '' }; return { mode:'all' }; }
    function valid(){ if (mode==='keep') return keepN!=='' && (parseInt(keepN,10)||0) >= 0; if (mode==='after') return !!afterTs; return true; }
    function paintMode(){ ov.querySelectorAll('.cu-opt').forEach(function(o){ var on=o.getAttribute('data-mode')===mode; o.style.borderColor = on?'var(--accent,#2563EB)':'var(--hairline-strong,#E2E4E9)'; o.style.background = on?'var(--accent-tint,#EFF4FF)':'var(--card,#fff)'; var dot=o.querySelector('.cu-dot'); if(dot){ dot.style.borderColor = on?'var(--accent,#2563EB)':'var(--hairline-strong,#E2E4E9)'; dot.innerHTML = on?'<span style="width:9px;height:9px;border-radius:50%;background:var(--accent,#2563EB)"></span>':''; } }); }
    var _pt, _lastCount=0;
    function refresh(){
      paintMode();
      if (!valid()){ summary.textContent = mode==='keep'?'Enter how many to keep above.':'Pick a date above.'; goBtn.disabled=true; goBtn.style.opacity='.55'; goBtn.textContent='Remove'; return; }
      summary.textContent='Counting…'; goBtn.disabled=true; goBtn.style.opacity='.55';
      clearTimeout(_pt); _pt=setTimeout(function(){
        var p=paramsFor(); p.preview=true;
        api.request('POST','/drip-sequences/'+seq.id+'/remove-unsent', p).then(function(r){
          var n=(r && (r.count!=null?r.count:(r.data&&r.data.count)))||0; _lastCount=n;
          summary.innerHTML = n ? ('Removes <b style="color:var(--ink,#1A1A2E)">'+n.toLocaleString()+'</b> contact'+(n===1?'':'s')+' that haven’t been texted yet. The rest stay.') : 'Nothing to clear — everyone’s already been texted.';
          goBtn.disabled = !n; goBtn.style.opacity = n?'1':'.55'; goBtn.textContent = n?('Remove '+n.toLocaleString()):'Remove';
        }).catch(function(){ summary.textContent='Could not count — try again.'; });
      },300);
    }
    function askAi(){
      var inp = ov.querySelector('.cu-ai'); var q=(inp.value||'').trim(); if(!q) return;
      var btn = ov.querySelector('.cu-ai-go'); btn.disabled=true; var ob=btn.innerHTML; btn.innerHTML='…';
      aiNote.style.display='block'; aiNote.style.color='var(--muted,#6F7287)'; aiNote.textContent='Working it out…';
      api.request('POST','/drip-sequences/'+seq.id+'/clear-plan', { prompt:q }).then(function(r){
        btn.disabled=false; btn.innerHTML=ob;
        if(!r || r.success===false){ aiNote.style.color='#B3403E'; aiNote.textContent=(r&&r.error)||'Couldn’t read that — pick an option below.'; return; }
        mode = ['all','keep','after'].indexOf(r.mode)>=0 ? r.mode : 'all';
        if(mode==='keep' && r.keep_first!=null){ keepN=''+r.keep_first; var k=ov.querySelector('.cu-keep'); if(k) k.value=keepN; }
        if(mode==='after' && r.enrolled_after){ afterTs=isoToLocal(r.enrolled_after); cuAfterRender(); }
        aiNote.style.color='var(--accent-deep,#1D4ED8)'; aiNote.innerHTML = SPARK+' '+esc(r.summary||'Got it.');
        refresh();
      }).catch(function(){ btn.disabled=false; btn.innerHTML=ob; aiNote.style.color='#B3403E'; aiNote.textContent='Couldn’t reach the assistant — use the options below.'; });
    }
    ov.addEventListener('click', function(e){
      if (e.target===ov || e.target.closest('.cu-x') || e.target.closest('.cu-cancel')) { ov.remove(); return; }
      if (e.target.closest('.cu-ai-go')) { askAi(); return; }
      var opt=e.target.closest('.cu-opt'); if (opt && !e.target.closest('input')) { mode=opt.getAttribute('data-mode'); aiNote.style.display='none'; refresh(); return; }
      if (e.target.closest('.cu-go')) {
        if (goBtn.disabled) return;
        goBtn.disabled=true; goBtn.textContent='Removing…';
        api.request('POST','/drip-sequences/'+seq.id+'/remove-unsent', paramsFor()).then(function(r){
          var removed=(r && (r.removed!=null?r.removed:(r.data&&r.data.removed)))||_lastCount;
          ov.remove(); if (parentOv) parentOv.remove(); seqLoading=false; loadSequences();
          if (window.__rsmsToast) window.__rsmsToast('Cleared '+removed.toLocaleString()+' unsent from the sequence');
        }).catch(function(){ goBtn.disabled=false; goBtn.textContent='Remove'; summary.textContent='Could not remove — try again.'; });
        return;
      }
    });
    ov.querySelector('.cu-ai').addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); askAi(); } });
    ov.querySelector('.cu-keep').addEventListener('input', function(){ keepN=this.value; mode='keep'; aiNote.style.display='none'; refresh(); });
    function cuAfterRender(){ var dEl=ov.querySelector('.cu-after-date'), tEl=ov.querySelector('.cu-after-time'); if(!dEl||!tEl) return; var ymd=(afterTs||'').split('T')[0]||'', hhmm=(afterTs||'').split('T')[1]||''; dEl.value=(ymd&&window.__rsmsFmtYMD)?window.__rsmsFmtYMD(ymd):ymd; tEl.value=(hhmm&&window.__rsmsFmtTime12)?window.__rsmsFmtTime12(hhmm):hhmm; }
    var _cad=ov.querySelector('.cu-after-date'); if(_cad) _cad.addEventListener('click', function(){ if(!window.__rsmsOpenDatePopover) return; var ymd=(afterTs||'').split('T')[0]||''; window.__rsmsOpenDatePopover(_cad, ymd, function(y){ var hhmm=(afterTs||'').split('T')[1]||'09:00'; afterTs=y+'T'+hhmm; mode='after'; aiNote.style.display='none'; cuAfterRender(); refresh(); }); });
    var _cat=ov.querySelector('.cu-after-time'); if(_cat) _cat.addEventListener('click', function(){ if(!window.__rsmsOpenTimePopover) return; var hhmm=(afterTs||'').split('T')[1]||''; window.__rsmsOpenTimePopover(_cat, hhmm, function(h){ var ymd=(afterTs||'').split('T')[0]||(new Date().toISOString().split('T')[0]); afterTs=ymd+'T'+h; mode='after'; aiNote.style.display='none'; cuAfterRender(); refresh(); }); });
    cuAfterRender();
    refresh();
  }
  function openSeqDetail(s){
    if (!s) return;
    var stArr = Array.isArray(s.steps) ? s.steps.slice().sort(seqByOrder) : [];
    var structural = !stArr.some(function(st){ return st.step_type === 'if_else'; });
    var ed = { steps: stArr.map(seqStepClone) };
    var statusCls = /active/i.test(s.status) ? 'st-green' : /paused/i.test(s.status) ? 'st-amber' : 'st-gray';
    var paused = /paused/i.test(s.status);
    var enrolled = parseInt(s.enrolled_count != null ? s.enrolled_count : s.total_enrolled, 10) || 0;
    var today = parseInt(s.queued_today, 10) || 0, due = parseInt(s.past_due, 10) || 0;
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(20,22,40,.45);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto';
    ov.innerHTML = '<div style="background:var(--card,#fff);border-radius:16px;max-width:560px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3);overflow:hidden" role="dialog" aria-label="Sequence detail">'
      + '<div style="display:flex;align-items:flex-start;gap:10px;padding:16px 18px;border-bottom:1px solid var(--hairline)"><div style="flex:1;min-width:0"><div class="rsms-seq-title" style="font-size:16px;font-weight:680;letter-spacing:-.01em">' + esc(s.name || 'Sequence') + ' <button type="button" class="rsms-seq-rename" title="Rename" style="border:0;background:none;cursor:pointer;color:var(--muted);font-size:13px;vertical-align:baseline">✎</button></div><div style="margin-top:4px"><span class="status ' + statusCls + '"><i></i>' + esc(s.status || 'draft') + '</span></div></div><button type="button" class="rsms-seq-x" aria-label="Close" style="border:0;background:none;cursor:pointer;color:var(--muted);font-size:24px;line-height:.8">&times;</button></div>'
      + '<div style="padding:16px 18px;max-height:62vh;overflow:auto">'
      + '<div style="display:flex;gap:22px;margin-bottom:16px;font-size:12px;color:var(--muted)"><span><b style="color:var(--ink);font-size:16px">' + num(enrolled) + '</b><br>Active enrolled</span><span><b style="color:var(--ink);font-size:16px">' + num(today) + '</b><br>Queued today</span>' + (due ? '<span><b style="color:#DC2626;font-size:16px">' + num(due) + '</b><br>Past due</span>' : '') + '</div>'
      + seqScheduleHtml(s)
      + '<div class="rsms-seq-count" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);margin-bottom:9px">Steps (' + ed.steps.length + ')</div>'
      + '<div class="rsms-seq-steps"></div>'
      + '<div class="rsms-seq-winwrap"></div></div>'
      + '<div style="display:flex;gap:10px;align-items:center;padding:13px 18px;border-top:1px solid var(--hairline);flex-wrap:wrap">'
      + '<button type="button" class="rsms-seq-delete" style="border:0;background:none;color:#DC2626;font:inherit;font-size:12.5px;cursor:pointer;padding:0">Delete</button>'
      + '<button type="button" class="rsms-seq-clear" title="Remove everyone not yet texted from this sequence" style="border:0;background:none;color:var(--muted);font:inherit;font-size:12.5px;cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:2px">Clear unsent</button>'
      + '<button type="button" class="rsms-seq-sendnow" disabled title="Pull the next scheduled batch forward to send now — capped at one day\'s pace, so it can\'t over-fire" style="border:0;background:none;color:var(--accent,#2563EB);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;padding:0;opacity:.5">Send now</button>'
      + '<span class="rsms-seq-status" style="font-size:12px;color:var(--muted);margin-left:auto;text-align:right;max-width:190px;line-height:1.3"></span>'
      + '<button type="button" class="rsms-seq-toggle" data-to="' + (paused?'active':'paused') + '" style="height:36px;padding:0 14px;border-radius:8px;border:1px solid var(--hairline-strong);background:var(--card);font:inherit;font-size:13px;font-weight:600;cursor:pointer;flex:none">' + (paused?'Resume':'Pause') + '</button>'
      + '<button type="button" class="rsms-seq-save" style="height:36px;padding:0 18px;border-radius:8px;border:0;background:var(--accent);color:#fff;font:inherit;font-size:13px;font-weight:700;cursor:pointer;flex:none">Save changes</button>'
      + '</div></div>';
    document.body.appendChild(ov);
    var stat = ov.querySelector('.rsms-seq-status');
    var setStat = function(txt, bad){ if (stat){ stat.textContent = txt || ''; stat.style.color = bad ? '#DC2626' : (bad === false ? '#16A34A' : 'var(--muted)'); } };
    // "Send now" labels itself with the real count it would release (server-computed,
    // capped at one day's pace) — a bare "Send now" hid whether it'd fire 3 or 3,000.
    var snBtn = ov.querySelector('.rsms-seq-sendnow');
    function renderSendNow(ready){
      if (!snBtn) return;
      var n = Number(ready) || 0;
      snBtn.disabled = n <= 0;
      snBtn.style.opacity = n > 0 ? '1' : '.5';
      snBtn.style.cursor = n > 0 ? 'pointer' : 'default';
      snBtn.textContent = n > 0 ? ('Send ' + num(n) + ' now') : 'Nothing to send now';
    }
    function refreshSendNow(){
      api.request('POST', '/drip-sequences/' + s.id + '/send-now', { preview: true })
        .then(function(r){ var d = (r && (r.data || r)) || {}; renderSendNow(d.ready); })
        .catch(function(){ if (snBtn) snBtn.textContent = 'Send now'; });
    }
    refreshSendNow();
    seqRenderSteps(ov, ed, structural);
    var winWrap = ov.querySelector('.rsms-seq-winwrap'); if (winWrap) winWrap.innerHTML = seqWindowHtml(seqWinFromSeq(s));
    seqWireDelayLabel(ov);
    seqWireWindow(ov);
    var structuralClick = seqStructuralClick(ov, ed, structural, setStat);
    var delArmed = false, delTimer = null;
    ov.addEventListener('click', function(e){
      if (e.target === ov || e.target.closest('.rsms-seq-x')) { ov.remove(); return; }
      if (structuralClick(e)) return;
      if (seqWindowClick(ov, e)) return;
      var asgChip = e.target.closest('.rsms-asg-chip');
      if (asgChip) {
        var block = asgChip.closest('.rsms-sched-block'); if (!block) return;
        var cache = seqSchedCache[block.getAttribute('data-sid')]; if (!cache) return;
        var key = asgChip.getAttribute('data-asg');
        var bd = key === '__all' ? cache.all : ((cache.asg[parseInt(key,10)] && cache.asg[parseInt(key,10)].byDate) || {});
        var grid = block.querySelector('.rsms-sched-grid'); if (grid) grid.innerHTML = seqGridCells(bd);
        block.querySelectorAll('.rsms-asg-chip').forEach(function(c){
          var on = c === asgChip;
          c.style.borderColor = on ? 'var(--accent,#2563EB)' : 'var(--hairline-strong,#E2E4E9)';
          c.style.background = on ? 'var(--accent,#2563EB)' : 'var(--card,#fff)';
          c.style.color = on ? '#fff' : 'var(--ink-2,#475569)';
        });
        return;
      }
      var rn = e.target.closest('.rsms-seq-rename');
      if (rn) {
        var tw = ov.querySelector('.rsms-seq-title'); if (!tw) return;
        tw.innerHTML = '<input class="rsms-seq-nameinput" value="' + esc(s.name || '') + '" style="font-size:15px;font-weight:680;border:1px solid var(--hairline-strong);border-radius:7px;padding:5px 8px;width:64%;font-family:inherit"> <button type="button" class="rsms-seq-rename-save" style="height:30px;padding:0 12px;border-radius:7px;border:0;background:var(--accent);color:#fff;font:inherit;font-size:12px;font-weight:700;cursor:pointer">Save</button>';
        var inp = tw.querySelector('input'); if (inp) { inp.focus(); inp.select(); inp.addEventListener('keydown', function(ev){ if (ev.key === 'Enter') { ev.preventDefault(); var b = ov.querySelector('.rsms-seq-rename-save'); if (b) b.click(); } }); }
        return;
      }
      var rs = e.target.closest('.rsms-seq-rename-save');
      if (rs) {
        var ni = ov.querySelector('.rsms-seq-nameinput'); if (!ni) return;
        var nm = ni.value.trim(); if (!nm) { setStat('Name required.', true); return; }
        if (!api.renameSequence) { setStat('Rename not available.', true); return; }
        ni.disabled = true; rs.disabled = true;
        api.renameSequence(s.id, nm).then(function(r){
          if (r && r.success) {
            s.name = nm; if (_seqMap[s.id]) _seqMap[s.id].name = nm;
            var tw2 = ov.querySelector('.rsms-seq-title'); if (tw2) tw2.innerHTML = esc(nm) + ' <button type="button" class="rsms-seq-rename" title="Rename" style="border:0;background:none;cursor:pointer;color:var(--muted);font-size:13px;vertical-align:baseline">✎</button>';
            setStat('Renamed ✓', false); seqLoading = false; loadSequences();
          } else { setStat((r && (r.error || r.message)) || 'Could not rename', true); ni.disabled = false; rs.disabled = false; }
        }).catch(function(){ setStat('Could not rename', true); ni.disabled = false; rs.disabled = false; });
        return;
      }
      var del = e.target.closest('.rsms-seq-delete');
      if (del) {
        if (!delArmed) { delArmed = true; del.textContent = 'Click again to delete'; del.style.fontWeight = '700'; setStat('Deletes the sequence + all enrollments.', true); delTimer = setTimeout(function(){ delArmed = false; del.textContent = 'Delete'; del.style.fontWeight = ''; setStat(''); }, 4000); return; }
        clearTimeout(delTimer); delArmed = false;
        if (!api.deleteSequence) { setStat('Delete not available.', true); return; }
        del.textContent = 'Deleting…'; del.disabled = true;
        api.deleteSequence(s.id).then(function(r){
          if (r && r.success) { ov.remove(); seqLoading = false; loadSequences(); if (window.__rsmsToast) window.__rsmsToast('Sequence deleted'); }
          else { setStat((r && (r.error || r.message)) || 'Could not delete', true); del.textContent = 'Delete'; del.disabled = false; }
        }).catch(function(){ setStat('Could not delete', true); del.textContent = 'Delete'; del.disabled = false; });
        return;
      }
      var sv = e.target.closest('.rsms-seq-save');
      if (sv) {
        seqSyncFromDom(ov, ed);
        var emptyIdx = seqFirstEmpty(ed.steps);
        if (emptyIdx >= 0) { setStat('Step ' + (emptyIdx + 1) + ' needs a message.', true); return; }
        if (!ed.steps.length) { setStat('Add at least one step.', true); return; }
        if (!api.updateSequenceSteps) { setStat('Editing not available — use the full editor.', true); return; }
        var winChk = seqValidateWindow(seqReadWindow(ov));
        if (!winChk.ok) { setStat(winChk.msg, true); return; }
        sv.disabled = true; sv.textContent = 'Saving…'; setStat('');
        api.updateSequenceSteps(s.id, ed.steps).then(function(r){
          if (!(r && r.success)) {
            var m = (r && (r.message || r.error)) || 'Could not save';
            if (r && r.step_index != null) m = 'Step ' + (r.step_index + 1) + ': ' + m;
            setStat(m, true); sv.disabled = false; sv.textContent = 'Save changes'; return;
          }
          if (Array.isArray(r.data)) { s.steps = r.data; if (_seqMap[s.id]) _seqMap[s.id].steps = r.data; ed.steps = r.data.slice().sort(seqByOrder).map(seqStepClone); seqRenderSteps(ov, ed, structural); }
          // Steps saved — now persist the sending window (best-effort; report if it fails).
          var winSave = (winChk.payload && api.updateDeliveryWindow) ? api.updateDeliveryWindow(s.id, winChk.payload) : Promise.resolve({ success: true });
          winSave.then(function(rw){
            sv.disabled = false; sv.textContent = 'Save changes';
            if (winChk.payload) { s.delivery_window_start = winChk.payload.delivery_window_start; s.delivery_window_end = winChk.payload.delivery_window_end; s.delivery_window_days = winChk.payload.delivery_window_days; s.timezone = winChk.payload.timezone; if (_seqMap[s.id]) { _seqMap[s.id].delivery_window_start = s.delivery_window_start; _seqMap[s.id].delivery_window_end = s.delivery_window_end; _seqMap[s.id].delivery_window_days = s.delivery_window_days; _seqMap[s.id].timezone = s.timezone; } }
            if (rw && rw.success === false) { setStat('Steps saved, but the window didn’t — ' + ((rw.error || rw.message) || 'try again'), true); }
            else { setStat('Saved ✓', false); if (window.__rsmsToast) window.__rsmsToast('Sequence saved'); }
          }).catch(function(){ sv.disabled = false; sv.textContent = 'Save changes'; setStat('Steps saved, but the window didn’t — try again.', true); });
        }).catch(function(){ setStat('Could not save — try again.', true); sv.disabled = false; sv.textContent = 'Save changes'; });
        return;
      }
      var cu = e.target.closest('.rsms-seq-clear');
      if (cu) { openClearUnsent(s, ov); return; }
      var sn = e.target.closest('.rsms-seq-sendnow');
      if (sn) {
        sn.disabled = true; sn.textContent = '…'; setStat('Releasing the next batch to send now…');
        api.request('POST', '/drip-sequences/' + s.id + '/send-now', {}).then(function (r) {
          var d = (r && (r.data || r)) || {};
          if (r && r.success !== false && d.released != null) {
            if (d.released > 0) { setStat(Number(d.released).toLocaleString() + ' released to send now (one day’s pace).', false); if (window.__rsmsToast) window.__rsmsToast(Number(d.released).toLocaleString() + ' releasing now'); }
            else { setStat(d.reason || 'Nothing to pull forward right now.', false); }
          } else { setStat((r && r.error) || 'Could not send now.', true); }
          refreshSendNow(); // re-label with what's left to release
        }).catch(function () { setStat('Could not send now — try again.', true); refreshSendNow(); });
        return;
      }
      var tg = e.target.closest('.rsms-seq-toggle');
      if (tg) {
        var to = tg.getAttribute('data-to');
        tg.disabled = true; tg.textContent = '…';
        (api.updateSequenceStatus ? api.updateSequenceStatus(s.id, to) : Promise.reject()).then(function(){ ov.remove(); seqLoading = false; loadSequences(); if (window.__rsmsToast) window.__rsmsToast('Sequence ' + (to==='paused'?'paused':'resumed')); }).catch(function(){ tg.disabled = false; tg.textContent = (to==='paused'?'Pause':'Resume'); if (window.__rsmsToast) window.__rsmsToast('Could not update the sequence'); });
        return;
      }
    });
  }

  function openSeqCreate(){
    var structural = true;
    var ed = { steps: [seqStepClone({})] };
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(20,22,40,.45);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto';
    ov.innerHTML = '<div style="background:var(--card,#fff);border-radius:16px;max-width:560px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3);overflow:hidden" role="dialog" aria-label="New sequence">'
      + '<div style="display:flex;align-items:flex-start;gap:10px;padding:16px 18px;border-bottom:1px solid var(--hairline)"><div style="flex:1;min-width:0"><div style="font-size:16px;font-weight:680;letter-spacing:-.01em">New sequence</div><div style="margin-top:3px;font-size:12px;color:var(--muted)">Contacts advance one step at a time</div></div><button type="button" class="rsms-seq-x" aria-label="Close" style="border:0;background:none;cursor:pointer;color:var(--muted);font-size:24px;line-height:.8">&times;</button></div>'
      + '<div style="padding:16px 18px;max-height:60vh;overflow:auto">'
      + '<label style="display:block;font-size:12px;font-weight:600;color:var(--muted);margin-bottom:5px">Sequence name</label>'
      + '<input class="rsms-seq-newname" placeholder="e.g. Realtor follow-up" style="width:100%;box-sizing:border-box;border:1px solid var(--hairline-strong,#d8d8e0);border-radius:8px;padding:9px 11px;font:inherit;font-size:14px;color:var(--ink);background:var(--card,#fff);margin-bottom:16px">'
      + '<div class="rsms-seq-count" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);margin-bottom:9px">Steps (1)</div>'
      + '<div class="rsms-seq-steps"></div>'
      + '<div class="rsms-seq-winwrap"></div>'
      + '<label style="display:flex;gap:8px;align-items:flex-start;margin-top:16px;font-size:12px;color:var(--muted);line-height:1.45"><input type="checkbox" class="rsms-seq-consent" style="margin-top:2px;flex:none"> <span>I confirm I have a lawful basis (prior express consent) to message every contact I enroll in this sequence.</span></label>'
      + '</div>'
      + '<div style="display:flex;gap:10px;align-items:center;padding:13px 18px;border-top:1px solid var(--hairline)">'
      + '<span class="rsms-seq-status" style="font-size:12px;color:var(--muted);margin-right:auto;max-width:230px;line-height:1.3"></span>'
      + '<button type="button" class="rsms-seq-x" style="height:36px;padding:0 14px;border-radius:8px;border:1px solid var(--hairline-strong);background:var(--card);font:inherit;font-size:13px;font-weight:600;cursor:pointer">Cancel</button>'
      + '<button type="button" class="rsms-seq-create" style="height:36px;padding:0 18px;border-radius:8px;border:0;background:var(--accent);color:#fff;font:inherit;font-size:13px;font-weight:700;cursor:pointer">Create sequence</button>'
      + '</div></div>';
    document.body.appendChild(ov);
    var stat = ov.querySelector('.rsms-seq-status');
    var setStat = function(txt, bad){ if (stat){ stat.textContent = txt || ''; stat.style.color = bad ? '#DC2626' : (bad === false ? '#16A34A' : 'var(--muted)'); } };
    seqRenderSteps(ov, ed, structural);
    var cWinWrap = ov.querySelector('.rsms-seq-winwrap'); if (cWinWrap) cWinWrap.innerHTML = seqWindowHtml(seqWinDefault());
    seqWireDelayLabel(ov);
    seqWireWindow(ov);
    var structuralClick = seqStructuralClick(ov, ed, structural, setStat);
    ov.addEventListener('click', function(e){
      if (e.target === ov || e.target.closest('.rsms-seq-x')) { ov.remove(); return; }
      if (structuralClick(e)) return;
      if (seqWindowClick(ov, e)) return;
      var cr = e.target.closest('.rsms-seq-create');
      if (cr) {
        seqSyncFromDom(ov, ed);
        var nameInp = ov.querySelector('.rsms-seq-newname');
        var name = nameInp ? nameInp.value.trim() : '';
        if (!name) { setStat('Name your sequence.', true); if (nameInp) nameInp.focus(); return; }
        var emptyIdx = seqFirstEmpty(ed.steps);
        if (emptyIdx >= 0) { setStat('Step ' + (emptyIdx + 1) + ' needs a message.', true); return; }
        var consent = ov.querySelector('.rsms-seq-consent');
        if (!consent || !consent.checked) { setStat('Confirm consent to create.', true); return; }
        if (!api.createDripSequence) { setStat('Create not available.', true); return; }
        var winChk = seqValidateWindow(seqReadWindow(ov));
        if (!winChk.ok) { setStat(winChk.msg, true); return; }
        cr.disabled = true; cr.textContent = 'Creating…'; setStat('');
        api.createDripSequence({ name: name, steps: ed.steps, consent_attested: true }).then(function(r){
          if (!(r && r.success)) {
            var m = (r && (r.error || r.message)) || 'Could not create';
            if (r && r.step_index != null) m = 'Step ' + (r.step_index + 1) + ': ' + m;
            setStat(m, true); cr.disabled = false; cr.textContent = 'Create sequence'; return;
          }
          var newId = r.data && r.data.id;
          // Sequence created — apply the chosen sending window before closing.
          var winSave = (newId && winChk.payload && api.updateDeliveryWindow) ? api.updateDeliveryWindow(newId, winChk.payload) : Promise.resolve({ success: true });
          winSave.then(function(){ ov.remove(); seqLoading = false; loadSequences(); if (window.__rsmsToast) window.__rsmsToast('Sequence created'); })
                 .catch(function(){ ov.remove(); seqLoading = false; loadSequences(); if (window.__rsmsToast) window.__rsmsToast('Created — set its window in the sequence'); });
        }).catch(function(){ setStat('Could not create — try again.', true); cr.disabled = false; cr.textContent = 'Create sequence'; });
        return;
      }
    });
  }

  function seqTable(){ var p = pane(); if (!p) return null; var w = p.querySelector('[data-panel-for="sequences"]'); return w ? w.querySelector('table.mlog-table') : null; }
  function wireSeqNewBtn(){
    var p = pane(); if (!p) return;
    var w = p.querySelector('[data-panel-for="sequences"]'); if (!w) return;
    var btn = w.querySelector('.card-head .link-btn'); if (!btn || btn.__seqNew) return;
    btn.__seqNew = 1; btn.removeAttribute('href');
    btn.addEventListener('click', function(e){ e.preventDefault(); openSeqCreate(); });
  }
  // Exposed so the unified Blasts list (mercury-live.js) can open a sequence's
  // detail/edit modal directly when a sequence row is clicked. openSeqDetail is
  // a hoisted declaration in this IIFE; assigning here closes over it + helpers.
  if (typeof window !== 'undefined') window.__rsmsOpenSeqDetail = openSeqDetail;
  function loadSequences(){
    var table = seqTable(); if (!table) return; if (seqLoading) return;
    wireSeqNewBtn();
    if (!api.getDripSequences){ tableMsg(table, 4, 'No sequences yet. <a class="link-btn" href="#" data-rsmsact="new-seq" onclick="event.preventDefault()">Create your first sequence →</a>'); return; }
    seqLoading = true; tableMsg(table, 4, 'Loading sequences…');
    Promise.resolve().then(function(){ return api.getDripSequences(); }).then(function(r){
      var list = asArray(r);
      if (!list.length){ tableMsg(table, 4, 'No sequences yet.'); return; }
      var tb = table.tBodies[0] || $('tbody', table); if (!tb) return;
      _seqMap = {};
      tb.innerHTML = list.map(function(s){
        _seqMap[s.id] = s;
        var steps = Array.isArray(s.steps) ? s.steps.length : (parseInt(s.step_count, 10) || 0);
        var enrolled = parseInt(s.enrolled_count != null ? s.enrolled_count : s.active_enrollments, 10) || 0;
        var st = SEQ_ST[('' + (s.status || 'draft')).toLowerCase()] || ['st-gray', s.status || 'Draft'];
        var when = s.updated_at || s.created_at;
        return '<tr data-seq-id="' + s.id + '" style="cursor:pointer" title="Open sequence"><td><div class="blast-name">' + esc(s.name || 'Untitled sequence') + '</div>'
          + (when ? '<div class="blast-date">Updated ' + esc(fmtDate(when)) + '</div>' : '') + '</td>'
          + '<td class="blast-num">' + steps + '</td>'
          + '<td class="blast-num">' + (enrolled ? num(enrolled) : '<span class="blast-empty-dash">—</span>') + '</td>'
          + '<td><span class="status ' + st[0] + '"><i></i>' + esc(st[1]) + '</span></td></tr>';
      }).join('');
      // rows were dead (no click handler) — Kevin: "I can see my campaigns but cant open them"
      if (!tb.__seqClick) { tb.__seqClick = 1; tb.addEventListener('click', function(e){ var tr = e.target.closest('tr[data-seq-id]'); if (tr) openSeqDetail(_seqMap[tr.getAttribute('data-seq-id')]); }); }
    }).catch(function(){ tableMsg(table, 4, 'Could not load sequences. <a class="link-btn" href="#" data-rsmsact="retry-seq" onclick="event.preventDefault()">Retry →</a>'); })
      .then(function(){ seqLoading = false; });
  }

  // ---- 3. Scheduled tab (upcoming sends + month calendar) ------------------
  var schedLoading = false;
  function schedPanel(){ var p = pane(); return p ? p.querySelector('[data-panel-for="scheduled"]') : null; }
  function loadScheduled(){
    var panel = schedPanel(); if (!panel) return; if (schedLoading) return;
    var table = panel.querySelector('table.sched-up-table');
    if (!table) return;
    if (!api.getCampaigns){ tableMsg(table, 5, emptyBillboard('Send at the perfect time', 'Schedule blasts in advance — your texts go out at the exact time you pick, even while you\'re offline. Pick a date when you build a blast.', 'Schedule a blast', 'sms-blasts')); blankCalendar(panel); return; }
    schedLoading = true; tableMsg(table, 5, 'Loading scheduled sends…');
    Promise.resolve().then(function(){ return api.getCampaigns(); }).then(function(r){
      var list = asArray(r).filter(function(c){
        var st = ('' + (c.status || '')).toLowerCase();
        return st === 'scheduled' || (st !== 'sent' && st !== 'sending' && st !== 'completed' && (c.scheduled_at || c.scheduled_for));
      });
      // Only show rows that genuinely have a future/queued schedule.
      list = list.filter(function(c){ return ('' + (c.status || '')).toLowerCase() === 'scheduled' || c.scheduled_at || c.scheduled_for; });
      var tb = table.tBodies[0] || $('tbody', table); if (!tb) return;
      if (!list.length){ tableMsg(table, 5, emptyBillboard('Schedule blasts in advance', 'Set it and forget it — your texts go out at the exact time you pick, even while you’re offline or asleep. Pick a date when you build a blast.', 'Schedule a blast', 'sms-blasts')); blankCalendar(panel); return; }
      var SEND_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>';
      tb.innerHTML = list.map(function(c){
        var when = c.scheduled_at || c.scheduled_for || c.created_at;
        var recips = parseInt(c.total_recipients != null ? c.total_recipients : (c.message_count != null ? c.message_count : c.recipients), 10) || 0;
        return '<tr><td class="blast-when">' + esc(fmtDate(when) || '—') + '</td>'
          + '<td class="blast-name">' + esc(c.name || 'Untitled') + '</td>'
          + '<td class="blast-num">' + (recips ? num(recips) : '<span class="blast-empty-dash">—</span>') + '</td>'
          + '<td><span class="sched-type">' + SEND_ICON + 'Blast</span></td>'
          + '<td></td></tr>';
      }).join('');
      blankCalendar(panel);
    }).catch(function(){ tableMsg(table, 5, emptyBillboard('Send at the perfect time', 'Schedule blasts in advance — your texts go out at the exact time you pick, even while you\'re offline. Pick a date when you build a blast.', 'Schedule a blast', 'sms-blasts')); blankCalendar(panel); })
      .then(function(){ schedLoading = false; });
  }
  // No-op. The month calendar is now REAL — renderSchedCal() in mercury-live.js
  // fills #sched-cal-grid from live scheduled sends. This used to strip hardcoded
  // June-2026 sample chips, but those are gone; stripping .sched-ev now would wipe
  // the real chips (both loaders run on the same tab, so this raced them away).
  function blankCalendar(panel){ /* real calendar now — nothing to strip */ }

  // ---- 4. Templates tab (real message templates) ---------------------------
  var tplLoading = false;
  function tplGrid(){ var p = pane(); if (!p) return null; var w = p.querySelector('[data-panel-for="templates"]'); return w ? w.querySelector('table.mlog-table tbody') : null; }
  function gridMsg(grid, html){ if (grid) grid.innerHTML = '<div style="grid-column:1/-1;padding:34px 16px;text-align:center;color:var(--muted);font-size:13px">' + html + '</div>'; }
  var _tplMap = {};
  function wireTmplNewBtn(){
    var p = pane(); if (!p) return;
    var w = p.querySelector('[data-panel-for="templates"]'); if (!w) return;
    var btn = w.querySelector('.auto-new-btn'); if (!btn || btn.__tmplNew) return;
    btn.__tmplNew = 1; btn.addEventListener('click', function(e){ e.preventDefault(); openTmplEditor(null); });
    // "Browse presets" next to the New button so it's reachable even once you
    // have your own templates (the empty-state billboard also offers it).
    if (!w.__presetBtn) { w.__presetBtn = 1; var pb = document.createElement('button'); pb.type = 'button'; pb.className = 'axn-btn'; pb.textContent = 'Browse presets'; pb.setAttribute('data-rsmsact', 'browse-presets'); pb.style.marginLeft = '8px'; if (btn.parentNode) btn.parentNode.insertBefore(pb, btn.nextSibling); }
  }
  function loadTemplates(){
    var grid = tplGrid(); if (!grid) return; if (tplLoading) return;
    wireTmplNewBtn();
    if (!api.getTemplates){ grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px 16px"><div style="font-size:17px;font-weight:700;color:var(--ink);margin-bottom:6px">Save time on your common texts</div><div style="font-size:13px;color:var(--muted);max-width:430px;margin:0 auto 16px;line-height:1.5">Build a template once — follow-ups, confirmations, reminders — and reuse it across blasts, automations and the inbox. No retyping every time.</div><button type="button" class="auto-new-btn" data-rsmsact="new-tmpl">+ Create a template</button></div>'; return; }
    tplLoading = true; gridMsg(grid, 'Loading templates…');
    Promise.resolve().then(function(){ return api.getTemplates('mine'); }).then(function(r){
      var list = asArray(r);
      if (!list.length){ grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:44px 16px"><div style="font-size:18px;font-weight:700;color:var(--ink);margin-bottom:6px">Save time on your common texts</div><div style="font-size:13px;color:var(--muted);max-width:460px;margin:0 auto 18px;line-height:1.5">Build a template once — follow-ups, confirmations, reminders — and reuse it across blasts, automations and the inbox. Start from scratch, let AI draft one, or grab a ready-made preset.</div><div style="display:flex;gap:9px;justify-content:center;flex-wrap:wrap"><button type="button" class="auto-new-btn" data-rsmsact="new-tmpl">+ Start from scratch</button><button type="button" class="auto-new-btn" data-rsmsact="ai-tmpl" style="background:var(--ai-grad,linear-gradient(135deg,#7C5CE6,#5B8DEF))">✦ Draft with AI</button><button type="button" class="axn-btn" data-rsmsact="browse-presets" style="height:36px;padding:0 15px">Browse preset templates</button></div></div>'; return; }
      _tplMap = {};
      grid.innerHTML = list.map(function(t){
        _tplMap[t.id] = t;
        var cat = ('' + (t.category || 'General')).trim() || 'General';
        // Premade starter-library templates come from a shared admin account — the
        // API flags them (_is_other=1 / is_shared) so a new user isn't confused
        // about where these came from. Their own templates carry no badge.
        var starter = (t._is_other === 1 || t._is_other === '1' || t.is_shared === 1 || t.is_shared === true || t.is_shared === '1');
        var uses = parseInt(t.use_count, 10) || 0;
        var body = ('' + (t.body || t.message_body || '')).trim();
        return '<tr data-tmpl-id="' + t.id + '" style="cursor:pointer" title="Use template">'
          + '<td><div class="blast-name">' + esc(t.name || 'Untitled') + (starter ? ' <span class="auto-chip auto-chip-drip" style="font-size:10px;font-weight:600;margin-left:6px;vertical-align:1px">Starter</span>' : '') + '</div>' + (body ? '<div style="font-size:12px;color:var(--muted,#667085);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:520px">' + esc(body.replace(/\s+/g, ' ').slice(0, 120)) + (body.length > 120 ? '…' : '') + '</div>' : '') + '</td>'
          + '<td>' + esc(cat) + '</td>'
          + '<td class="blast-num">' + (uses ? num(uses) : '<span class="blast-empty-dash">—</span>') + '</td>'
          + '<td>' + (t.updated_at || t.last_used_at ? esc(fmtDate(t.updated_at || t.last_used_at)) : '<span class="blast-empty-dash">—</span>') + '</td>'
          + '<td style="text-align:right;white-space:nowrap"><button type="button" class="axn-btn" data-tmpl-edit="' + t.id + '">Edit</button> <button type="button" class="axn-btn axn-btn-accent" data-tmpl-use="' + t.id + '">Use</button> <button type="button" class="axn-btn" data-tmpl-del="' + t.id + '" title="Delete template" style="color:#DC2626">Delete</button></td></tr>';
      }).join('');
    }).catch(function(){ gridMsg(grid, 'Could not load templates. <a class="link-btn" href="#" data-rsmsact="retry-tmpl" onclick="event.preventDefault()">Retry →</a>'); })
      .then(function(){ tplLoading = false; });
  }
  // Preset picker: presets are the shared "starter library" (not the user's own).
  // Instead of auto-showing them (with a broken Delete → "Template not found"),
  // let the user PICK which to keep — each chosen preset is saved as their OWN
  // template (real id, editable + deletable). GET /templates (default) returns
  // own + shared; the shared ones carry _is_other=1.
  function openPresetPicker(){
    var ov = document.createElement('div'); ov.setAttribute('data-rsms-modal','1');
    ov.style.cssText = 'position:fixed;inset:0;z-index:10010;background:rgba(17,24,39,.45);display:flex;align-items:center;justify-content:center;padding:20px';
    ov.innerHTML = '<div style="background:var(--card,#fff);border-radius:14px;width:100%;max-width:520px;max-height:86vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.25)">'
      + '<div style="padding:18px 20px 4px;font-size:15px;font-weight:650;color:var(--ink,#111)">Preset templates</div>'
      + '<div style="padding:2px 20px 0;font-size:12.5px;color:var(--muted,#6b7280)">Pick the ones you want — each is saved to your templates, so you can edit or delete it like your own.</div>'
      + '<div id="pp-list" style="padding:14px 20px 0;overflow:auto;flex:1"><div style="color:var(--muted);font-size:13px;padding:14px 0">Loading presets…</div></div>'
      + '<div style="padding:16px 20px 18px;display:flex;align-items:center;gap:8px"><span style="flex:1"></span>'
      + '<button id="pp-cancel" type="button" class="axn-btn">Cancel</button>'
      + '<button id="pp-add" type="button" class="axn-btn axn-btn-accent" disabled style="opacity:.5">Add selected</button></div></div>';
    document.body.appendChild(ov);
    function close(){ if (ov.parentNode) ov.parentNode.removeChild(ov); }
    ov.addEventListener('click', function(e){ if (e.target === ov) close(); });
    ov.querySelector('#pp-cancel').addEventListener('click', close);
    var presets = [];
    Promise.resolve(api.getTemplates()).then(function(r){
      presets = asArray(r).filter(function(t){ return Number(t._is_other) === 1; });
      var host = ov.querySelector('#pp-list'); if (!host) return;
      if (!presets.length) { host.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:14px 0">No preset templates available right now.</div>'; return; }
      host.innerHTML = presets.map(function(t){
        var body = ('' + (t.body || t.message_body || '')).trim();
        return '<label style="display:flex;gap:11px;align-items:flex-start;padding:11px 12px;border:1px solid var(--hairline-strong,#d8dee9);border-radius:10px;margin-bottom:8px;cursor:pointer"><input type="checkbox" class="pp-ck" data-i="' + esc('' + t.id) + '" style="margin-top:3px;flex:none"><div style="min-width:0"><div style="font-size:13px;font-weight:650;color:var(--ink,#111)">' + esc(t.name || 'Template') + (t.category ? ' <span style="font-weight:500;color:var(--muted);font-size:11.5px">· ' + esc(t.category) + '</span>' : '') + '</div><div style="font-size:12px;color:var(--muted);margin-top:2px;line-height:1.4">' + esc(body.replace(/\s+/g,' ').slice(0,160)) + (body.length > 160 ? '…' : '') + '</div></div></label>';
      }).join('');
    }).catch(function(){ var h = ov.querySelector('#pp-list'); if (h) h.innerHTML = '<div style="color:#b91c1c;font-size:13px;padding:14px 0">Could not load presets.</div>'; });
    ov.addEventListener('change', function(e){ if (e.target.classList && e.target.classList.contains('pp-ck')) { var n = ov.querySelectorAll('.pp-ck:checked').length; var b = ov.querySelector('#pp-add'); b.disabled = !n; b.style.opacity = n ? '1' : '.5'; b.textContent = n ? ('Add ' + n + ' template' + (n === 1 ? '' : 's')) : 'Add selected'; } });
    ov.querySelector('#pp-add').addEventListener('click', function(){
      var ids = Array.prototype.map.call(ov.querySelectorAll('.pp-ck:checked'), function(c){ return c.getAttribute('data-i'); });
      if (!ids.length) return;
      var chosen = presets.filter(function(t){ return ids.indexOf('' + t.id) >= 0; });
      var b = ov.querySelector('#pp-add'); b.disabled = true; b.textContent = 'Adding…';
      Promise.all(chosen.map(function(t){ var p = { name: t.name || 'Template', body: t.body || t.message_body || '' }; if (t.category) p.category = t.category; return api.createTemplate(p).catch(function(){ return null; }); })).then(function(res){
        var ok = res.filter(function(r){ return r && r.success !== false; }).length;
        close(); tplLoading = false; loadTemplates(); if (window.__rsmsToast) window.__rsmsToast('Added ' + ok + ' template' + (ok === 1 ? '' : 's') + ' to yours');
      });
    });
  }
  // Copy a template body for pasting into a blast/reply + bump its use count.
  function useTmpl(id){
    var t = _tplMap[id]; if (!t) return;
    var body = ('' + (t.body || t.message_body || ''));
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(body); } catch(_){}
    if (api.useTemplate) api.useTemplate(id).catch(function(){});
    if (window.__rsmsToast) window.__rsmsToast('Template copied — paste it into a blast or reply');
  }
  // Native create/edit modal — backend CRUD (routes/templates.js) + api.js already exist.
  function openTmplEditor(t){
    t = t || {}; var isEdit = !!t.id;
    // Autosave-as-draft (Anton: "if user accidentally clicks off a template it
    // needs to be a draft"). NEW templates only: restore an unsaved draft from
    // localStorage on open, persist it on close-with-content, clear it once the
    // template is actually created. No backend / is_draft column needed.
    var TPL_DRAFT_KEY = 'rsms_tmpl_draft_v1';
    var _restoredDraft = false;
    if (!isEdit) {
      var _d = null; try { _d = JSON.parse(localStorage.getItem(TPL_DRAFT_KEY) || 'null'); } catch (e) {}
      if (_d && (_d.name || _d.body || _d.category)) { t = { name: _d.name || '', category: _d.category || '', body: _d.body || '' }; _restoredDraft = true; }
    }
    // Distinct existing categories → datalist suggestions for the Category field.
    var _catSet = {}; Object.keys(_tplMap || {}).forEach(function (k) { var c = ('' + (_tplMap[k].category || '')).trim(); if (c) _catSet[c] = 1; });
    var _catOpts = Object.keys(_catSet).sort().map(function (c) { return '<option value="' + esc(c) + '">'; }).join('');
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(20,22,40,.45);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto';
    ov.innerHTML = '<div style="background:var(--card,#fff);border-radius:16px;max-width:520px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3);overflow:hidden" role="dialog" aria-label="Template">'
      + '<div style="display:flex;align-items:flex-start;gap:10px;padding:16px 18px;border-bottom:1px solid var(--hairline)"><div style="flex:1"><div style="font-size:16px;font-weight:680">' + (isEdit ? 'Edit template' : 'New template') + '</div><div style="margin-top:3px;font-size:12px;color:var(--muted)">Use {{contact.first_name}} and other merge fields</div></div><button type="button" class="rsms-tpl-x" aria-label="Close" style="border:0;background:none;cursor:pointer;color:var(--muted);font-size:24px;line-height:.8">&times;</button></div>'
      + '<div style="padding:16px 18px">'
      + '<label style="display:block;font-size:12px;font-weight:600;color:var(--muted);margin-bottom:5px">Name</label>'
      + '<input class="rsms-tpl-name" value="' + esc(t.name || '') + '" placeholder="e.g. Price drop alert" style="width:100%;box-sizing:border-box;border:1px solid var(--hairline-strong,#d8d8e0);border-radius:8px;padding:9px 11px;font:inherit;font-size:14px;color:var(--ink);background:var(--card,#fff);margin-bottom:14px">'
      + '<label style="display:block;font-size:12px;font-weight:600;color:var(--muted);margin-bottom:5px">Category <span style="font-weight:400">(optional)</span></label>'
      + '<input class="rsms-tpl-cat" list="rsms-tpl-cats" value="' + esc(t.category || '') + '" placeholder="e.g. follow-up" style="width:100%;box-sizing:border-box;border:1px solid var(--hairline-strong,#d8d8e0);border-radius:8px;padding:9px 11px;font:inherit;font-size:14px;color:var(--ink);background:var(--card,#fff);margin-bottom:14px"><datalist id="rsms-tpl-cats">' + _catOpts + '</datalist>'
      + '<div style="display:flex;align-items:center;margin-bottom:5px"><label style="font-size:12px;font-weight:600;color:var(--muted)">Message</label><span style="flex:1"></span><button type="button" class="rsms-tpl-merge" style="border:1px solid var(--hairline-strong,#d8d8e0);background:var(--card,#fff);border-radius:7px;padding:3px 9px;font:inherit;font-size:11.5px;color:var(--ink-2,#374151);cursor:pointer;margin-right:6px">{ } Insert field</button><button type="button" class="rsms-tpl-ai" style="border:0;background:var(--ai-grad);color:#fff;border-radius:7px;padding:4px 10px;font:inherit;font-size:11.5px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(37,99,235,.26)">✦ AI draft</button></div>'
      + '<textarea class="rsms-tpl-body" rows="5" placeholder="Hi {{contact.first_name}}, …" style="width:100%;box-sizing:border-box;border:1px solid var(--hairline-strong,#d8d8e0);border-radius:8px;padding:9px 11px;font:inherit;font-size:14px;line-height:1.5;color:var(--ink);background:var(--card,#fff);resize:vertical;min-height:110px">' + esc(t.body || t.message_body || '') + '</textarea>'
      + '<div class="rsms-tpl-charc" style="margin-top:6px;font-size:11.5px;color:var(--faint)"></div>'
      + '</div>'
      + '<div style="display:flex;gap:10px;align-items:center;padding:13px 18px;border-top:1px solid var(--hairline)">'
      + (isEdit ? '<button type="button" class="rsms-tpl-del" style="border:0;background:none;color:#DC2626;font:inherit;font-size:12.5px;cursor:pointer;padding:0">Delete</button>' : '')
      + '<span class="rsms-tpl-status" style="font-size:12px;color:var(--muted);margin-left:auto;text-align:right;max-width:170px;line-height:1.3"></span>'
      + '<button type="button" class="rsms-tpl-x" style="height:36px;padding:0 14px;border-radius:8px;border:1px solid var(--hairline-strong);background:var(--card);font:inherit;font-size:13px;font-weight:600;cursor:pointer;flex:none">Cancel</button>'
      + '<button type="button" class="rsms-tpl-save" style="height:36px;padding:0 18px;border-radius:8px;border:0;background:var(--accent);color:#fff;font:inherit;font-size:13px;font-weight:700;cursor:pointer;flex:none">' + (isEdit ? 'Save' : 'Create') + '</button>'
      + '</div></div>';
    document.body.appendChild(ov);
    var stat = ov.querySelector('.rsms-tpl-status');
    var setStat = function(txt, bad){ if (stat){ stat.textContent = txt || ''; stat.style.color = bad ? '#DC2626' : (bad === false ? '#16A34A' : 'var(--muted)'); } };
    var bodyEl = ov.querySelector('.rsms-tpl-body'); var charc = ov.querySelector('.rsms-tpl-charc');
    function updCharc(){ var n = (bodyEl.value || '').length; var segs = n ? Math.ceil(n / 160) : 0; charc.textContent = n + ' chars · ' + segs + ' segment' + (segs === 1 ? '' : 's'); }
    updCharc(); bodyEl.addEventListener('input', updCharc); ov.querySelector('.rsms-tpl-name').focus();
    if (_restoredDraft) setStat('Restored your unsaved draft.', false);
    ov.addEventListener('click', function(e){
      if (e.target === ov || e.target.closest('.rsms-tpl-x')) {
        // Persist as a draft if there's unsaved content; otherwise clear any stale draft.
        if (!isEdit) {
          var dn = ov.querySelector('.rsms-tpl-name').value.trim(), dc = ov.querySelector('.rsms-tpl-cat').value.trim(), db = bodyEl.value.trim();
          try {
            if (dn || db || dc) { localStorage.setItem(TPL_DRAFT_KEY, JSON.stringify({ name: dn, category: dc, body: db })); if (window.__rsmsToast) window.__rsmsToast('Saved as draft — reopen “New template” to finish'); }
            else localStorage.removeItem(TPL_DRAFT_KEY);
          } catch (_e) {}
        }
        ov.remove(); return;
      }
      var mg = e.target.closest('.rsms-tpl-merge');
      if (mg) { e.preventDefault(); if (window.__rsmsMergePop) window.__rsmsMergePop(mg, bodyEl); else setStat('Merge fields: type {{contact.first_name}}', false); return; }
      var ai = e.target.closest('.rsms-tpl-ai');
      if (ai) { e.preventDefault();
        var nm0 = (ov.querySelector('.rsms-tpl-name').value || '').trim();
        var draft = function (goal) { goal = (goal || '').trim(); if (!goal) return; ai.disabled = true; ai.textContent = 'Drafting…'; setStat('');
          api.request('POST', '/campaigns/ai-compose', { goal: goal }).then(function (r) { var d = (r && (r.data !== undefined ? r.data : r)) || {}; var msg = d.message || d.body || d.text || ''; if (msg) { bodyEl.value = msg; updCharc(); setStat('Drafted — review & edit', false); } else setStat((r && (r.error || r.message)) || 'Could not draft', true); }).catch(function () { setStat('Could not draft — try again', true); }).then(function () { ai.disabled = false; ai.textContent = '✦ AI draft'; });
        };
        // Always let the user tell the AI what to write — prefill with the
        // template name as a starting point so a named template is one tap away,
        // but they can refine or replace it (was: silently drafted from the name).
        if (window.__rsmsPrompt) window.__rsmsPrompt({ ai:true, title:'AI draft this template', body:'Describe the message you want — e.g. “friendly follow-up after a missed call”. Tweak it or just hit Draft it.', multiline:true, placeholder:'What should this template say?', okLabel:'Draft it', value: nm0 }).then(draft);
        else window.showPrompt('AI draft this template', 'Describe the message you want:', draft, { defaultValue: nm0, placeholder: 'What should this template say?', confirmText: 'Draft it', multiline: true });
        return;
      }
      var del = e.target.closest('.rsms-tpl-del');
      if (del) {
        // One-click delete (Anton) — no arm/confirm step.
        del.textContent = 'Deleting…';
        api.deleteTemplate(t.id).then(function(r){ if (r && r.success !== false) { ov.remove(); tplLoading = false; loadTemplates(); if (window.__rsmsToast) window.__rsmsToast('Template deleted'); } else { setStat((r && (r.error || r.message)) || 'Could not delete', true); del.textContent = 'Delete'; } }).catch(function(){ setStat('Could not delete', true); del.textContent = 'Delete'; });
        return;
      }
      var sv = e.target.closest('.rsms-tpl-save');
      if (sv) {
        var name = ov.querySelector('.rsms-tpl-name').value.trim();
        var cat = ov.querySelector('.rsms-tpl-cat').value.trim();
        var body = bodyEl.value.trim();
        if (!name) { setStat('Name your template.', true); return; }
        if (!body) { setStat('Add a message.', true); return; }
        var payload = { name: name, body: body }; if (cat) payload.category = cat;
        sv.disabled = true; sv.textContent = isEdit ? 'Saving…' : 'Creating…'; setStat('');
        (isEdit ? api.updateTemplate(t.id, payload) : api.createTemplate(payload)).then(function(r){
          if (r && r.success === false) { setStat((r.message || r.error) || 'Could not save', true); sv.disabled = false; sv.textContent = isEdit ? 'Save' : 'Create'; return; }
          try { localStorage.removeItem(TPL_DRAFT_KEY); } catch (_e) {} // created → draft no longer needed
          ov.remove(); tplLoading = false; loadTemplates(); if (window.__rsmsToast) window.__rsmsToast(isEdit ? 'Template saved' : 'Template created');
        }).catch(function(){ setStat('Could not save — try again.', true); sv.disabled = false; sv.textContent = isEdit ? 'Save' : 'Create'; });
        return;
      }
    });
  }

  // Native actions for empty/error states + template card buttons (replace classic
  // links). These loaders/editors share this closure, so we call them directly.
  document.addEventListener('click', function(e){
    if (!e.target || !e.target.closest) return;
    var a = e.target.closest('[data-rsmsact]');
    if (a) {
      var act = a.getAttribute('data-rsmsact');
      if (act === 'new-seq') { e.preventDefault(); openSeqCreate(); return; }
      if (act === 'retry-seq') { e.preventDefault(); seqLoading = false; loadSequences(); return; }
      if (act === 'retry-sched') { e.preventDefault(); schedLoading = false; loadScheduled(); return; }
      if (act === 'retry-tmpl') { e.preventDefault(); tplLoading = false; loadTemplates(); return; }
      if (act === 'new-tmpl') { e.preventDefault(); openTmplEditor(null); return; }
      if (act === 'ai-tmpl') { e.preventDefault(); openTmplEditor(null); setTimeout(function(){ var b = document.querySelector('.rsms-tpl-ai'); if (b) b.click(); }, 80); return; }
      if (act === 'browse-presets') { e.preventDefault(); openPresetPicker(); return; }
    }
    var ed = e.target.closest('[data-tmpl-edit]');
    if (ed) { e.preventDefault(); openTmplEditor(_tplMap[ed.getAttribute('data-tmpl-edit')] || null); return; }
    var us = e.target.closest('[data-tmpl-use]');
    if (us) { e.preventDefault(); useTmpl(us.getAttribute('data-tmpl-use')); return; }
    var tdel = e.target.closest('[data-tmpl-del]');
    if (tdel) { e.preventDefault(); e.stopPropagation();
      var tid = tdel.getAttribute('data-tmpl-del');
      // One-click delete (Anton) — no confirm dialog. The list is your own
      // templates only now, so nothing shared/un-deletable lands here.
      tdel.textContent = 'Deleting…'; tdel.disabled = true;
      api.deleteTemplate(tid).then(function (r) { if (r && r.success !== false) { tplLoading = false; loadTemplates(); if (window.__rsmsToast) window.__rsmsToast('Template deleted'); } else { tdel.textContent = 'Delete'; tdel.disabled = false; if (window.__rsmsToast) window.__rsmsToast((r && (r.error || r.message)) || 'Could not delete'); } }).catch(function () { tdel.textContent = 'Delete'; tdel.disabled = false; if (window.__rsmsToast) window.__rsmsToast('Could not delete'); });
      return;
    }
    // "New template" had several dead entry points: the SMS page-header action
    // button (rendered into #sms-view-actions, NOT inside the templates panel so
    // wireTmplNewBtn never reached it) and the various empty-state CTAs. Catch any
    // .auto-new-btn whose label is a template-create action and open the editor.
    var nb = e.target.closest('.auto-new-btn');
    if (nb && !nb.__tmplNew && /\b(new template|create (a |your first )?template)\b/i.test((nb.textContent || ''))) {
      // Only when we're actually on the SMS Templates sub-view (header button) or
      // the button sits inside the templates panel (empty-state CTAs).
      var inTplPanel = !!nb.closest('[data-panel-for="templates"]');
      var onTplView = !!document.querySelector('[data-smsview="templates"].on') || !!document.querySelector('#sms-view-actions .auto-new-btn');
      if (inTplPanel || onTplView) { e.preventDefault(); openTmplEditor(null); return; }
    }
  });
  // ---- orchestration -------------------------------------------------------
  function purgeAll(){
    if (!live()) return;
    if (!pane()) return;
    purgeListOpt();
    // Render every sub-tab's real data up front so a switch never flashes
    // sample rows (the tables/grids are in the DOM whether visible or not).
    loadSequences();
    loadScheduled();
    loadTemplates();
  }

  // Run on sub-tab click (capture phase, scoped to the blasts pane) — re-purge
  // the panel being revealed before the generic switcher un-hides it.
  document.addEventListener('click', function(e){
    if (!live()) return;
    var t = e.target; if (!t || !t.closest) return;
    if (!t.closest('#pane-blasts')) return;
    var st = t.closest('[data-panel]'); if (!st) return;
    var name = st.getAttribute('data-panel');
    setTimeout(function(){
      try {
        if (name === 'sequences') loadSequences();
        else if (name === 'scheduled') loadScheduled();
        else if (name === 'templates') loadTemplates();
        purgeListOpt();
      } catch(_) {}
    }, 0);
  }, true);

  // Run when the blasts pane becomes the active tab. The shell toggles the
  // pane's [hidden]; observe it and purge on reveal. Also run once now.
  function watch(){
    var p = pane(); if (!p) { setTimeout(watch, 400); return; }
    try {
      var mo = new MutationObserver(function(){ if (!p.hidden) purgeAll(); });
      mo.observe(p, { attributes: true, attributeFilter: ['hidden'] });
    } catch(_) {}
    if (!p.hidden) purgeAll();
    // Belt-and-suspenders: a delayed pass catches late-mounted markup.
    setTimeout(purgeAll, 300);
    setTimeout(purgeAll, 1200);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
  else watch();
})(); } catch(_) {}
} catch(e){ console.warn('[mercury-purge] blasts', e); }

/* purge: dashboard */
try {
(function () {
  'use strict';
  var api = (window.api || {});
  function live() { return !!document.documentElement.getAttribute('data-rsms-live'); }

  var PANE = '#pane-dashboard';
  function pane() { return document.querySelector(PANE); }
  function $(sel, root) { try { return (root || document).querySelector(sel); } catch (e) { return null; } }
  function $all(sel, root) { try { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); } catch (e) { return []; } }

  // Known fabricated literals from the static mockup. If any of these survive in
  // LIVE mode it means the real loader (mercury-live.js loadDashboard) either
  // hasn't run yet or its API call errored and left the sample value in place.
  var SAMPLE_KPI = { '147,932': 1, '93.8%': 1, '3,387': 1, '247': 1, '2.29%': 1 };
  var SAMPLE_DELTA = { '8.6%': 1, '0.6 pt': 1, '5.2%': 1, '18': 1, '0.1 pt': 1 };
  var SAMPLE_CAMP_NAMES = {
    'June Promo — VIP List': 1,
    'Lead Re-engagement · Q2': 1,
    'Open House Reminder — Sat': 1,
    'Appointment Confirmations': 1
  };
  var SAMPLE_RING = { '92': 1 };
  var SAMPLE_DROW = { '1.4%': 1, '2.1s': 1, '0.09%': 1 };

  // Was a real campaign row injected by loadDashboard? Its rows have no .camp-icon
  // color-class collisions we can't distinguish, so detect by sample names instead.
  function campListIsSample(list) {
    var names = $all('.camp-name', list);
    if (!names.length) return false;
    for (var i = 0; i < names.length; i++) {
      if (SAMPLE_CAMP_NAMES[(names[i].textContent || '').trim()]) return true;
    }
    return false;
  }

  function emptyMsg(text) {
    return '<div style="padding:26px 8px;text-align:center;color:var(--muted);font-size:13px">' + text + '</div>';
  }

  function purge() {
    if (!live()) return;
    var p = pane();
    if (!p) return;

    // 1) KPI values + deltas — blank any surviving fabricated number so the user
    //    never sees made-up volume. (loadDashboard overwrites these on success.)
    try {
      $all('.kpi', p).forEach(function (card) {
        var valEl = $('.kpi-val', card);
        if (valEl && SAMPLE_KPI[(valEl.textContent || '').trim()]) valEl.textContent = '—';
        var delta = $('.delta', card);
        if (delta) {
          var dt = (delta.textContent || '').trim();
          if (SAMPLE_DELTA[dt]) { delta.style.display = 'none'; }
        }
      });
    } catch (e) {}

    // 2) Recent campaigns — if the list still holds the sample rows, replace with a
    //    clean empty state. Real data (real names) is left untouched.
    try {
      var list = $('.camp-list', p);
      if (list && campListIsSample(list)) {
        list.innerHTML = emptyMsg('No campaigns in the last 30 days.');
      }
    } catch (e) {}

    // 3) Deliverability card — strip fabricated specifics that loadDashboard only
    //    fills when it has a real overview. Hide rather than fake.
    try {
      var ring = $('.deliv .ring-num', p);
      if (ring && SAMPLE_RING[(ring.textContent || '').trim()]) ring.textContent = '—';
      $all('.deliv .drow', p).forEach(function (row) {
        var val = $('.drow-val', row);
        if (val && SAMPLE_DROW[(val.textContent || '').trim()]) row.style.display = 'none';
      });
      var note = $('.deliv .deliv-note', p);
      if (note && /11 of 12 numbers|T-Mobile filtering ticked up/i.test(note.textContent || '')) {
        note.textContent = '';
      }
      var status = $('.deliv .deliv-status', p);
      if (status) {
        var stxt = (status.textContent || '').trim();
        // "Strong" is also a legit live label; only clear it when the ring is unknown
        if (ring && (ring.textContent || '').trim() === '—' && /strong/i.test(stxt)) {
          if (status.lastChild && status.lastChild.nodeType === 3) status.lastChild.nodeValue = '—';
          else status.textContent = '—';
        }
      }
      // The "Spreading Friday's blast…" tip is never computed → drop it in live.
      var tip = $('.deliv .tip', p);
      if (tip && /Spreading Friday|lift delivery by/i.test(tip.textContent || '')) tip.style.display = 'none';
    } catch (e) {}

    // 4) Recommendation row — scrub fabricated reply counts + the deliverability
    //    "T-Mobile dip / number nearing its cap" specifics that aren't computed.
    try {
      var recoB = $('.reco .reco-desc b', p);
      if (recoB && /3,387 replies/i.test(recoB.textContent || '')) recoB.textContent = 'your replies';
      // The "Book a call" CTA books the customer success manager (getCsmBookingLink),
      // NOT a deliverability specialist — so the card must not promise one. Relabel
      // the whole card (badge/title/desc) to the CSM wherever the old copy survives.
      $all('.reco', p).forEach(function (reco) {
        var title = $('.reco-title', reco), desc = $('.reco-desc', reco), badge = $('.reco-badge', reco);
        var titxt = (title && title.textContent) || '', detxt = (desc && desc.textContent) || '';
        if (/deliverability specialist/i.test(titxt) || /Delivery dipped on T-Mobile|number'?s nearing its cap|deliverability specialist/i.test(detxt)) {
          if (badge) badge.textContent = 'Support';
          if (title) title.textContent = 'Talk to your customer success manager';
          if (desc) desc.textContent = 'Book 15 minutes with your customer success manager — we’ll review your account and help you get the most out of ReadySMS.';
        }
      });
    } catch (e) {}

    // 5) Page subtitle + chart subtitle/footer — the mockup hardcodes a specific
    //    date + "1 number nearing its daily cap" narrative. Neutralize if surviving.
    try {
      var sub = $('.page-sub', p);
      if (sub && /Jun 11|number nearing its daily cap|delivery dipped 0\.6/i.test(sub.textContent || '')) {
        sub.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      }
      var csub = $('.chart-card .card-sub', p);
      if (csub && /May 13|Jun 11/i.test(csub.textContent || '')) csub.textContent = 'Last 30 days · daily volume';
      // chart-foot labels are recomputed by loadDashboard on success; if they still
      // read the sample range, blank them rather than show a fake window.
      var foot = $('.chart-foot', p);
      if (foot && /May 13|Jun 11/i.test(foot.textContent || '')) {
        $all('span', foot).forEach(function (s) { s.textContent = ''; });
      }
    } catch (e) {}
  }

  // Run now, shortly after (let loadDashboard's async fills win the race), and on
  // any nav/timeframe interaction within the pane. Idempotent + never throws.
  function safe() { try { purge(); } catch (e) {} }
  safe();
  setTimeout(safe, 400);
  setTimeout(safe, 1500);
  document.addEventListener('click', function (ev) {
    try {
      var t = ev.target;
      if (!t || !t.closest) return;
      if (t.closest(PANE) || t.closest('[data-tab="dashboard"]')) setTimeout(safe, 60);
    } catch (e) {}
  }, true);
  window.addEventListener('hashchange', function () { setTimeout(safe, 80); });
})();
} catch(e){ console.warn('[mercury-purge] dashboard', e); }

/* purge: dialer */
try {
(function () {
  'use strict';
  var api = (window.api || {});
  function live() { try { return !!document.documentElement.getAttribute('data-rsms-live'); } catch (e) { return false; } }
  var PANE = 'pane-dialer';
  function pane() { return document.getElementById(PANE); }
  function $(sel, root) { try { return (root || document).querySelector(sel); } catch (e) { return null; } }
  function $all(sel, root) { try { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); } catch (e) { return []; } }
  function setText(el, t) { if (el) { try { el.textContent = t; } catch (e) {} } }
  function setHTML(el, h) { if (el) { try { el.innerHTML = h; } catch (e) {} } }

  var EMPTY_CARD = '<div style="padding:30px 24px;text-align:center;color:var(--muted);font-size:13px;line-height:1.5">';
  function classicLink(hash, label) {
    return '<a href="#" data-rsmsnav="' + (window.__rsmsNavTab(hash)) + '" onclick="event.preventDefault()" style="display:inline-flex;align-items:center;gap:6px;text-decoration:none;color:var(--accent-deep);font-weight:650;font-size:13px">' + label + ' &rarr;</a>';
  }

  // ---- header sub-line (fabricated "Expired listings · Charlotte metro · session started 9:05 AM") ----
  function purgeHeader(p) {
    var sub = $('.dlr-head-sub', p);
    if (sub) sub.hidden = true;
  }

  // ---- live tab: caller-id + queue sub + neutralize static lead before loaders fill it ----
  function purgeLive(p) {
    var fromnum = document.getElementById('dlr-fromnum');
    // Only neutralize while no active call has set a real from-number.
    if (fromnum && !window._activeCall && /555/.test(fromnum.textContent || '')) setText(fromnum, '—');
    var frommode = document.getElementById('dlr-frommode');
    if (frommode && !window._activeCall && /local presence/i.test(frommode.textContent || '')) setText(frommode, 'Your number');
    // Static demo lead name / meta show before the live loader pulls the first lead.
    var nm = document.getElementById('dlr-leadname');
    if (nm && /whitfield/i.test(nm.textContent || '')) setText(nm, 'Loading next lead…');
    var meta = document.getElementById('dlr-leadmeta');
    if (meta && /brookhaven|fsbo 9 days|attempt 2/i.test(meta.textContent || '')) setText(meta, 'Dialer lead');
    var av = document.getElementById('dlr-av');
    if (av && (av.textContent || '').trim() === 'MW') setText(av, '');
    var num = document.getElementById('dlr-leadnum');
    if (num && /555-0138/.test(num.textContent || '')) setText(num, '');
    // queue card subs
    $all('.dlr-side .card-sub', p).forEach(function (s) {
      var t = s.textContent || '';
      if (/remaining|auto-advance/i.test(t)) setText(s, 'Live calling pulls leads automatically.');
      else if (/across 1 line/i.test(t)) setText(s, 'Today · resets at midnight');
    });
    // queue footer note
    var qnote = $('.dlr-q-note', p);
    if (qnote && /expired listings|charlotte/i.test(qnote.textContent || '')) setText(qnote, '');
    // right-rail "Today" stats — blank the fabricated 32 / 11·34% / 9 / 2:47 (the live
    // loader fills real numbers; if it's slow/blocked we must NOT keep showing fake ones).
    $all('.dlr-side .dlr-stat', p).forEach(function (st) {
      var b = st.querySelector('b'); if (!b) return; var t = (b.textContent || '').trim();
      if (t === '32' || /^11(\b|\s|·)/.test(t) || t === '9' || t === '2:47') b.innerHTML = '—';
    });
    // right-rail "Call queue" — replace the fabricated leads (Marcus Whitfield, Renee
    // Delgado, …) with the live note. The live loader repopulates when it runs.
    var rq = $('.dlr-side .dlr-queue', p);
    if (rq && /whitfield|delgado|brackett|okafor|hutchins|venkatesan|555-01/i.test(rq.textContent || '')) {
      rq.innerHTML = '<div style="padding:18px 14px;text-align:center;color:var(--muted);font-size:12px">Live calling pulls the next lead automatically.</div>';
    }
    // The live mask hides the lead card until rsms-dlr-ready; if the live loader is slow
    // or never runs (e.g. getMe blocked), never leave the card permanently hidden — we've
    // already blanked the sample text above, so revealing shows the loading state, not mock.
    try { document.documentElement.classList.add('rsms-dlr-ready'); } catch (e) {}
  }

  // ---- callbacks badge ("3 due today") ----
  function purgeCallbacks(p) {
    var head = $('[data-dtab-panel="callbacks"] .card-head', p);
    if (head) {
      var badge = $('.status.st-amber', head);
      if (badge && /due today/i.test(badge.textContent || '') && !badge.__purged) { badge.__purged = 1; badge.style.display = 'none'; }
    }
  }

  // ---- team panel: card-subs + the uncovered "Team totals" .dlr-stats ----
  function purgeTeam(p) {
    var panel = $('[data-dtab-panel="team"]', p); if (!panel) return;
    $all('.card-sub', panel).forEach(function (s) {
      var t = s.textContent || '';
      if (/agents online|on calls right now/i.test(t)) setText(s, 'Your team');
    });
    // Team totals tiles (418 / 147 / 10 / 9:24) — no dedicated real endpoint; blank them.
    $all('.dlr-stats', panel).forEach(function (grid) {
      if (grid.__teampurged) return; grid.__teampurged = 1;
      $all('.dlr-stat b', grid).forEach(function (b) { setHTML(b, '—'); });
    });
  }

  // ---- numbers panel: card-subs, reputation badge, plan & usage ----
  function purgeNumbers(p) {
    var panel = $('[data-dtab-panel="numbers"]', p); if (!panel) return;
    $all('.card-sub', panel).forEach(function (s) {
      var t = s.textContent || '';
      if (/^\s*\d+\s+numbers/i.test(t)) setText(s, 'Spam score & daily usage');
    });
    var rep = $('.card-head .status.st-green', panel);
    if (rep && /pool healthy/i.test(rep.textContent || '')) { rep.style.display = 'none'; }
    // Plan & usage: fabricated tiles + plan cards. No real dialer-billing read here →
    // blank the usage figures, hide the demo plan grid + chip.
    var usage = $('.dlr-usage', panel);
    if (usage && !usage.__purged) { usage.__purged = 1; $all('.dlr-usage-stat b', usage).forEach(function (b) { setText(b, '—'); }); }
    var chip = $('.set-card-chip', panel);
    if (chip && /\d+\s*seat/i.test(chip.textContent || '')) setText(chip, '');
    var plans = $('.dlr-plans', panel);
    if (plans && !plans.__purged) {
      plans.__purged = 1;
      setHTML(plans, EMPTY_CARD + 'Manage your dialer plan &amp; seats.<div style="margin-top:10px">' + classicLink('dialer', 'Open dialer settings') + '</div></div>');
    }
  }

  // ---- settings panel: mercury-live.js now handles dialer webhooks, dispositions,
  //      and lead priority natively — just purge fake demo data, don't replace with classic CTA ----
  function purgeSettings(p) {
    var panel = $('[data-dtab-panel="settings"]', p); if (!panel || panel.__purged) return;
    panel.__purged = 1;
    // Clear fabricated demo data (fake webhook URLs, etc.) — mercury-live.js loaders will fill in real data
    $all('input[type="text"]', panel).forEach(function (inp) {
      if (/hooks\.maplegrove\.com|maplegrove|carolinahomeoffers/i.test(inp.value || '')) { inp.value = ''; }
    });
  }

  // ---- performance KPIs the existing loader leaves alone (talk time, avg call, connect rate) ----
  function purgePerf(p) {
    $all('[data-dtab-panel="performance"] .kpis .kpi', p).forEach(function (card) {
      var lbl = ((($('.kpi-label', card) || {}).textContent) || '').toLowerCase();
      var v = $('.kpi-val', card); if (!v) return;
      // Only scrub a NON-zero demo value (e.g. "3:42", "42%"). A genuine zero
      // ("0:00", "0%") is the real default — scrubbing it to "—" caused a ~2s dash
      // flash on hard refresh for accounts with no calls yet (Anton 2026-06).
      if (/talk time|avg|average|connect rate/.test(lbl) && /[1-9]/.test(v.textContent || '')) setText(v, '—');
      var d = $('.delta', card); if (d) d.style.display = 'none';
    });
  }

  // ---- campaign builder modal: demo option lists, matching-lead count, assigned agents ----
  function purgeModal() {
    var modal = document.getElementById('dlc-modal'); if (!modal || modal.__purged) return;
    modal.__purged = 1;
    var lists = ['dlc-list', 'dlc-cid', 'dlc-script', 'dlc-vmrec'];
    lists.forEach(function (id) {
      var sel = document.getElementById(id);
      if (sel && /1,284|555-0142|maple|expired \/ fsbo|quick intro|charlotte/i.test(sel.textContent || '')) {
        setHTML(sel, '<option>Loading…</option>');
      }
    });
    var cnt = $('.bm-filter-count', modal);
    if (cnt && /\d/.test(cnt.textContent || '')) setText(cnt, 'Matching leads: —');
    var agents = $('.dlc-agents', modal);
    if (agents && /jill tran|richie/i.test(agents.textContent || '')) {
      setHTML(agents, '<span style="font-size:12.5px;color:var(--muted)">Assigned agents load from your team.</span>');
    }
    var nameIn = document.getElementById('dlc-name-in');
    if (nameIn && /charlotte/i.test(nameIn.placeholder || '')) nameIn.placeholder = 'Campaign name';
    var pc = document.getElementById('dlc-precall-msg');
    if (pc && /maple grove/i.test(pc.value || '')) pc.value = '';
  }

  // ---- master purge (idempotent) ----
  function purge() {
    if (!live()) return;
    var p = pane(); if (!p) return;
    try { purgeHeader(p); } catch (e) {}
    try { purgeLive(p); } catch (e) {}
    try { purgeCallbacks(p); } catch (e) {}
    try { purgeTeam(p); } catch (e) {}
    try { purgeNumbers(p); } catch (e) {}
    try { purgeSettings(p); } catch (e) {}
    try { purgePerf(p); } catch (e) {}
    try { purgeModal(); } catch (e) {}
  }

  function kick() { purge(); setTimeout(purge, 120); setTimeout(purge, 500); }
  kick();

  // re-purge on any click inside the dialer pane (capture phase, scoped) — covers sub-tab switches
  document.addEventListener('click', function (e) {
    try {
      if (e.target && e.target.closest && e.target.closest('#' + PANE)) { setTimeout(purge, 80); setTimeout(purge, 300); }
    } catch (err) {}
  }, true);

  // re-purge when the dialer nav item opens the pane
  document.addEventListener('click', function (e) {
    try {
      var nav = e.target && e.target.closest ? e.target.closest('[data-tab="dialer"],[data-pane="dialer"],[href="#dialer"]') : null;
      if (nav) { setTimeout(purge, 100); setTimeout(purge, 600); }
    } catch (err) {}
  }, true);
})();
} catch(e){ console.warn('[mercury-purge] dialer', e); }

/* purge: reports */
try {
/* ---- pane: reports — purge hardcoded sample data (LIVE only) ---- */
(function () {
  'use strict';
  var api = (window.api || {});
  var PANE = '#pane-reports';
  function live() { return !!document.documentElement.getAttribute('data-rsms-live'); }
  function $(s, r) { try { return (r || document).querySelector(s); } catch (e) { return null; } }
  function $all(s, r) { try { return Array.prototype.slice.call((r || document).querySelectorAll(s)); } catch (e) { return []; } }
  function esc(s) { return (s == null ? '' : '' + s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function unwrap(res) { if (!res) return null; if (res.success === false) return null; if (res.data !== undefined) return res.data; return res; }
  function num(n) { try { return Number(n || 0).toLocaleString('en-US'); } catch (e) { return '0'; } }
  function pane() { return document.querySelector(PANE); }
  function panel(name) { return $(PANE + ' [data-rtab-panel="' + name + '"]'); }

  // Honest empty/preview state injected into a card body (idempotent per element).
  function emptyMsg(msg, classicHash) {
    var link = classicHash ? ' <a href="#" data-rsmsnav="' + esc(window.__rsmsNavTab(classicHash)) + '" onclick="event.preventDefault()" style="color:var(--accent-deep);font-weight:600;white-space:nowrap">Manage &rarr;</a>' : '';
    return '<div style="padding:22px 8px;text-align:center;color:var(--muted);font-size:12.5px;line-height:1.5">' + esc(msg) + link + '</div>';
  }
  function emptyRow(cols, msg) {
    return '<tr><td colspan="' + (cols || 4) + '" style="padding:22px 8px;text-align:center;color:var(--muted);font-size:12.5px">' + esc(msg) + '</td></tr>';
  }
  // Replace a card's sample body (everything after the card-head) with an honest
  // empty state. Idempotent via a marker class.
  function blankCardBody(card, msg, classicHash) {
    if (!card || card.getAttribute('data-rsms-blanked') === '1') return;
    var head = $('.card-head', card);
    // remove every element after the head (charts/meters/tables/notes)
    var kids = Array.prototype.slice.call(card.children);
    kids.forEach(function (k) { if (k !== head) { try { card.removeChild(k); } catch (e) {} } });
    var box = document.createElement('div');
    box.innerHTML = emptyMsg(msg, classicHash);
    card.appendChild(box);
    card.setAttribute('data-rsms-blanked', '1');
  }

  // ---- KPI helpers ---------------------------------------------------------
  function setKpiByLabel(scope, map) {
    $all('.kpi', scope).forEach(function (card) {
      var lab = (($('.kpi-label', card) || {}).textContent || '').trim().toLowerCase();
      var val = $('.kpi-val', card);
      if (!val) return;
      if (Object.prototype.hasOwnProperty.call(map, lab)) {
        val.textContent = map[lab];
        var delta = $('.delta', card);
        if (delta) delta.style.display = 'none';
      } else {
        // unknown label with a fabricated value → blank it so nothing fake shows
        val.textContent = '—';
        var d2 = $('.delta', card);
        if (d2) d2.style.display = 'none';
      }
    });
  }

  // ========================================================================
  // DELIVERY tab — real topline from /reports/carriers ({total,delivered,
  // failed}); there is NO per-carrier or per-reason endpoint, so the carrier
  // meters / failure breakdown / blocked-detail table are fabricated → blank.
  // ========================================================================
  function purgeDelivery() {
    var p = panel('delivery'); if (!p || p.getAttribute('data-rsms-purged') === '1') return;
    p.setAttribute('data-rsms-purged', '1');
    var cards = $all('.card', p);
    cards.forEach(function (card) {
      var title = (($('.card-title', card) || {}).textContent || '').toLowerCase();
      if (/by carrier/.test(title)) {
        blankCardBody(card, 'Per-carrier delivery breakdown isn\'t available in this view yet.', 'deliverability');
      } else if (/failure breakdown/.test(title)) {
        blankCardBody(card, 'Failure breakdown isn\'t available in this view yet.', 'deliverability');
      } else if (/blocked|undelivered detail/.test(title)) {
        blankCardBody(card, 'Detailed block reasons aren\'t available in this view yet.', 'deliverability');
      } else {
        // the delivery-rate-over-time chart card: zero the fabricated SVG plot
        var svg = $('.rpt-chart', card);
        if (svg) {
          $all('path', svg).forEach(function (pa) { pa.setAttribute('d', ''); });
          $all('circle', svg).forEach(function (c) { c.setAttribute('r', '0'); });
          $all('text', svg).forEach(function (tx) { if (/T-Mobile|filtering|%/.test(tx.textContent || '')) tx.textContent = ''; });
        }
      }
    });
    // Fill the delivery-rate-over-time card sub with the real rate if we have it.
    api.getCarrierReport && Promise.resolve(api.getCarrierReport()).then(function (r) {
      var d = unwrap(r); if (!d) return;
      var total = parseInt(d.total, 10) || 0, del = parseInt(d.delivered, 10) || 0;
      var rate = total ? (del / total * 100) : 0;
      var sub = $('.card-sub', p);
      if (sub) sub.textContent = (total ? rate.toFixed(1) + '% delivered of ' + num(total) + ' accepted sends' : 'No sends in this account yet');
    }).catch(function () {});
  }

  // ========================================================================
  // TIMING tab — no per-account response-time / heatmap render endpoint here
  // (hourly exists but the heatmap is purely decorative). Blank all fabricated
  // visuals with honest empty states.
  // ========================================================================
  function purgeTiming() {
    var p = panel('timing'); if (!p || p.getAttribute('data-rsms-purged') === '1') return;
    p.setAttribute('data-rsms-purged', '1');
    $all('.card', p).forEach(function (card) {
      var title = (($('.card-title', card) || {}).textContent || '').toLowerCase();
      if (/response time/.test(title)) {
        blankCardBody(card, 'Response-time distribution isn\'t available in this view yet.', 'reports');
      } else if (/day-of-week|day of week/.test(title)) {
        blankCardBody(card, 'Day-of-week performance isn\'t available in this view yet.', 'reports');
      } else {
        blankCardBody(card, 'Best-time-to-send heatmap isn\'t available in this view yet.', 'reports');
      }
    });
  }

  // ========================================================================
  // COMPLIANCE tab — opt-out rate is real (from overview); STOP/HELP/complaint/
  // quiet-hours counts, the trend chart and the protection tables have no
  // per-account endpoint → blank fabricated, fill opt-out KPI from overview.
  // ========================================================================
  function purgeCompliance() {
    var p = panel('compliance'); if (!p || p.getAttribute('data-rsms-purged') === '1') return;
    p.setAttribute('data-rsms-purged', '1');
    // fabricated "Business hours — Mon–Fri 8:00 AM – 9:00 PM … Eastern" presented as the
    // user's setting → genericize.
    $all('.set-row-sub', p).forEach(function (s) { if (/8:00 ?am.*9:00 ?pm|mon.?fri 8|· eastern/i.test(s.textContent || '')) s.textContent = 'Set your business hours in Settings.'; });
    var kpis = $('.kpis', p);
    if (kpis) setKpiByLabel(kpis, {}); // blank all (we fill opt-out below)
    $all('.card', p).forEach(function (card) {
      var title = (($('.card-title', card) || {}).textContent || '').toLowerCase();
      if (/opt-out rate trend/.test(title)) blankCardBody(card, 'Opt-out rate trend isn\'t available in this view yet.', 'settings');
      else if (/tcpa|dnc|scrubbing/.test(title)) blankCardBody(card, 'Scrubbing detail isn\'t available in this view yet.', 'settings');
      else if (/platform protections/.test(title)) blankCardBody(card, 'Protection detail isn\'t available in this view yet.', 'settings');
    });
    // Honest informational note → drop the fabricated specifics.
    var note = $('.rpt-note', p);
    if (note) {
      var body = note.querySelector('div');
      if (body) body.innerHTML = '<strong>How auto-pause works:</strong> if your opt-out rate stays above <strong>1.0%</strong> for 30 days (with 500+ sends), campaigns pause automatically and we email you why.';
    }
    // Real opt-out KPI from overview.
    api.getReportOverview && Promise.resolve(api.getReportOverview(30)).then(function (r) {
      var ov = unwrap(r); if (!ov) return;
      var sent = parseInt(ov.messages_sent, 10) || 0, opt = parseInt(ov.opt_outs, 10) || 0;
      $all('.kpi', kpis || p).forEach(function (card) {
        var lab = (($('.kpi-label', card) || {}).textContent || '').trim().toLowerCase();
        var val = $('.kpi-val', card); if (!val) return;
        if (lab === 'opt-out rate') val.textContent = (sent ? (Math.round(opt / sent * 1000) / 10) + '%' : '0%');
        else if (lab === 'stop replies') val.textContent = num(opt);
      });
    }).catch(function () {});
  }

  // ========================================================================
  // LINKS tab — real short links via api.getLinks(). Fill the table + KPI
  // count + total clicks from real rows; columns with no list-level data
  // (unique / CTR / campaign) show an em-dash. Empty state when none.
  // ========================================================================
  function purgeLinks() {
    var p = panel('links'); if (!p) return;
    if (p.getAttribute('data-rsms-purged') !== '1') {
      p.setAttribute('data-rsms-purged', '1');
      // Pre-blank the sample table + fabricated KPIs immediately so nothing fake
      // flashes if the fetch is slow / fails.
      var tb0 = $('.rlnk-table tbody', p); if (tb0) tb0.innerHTML = emptyRow(6, 'Loading…');
      setKpiByLabel($('.kpis', p) || p, {});
    }
    if (!api.getLinks) {
      var tbn = $('.rlnk-table tbody', p); if (tbn) tbn.innerHTML = emptyRow(6, 'No tracked links yet.');
      return;
    }
    Promise.resolve(api.getLinks({})).then(function (r) {
      var rows = [];
      var d = (r && r.data !== undefined) ? r.data : r;
      if (Array.isArray(d)) rows = d; else if (d && Array.isArray(d.data)) rows = d.data;
      var tb = $('.rlnk-table tbody', p);
      var totalClicks = 0;
      rows.forEach(function (l) { totalClicks += parseInt(l.click_count, 10) || 0; });
      if (tb) {
        if (!rows.length) tb.innerHTML = emptyRow(6, 'No tracked links yet. Add a short link to track clicks.');
        else tb.innerHTML = rows.map(function (l) {
          var code = l.short_code || l.code || '';
          var dest = l.original_url || l.url || '';
          var clicks = parseInt(l.click_count, 10) || 0;
          return '<tr><td><div class="rlnk-short">rsms.io/' + esc(code) + '</div><div class="rlnk-dest">' + esc(dest) + '</div></td>' +
            '<td style="color:var(--faint)">—</td><td>' + num(clicks) + '</td><td style="color:var(--faint)">—</td>' +
            '<td class="rlnk-ctr" style="color:var(--faint)">—</td><td></td></tr>';
        }).join('');
      }
      // KPIs: tracked links + total clicks are real; unique/CTR/device unknown.
      $all('.kpi', $('.kpis', p) || p).forEach(function (card) {
        var lab = (($('.kpi-label', card) || {}).textContent || '').trim().toLowerCase();
        var val = $('.kpi-val', card); if (!val) return;
        if (/tracked links/.test(lab)) val.textContent = num(rows.length);
        else if (/total clicks/.test(lab)) val.textContent = num(totalClicks);
        else val.textContent = '—';
      });
    }).catch(function () {
      var tb = $('.rlnk-table tbody', p); if (tb) tb.innerHTML = emptyRow(6, 'Couldn\'t load tracked links.');
    });
  }

  // ========================================================================
  // QUEUE tab — real per-assignee workload via /reports/queue-stats.
  // ========================================================================
  function fmtMins(m) {
    if (m == null) return '—';
    m = Number(m); if (!isFinite(m) || m <= 0) return '—';
    if (m < 60) return Math.round(m) + 'm';
    return Math.floor(m / 60) + 'h ' + Math.round(m % 60) + 'm';
  }
  function initials(fn, ln, email) {
    var a = (fn || '').trim(), b = (ln || '').trim();
    if (a || b) return ((a[0] || '') + (b[0] || '')).toUpperCase() || '—';
    return ((email || '?')[0] || '?').toUpperCase();
  }
  function purgeQueue() {
    var p = panel('queue'); if (!p) return;
    if (p.getAttribute('data-rsms-purged') !== '1') {
      p.setAttribute('data-rsms-purged', '1');
      var tb0 = $('.rq-tbl tbody', p); if (tb0) tb0.innerHTML = emptyRow(6, 'Loading…');
      setKpiByLabel($('.kpis', p) || p, {});
    }
    if (!api.request) {
      var tbn = $('.rq-tbl tbody', p); if (tbn) tbn.innerHTML = emptyRow(6, 'No queue data yet.');
      return;
    }
    Promise.resolve(api.request('GET', '/reports/queue-stats')).then(function (r) {
      var d = unwrap(r) || {};
      var assignees = Array.isArray(d.assignees) ? d.assignees : [];
      var unassigned = d.unassigned || {};
      var tb = $('.rq-tbl tbody', p);
      if (tb) {
        var html = '';
        assignees.forEach(function (a) {
          var name = ((a.first_name || '') + ' ' + (a.last_name || '')).trim() || a.email || 'Team member';
          html += '<tr><td><div class="rq-rep"><span class="avatar">' + esc(initials(a.first_name, a.last_name, a.email)) +
            '</span><b>' + esc(name) + '</b></div></td><td>' + num(a.open_count) + '</td><td>' + num(a.unread_count) +
            '</td><td style="color:var(--faint)">—</td><td style="color:var(--faint)">—</td>' +
            '<td><span class="status st-green"><i></i>Active</span></td></tr>';
        });
        var ua = parseInt(unassigned.open_count, 10) || 0;
        if (ua) html += '<tr><td><div class="rq-rep"><span class="avatar">—</span><b>Unassigned</b></div></td><td>' + num(ua) + (unassigned.open_capped ? '+' : '') +
          '</td><td>' + num(unassigned.unread_count) + '</td><td style="color:var(--faint)">—</td><td style="color:var(--faint)">—</td>' +
          '<td><span class="status st-gray"><i></i>Queue</span></td></tr>';
        if (!html) html = emptyRow(6, 'No open conversations assigned to team members yet.');
        tb.innerHTML = html;
      }
      // KPIs: open + awaiting + avg response are real; resolution/SLA unknown.
      $all('.kpi', $('.kpis', p) || p).forEach(function (card) {
        var lab = (($('.kpi-label', card) || {}).textContent || '').trim().toLowerCase();
        var val = $('.kpi-val', card); if (!val) return;
        if (/open conversations/.test(lab)) val.textContent = num(d.total_open) + (d.total_open_capped ? '+' : '');
        else if (/awaiting reply/.test(lab)) val.textContent = num(d.total_unread) + (d.total_unread_capped ? '+' : '');
        else if (/first response/.test(lab)) val.textContent = fmtMins(d.avg_response_minutes);
        else val.textContent = '—';
      });
    }).catch(function () {
      var tb = $('.rq-tbl tbody', p); if (tb) tb.innerHTML = emptyRow(6, 'Couldn\'t load queue data.');
    });
  }

  // ---- run everything (idempotent) ----------------------------------------
  function purgeAll() {
    if (!live()) return;
    if (!pane()) return;
    try { purgeDelivery(); } catch (e) {}
    try { purgeTiming(); } catch (e) {}
    try { purgeCompliance(); } catch (e) {}
    try { purgeLinks(); } catch (e) {}
    try { purgeQueue(); } catch (e) {}
  }

  // Run on pane load: poll briefly until the pane exists & is visible, then purge.
  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    var pn = pane();
    if (pn && live()) { purgeAll(); }
    if (tries > 40) clearInterval(iv);
  }, 250);

  // Re-purge on any sub-tab click (capture phase, pane-scoped).
  document.addEventListener('click', function (e) {
    if (!live()) return;
    var t = e.target; if (!t || !t.closest) return;
    if (t.closest(PANE + ' [data-rtab]') || t.closest(PANE + ' [data-rptrange]')) {
      // let the panel switch happen, then purge the now-visible panel
      setTimeout(purgeAll, 0);
      setTimeout(purgeAll, 120);
    }
  }, true);

  // Re-purge when the pane itself is revealed (nav into reports).
  document.addEventListener('click', function (e) {
    if (!live()) return;
    var t = e.target; if (!t || !t.closest) return;
    if (t.closest('[data-tab="reports"]')) { setTimeout(purgeAll, 80); setTimeout(purgeAll, 300); }
  }, true);
})();
} catch(e){ console.warn('[mercury-purge] reports', e); }

/* purge: number-health */
try {
(function () {
  'use strict';
  var api = (window.api || {});
  var PANE = 'pane-number-health';
  function live() { return !!document.documentElement.getAttribute('data-rsms-live'); }
  function pane() { return document.getElementById(PANE); }
  function $(sel, root) { try { return (root || document).querySelector(sel); } catch (e) { return null; } }
  function $all(sel, root) { try { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); } catch (e) { return []; } }
  function unwrap(res) { if (!res) return null; if (res.success === false) return null; if (res.data !== undefined) return res.data; return res; }

  // honest empty-state block
  function emptyState(title, sub, classicHref) {
    var link = '';
    if (classicHref) {
      var page = (classicHref || '').replace(/.*#/, '');
      link = '<a href="#" data-rsmsnav="' + (window.__rsmsNavTab(page)) + '" onclick="event.preventDefault()" style="color:var(--accent-deep);font-weight:650;white-space:nowrap;margin-left:6px">Manage &rarr;</a>';
    }
    return '<div class="rsms-nh-empty" style="padding:26px 18px;text-align:center;color:var(--muted);font-size:13px;line-height:1.5">'
      + '<div style="font-weight:600;color:var(--ink-2);margin-bottom:4px">' + title + '</div>'
      + '<div style="font-size:12.5px">' + (sub || '') + link + '</div></div>';
  }

  // ---- SMS panel: neutralize fabricated header summary (ring + card-sub) ----
  // loadNumberHealth() (mercury-live.js) already fills the SMS rows + KPIs,
  // hides the amber tip and marks the analyzer a preview. It does NOT touch the
  // pool-health RING ("92") or the header card-sub ("4 of 5 numbers healthy ..."),
  // which are fabricated. Recompute them from the real number list, else blank.
  function purgeSmsHeader(nums) {
    var p = pane(); if (!p) return;
    var panel = $('[data-nhtab-panel="sms"]', p); if (!panel) return;
    var n = Array.isArray(nums) ? nums.length : 0, healthy = 0, tot = 0;
    if (Array.isArray(nums)) {
      nums.forEach(function (x) {
        var sc = parseInt(x && x.health_score, 10) || 0;
        tot += sc;
        if (sc >= 85) healthy++;
      });
    }
    var head = $('.nh-head', panel);
    if (!head) return;
    var ring = $('.nh-ring', head);
    if (ring) {
      var rv = $('.nh-ring-val', ring);
      var avg = n ? Math.round(tot / n) : null;
      if (rv) rv.textContent = avg != null ? ('' + avg) : '—';
      var circles = $all('circle', ring);
      var arc = circles[circles.length - 1];
      if (arc) {
        var pctv = avg != null ? Math.max(0, Math.min(100, avg)) : 0;
        arc.setAttribute('stroke-dasharray', '150.8');
        arc.setAttribute('stroke-dashoffset', '' + (150.8 * (1 - pctv / 100)).toFixed(1));
        arc.setAttribute('stroke', avg == null ? 'var(--hairline)' : (avg >= 85 ? 'var(--green)' : avg >= 60 ? 'var(--amber)' : 'var(--red)'));
      }
      ring.setAttribute('aria-label', avg != null ? ('Pool health score ' + avg + ' out of 100') : 'Pool health');
    }
    var sub = $('.card-sub', head);
    if (sub) {
      sub.innerHTML = n
        ? (healthy + ' of ' + n + ' number' + (n === 1 ? '' : 's') + ' healthy')
        : 'No sending numbers yet';
    }
  }

  // ---- Dial panel: NOW WIRED — drive the real renderer, don't purge -----------
  // This used to wipe the Dial Health view and show a "coming soon" empty state,
  // back when the panel was fabricated demo data with no backend. It is now real:
  // mercury-live.js loadDialNumberHealth() renders per-number caller-ID reputation,
  // answer rate, calls-today and carrier spam labels from GET /dialer-number-health
  // (routes/dialer-number-health.js), with its own honest empty/disabled states
  // (and it hides the shipped demo KPIs/cards first, so nothing fabricated leaks).
  // That renderer runs at the tail of loadNumberHealth — which early-returns for
  // accounts with no SMS sending number, leaving the demo rows/cards visible. This
  // reliable pane-show hook re-drives it so the demo content is always replaced.
  function purgeDial() {
    try { if (typeof window.loadDialNumberHealth === 'function') window.loadDialNumberHealth(); } catch (e) {}
  }

  function purge() {
    if (!live()) return;
    var p = pane(); if (!p) return;
    var smsRendered = false;
    try {
      if (typeof api.getPhoneNumbers === 'function') {
        var pr = api.getPhoneNumbers();
        if (pr && typeof pr.then === 'function') {
          pr.then(function (res) {
            var list = unwrap(res);
            if (!Array.isArray(list)) list = (list && list.numbers) || [];
            try { purgeSmsHeader(Array.isArray(list) ? list : []); } catch (e) {}
          }).catch(function () { try { purgeSmsHeader([]); } catch (e) {} });
          smsRendered = true;
        }
      }
    } catch (e) {}
    if (!smsRendered) { try { purgeSmsHeader([]); } catch (e) {} }
    try { purgeDial(); } catch (e) {}
  }

  function maybe() { setTimeout(purge, 0); }

  document.addEventListener('click', function (e) {
    var p = pane(); if (!p) return;
    var t = e.target;
    if (t && t.closest && (t.closest('#' + PANE + ' [data-nhtab]') || t.closest('#' + PANE + ' [role="tab"]'))) {
      setTimeout(purge, 60);
    }
  }, true);

  if (typeof MutationObserver === 'function') {
    try {
      var p0 = pane();
      if (p0) {
        var mo = new MutationObserver(function () { if (!p0.hasAttribute('hidden')) maybe(); });
        mo.observe(p0, { attributes: true, attributeFilter: ['hidden'] });
      }
    } catch (e) {}
  }
  maybe();
})();
} catch(e){ console.warn('[mercury-purge] number-health', e); }

/* purge: campaigns */
try {
/* mercury-buttons.js tail — LIVE purge for #pane-campaigns (Automations).
   Removes the bundled sample drip/keyword/recurring cards (rich cards with
   ENROLLED/SENT/REPLY-RATE stats + Day chips), fixes the All/Active/Drips/Keyword
   count badges to real counts from getAutomations()+getDripSequences() (or blanks
   them), and reveals the honest empty state when the account has none. Complements
   loadAutomations() in mercury-live.js (which renders real cards + fixes counts[0]);
   never removes real automation cards. Idempotent + gated to live(). Never throws. */
(function () {
  'use strict';
  var api = (window.api || {});
  function live() { try { return !!document.documentElement.getAttribute('data-rsms-live'); } catch (e) { return false; } }
  function $(s, r) { try { return (r || document).querySelector(s); } catch (e) { return null; } }
  function $all(s, r) { try { return Array.prototype.slice.call((r || document).querySelectorAll(s)); } catch (e) { return []; } }
  function unwrap(r) { if (!r) return r; if (r.data !== undefined && (r.ok !== undefined || r.success !== undefined || r.status !== undefined)) return r.data; return r; }
  function asList(r, keys) {
    var d = unwrap(r);
    if (Array.isArray(d)) return d;
    if (d && typeof d === 'object') { for (var i = 0; i < keys.length; i++) { if (Array.isArray(d[keys[i]])) return d[keys[i]]; } }
    return [];
  }

  var PANE = 'pane-campaigns';
  var running = false;

  // A "sample" card is one of the bundled rich mock cards: it carries the
  // ENROLLED/SENT/REPLY-RATE stat block or the Day-chip flow row. The real
  // autoCard() output (mercury-live.js) has neither, so this never touches
  // a genuinely-rendered automation.
  function purgeSampleCards() {
    var grid = $('#' + PANE + ' .auto-grid'); if (!grid) return;
    $all('.auto-card', grid).forEach(function (c) {
      if (c.classList && c.classList.contains('auto-ai-card')) return; // keep "Create with AI"
      if (c.querySelector('.auto-stats') || c.querySelector('.auto-flow')) {
        try { c.parentNode && c.parentNode.removeChild(c); } catch (e) {}
      }
    });
  }

  // Count how many genuine automation cards remain (non-AI, non-sample).
  function realCardCount() {
    var grid = $('#' + PANE + ' .auto-grid'); if (!grid) return 0;
    return $all('.auto-card', grid).filter(function (c) {
      return !(c.classList && c.classList.contains('auto-ai-card'));
    }).length;
  }

  function toggleEmpty(total) {
    var empty = $('#auto-empty'); if (!empty) return;
    // Keep the grid and the empty billboard mutually exclusive — show one OR the
    // other so the middle always has content (cards when present, the value-first
    // CTA when not). The grid must be un-hidden when there are real automations,
    // otherwise a populated account shows a blank middle.
    var grid = $('#' + PANE + ' .auto-grid');
    if (total <= 0) {
      try { empty.hidden = false; empty.removeAttribute('hidden'); empty.style.display = ''; } catch (e) {}
      if (grid) try { grid.hidden = true; } catch (e) {}
    } else {
      try { empty.hidden = true; empty.setAttribute('hidden', ''); empty.style.display = 'none'; } catch (e) {}
      if (grid) try { grid.hidden = false; } catch (e) {}
    }
  }

  // Set the four filter badges (All / Active / Drips / Keyword) to real counts,
  // or blank them when we can't compute. Order matches the markup.
  function setBadges(all, active, drips, keyword) {
    var counts = $all('#' + PANE + ' .auto-toolbar .auto-count');
    var vals = [all, active, drips, keyword];
    counts.forEach(function (el, i) {
      var v = vals[i];
      el.textContent = (v == null || isNaN(v)) ? '' : String(v);
    });
  }

  function blankBadges() {
    $all('#' + PANE + ' .auto-toolbar .auto-count').forEach(function (el) { el.textContent = ''; });
  }

  function isActive(a) {
    return a && (a.enabled === 1 || a.enabled === true || a.status === 'active' || a.active === 1 || a.active === true);
  }
  function isKeyword(a) {
    var t = ('' + ((a && (a.trigger_type || a.type || a.kind)) || '')).toLowerCase();
    return t.indexOf('keyword') >= 0;
  }

  async function refreshCounts() {
    // Always strip the sample cards first so a real user never sees fabricated stats.
    purgeSampleCards();

    var autos = null, drips = null;
    try { if (typeof api.getAutomations === 'function') autos = asList(await api.getAutomations(), ['automations', 'rules', 'data', 'items']); } catch (e) { autos = null; }
    try { if (typeof api.getDripSequences === 'function') drips = asList(await api.getDripSequences(), ['drip_sequences', 'sequences', 'drips', 'data', 'items']); } catch (e) { drips = null; }

    // Re-purge in case a render landed during the awaits (idempotent).
    purgeSampleCards();

    if (autos == null && drips == null) {
      // No reliable data — never show fabricated counts.
      blankBadges();
      toggleEmpty(realCardCount());
      return;
    }

    var autoList = autos || [];
    var dripList = drips || [];
    var dripCount = dripList.length;
    // "All" = automations + drip sequences (the live product nests both here).
    var all = autoList.length + dripCount;
    var active = autoList.filter(isActive).length + dripList.filter(isActive).length;
    var keyword = autoList.filter(isKeyword).length;
    setBadges(all, active, dripCount, keyword);
    toggleEmpty(all);
  }

  function run() {
    if (!live()) return;
    if (running) { purgeSampleCards(); return; } // re-strip immediately; let the in-flight one finish counts
    running = true;
    // Strip synchronously so nothing fabricated is ever visible, then reconcile counts.
    purgeSampleCards();
    refreshCounts().catch(function () {}).then(function () { running = false; }, function () { running = false; });
  }

  function paneVisible() {
    var p = document.getElementById(PANE);
    return !!(p && !p.hidden && p.offsetParent !== null);
  }

  // ---- triggers -----------------------------------------------------------
  // Pane load: poll briefly until the pane is shown / live flag set, then purge.
  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    if (live() && paneVisible()) { run(); }
    if (tries > 40) clearInterval(iv); // ~10s safety
  }, 250);
  // Also run once on next tick (covers the case where it's already the active tab).
  setTimeout(run, 0);

  // Nav to the campaigns tab.
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-tab="campaigns"]');
    if (!t) return;
    setTimeout(run, 60);
    setTimeout(run, 400);
  }, true);

  // Sub-tab clicks inside the pane (filter seg + [data-autotab] switcher).
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('#' + PANE + ' [role="tab"], #' + PANE + ' [data-autotab]');
    if (!t) return;
    setTimeout(run, 30);
  }, true);
})();
} catch(e){ console.warn('[mercury-purge] campaigns', e); }

/* purge: settings */
try {
/* ---- pane: settings — purge residual sample data (complements mercury-live loaders) ---- */
try {
(function () {
  'use strict';
  var api = (window.api || {});
  var PANE = '#pane-settings';

  function live() { try { return !!document.documentElement.getAttribute('data-rsms-live'); } catch (e) { return false; } }
  function $(s, r) { try { return (r || document).querySelector(s); } catch (e) { return null; } }
  function $all(s, r) { try { return Array.prototype.slice.call((r || document).querySelectorAll(s)); } catch (e) { return []; } }
  function pane() { return $(PANE); }
  function txt(el) { return ((el && el.textContent) || '').trim(); }
  function esc(s) { return ('' + (s == null ? '' : s)).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function initials(name) { return (('' + (name || '')).split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase()) || '—'; }
  function num(n) { try { return Number(n || 0).toLocaleString('en-US'); } catch (e) { return '' + (n || 0); } }
  function unwrap(r) { return (r && typeof r === 'object' && 'data' in r && !Array.isArray(r) && r.data && typeof r.data === 'object') ? r.data : r; }
  function setText(el, v) { if (el) try { el.textContent = v; } catch (e) {} }

  // Replace any descendant text nodes that match a fabricated string with a safe value.
  function scrubMeta(panel) {
    if (!panel) return;
    // card-subs with fabricated counts / spend
    $all('.card-sub', panel).forEach(function (el) {
      var s = txt(el);
      if (/Spend this month:\s*\$/.test(s)) setText(el, 'Your account charges and top-ups');
      else if (/\d+\s+seats?\b.*(active|invite|pending)/i.test(s)) setText(el, 'People with access to this account');
      else if (/\d+\s+active numbers?\b/i.test(s)) setText(el, 'Your sending numbers — health lives in Number Health');
    });
  }

  // ---- PROFILE: identity header, security session, phone-number cards --------
  function purgeProfile() {
    var p = $(PANE + ' [data-stab-panel="profile"]'); if (!p) return;

    // Identity header (avatar / name / verified / member-since) from real getMe.
    var idBox = $('.set-id', p);
    if (idBox && !idBox.__rsmsPurged) {
      idBox.__rsmsPurged = 1;
      // neutralize fabricated values immediately so nothing fake flashes.
      // NOT the avatar: the static markup is empty and settingsProfile()'s
      // _renderAvatar owns it. This purge runs on an interval and was racing
      // AFTER that render, erasing the real initials/photo → permanently blank.
      var nameEl = $('.set-id-name', idBox);
      var verified = nameEl ? $('.set-verified', nameEl) : null;
      if (verified) verified.style.display = 'none';
      var nameNode = null;
      if (nameEl) { for (var i = 0; i < nameEl.childNodes.length; i++) { if (nameEl.childNodes[i].nodeType === 3 && txt(nameEl.childNodes[i])) { nameNode = nameEl.childNodes[i]; break; } } }
      if (nameNode) nameNode.nodeValue = '';
      var metaEl = $('.set-id-meta', idBox);
      // strip the fabricated "Owner · Member since …" prose, keep the Change-photo button
      if (metaEl) { for (var j = metaEl.childNodes.length - 1; j >= 0; j--) { var n = metaEl.childNodes[j]; if (n.nodeType === 3) n.nodeValue = ''; } }

      // mercury-live.js settingsProfile() handles the real data load from api.getMe()
      // — no duplicate fetch needed here. Just blank the fabricated values.
    }

    // Security card: device-session line is fabricated, no clean read endpoint.
    $all('.card', p).forEach(function (card) {
      var title = txt($('.card-title', card));
      if (title === 'Security' && !card.__rsmsPurged) {
        card.__rsmsPurged = 1;
        var sub = $('.set-row-sub', card);
        if (sub) setText(sub, '1 active session (this browser).');
      }
    });

    // Phone Numbers card: mercury-live.js settingsPhoneNumbers() loads real data.
    // Just blank the fabricated rows so they don't flash before real data arrives.
    var numCards = $all('.card', p).filter(function (c) { return txt($('.card-title', c)) === 'Phone Numbers'; });
    numCards.forEach(function (card) {
      if (card.__rsmsNumPurged) return; card.__rsmsNumPurged = 1;
      var rows = $('.set-rows', card);
      if (rows) rows.innerHTML = '<div class="set-row"><div class="set-row-main"><div class="set-row-sub" style="color:var(--muted)">Loading numbers\u2026</div></div></div>';
      var subEl = $('.card-sub', card);
      if (subEl) setText(subEl, 'Your sending numbers \u2014 health lives in Number Health');
    });
  }

  // ---- BILLING: volume-pricing copy + transaction card-sub -------------------
  function purgeBilling() {
    var p = $(PANE + ' [data-stab-panel="billing"]'); if (!p) return;
    scrubMeta(p);
    // Volume-pricing note has a fabricated "25,682 segments from Growth" figure.
    var note = $('.vp-note', p);
    if (note && !note.__rsmsPurged) { note.__rsmsPurged = 1; note.innerHTML = 'The more you send each month, the lower your per-segment rate — it steps down automatically. Carrier fees are passed through at cost and aren’t marked up.'; }
    // The "You're here" tier pill is generic enough, but the hardcoded $ tiers are
    // pricing (not user data) so leave them.
    // "Dialer plan" row sub ships fabricated "Renews Jul 1, 2026 · $149/mo · 3 local
    // numbers" → genericize (real dialer sub isn't read into this row).
    $all('.set-row-sub', p).forEach(function (s) { if (/renews .*20\d\d|\$149\/mo|\d local number/i.test(s.textContent || '')) s.textContent = 'Manage your dialer plan in Billing → Dialer.'; });
  }

  // ---- TEAM: card-sub seat counts --------------------------------------------
  function purgeTeam() {
    var p = $(PANE + ' [data-stab-panel="team"]'); if (!p) return;
    scrubMeta(p);
  }

  // ---- SUB-ACCOUNTS: the "margin (30d)" KPI mercury-live doesn't fill ---------
  function purgeSubAccounts() {
    var p = $(PANE + ' [data-stab-panel="sub-accounts"]'); if (!p || p.__rsmsMargin) return; p.__rsmsMargin = 1;
    $all('.kpi', p).forEach(function (c) {
      var lbl = txt($('.kpi-label', c)).toLowerCase();
      if (/margin/.test(lbl)) { var v = $('.kpi-val', c); if (v) setText(v, '—'); }
    });
  }

  // ---- NOTIFICATIONS: "Recent activity" feed -> real notifications -----------
  function purgeNotifications() {
    var p = $(PANE + ' [data-stab-panel="notifications"]'); if (!p) return;
    var feed = $('.set-feed', p); if (!feed || feed.__rsmsPurged) return; feed.__rsmsPurged = 1;
    feed.innerHTML = '<div class="set-feed-row"><span class="set-feed-dot fd-gray"></span><div class="set-feed-text" style="color:var(--muted)">Loading recent activity…</div></div>';
    try {
      Promise.resolve(api.getNotifications && api.getNotifications({ limit: 8 })).then(function (res) {
        var d = unwrap(res);
        var rows = Array.isArray(d) ? d : (d && (d.notifications || d.data || d.items)) || [];
        if (!rows.length) {
          feed.innerHTML = '<div class="set-feed-row"><span class="set-feed-dot fd-gray"></span><div class="set-feed-text" style="color:var(--muted)">No recent activity yet.</div></div>';
          return;
        }
        feed.innerHTML = rows.slice(0, 8).map(function (n) {
          var body = n.message || n.body || n.text || n.title || n.description || '';
          var when = n.created_at || n.time || n.date || '';
          var rel = '';
          try { if (when) { var dt = new Date(when); var diff = (Date.now() - dt.getTime()) / 1000; rel = diff < 3600 ? Math.max(1, Math.round(diff / 60)) + 'm ago' : diff < 86400 ? Math.round(diff / 3600) + 'h ago' : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } } catch (e) {}
          var sev = ('' + (n.type || n.severity || n.level || '')).toLowerCase();
          var dot = /fail|error|warn|amber/.test(sev) ? 'fd-amber' : /success|deliver|done|paid/.test(sev) ? 'fd-green' : 'fd-violet';
          return '<div class="set-feed-row"><span class="set-feed-dot ' + dot + '"></span><div class="set-feed-text">' + esc(body) + '</div><span class="set-feed-time">' + esc(rel) + '</span></div>';
        }).join('');
      }).catch(function () {
        feed.innerHTML = '<div class="set-feed-row"><span class="set-feed-dot fd-gray"></span><div class="set-feed-text" style="color:var(--muted)">Recent activity is unavailable right now.</div></div>';
      });
    } catch (e) {}
  }

  // ---- COMPLIANCE: the message-footer preview names a fake company -----------
  function purgeCompliance() {
    var p = $(PANE + ' [data-stab-panel="compliance"]'); if (!p) return;
    var bubble = $('.set-bubble', p); if (!bubble || bubble.__rsmsPurged) return; bubble.__rsmsPurged = 1;
    // generic preview so no fabricated brand name shows; refine with real company if known
    bubble.innerHTML = 'Your appointment is confirmed for Tuesday at 2pm. <em>— Reply STOP to opt out</em>';
    try {
      Promise.resolve(api.getMe && api.getMe()).then(function (res) {
        var m = unwrap(res); var co = m && (m.company_name || (((m.first_name || '') + ' ' + (m.last_name || '')).trim()));
        if (co) bubble.innerHTML = 'Your appointment is confirmed for Tuesday at 2pm. <em>— ' + esc(co) + ' · Reply STOP to opt out</em>';
      }).catch(function () {});
    } catch (e) {}
  }

  // ---- DIALER sub-tab: fabricated webhook URL --------------------------------
  function purgeDialer() {
    var p = $(PANE + ' [data-stab-panel="dialer"]'); if (!p || p.__rsmsWh) return; p.__rsmsWh = 1;
    $all('input[type="text"]', p).forEach(function (inp) {
      if (/hooks\.maplegrove\.com|maplegrove|carolinahomeoffers/i.test(inp.value || '')) { inp.value = ''; inp.setAttribute('placeholder', 'https://your-endpoint.example.com/readysms/calls'); }
    });
    // Dispositions + lead-priority lists are default configuration (not fabricated
    // user data), so they stay as sensible defaults.
  }

  function purge() {
    if (!live()) return;
    try { purgeProfile(); } catch (e) {}
    try { purgeBilling(); } catch (e) {}
    try { purgeTeam(); } catch (e) {}
    try { purgeSubAccounts(); } catch (e) {}
    try { purgeNotifications(); } catch (e) {}
    try { purgeCompliance(); } catch (e) {}
    try { purgeDialer(); } catch (e) {}
  }

  // Run on pane load (when settings becomes visible) and on every sub-tab click.
  function paneVisible() { var pn = pane(); return pn && !pn.hasAttribute('hidden'); }

  // initial + retry a couple times (mercury-live's async loaders may run after us)
  function kick() { if (paneVisible()) purge(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kick); else kick();
  setTimeout(kick, 300); setTimeout(kick, 1200);

  // Sub-tab nav clicks inside settings (data-stab) re-reveal a panel → re-purge.
  document.addEventListener('click', function (e) {
    if (!live()) return;
    var t = e.target; if (!t || !t.closest) return;
    if (t.closest(PANE + ' [data-stab]') || t.closest('[data-stab="sub-accounts"]')) {
      setTimeout(purge, 0); setTimeout(purge, 250);
    }
  }, true);

  // Main left-nav click that opens the settings pane.
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest) return;
    var navLink = t.closest('[data-pane="settings"],[href="#settings"],[data-tab="settings"]');
    if (navLink) { setTimeout(kick, 60); setTimeout(kick, 400); }
  }, true);

  // hashchange to #settings
  window.addEventListener('hashchange', function () { if ((location.hash || '').indexOf('settings') >= 0) { setTimeout(kick, 60); setTimeout(kick, 400); } });
})();
} catch (e) { console.warn('[mercury-buttons] settings-purge failed', e); }
} catch(e){ console.warn('[mercury-purge] settings', e); }

/* ---- pane: crm csv import ---- */
try { (function(){
  'use strict';
  var api = (window.api || {});
  var modal = document.getElementById('crm-import'); if (!modal) return;
  var config = document.getElementById('imp-config');
  var go = document.getElementById('imp-go');
  var goLbl = document.getElementById('imp-go-lbl');
  var attest = document.getElementById('imp-attest-cb');
  var fileInput = document.getElementById('imp-file');
  var dropZone = document.getElementById('imp-drop');
  var chooseBtn = document.getElementById('imp-choose');
  var replaceBtn = document.getElementById('imp-replace');
  var mapBody = document.getElementById('imp-map-body');
  var filechip = document.getElementById('imp-filechip');
  var scrubCost = document.getElementById('imp-scrub-cost');
  var etaEl = document.getElementById('imp-eta');
  var _impRowCount = 0; // remembered so the ETA can update when scrub is toggled
  var sheetUrl = document.getElementById('imp-sheet-url');
  var tagCb = document.getElementById('imp-tag-cb');
  var dripCb = document.getElementById('imp-drip-cb');
  var scrubCb = document.getElementById('imp-scrub-cb');
  var dripSeq = document.getElementById('imp-drip-seq');
  var _savedDripId = ''; // restored drip-sequence id, re-applied after its async load
  var IMP_SETTINGS_KEY = 'rsms_import_settings_v1';

  var FIELDS = [
    {v:'', l:'-- Ignore --'},
    {v:'phone', l:'Phone (required)'},
    {v:'first_name', l:'First Name'},
    {v:'last_name', l:'Last Name'},
    {v:'full_name', l:'Full Name (splits into first + last)'},
    {v:'email', l:'Email'},
    {v:'address1', l:'Mailing Address'},
    {v:'city', l:'City'},
    {v:'state', l:'State'},
    {v:'postal_code', l:'Zip / Postal Code'},
    {v:'property_address', l:'Property Address'},
    {v:'property_city', l:'Property City'},
    {v:'property_state', l:'Property State'},
    {v:'property_zip', l:'Property Zip'},
    {v:'property_type', l:'Property Type'},
    {v:'mortgage_balance', l:'Mortgage Balance'},
    {v:'equity_value', l:'Equity Value'},
    {v:'estimated_value', l:'Estimated Value'},
    {v:'home_value', l:'Home Value'},
    {v:'year_built', l:'Year Built'},
    {v:'bedrooms', l:'Bedrooms'},
    {v:'bathrooms', l:'Bathrooms'},
    {v:'square_feet', l:'Square Feet'},
    {v:'lot_size', l:'Lot Size'},
    {v:'years_owned', l:'Years Owned'},
    {v:'last_sale_date', l:'Last Sale Date'},
    {v:'last_sale_price', l:'Last Sale Price'},
    {v:'tags', l:'Tags'},
    {v:'assigned_to', l:'Assign To (sub-user)'}
  ];

  // State
  var _headers = [];
  var _lines = [];   // all lines including header
  var _fileName = '';
  // Unmapped columns the user hovered-and-×'d out of "auto-create custom fields"
  // — keyed by header index. Excluded columns are skipped at import time. Reset per file.
  var _impExcludedCustom = {};

  function guessField(rawHeader) {
    var h = rawHeader.toLowerCase().trim().replace(/['"]/g, '').replace(/\s+/g, '_');
    if (/^(phone|phone_1|primary_phone|mobile|mobile_phone|cell|cellphone|telephone|phone_number)$/.test(h)) return 'phone';
    if (/^first_?name$|^first$|^owner_?1?_?first(_?name)?$/.test(h)) return 'first_name';
    if (/^last_?name$|^last$|^owner_?1?_?last(_?name)?$/.test(h)) return 'last_name';
    if (/^full_?name$|^name$|^contact_?name$|^owner_?name$|^owner_?full_?name$|^full$/.test(h)) return 'full_name';
    if (/^email(_1|_address|_primary)?$/.test(h)) return 'email';
    if (/^(assigned|assigned_to|assignee|assigned_rep|assigned_agent|assigned_lo|loan_officer|lo|rep|agent|owner_rep|sales_rep|salesperson)$/.test(h)) return 'assigned_to';
    if (/^(mailing_address|address|address_1|address1|street)$/.test(h)) return 'address1';
    if (/^(mailing_city|city)$/.test(h)) return 'city';
    if (/^(mailing_state|state)$/.test(h)) return 'state';
    if (/^(mailing_zip|zip|zip_code|postal_code)$/.test(h)) return 'postal_code';
    if (/^property_address$/.test(h)) return 'property_address';
    if (/^property_city$/.test(h)) return 'property_city';
    if (/^property_state$/.test(h)) return 'property_state';
    if (/^property_zip$|^property_postal_code$/.test(h)) return 'property_zip';
    if (/^property_type(_detail)?$/.test(h)) return 'property_type';
    if (/^(total_loan_balance|mortgage_balance|loan_balance|loan_est_balance)$/.test(h)) return 'mortgage_balance';
    if (/^equity(_current_estimated_balance)?$|^equity_value$|^current_equity$/.test(h)) return 'equity_value';
    if (/^estimated_value$|^arv$|^market_value$/.test(h)) return 'estimated_value';
    if (/^(home_value|total_assessed_value|assessed_value)$/.test(h)) return 'home_value';
    if (/^year_built$/.test(h)) return 'year_built';
    if (/^bedroom_count$|^bedrooms?$|^beds$/.test(h)) return 'bedrooms';
    if (/^bathroom_count$|^bathrooms?$|^baths$/.test(h)) return 'bathrooms';
    if (/^(total_building_area_square_feet|square_feet|sqft|building_sqft)$/.test(h)) return 'square_feet';
    if (/^lot_size(_square_feet)?$|^lot_sqft$/.test(h)) return 'lot_size';
    if (/^years_owned$|^ownership_length$/.test(h)) return 'years_owned';
    if (/^last_sale_date$|^sale_date$/.test(h)) return 'last_sale_date';
    if (/^last_sale_price$|^sale_price$/.test(h)) return 'last_sale_price';
    if (/^tags?$|^tag_names$/.test(h)) return 'tags';
    return '';
  }

  function parseCsvLine(line) {
    var cols = [];
    var current = '';
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
        continue;
      }
      if (ch === ',' && !inQuotes) { cols.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    cols.push(current.trim());
    return cols;
  }

  function escHtml(s) {
    var d = document.createElement('div'); d.textContent = s; return d.innerHTML;
  }

  function reset() {
    if (modal._importJobTimer) { clearInterval(modal._importJobTimer); modal._importJobTimer = null; }
    _headers = []; _lines = []; _fileName = '';
    _impRowCount = 0; if (etaEl) etaEl.hidden = true; // clear stale time estimate
    if (config) config.hidden = true;
    if (attest) attest.checked = false;
    if (go) { go.disabled = true; go.style.opacity = '.5'; } // no file yet → Import stays disabled
    if (goLbl) goLbl.textContent = 'Import contacts';
    if (mapBody) mapBody.innerHTML = '';
    if (filechip) filechip.innerHTML = '';
    if (fileInput) fileInput.value = '';
    if (sheetUrl) sheetUrl.value = '';
    ['imp-tag-cb','imp-drip-cb'].forEach(function(id) { var c = document.getElementById(id); if (c) c.checked = false; });
    ['imp-tag-body','imp-drip-body'].forEach(function(id) { var b = document.getElementById(id); if (b) b.hidden = true; });
    if (scrubCb) scrubCb.checked = true;
    if (scrubCost) { scrubCost.style.display = ''; scrubCost.innerHTML = ''; }
    var al = document.getElementById('imp-attest'); if (al) al.classList.remove('bm-attest-missing');
    var bd = modal.querySelector('.bm-body'); if (bd) bd.scrollTop = 0;
    // Reset import mode to upsert
    modal.querySelectorAll('[data-impmode]').forEach(function(b) { b.classList.toggle('on', b.getAttribute('data-impmode') === 'upsert'); });
    // Reset dedupe checkboxes
    modal.querySelectorAll('.imp-dedupe').forEach(function(cb) { cb.checked = (cb.value === 'phone'); });
    // Restore the user's last-used import settings over those defaults, so repeat
    // imports don't make them re-toggle everything each time. CONSENT is never
    // restored — it's a per-import legal attestation that must be made fresh.
    try {
      var saved = JSON.parse(localStorage.getItem(IMP_SETTINGS_KEY) || 'null');
      if (saved) {
        if (saved.mode) modal.querySelectorAll('[data-impmode]').forEach(function(b) { b.classList.toggle('on', b.getAttribute('data-impmode') === saved.mode); });
        if (Array.isArray(saved.dedupe) && saved.dedupe.length) modal.querySelectorAll('.imp-dedupe').forEach(function(cb) { cb.checked = saved.dedupe.indexOf(cb.value) !== -1; });
        if (scrubCb) scrubCb.checked = (saved.scrub !== false);
        if (tagCb) {
          tagCb.checked = !!saved.tagOn;
          var _tb = document.getElementById('imp-tag-body'); if (_tb) _tb.hidden = !tagCb.checked;
          var _tn = document.getElementById('imp-tag-name'); if (_tn && saved.tagName) _tn.value = saved.tagName;
        }
        if (dripCb) {
          dripCb.checked = !!saved.dripOn;
          var _db = document.getElementById('imp-drip-body'); if (_db) _db.hidden = !dripCb.checked;
        }
        _savedDripId = saved.dripId || '';
        if (dripSeq && _savedDripId) dripSeq.value = _savedDripId; // re-applied after loadDripSequences too
      }
    } catch (e) {}
  }

  function loadDripSequences() {
    // Re-query fresh in case the module-init binding went stale.
    var el = document.getElementById('imp-drip-seq') || dripSeq;
    if (!el) return;
    if (typeof api.request !== 'function') return;
    // FAST PATH ?light=1: the plain /drip-sequences does 6 subqueries + a forecast
    // per sequence, which timed out for big-drip accounts (Kevin Van Patten u176)
    // — the fetch failed, the .catch swallowed it, and the "enroll on import"
    // dropdown stayed empty ("-- None --"). The bulk "Add to drip" modal already
    // moved to ?light for this exact reason; the import modal never did.
    api.request('GET', '/drip-sequences?light=1').then(function(r) {
      // Tolerate any of the shapes the endpoint/helpers return.
      var arr = r && (Array.isArray(r) ? r : (r.data || r.sequences || r.drip_sequences || r.items));
      if (!Array.isArray(arr)) return;
      var html = '<option value="">-- None --</option>';
      arr.forEach(function(seq) {
        html += '<option value="' + seq.id + '">' + escHtml(seq.name) + '</option>';
      });
      el.innerHTML = html;
      if (_savedDripId) el.value = _savedDripId; // restore the remembered sequence once options exist
    }).catch(function(e) { try { console.warn('[import] loadDripSequences failed:', e && e.message); } catch (_) {} });
  }

  function buildSelectHtml(guess) {
    var html = '';
    FIELDS.forEach(function(f) {
      html += '<option value="' + f.v + '"' + (f.v === guess ? ' selected' : '') + '>' + escHtml(f.l) + '</option>';
    });
    return html;
  }

  // Dynamic import-time estimate. The import runs as a batched background job;
  // the base insert/dedupe pass is fast, but TCPA-scrub hits an external API per
  // number and dominates. Rates are approximate + tunable (label says "~"), and
  // the estimate re-computes whenever the file or the scrub toggle changes.
  var IMPORT_RATE = 2500; // contacts/sec — base parse+dedupe+insert
  var SCRUB_RATE = 220;   // contacts/sec — external TCPA scrub (the slow part)
  function fmtEta(sec) {
    if (sec < 8) return 'a few seconds';
    if (sec < 60) return '~' + (Math.ceil(sec / 5) * 5) + ' seconds';
    var min = sec / 60;
    if (min < 60) return '~' + Math.max(1, Math.round(min)) + ' min';
    var hr = Math.floor(min / 60), rm = Math.round(min % 60);
    return '~' + hr + ' hr' + (rm ? ' ' + rm + ' min' : '');
  }
  function updateEta() {
    if (!etaEl) return;
    // Only show the estimate once a file/sheet is actually loaded (config visible).
    // Guards against a stale estimate lingering after a file is removed or on reopen.
    if (!_impRowCount || (config && config.hidden)) { etaEl.hidden = true; return; }
    var scrub = scrubCb ? scrubCb.checked : false;
    var sec = _impRowCount / IMPORT_RATE + (scrub ? _impRowCount / SCRUB_RATE : 0);
    sec = Math.max(2, sec);
    etaEl.hidden = false;
    etaEl.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>' +
      'Est. import time: <b>' + fmtEta(sec) + '</b>' +
      (scrub ? ' <span class="imp-eta-scrub">· incl. TCPA scrub</span>' : '');
  }

  // #3: show which columns will be auto-created as custom fields (the unmapped
  // ones), live-updating as mappings change and when the toggle flips.
  function updateAutoCustomPreview() {
    var box = document.getElementById('imp-auto-custom-list');
    if (!box) return;
    var autoOn = (document.getElementById('imp-auto-custom') || {}).checked;
    var mapped = {};
    if (modal) modal.querySelectorAll('.imp-field-sel').forEach(function(sel) {
      if (sel.value) mapped[parseInt(sel.getAttribute('data-csv-idx'), 10)] = 1;
    });
    var unmapped = [];
    _headers.forEach(function(h, i) { if (!mapped[i]) unmapped.push({ h: h, i: i }); });
    if (!autoOn || !unmapped.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    // Hover a chip → an "×" appears; click it to drop that column so it WON'T become a
    // custom field. Dropped columns move to a muted "Won't import" row (click to restore).
    var active = unmapped.filter(function(u) { return !_impExcludedCustom[u.i]; });
    var excluded = unmapped.filter(function(u) { return _impExcludedCustom[u.i]; });
    var html = '';
    if (active.length) {
      html += '<span class="imp-cf-lbl">Will create custom fields:</span> ' +
        active.map(function(u) {
          return '<span class="imp-cf-chip" data-cf-idx="' + u.i + '">' + escHtml(u.h) +
            '<button type="button" class="imp-cf-x" data-cf-drop="' + u.i + '" title="Don’t create this field" aria-label="Remove ' + escHtml(u.h) + '">×</button></span>';
        }).join('');
    } else {
      html += '<span class="imp-cf-lbl">No custom fields will be created — every unmapped column is excluded.</span>';
    }
    if (excluded.length) {
      html += '<div class="imp-cf-excluded"><span class="imp-cf-lbl">Won’t import:</span> ' +
        excluded.map(function(u) {
          return '<span class="imp-cf-chip is-excluded" data-cf-restore="' + u.i + '" title="Create this field after all">' + escHtml(u.h) +
            '<span class="imp-cf-plus">+</span></span>';
        }).join('') + '</div>';
    }
    box.innerHTML = html;
    if (!box.__cfxWired) {
      box.__cfxWired = 1;
      box.addEventListener('click', function(e) {
        var drop = e.target.closest('.imp-cf-x[data-cf-drop]');
        if (drop) { e.preventDefault(); e.stopPropagation(); _impExcludedCustom[parseInt(drop.getAttribute('data-cf-drop'), 10)] = 1; updateAutoCustomPreview(); return; }
        var restore = e.target.closest('.imp-cf-chip.is-excluded[data-cf-restore]');
        if (restore) { e.preventDefault(); e.stopPropagation(); delete _impExcludedCustom[parseInt(restore.getAttribute('data-cf-restore'), 10)]; updateAutoCustomPreview(); return; }
      });
    }
  }

  // #6: populate the tag input's autocomplete with the account's existing tags,
  // and tell the user whether what they typed is an existing tag or a new one.
  var _impTags = null, _impTagsLoaded = false;
  function loadImpTags() {
    var input = document.getElementById('imp-tag-name');
    if (input && !input.__impHint) {
      input.__impHint = 1;
      input.addEventListener('input', updateImpTagHint);
      input.addEventListener('focus', updateImpTagHint);
    }
    var dl = document.getElementById('imp-tag-list');
    if (_impTagsLoaded || !dl || typeof api === 'undefined' || !api.request) return;
    _impTagsLoaded = true;
    api.request('GET', '/contacts/tags').then(function(r) {
      var tags = (r && (r.data || r)) || [];
      _impTags = tags.map(function(t) { return (typeof t === 'string') ? t : (t.name || t.tag || ''); }).filter(Boolean);
      dl.innerHTML = _impTags.map(function(n) { return '<option value="' + escHtml(n) + '"></option>'; }).join('');
      updateImpTagHint();
    }).catch(function() { _impTagsLoaded = false; });
  }
  function updateImpTagHint() {
    var input = document.getElementById('imp-tag-name');
    var hint = document.getElementById('imp-tag-hint');
    if (!input || !hint) return;
    var v = input.value.trim();
    if (!v) { hint.textContent = (_impTags && _impTags.length) ? 'Pick an existing tag or type a new one.' : ''; hint.className = 'imp-tag-hint'; return; }
    var exists = _impTags && _impTags.some(function(n) { return n.toLowerCase() === v.toLowerCase(); });
    hint.textContent = exists ? '✓ Existing tag' : '+ Creates a new tag “' + v + '”';
    hint.className = 'imp-tag-hint ' + (exists ? 'is-existing' : 'is-new');
  }

  function onFileLoaded(fileName, text) {
    if (!text || !text.trim()) {
      if (window.__rsmsToast) window.__rsmsToast('File appears to be empty');
      return;
    }
    // Split lines, filter empty
    var allLines = text.split(/\r?\n/).filter(function(l) { return l.trim() !== ''; });
    if (allLines.length < 2) {
      if (window.__rsmsToast) window.__rsmsToast('CSV needs at least a header row and one data row');
      return;
    }
    _headers = parseCsvLine(allLines[0]);
    _lines = allLines;
    _fileName = fileName;
    _impExcludedCustom = {}; // fresh file → clear any prior per-column exclusions
    var rowCount = allLines.length - 1;
    var colCount = _headers.length;
    var sampleRow = parseCsvLine(allLines[1] || '');

    // Show config
    if (config) config.hidden = false; if (go) { go.disabled = false; go.style.opacity = '1'; } // file/sheet ready → enable Import

    // Update file chip
    if (filechip) {
      filechip.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>' +
        '<b>' + escHtml(fileName) + '</b>' +
        '<span>' + rowCount.toLocaleString() + ' rows · ' + colCount + ' columns</span>' +
        '<button class="link-btn" type="button" id="imp-replace">Replace</button>' +
        '<button class="link-btn" type="button" id="imp-remove" style="color:var(--danger,#dc2626)">Remove</button>';
      // Re-bind replace button reference
      replaceBtn = document.getElementById('imp-replace');
    }

    // Build mapping rows
    if (mapBody) {
      var html = '';
      _headers.forEach(function(h, i) {
        var guess = guessField(h);
        var sample = (sampleRow[i] || '').slice(0, 40);
        html += '<div class="imp-map-row">' +
          '<span class="imp-col">' + escHtml(h) + '</span>' +
          '<span class="imp-samp">' + escHtml(sample) + (sample.length === 40 ? '...' : '') + '</span>' +
          '<div class="blast-select-wrap blast-select-inline">' +
            '<select class="blast-select imp-field-sel" data-csv-idx="' + i + '">' + buildSelectHtml(guess) + '</select>' +
          '</div></div>';
      });
      mapBody.innerHTML = html;
      // Upgrade the native dropdowns to the app's custom styled select (keeps the
      // underlying <select> in sync, so submit still reads .imp-field-sel.value).
      mapBody.querySelectorAll('.imp-field-sel').forEach(function(s){ if (window.__rdsEnhance) window.__rdsEnhance(s); });
      // Live-preview which columns will become auto custom fields (#3), and keep
      // it in sync as the user changes mappings.
      updateAutoCustomPreview();
      mapBody.addEventListener('change', updateAutoCustomPreview);
    }

    // Update go button label
    if (goLbl) goLbl.textContent = 'Import ' + rowCount.toLocaleString() + ' contacts';

    // Gate the Import button on the consent attestation (compliance). It used to stay
    // clickable and only block with a toast AFTER the click; disable it up front so the
    // user can't import until they've checked 'Consent confirmation' (Anton).
    function _impConsentGate() {
      var cb = document.getElementById('imp-attest-cb'), g = document.getElementById('imp-go');
      if (!g) return;
      var ok = !!(cb && cb.checked);
      g.disabled = !ok; g.style.opacity = ok ? '' : '.5'; g.style.cursor = ok ? '' : 'not-allowed';
      g.title = ok ? '' : 'Check “Consent confirmation” below to import';
    }
    _impConsentGate();
    if (!window.__impConsentGateWired) {
      window.__impConsentGateWired = 1;
      document.addEventListener('change', function (e) { if (e.target && e.target.id === 'imp-attest-cb') _impConsentGate(); }, true);
    }

    // Update scrub cost
    if (scrubCost) {
      var cost = (rowCount * 0.005).toFixed(2);
      scrubCost.innerHTML = '&#8776; <b>$' + cost + '</b> · $0.005 x ' + rowCount.toLocaleString() + ' contacts';
    }

    // Update dynamic time estimate (remembers count so the scrub toggle can re-run it)
    _impRowCount = rowCount;
    updateEta();

    // Reset consent
    if (attest) attest.checked = false;
  }

  function handleFile(file) {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      if (window.__rsmsToast) window.__rsmsToast('File too large (max 50 MB)');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      if (window.__rsmsToast) window.__rsmsToast('Please upload a .csv file');
      return;
    }
    // Immediate feedback: reading + parsing a large CSV (up to 50 MB) takes a
    // beat and the file picker gives no signal once you've chosen. Show a
    // "Reading file…" chip now so the upload visibly registers; onFileLoaded
    // swaps in the real row/column counts once the read+parse finishes.
    if (filechip) {
      filechip.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="var(--accent,#2563EB)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:rsmsSpinBtn .6s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>' +
        '<b>' + escHtml(file.name) + '</b>' +
        '<span>Reading file…</span>';
    }
    if (config) config.hidden = false; if (go) { go.disabled = false; go.style.opacity = '1'; } // file/sheet ready → enable Import
    var reader = new FileReader();
    reader.onload = function(e) { onFileLoaded(file.name, e.target.result); };
    reader.onerror = function() {
      if (window.__rsmsToast) window.__rsmsToast('Could not read that file — please try again');
      if (config) config.hidden = true;
      if (filechip) filechip.innerHTML = '';
    };
    reader.readAsText(file);
  }

  // #9: import several CSVs at once. Files with the SAME columns are merged into
  // one import (the common "split my export into part1/part2/part3" case);
  // mismatched-column files are skipped with a heads-up. Reuses the single-file
  // pipeline by concatenating into one blob.
  function handleFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    if (files.length === 1) return handleFile(files[0]);
    for (var k = 0; k < files.length; k++) {
      if (files[k].size > 50 * 1024 * 1024) { if (window.__rsmsToast) window.__rsmsToast('File too large (max 50 MB): ' + files[k].name); return; }
      if (!files[k].name.toLowerCase().endsWith('.csv')) { if (window.__rsmsToast) window.__rsmsToast('Only .csv files: ' + files[k].name); return; }
    }
    if (filechip) filechip.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="var(--accent,#2563EB)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:rsmsSpinBtn .6s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><b>' + files.length + ' files</b><span>Reading…</span>';
    if (config) config.hidden = false; if (go) { go.disabled = false; go.style.opacity = '1'; } // file/sheet ready → enable Import
    Promise.all(files.map(function (f) {
      return new Promise(function (res, rej) {
        var r = new FileReader();
        r.onload = function (e) { res({ name: f.name, text: e.target.result }); };
        r.onerror = function () { rej(f.name); };
        r.readAsText(f);
      });
    })).then(function (results) {
      var headerLine = null, headerCols = null, body = [], used = [], skipped = [];
      results.forEach(function (r) {
        var lines = (r.text || '').split(/\r?\n/).filter(function (l) { return l.trim() !== ''; });
        if (lines.length < 2) { skipped.push(r.name); return; }
        var cols = parseCsvLine(lines[0]);
        var matches = headerCols && cols.length === headerCols.length && cols.every(function (c, i) { return c.toLowerCase().trim() === headerCols[i].toLowerCase().trim(); });
        if (!headerLine) { headerLine = lines[0]; headerCols = cols; used.push(r.name); body = body.concat(lines.slice(1)); }
        else if (matches) { used.push(r.name); body = body.concat(lines.slice(1)); }
        else { skipped.push(r.name); }
      });
      if (!headerLine) { if (window.__rsmsToast) window.__rsmsToast('No valid CSV rows found'); if (config) config.hidden = true; if (filechip) filechip.innerHTML = ''; return; }
      if (skipped.length && window.__rsmsToast) window.__rsmsToast(skipped.length + ' file(s) skipped — different columns');
      var name = used.length > 1 ? (used[0].replace(/\.csv$/i, '') + ' + ' + (used.length - 1) + ' more') : used[0];
      onFileLoaded(name, [headerLine].concat(body).join('\n'));
    }).catch(function (n) {
      if (window.__rsmsToast) window.__rsmsToast('Could not read ' + n);
      if (config) config.hidden = true; if (filechip) filechip.innerHTML = '';
    });
  }

  // --- Open modal ---
  document.addEventListener('click', function(e) {
    if (e.target.closest('#crm-import-btn')) {
      e.preventDefault(); e.stopPropagation();
      reset();
      loadDripSequences();
      modal.classList.add('is-open');
    }
  }, true);

  // --- Source tabs ---
  document.addEventListener('click', function(e) {
    var src = e.target.closest('#crm-import [data-impsrc]');
    if (!src) return;
    e.preventDefault();
    modal.querySelectorAll('[data-impsrc]').forEach(function(b) { b.classList.remove('on'); });
    src.classList.add('on');
    var m = src.getAttribute('data-impsrc');
    modal.querySelectorAll('[data-imppane]').forEach(function(p) { p.hidden = p.getAttribute('data-imppane') !== m; });
  });

  // --- Import mode seg buttons ---
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('#crm-import [data-impmode]');
    if (!btn) return;
    modal.querySelectorAll('[data-impmode]').forEach(function(b) { b.classList.remove('on'); });
    btn.classList.add('on');
  });

  // --- File upload via button ---
  if (chooseBtn && fileInput) {
    chooseBtn.addEventListener('click', function(e) { e.preventDefault(); fileInput.click(); });
  }
  // Whole drop-zone is clickable, not just the button (matches the dialer-list
  // import modal). The button + replace link open the picker themselves, so
  // skip clicks that land on them to avoid firing the file dialog twice.
  if (dropZone && fileInput) {
    dropZone.style.cursor = 'pointer';
    dropZone.addEventListener('click', function(e) {
      if (e.target.closest('#imp-choose, #imp-replace')) return;
      fileInput.click();
    });
  }
  if (fileInput) {
    fileInput.addEventListener('change', function() { if (fileInput.files && fileInput.files.length) handleFiles(fileInput.files); });
  }

  // --- Replace file ---
  document.addEventListener('click', function(e) {
    if (e.target.closest('#imp-replace') && fileInput) {
      e.preventDefault();
      fileInput.value = '';
      fileInput.click();
    }
    // --- Remove file (#8): clear everything back to the empty state ---
    if (e.target.closest('#imp-remove')) {
      e.preventDefault();
      reset();
    }
  });

  // --- Drag and drop ---
  if (dropZone) {
    ['dragenter','dragover'].forEach(function(ev) {
      dropZone.addEventListener(ev, function(e) { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('drag-over'); });
    });
    ['dragleave','drop'].forEach(function(ev) {
      dropZone.addEventListener(ev, function(e) { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('drag-over'); });
    });
    dropZone.addEventListener('drop', function(e) {
      var files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length) handleFiles(files);
    });
  }

  // --- Tag checkbox ---
  if (tagCb) tagCb.addEventListener('change', function() {
    var b = document.getElementById('imp-tag-body'); if (b) b.hidden = !tagCb.checked;
    if (tagCb.checked) loadImpTags();
  });
  var _autoCustomCb = document.getElementById('imp-auto-custom');
  if (_autoCustomCb) _autoCustomCb.addEventListener('change', updateAutoCustomPreview);

  // --- Drip checkbox ---
  if (dripCb) dripCb.addEventListener('change', function() {
    var b = document.getElementById('imp-drip-body'); if (b) b.hidden = !dripCb.checked;
    // (Re)load sequences the moment enrollment is switched on — covers a modal
    // opened before this fix, a stale list, or an earlier failed fetch.
    if (dripCb.checked) loadDripSequences();
  });

  // --- Scrub checkbox ---
  if (scrubCb) scrubCb.addEventListener('change', function() {
    if (scrubCost) scrubCost.style.display = scrubCb.checked ? '' : 'none';
    updateEta(); // scrub toggle changes the estimate
  });

  // --- Consent checkbox gates submit ---
  if (attest) attest.addEventListener('change', function() {
    if (go) { go.disabled = !attest.checked; go.style.opacity = attest.checked ? '1' : '0.5'; }
    var al = document.getElementById('imp-attest');
    if (al && attest.checked) al.classList.remove('bm-attest-missing');
  });
  // Also listen for click since change can be swallowed
  if (attest) attest.addEventListener('click', function() {
    setTimeout(function() {
      if (go) { go.disabled = !attest.checked; go.style.opacity = attest.checked ? '1' : '0.5'; }
    }, 0);
  });

  // --- Google Sheet URL input ---
  if (sheetUrl) sheetUrl.addEventListener('input', function() {
    if (config && sheetUrl.value.trim()) config.hidden = false;
  });

  // --- Submit import (event delegation so it works even if button is re-rendered) ---
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('#imp-go');
    if (!btn) return;
    if (btn.disabled) { console.log('[csv-import] button disabled, skipping'); return; }
    e.preventDefault(); e.stopPropagation();
    console.log('[csv-import] submit clicked, source lines:', _lines.length, 'headers:', _headers.length);

    // Consent check at submit time as safety net
    var attestCb = document.getElementById('imp-attest-cb');
    if (attestCb && !attestCb.checked) {
      var al = document.getElementById('imp-attest');
      if (al) { al.classList.add('bm-attest-missing'); al.scrollIntoView({block:'center'}); }
      if (window.__rsmsToast) window.__rsmsToast('Please confirm consent before importing');
      return;
    }

    if (typeof api.request !== 'function') {
      if (window.__rsmsToast) window.__rsmsToast('API not ready — please refresh and try again');
      return;
    }

    // Determine source: CSV or Google Sheet
    var activeTab = modal.querySelector('[data-impsrc].on');
    var source = activeTab ? activeTab.getAttribute('data-impsrc') : 'csv';

    if (source === 'sheet') {
      // Google Sheet flow
      var url = sheetUrl ? sheetUrl.value.trim() : '';
      if (!url) { if (window.__rsmsToast) window.__rsmsToast('Please paste a Google Sheet URL'); return; }

      go.disabled = true;
      goLbl.textContent = 'Fetching sheet...';

      api.request('POST', '/contacts/import-google-sheet', { sheet_url: url }).then(function(r) {
        if (!r || !r.success) {
          if (window.__rsmsToast) window.__rsmsToast((r && r.error) || 'Failed to fetch Google Sheet');
          go.disabled = false;
          goLbl.textContent = 'Import contacts';
          return;
        }
        // Sheet endpoint returns import_payload (all contacts) + contacts (preview of 5)
        var sheetContacts = r.data.import_payload || r.data.contacts || r.data || [];
        if (!sheetContacts.length) {
          if (window.__rsmsToast) window.__rsmsToast('No contacts found in the Google Sheet');
          go.disabled = false;
          goLbl.textContent = 'Import contacts';
          return;
        }
        _fileName = 'Google Sheet';
        submitContacts(sheetContacts);
      }).catch(function(err) {
        if (window.__rsmsToast) window.__rsmsToast('Error fetching sheet: ' + (err.message || err));
        go.disabled = false;
        goLbl.textContent = 'Import contacts';
      });
      return;
    }

    // CSV flow — build contacts from parsed data + field mappings
    if (!_lines.length || !_headers.length) {
      if (window.__rsmsToast) window.__rsmsToast('Please upload a CSV file first');
      return;
    }

    // Read field mappings
    var mapping = {};
    var phoneIdx = -1;
    modal.querySelectorAll('.imp-field-sel').forEach(function(sel) {
      var idx = parseInt(sel.getAttribute('data-csv-idx'), 10);
      var dest = sel.value;
      if (dest) {
        mapping[idx] = dest;
        if (dest === 'phone') phoneIdx = idx;
      }
    });

    if (phoneIdx === -1) {
      if (window.__rsmsToast) window.__rsmsToast('At least one column must be mapped to Phone');
      return;
    }

    // Build contacts array
    var contacts = [];
    var autoCustom = (document.getElementById('imp-auto-custom') || {}).checked;
    for (var i = 1; i < _lines.length; i++) {
      var cols = parseCsvLine(_lines[i]);
      if (!cols[phoneIdx]) continue;
      var contact = {};
      var cf = null;
      for (var csvIdx in mapping) {
        if (!mapping.hasOwnProperty(csvIdx)) continue;
        var v = cols[Number(csvIdx)];
        if (v == null || v === '') continue;
        var destField = mapping[csvIdx];
        if (destField.indexOf('custom:') === 0) {
          if (!cf) cf = {};
          cf[destField.slice(7)] = v;
        } else if (destField === 'full_name') {
          // Split "Krysty Chennaux" -> first_name + last_name. First token is the
          // first name, the rest is the last name. Don't clobber an explicit
          // First/Last column if one is also mapped.
          var _p = String(v).trim().split(/\s+/);
          if (_p.length && !contact.first_name) contact.first_name = _p.shift();
          if (_p.length && !contact.last_name) contact.last_name = _p.join(' ');
        } else {
          contact[destField] = v;
        }
      }
      // Auto-custom: unmapped columns become custom fields
      if (autoCustom) {
        for (var j = 0; j < _headers.length; j++) {
          if (mapping[j]) continue; // already mapped
          if (_impExcludedCustom[j]) continue; // user ×'d this column out of auto-create
          var val = cols[j];
          if (val == null || val === '') continue;
          if (!cf) cf = {};
          cf[_headers[j].toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')] = val;
        }
      }
      if (cf) contact.custom_fields = cf;
      contacts.push(contact);
    }

    if (!contacts.length) {
      if (window.__rsmsToast) window.__rsmsToast('No valid contacts found (every row missing phone)');
      return;
    }

    submitContacts(contacts);
  });

  function submitContacts(contacts) {
    // Read import mode
    var modeBtn = modal.querySelector('[data-impmode].on');
    var importMode = modeBtn ? modeBtn.getAttribute('data-impmode') : 'upsert';

    // Read dedupe keys
    var dedupeKeys = [];
    modal.querySelectorAll('.imp-dedupe:checked').forEach(function(cb) { dedupeKeys.push(cb.value); });

    // Read tag
    var tagName = '';
    if (tagCb && tagCb.checked) {
      var tn = document.getElementById('imp-tag-name');
      tagName = tn ? tn.value.trim() : '';
    }

    // Read drip sequence
    var dripSequenceId = '';
    if (dripCb && dripCb.checked && dripSeq) {
      dripSequenceId = dripSeq.value;
    }

    // Read TCPA scrub
    var tcpaScrub = scrubCb ? scrubCb.checked : true;

    // Remember these choices for next time (per browser). Consent is deliberately
    // NOT saved — every import must re-attest it.
    try {
      localStorage.setItem(IMP_SETTINGS_KEY, JSON.stringify({
        mode: importMode,
        dedupe: dedupeKeys,
        tagOn: !!(tagCb && tagCb.checked),
        tagName: tagName || '',
        dripOn: !!(dripCb && dripCb.checked),
        dripId: dripSequenceId || '',
        scrub: !!tcpaScrub
      }));
    } catch (e) {}

    var payload = {
      contacts: contacts,
      mode: importMode,
      dedupe_keys: dedupeKeys.length ? dedupeKeys : ['phone'],
      apply_scrub: tcpaScrub || undefined,
      consent_attested: true,
      file_name: _fileName || undefined
    };
    if (tagName) payload.apply_tag = [tagName];
    if (dripSequenceId) payload.enroll_sequence_id = Number(dripSequenceId) || undefined;

    go.disabled = true;
    go.classList.add('is-loading');
    goLbl.textContent = 'Importing\u2026';

    console.log('[csv-import] submitting', contacts.length, 'contacts, mode:', payload.mode);
    api.request('POST', '/contacts/import', payload).then(function(r) {
      console.log('[csv-import] response:', JSON.stringify(r).slice(0, 500));
      if (!r || !r.success) {
        var errMsg = (r && (r.error || r.message)) || 'Import failed (no details)';
        if (window.__rsmsToast) window.__rsmsToast(errMsg);
        console.error('[csv-import] failed:', errMsg);
        go.disabled = false;
        go.classList.remove('is-loading');
        goLbl.textContent = 'Import contacts';
        return;
      }

      // Close modal
      go.classList.remove('is-loading');
      modal.classList.remove('is-open');
      var data = r.data || {};
      if (window.__rsmsToast) window.__rsmsToast('Importing ' + (data.total || contacts.length).toLocaleString() + ' contacts — processing in the background');

      // Poll for progress
      if (data.job_id) {
        pollJob(data.job_id, data.total || contacts.length);
      } else {
        // No job_id = synchronous import, refresh now
        setTimeout(function() { try { if (window.__rsmsLoadContacts) window.__rsmsLoadContacts(); } catch(_){} }, 1000);
      }
    }).catch(function(err) {
      console.error('[csv-import] request error:', err);
      if (window.__rsmsToast) window.__rsmsToast('Import error: ' + (err.message || err));
      go.disabled = false;
      go.classList.remove('is-loading');
      goLbl.textContent = 'Import contacts';
    });
  }

  // Floating import-progress bar. The modal closes on submit and the job runs in
  // the background, so the bar lives on <body>, fed by job.processed/total.
  function importProgEl(jobId) {
    var id = 'rsms-imp-prog-' + jobId;
    var el = document.getElementById(id);
    if (el) return el;
    el = document.createElement('div');
    el.id = id;
    el.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:10050;width:300px;box-sizing:border-box;background:var(--card,#fff);border:1px solid var(--hairline-strong,#d8dee9);border-radius:12px;box-shadow:0 16px 44px rgba(20,20,40,.22);padding:13px 15px;font:inherit';
    el.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:9px">'
      + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent,#2563EB)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>'
      + '<div style="font-size:12.5px;font-weight:650;color:var(--ink,#111);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" data-imp-label>Importing contacts…</div>'
      + '<div style="font-size:12px;font-weight:650;color:var(--muted)" data-imp-pct></div></div>'
      + '<div style="height:7px;border-radius:99px;background:var(--hairline,#eef1f5);overflow:hidden"><div data-imp-bar style="height:100%;width:0%;background:var(--accent,#2563EB);border-radius:99px;transition:width .4s ease"></div></div>';
    document.body.appendChild(el);
    return el;
  }
  function importProg(jobId, pct, label) {
    var el = importProgEl(jobId);
    var bar = el.querySelector('[data-imp-bar]'), pe = el.querySelector('[data-imp-pct]'), lb = el.querySelector('[data-imp-label]');
    if (pct == null) { if (bar) { bar.style.width = '45%'; bar.style.opacity = '.45'; } if (pe) pe.textContent = ''; }
    else { if (bar) { bar.style.width = Math.max(2, Math.min(100, pct)) + '%'; bar.style.opacity = '1'; } if (pe) pe.textContent = pct + '%'; }
    if (label && lb) lb.textContent = label;
  }
  function importProgDone(jobId, ok, msg) {
    var el = document.getElementById('rsms-imp-prog-' + jobId); if (!el) return;
    var bar = el.querySelector('[data-imp-bar]'), lb = el.querySelector('[data-imp-label]'), pe = el.querySelector('[data-imp-pct]');
    if (bar) { bar.style.width = '100%'; bar.style.opacity = '1'; bar.style.background = ok ? 'var(--green,#16a34a)' : 'var(--red,#dc2626)'; }
    if (lb) lb.textContent = msg || (ok ? 'Import complete' : 'Import failed');
    if (pe) pe.textContent = ok ? '100%' : '';
    setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, ok ? 4000 : 6000);
  }
  function pollJob(jobId, total) {
    if (typeof api.request !== 'function') return;
    var attempts = 0;
    var maxAttempts = 120; // 10 min at 5s intervals
    importProg(jobId, total ? 0 : null, 'Importing ' + (Number(total) || 0).toLocaleString() + ' contacts…');
    modal._importJobTimer = setInterval(function() {
      var timer = modal._importJobTimer;
      attempts++;
      if (attempts > maxAttempts) { clearInterval(timer); importProgDone(jobId, false, 'Still importing — check Contacts in a bit'); return; }
      api.request('GET', '/bulk-jobs/' + jobId).then(function(r) {
        if (!r || !r.success) return;
        var job = r.data || {};
        var jtot = Number(job.total) || Number(total) || 0;
        var jdone = Number(job.processed) || 0;
        if (job.status === 'completed') {
          clearInterval(timer);
          var res = job.result_json || job;
          var parts = [];
          if (res.inserts) parts.push(res.inserts + ' new');
          if (res.updates) parts.push(res.updates + ' updated');
          if (res.skipped) parts.push(res.skipped + ' skipped');
          if (res.errors) parts.push(res.errors + ' errors');
          var msg = 'Import complete: ' + (parts.length ? parts.join(', ') : (res.imported || job.processed || total) + ' processed');
          importProgDone(jobId, true, parts.length ? ('Done · ' + parts.join(', ')) : 'Import complete');
          if (window.__rsmsToast) window.__rsmsToast(msg);
          // Refresh the contacts list IN PLACE so the imported rows appear. The old
          // code re-clicked the Contacts tab, which yanked the user there if they
          // were elsewhere and no-op'd when already on Contacts (loadTab skips a
          // loaded tab). crmReload() calls loadContacts() directly — updates the
          // table whether it's visible or hidden, no navigation.
          try { if (window.crmReload) window.crmReload(); } catch(_) {}
        } else if (job.status === 'failed') {
          clearInterval(timer);
          importProgDone(jobId, false, 'Import failed');
          if (window.__rsmsToast) window.__rsmsToast('Import failed: ' + (job.error_text || 'unknown error'));
        } else {
          importProg(jobId, jtot ? Math.max(1, Math.min(99, Math.round(jdone / jtot * 100))) : null,
            'Importing… ' + (jdone ? jdone.toLocaleString() + (jtot ? ' / ' + jtot.toLocaleString() : '') : ''));
        }
      }).catch(function() {});
    }, 5000);
  }

})(); } catch(e) { console.warn('[mercury-buttons] csv-import failed', e); }

/* ---- pane: contacts — CRUD wiring (add contact modal, opt-out, row menu enhancements) ---- */
try {
(function () {
  'use strict';
  var api = (window.api || {});
  function live() { try { return !!document.documentElement.getAttribute('data-rsms-live'); } catch (_) { return false; } }
  function toast(m) { try { if (window.__rsmsToast) window.__rsmsToast(m); } catch (_) {} }

  // ===== 1. Add Contact Modal — wire #ac-go to real API =======================
  // The inline HTML handler just toasts. We intercept in capture phase BEFORE it,
  // call the API, and stop propagation so the dummy handler never fires.
  document.addEventListener('click', function (e) {
    if (!live()) return;
    var goBtn = e.target.closest('#ac-go');
    if (!goBtn) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (goBtn.disabled) return;

    var phone = (document.getElementById('ac-phone') || {}).value || '';
    phone = phone.trim();
    if (!phone) { toast('Phone number is required'); return; }
    // NO consent gate on single manual add — the legal liability is the SMS SEND
    // (which has its own attestation), and the bulk-import endpoint keeps its
    // paper-trail gate. Adding one contact you intend to CALL must not require
    // SMS consent. The consent checkbox here is an OPTIONAL attestation.

    var data = {
      first_name: ((document.getElementById('ac-first') || {}).value || '').trim(),
      last_name: ((document.getElementById('ac-last') || {}).value || '').trim(),
      phone: phone,
      email: ((document.getElementById('ac-email') || {}).value || '').trim() || undefined,
      company: ((document.getElementById('ac-company') || {}).value || '').trim() || undefined,
      website: ((document.getElementById('ac-website') || {}).value || '').trim() || undefined,
      city: ((document.getElementById('ac-city') || {}).value || '').trim() || undefined,
      state: ((document.getElementById('ac-state') || {}).value || '').trim() || undefined,
      source: ((document.getElementById('ac-source') || {}).value || '').trim() || undefined,
      pipeline_stage: ((document.getElementById('ac-stage') || {}).value || '').trim() || undefined
    };

    // Tags — comma-separated string -> array
    var tagsRaw = ((document.getElementById('ac-tags') || {}).value || '').trim();
    if (tagsRaw) {
      data.tags = tagsRaw.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
    }

    // Notes — we'll create a note after the contact is created
    var noteBody = ((document.getElementById('ac-notes') || {}).value || '').trim();

    // Clean undefined values
    Object.keys(data).forEach(function (k) { if (data[k] === undefined) delete data[k]; });

    goBtn.disabled = true;
    var origText = goBtn.textContent;
    goBtn.textContent = 'Adding\u2026';

    (async function () {
      try {
        var res = await api.request('POST', '/contacts', data);
        if (res && res.success !== false) {
          var contact = (res.data && res.data.contact) || res.data || res.contact || res;
          var contactId = contact.id || contact.contact_id;
          var name = ((data.first_name || '') + ' ' + (data.last_name || '')).trim() || 'contact';

          // If notes were entered, create a note on the new contact
          if (noteBody && contactId) {
            try { await api.createNote(contactId, noteBody); } catch (_) {}
          }

          // Refresh the CRM list in the background, then show a "what next?"
          // success panel inside the modal (Add another / enroll in a sequence)
          // instead of just closing — the natural next steps after creating a lead.
          if (window.__rsmsLoadContacts) { try { window.__rsmsLoadContacts(); } catch (_) {} }
          _acSuccess(contactId, name);
        } else {
          toast('Could not add contact \u2014 ' + ((res && (res.error || res.message)) || 'try again'));
        }
      } catch (err) {
        toast('Add contact failed \u2014 network error');
      } finally {
        goBtn.disabled = false;
        goBtn.textContent = origText;
      }
    })();
  }, true); // capture phase — fires before the inline HTML handler

  // --- Add Contact: consent gates the button (UX) + real-data suggestions ----
  // The "Add contact" button enables once PHONE is filled (the only hard
  // requirement — consent is NOT required to add a contact you'll call). Source +
  // Tags autocomplete from the account's REAL data — distinct sources off the CRM
  // rows and the real tag list (/contacts/tags) — instead of fabricated presets,
  // and both let the user type a brand-new value (custom source / new tag) freely.
  function _acGate() {
    var p = document.getElementById('ac-phone'), g = document.getElementById('ac-go');
    if (!g) return;
    var ok = !!(p && ('' + p.value).trim());
    g.disabled = !ok; g.style.opacity = ok ? '1' : '.5';
  }

  // Post-save "what next?" panel — replaces the form with the natural next steps
  // after creating a lead: add another, or enroll in a sequence (drip). (Scrub is
  // intentionally NOT here — POST /contacts/scrub is account-wide + billed, not a
  // per-contact action. "Add to a blast" needs a contact-preselect we don't have.)
  function _acSuccess(contactId, name) {
    var ace = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
    var modal = document.getElementById('crm-add'); if (!modal) return;
    var body = modal.querySelector('.bm-body'); var foot = modal.querySelector('.bm-foot'); var form = modal.querySelector('.bm-form');
    if (!body) return;
    if (form) form.style.display = 'none';
    if (foot) foot.style.display = 'none';
    var old = modal.querySelector('#ac-success'); if (old) old.remove();
    var canEnroll = !!contactId;
    var p = document.createElement('div'); p.id = 'ac-success';
    p.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:14px 12px 18px">'
      + '<span style="width:46px;height:46px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#16a34a;color:#fff;margin-bottom:12px"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>'
      + '<div style="font-size:17px;font-weight:680;color:var(--ink)">Added ' + ace(name) + '</div>'
      + '<div style="font-size:13px;color:var(--muted);margin-top:4px">What next?</div>'
      + '<div style="width:100%;max-width:340px;margin-top:16px;display:flex;flex-direction:column;gap:8px">'
      +   '<button type="button" class="blast-btn blast-btn-primary" id="ac-add-another" style="justify-content:center">+ Add another contact</button>'
      +   (canEnroll ? '<button type="button" class="blast-btn blast-btn-ghost" id="ac-enroll-open" style="justify-content:center">Add to a sequence</button>' : '')
      +   '<div id="ac-enroll-pick" hidden style="display:flex;gap:6px"><div class="blast-select-wrap" style="flex:1"><select class="blast-select" id="ac-enroll-sel"><option value="">Loading sequences…</option></select></div><button type="button" class="blast-btn blast-btn-primary" id="ac-enroll-go">Enroll</button></div>'
      +   '<button type="button" class="blast-btn blast-btn-ghost" id="ac-done" style="justify-content:center">Done</button>'
      + '</div></div>';
    body.appendChild(p);
    function restore() { if (p.parentNode) p.remove(); if (form) form.style.display = ''; if (foot) foot.style.display = ''; }
    p.querySelector('#ac-add-another').onclick = function () {
      ['ac-first', 'ac-last', 'ac-phone', 'ac-email', 'ac-company', 'ac-website', 'ac-city', 'ac-state', 'ac-tags', 'ac-notes'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
      var src = document.getElementById('ac-source'); if (src) src.value = 'Manual entry';
      var st = document.getElementById('ac-stage'); if (st) st.value = 'new_lead';
      var cb = document.getElementById('ac-attest-cb'); if (cb) cb.checked = false;
      restore(); _acGate();
      var ph = document.getElementById('ac-phone'); if (ph) { try { ph.focus(); } catch (_) {} }
    };
    p.querySelector('#ac-done').onclick = function () { restore(); modal.classList.remove('is-open'); };
    var enrollOpen = p.querySelector('#ac-enroll-open'), pick = p.querySelector('#ac-enroll-pick'), sel = p.querySelector('#ac-enroll-sel');
    if (enrollOpen) enrollOpen.onclick = function () {
      enrollOpen.hidden = true; pick.hidden = false;
      api.request('GET', '/drip-sequences?light=1').then(function (r) {
        var seqs = (r && (r.data || r)) || []; if (!Array.isArray(seqs)) seqs = seqs.sequences || [];
        sel.innerHTML = seqs.length ? seqs.map(function (s) { return '<option value="' + s.id + '">' + ace(s.name || ('Sequence ' + s.id)) + '</option>'; }).join('') : '<option value="">No sequences yet</option>';
      }).catch(function () { sel.innerHTML = '<option value="">Could not load sequences</option>'; });
    };
    var enrollGo = p.querySelector('#ac-enroll-go');
    if (enrollGo) enrollGo.onclick = function () {
      var sid = sel.value; if (!sid) { toast('Pick a sequence'); return; }
      enrollGo.disabled = true; enrollGo.textContent = 'Enrolling…';
      api.request('POST', '/drip-sequences/' + sid + '/enroll', { contact_ids: [contactId] }).then(function (r) {
        if (r && r.success !== false) { toast('Enrolled ' + name + ' in the sequence'); pick.hidden = true; if (enrollOpen) { enrollOpen.hidden = false; enrollOpen.textContent = '✓ Enrolled — add to another'; } }
        else toast((r && (r.error || r.message)) || 'Could not enroll');
      }).catch(function () { toast('Could not enroll'); }).then(function () { enrollGo.disabled = false; enrollGo.textContent = 'Enroll'; });
    };
  }

  // Closing the modal (X / Cancel) resets it back to the form, so reopening never
  // shows a stale success panel.
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest || !e.target.closest('#crm-add [data-close]')) return;
    var modal = document.getElementById('crm-add'); if (!modal) return;
    var s = modal.querySelector('#ac-success'); if (s) s.remove();
    var f = modal.querySelector('.bm-form'); if (f) f.style.display = '';
    var ft = modal.querySelector('.bm-foot'); if (ft) ft.style.display = '';
  });
  document.addEventListener('change', function (e) {
    if (!e.target || e.target.id !== 'ac-attest-cb') return;
    _acGate();
    if (e.target.checked) { var al = document.getElementById('ac-attest'); if (al) al.classList.remove('bm-attest-missing'); }
  });
  document.addEventListener('input', function (e) { if (e.target && e.target.id === 'ac-phone') _acGate(); });
  var _acSrcDone = false, _acTagDone = false;
  document.addEventListener('focusin', function (e) {
    if (!e.target) return;
    if (e.target.id === 'ac-source' && !_acSrcDone) {
      _acSrcDone = true;
      var seen = {}, opts = '';
      document.querySelectorAll('.crm-src').forEach(function (cell) {
        var v = ('' + (cell.textContent || '')).trim();
        if (v && !seen[v.toLowerCase()]) { seen[v.toLowerCase()] = 1; opts += '<option value="' + v.replace(/"/g, '&quot;') + '"></option>'; }
      });
      var dl = document.getElementById('ac-source-list'); if (dl) dl.innerHTML = opts;
    }
    if (e.target.id === 'ac-tags' && !_acTagDone && typeof api.request === 'function') {
      _acTagDone = true;
      api.request('GET', '/contacts/tags').then(function (r) {
        var tags = (r && (r.data || r)) || []; if (!Array.isArray(tags)) tags = [];
        var dl = document.getElementById('ac-tag-list');
        if (dl) dl.innerHTML = tags.map(function (t) {
          var name = (typeof t === 'string') ? t : (t && (t.tag || t.name)) || '';
          return name ? '<option value="' + ('' + name).replace(/"/g, '&quot;') + '"></option>' : '';
        }).join('');
      }).catch(function () {});
    }
  });

  // ===== 2. Row Menu — add Opt Out option ====================================
  // The existing row menu (built above) has View/Text/Tag/Delete. We enhance it
  // with an Opt Out action by patching the menu builder. Since the existing menu
  // is built inline above and we can't easily modify it, we add a MutationObserver
  // that injects the "Opt out" button when the menu appears.
  var _menuObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (node.id !== 'rsms-rowmenu-pop') return;
        // Already has opt-out?
        if (node.querySelector('[data-action="optout"]')) return;
        // Find the delete button to insert before it
        var delBtn = node.querySelector('[data-action="delete"]');
        if (!delBtn) return;

        var optBtn = document.createElement('button');
        optBtn.type = 'button';
        optBtn.textContent = 'Opt out';
        optBtn.setAttribute('data-action', 'optout');
        optBtn.style.cssText = 'display:block;width:100%;text-align:left;padding:8px 12px;border:0;background:none;border-radius:7px;font:inherit;font-size:13px;color:var(--amber,#d97706);cursor:pointer';
        optBtn.onmouseover = function () { optBtn.style.background = 'var(--hover,#f5f5f5)'; };
        optBtn.onmouseout = function () { optBtn.style.background = 'none'; };
        optBtn.addEventListener('click', function (ev) {
          ev.stopPropagation();
          node.remove();
          // Find the row's contact id
          // The pop was positioned relative to a .crm-rowmenu button inside a .crm-row
          // We need to find it from context; grab from the pop's data or search the DOM
          var cid = node.getAttribute('data-contact-id');
          var cname = node.getAttribute('data-contact-name');
          if (!cid) return;
          var confirmFn = window.__rsmsConfirm || window.confirm;
          if (!confirmFn('Opt out ' + (cname || 'this contact') + '? They will no longer receive messages.')) return;
          api.request('PUT', '/contacts/' + cid, { status: 'opted_out' }).then(function (res) {
            if (res && res.success !== false) {
              toast((cname || 'Contact') + ' opted out');
              // Update the row status badge
              var row = document.querySelector('#pane-contacts .crm-row[data-id="' + cid + '"]');
              if (row) {
                row.setAttribute('data-status', 'Opted out');
                var badge = row.querySelector('.status');
                if (badge) {
                  badge.className = 'status st-gray';
                  badge.innerHTML = '<i></i>Opted out';
                }
              }
            } else {
              toast('Could not opt out \u2014 ' + ((res && res.error) || 'try again'));
            }
          }).catch(function () { toast('Opt out failed \u2014 network error'); });
        });
        node.insertBefore(optBtn, delBtn);

        // Store the contact id on the popup for the opt-out handler
        // The popup is created near a .crm-rowmenu button — find the row
        // by walking sibling structure. We set data attrs on creation below.
      });
    });
  });
  _menuObserver.observe(document.body, { childList: true });

  // Patch: when the row menu popup is created, stamp the contact id/name onto it
  // so the opt-out handler can read them. We do this by hooking into the same
  // click listener — the popup is created by the existing handler above, so we
  // detect it appearing and stamp it.
  document.addEventListener('click', function (e) {
    if (!live()) return;
    var menuBtn = e.target.closest('#pane-contacts .crm-rowmenu');
    if (!menuBtn) return;
    // The popup may already exist (being toggled off); only stamp on creation.
    setTimeout(function () {
      var pop = document.getElementById('rsms-rowmenu-pop');
      if (!pop) return;
      if (pop.getAttribute('data-contact-id')) return; // already stamped
      var row = menuBtn.closest('.crm-row');
      if (row) {
        pop.setAttribute('data-contact-id', row.getAttribute('data-id') || '');
        pop.setAttribute('data-contact-name', row.getAttribute('data-name') || '');
      }
    }, 0);
  }, true);

  // ===== 3. Detail panel Edit buttons — make fields inline-editable ===========
  // The detail panel has .crm-f-val elements. mercury-live.js already makes
  // email/phone contenteditable and provides a "Save changes" button.
  // The "Edit" ghost buttons in the custom-fields section aren't wired.
  // We make the cd2-cf-val cells editable on click of the "Edit" / pencil buttons.
  document.addEventListener('click', function (e) {
    if (!live()) return;
    var editBtn = e.target.closest('#pane-contacts .cd2-sec-head .cd2-sec-add');
    // This is the "Add field" button in the custom fields section — already routed
    // to classic. We leave it as-is.
  }, true);

  // Make detail panel name/email/phone respond to click-to-edit with visual cue
  document.addEventListener('dblclick', function (e) {
    if (!live()) return;
    var val = e.target.closest('#pane-contacts .crm-detail .crm-f-val[contenteditable]');
    if (!val) return;
    // Select all text for easy replacement
    var range = document.createRange();
    range.selectNodeContents(val);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    val.style.outline = '2px solid var(--accent)';
    val.style.borderRadius = '4px';
    val.addEventListener('blur', function onBlur() {
      val.style.outline = '';
      val.style.borderRadius = '';
      val.removeEventListener('blur', onBlur);
    });
  }, true);

  // Enter key in contenteditable fields -> click Save
  document.addEventListener('keydown', function (e) {
    if (!live()) return;
    if (e.key !== 'Enter') return;
    var el = e.target.closest('#pane-contacts .crm-detail [contenteditable]');
    if (!el) return;
    e.preventDefault();
    el.blur();
    // Auto-click save
    var saveBtn = document.querySelector('#pane-contacts .crm-detail .cd2-save-btn');
    if (saveBtn) saveBtn.click();
  }, true);

})();
} catch (e) { console.warn('[mercury-buttons] contacts-crud failed', e); }

// Warm the best-send-time cache (window.__rsmsBestSend) shortly after load so the
// Schedule-send "Best time to send" chip paints INSTANTLY instead of popping in ~1s
// later after its own fetch. One idle GET, swr-cached, fully best-effort.
(window.requestIdleCallback || function (f) { return setTimeout(f, 1800); })(function () {
  try {
    if (window.__rsmsBestSend || !window.api || !window.api.request) return;
    window.api.request('GET', '/reports/hourly-pattern?days=90', null, { swr: 300000, silent: true })
      .then(function (r) { if (r && r.best) window.__rsmsBestSend = r.best; })
      .catch(function () {});
  } catch (e) {}
});

/* Inbound-call settings wiring moved into loadDialerSettings() in mercury-live.js
   (the Dialer surface's "Settings" sub-tab is now the single home for dialer
   settings). This IIFE bound the same #dset-inbound* ids and double-saved, so it
   was removed to leave one source of truth. */

/* Blast composer: gate Send/Save-as-draft so a click can't land on a guaranteed
   validation error. The submit path (mercury-live.js submitBlast) still toasts
   "Give your blast a name first" etc., but a disabled button never fires that
   click — the button just stays off with a tooltip saying what's missing.
   Requirements: draft = name; send = name + message + consent (drip = name +
   first-step message + consent). Kept here (plain DOM) so it stays off the
   high-churn mercury-live.js. */
(function () {
  var st = document.createElement('style');
  st.textContent =
    '#blast-modal .blast-btn:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}' +
    '#blast-modal .blast-btn-primary:disabled:hover{background:var(--accent)}';
  (document.head || document.documentElement).appendChild(st);

  function val(id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; }
  function syncBlastSubmit() {
    var modal = document.getElementById('blast-modal'); if (!modal) return;
    var card = modal.querySelector('.blast-modal');
    var prim = modal.querySelector('.blast-btn-primary');
    var draft = document.getElementById('blast-draft-btn');
    var status = card ? (card.getAttribute('data-blast-status') || '') : '';
    var preSend = !(status === 'Sending' || status === 'Completed'); // post-send primary = mock action, leave it
    var drip = !!(card && card.classList.contains('is-drip'));
    var name = val('bm-name');
    var msg = val('bm-message');
    var firstStep = modal.querySelector('#bm-dsteps .bm-dstep-msg');
    var stepMsg = firstStep ? String(firstStep.value || '').trim() : '';

    if (draft) {
      draft.disabled = !name;
      draft.title = name ? '' : (drip ? 'Give your sequence a name first' : 'Give your blast a name first');
    }
    if (prim) {
      if (!preSend) { prim.disabled = false; prim.title = ''; return; }
      // Gate only on the "empty field" cases (name + message). Consent is a legal
      // attestation left as a click-time action: submitBlast scrolls to + highlights
      // the consent box, which points the user at the box to tick — better than a
      // greyed button they might not connect to an un-checked checkbox below.
      var why = '';
      if (!name) why = drip ? 'Give your sequence a name first' : 'Give your blast a name first';
      else if (drip ? !stepMsg : !msg) why = drip ? 'Add a message to the first step' : 'Add a message first';
      prim.disabled = !!why;
      prim.title = why;
    }
  }
  document.addEventListener('input', function (e) { if (e.target.closest && e.target.closest('#blast-modal')) syncBlastSubmit(); }, true);
  document.addEventListener('change', function (e) { if (e.target.closest && e.target.closest('#blast-modal')) syncBlastSubmit(); }, true);
  document.addEventListener('click', function (e) {
    if (e.target.closest && (e.target.closest('[data-open="blast-modal"]') || e.target.closest('#blast-modal [data-bmode]'))) setTimeout(syncBlastSubmit, 120);
  }, true);
  // Backstop for PROGRAMMATIC fills that don't emit input events (draft load,
  // AI compose, mode switch): cheap re-sync while the modal is actually visible.
  // ponytail: 700ms poll instead of threading a hook into every mercury-live fill
  // path; upgrade to explicit calls only if this ever shows up on a profile.
  setInterval(function () { var m = document.getElementById('blast-modal'); if (m && m.offsetParent !== null) syncBlastSubmit(); }, 700);
})();
