// mlog.js — Message Logs pane (Inbox → Logs view). Extracted from mercury-live.js
// on 2026-06-27 to shrink the monolith (see CLAUDE.md "STOP GROWING THE MONOLITH").
// Self-sufficient module (the welcome-palette.js pattern): grabs window.api, defines
// its own small helpers, and keeps its public contract on window
// (__rsmsLoadMsgLog / __rsmsApplyMlogFilter — called by dashboard-mercury-app.html
// + mercury-buttons.js). Loaded AFTER mercury-live.js + api.js.
(function () {
  'use strict';
  var api = window.api;
  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return (s == null ? '' : '' + s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function fmtPhone(p) {
    var d = ('' + (p || '')).replace(/[^0-9]/g, '');
    if (d.length === 11 && d[0] === '1') d = d.slice(1);
    if (d.length === 10) return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
    return p || '';
  }

  // ===== Text logs table loader (Inbox → Logs view) ======================
  // The mlog table sat empty on open — rows only appeared after Export CSV.
  // Wire it to the real GET /sms/logs list (limit/offset/total) so it loads
  // automatically when the Logs view opens, capped at 20 rows/page with
  // Prev/Next pagination.
  var MLOG_PAGE_SIZE = 20;
  var _mlogPage = 0;       // 0-based page index
  var _mlogSearch = '';    // free-text query → server-side via /sms/logs?search=
  var _mlogFilters = null; // {conds, match} from the filter builder → /sms/logs?filters=
  var _mlogTotal = 0;
  var _mlogSeq = 0;        // monotonic load token — only the latest load renders
  function mlogTime(ts) {
    try {
      var dt = new Date((typeof ts === 'string' && ts.indexOf('Z') < 0 && ts.indexOf('T') > 0) ? ts + 'Z' : ts);
      if (isNaN(dt.getTime())) return esc(ts || '');
      return dt.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch (e) { return esc(ts || ''); }
  }
  function mlogContact(m) {
    var nm = [m.contact_first_name, m.contact_last_name].filter(Boolean).join(' ').trim();
    if (nm) return esc(nm);
    var num = (m.direction === 'inbound') ? (m.from_number || m.to_number) : (m.to_number || m.from_number);
    return esc(num || '—');
  }
  function mlogStatusPill(m) {
    var s = (m.status || '').toLowerCase();
    var color = '#6B7280', bg = '#F3F4F6';
    if (s === 'delivered') { color = '#15803D'; bg = '#DCFCE7'; }
    else if (s === 'failed' || s === 'rejected' || s === 'undelivered') { color = '#B91C1C'; bg = '#FEE2E2'; }
    else if (s === 'sent') { color = '#1D4ED8'; bg = '#DBEAFE'; }
    else if (s === 'pending' || s === 'queued') { color = '#B45309'; bg = '#FEF3C7'; }
    else if (s === 'received') { color = '#6D28D9'; bg = '#EDE9FE'; }
    var label = m.status ? (m.status.charAt(0).toUpperCase() + m.status.slice(1)) : '—';
    return '<span style="display:inline-flex;align-items:center;padding:2px 9px;border-radius:999px;font-size:11.5px;font-weight:600;color:' + color + ';background:' + bg + '">' + esc(label) + '</span>';
  }
  function mlogRow(m, _i) {
    var dir = (m.direction === 'inbound')
      ? '<span style="color:#6D28D9;font-weight:600">Inbound</span>'
      : '<span style="color:#1D4ED8;font-weight:600">Outbound</span>';
    var camp = m.campaign_name ? esc(m.campaign_name) : (m.drip_name ? esc(m.drip_name) + ' <span style="color:var(--faint)">(drip)</span>' : '<span style="color:var(--faint)">—</span>');
    return '<tr class="mrow" style="cursor:pointer" data-mi="' + (_i == null ? '' : _i) + '" data-mbody="' + esc(m.body || '') + '" title="Click to expand">' +
      '<td style="white-space:nowrap;color:var(--muted)">' + mlogTime(m.created_at || m.sent_at) + '</td>' +
      '<td style="font-weight:550;color:var(--ink-2)">' + mlogContact(m) + '</td>' +
      '<td>' + camp + '</td>' +
      '<td>' + dir + '</td>' +
      '<td class="mlog-body">' + esc(m.body || '') + '</td>' +
      '<td>' + mlogStatusPill(m) + '</td>' +
      '<td class="mlog-caret-cell"><span class="mlog-caret"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></span></td>' +
      '</tr>';
  }
  // Click a log row to expand a full-message detail row beneath it.
  if (!window.__mlogExpandWired) {
    window.__mlogExpandWired = 1;
    document.addEventListener('click', function (e) {
      if (!e.target.closest) return;
      // Match any message-log row (don't hard-require [data-mbody] — a transient
      // reload or the fallback renderer can produce rows without it, which used to
      // make expand silently no-op for "a certain" row).
      var row = e.target.closest('#mlog-tbody tr.mrow') || e.target.closest('.mrow[data-mbody]'); if (!row) return;
      if (e.target.closest('a, button')) return;
      var nxt = row.nextElementSibling;
      if (nxt && nxt.classList && nxt.classList.contains('mlog-detail')) { nxt.remove(); row.classList.remove('is-open'); return; }
      var prev = document.querySelector('.mlog-detail'); if (prev) { var pr = prev.previousElementSibling; if (pr && pr.classList) pr.classList.remove('is-open'); prev.remove(); }
      row.classList.add('is-open');
      // Body source: the data-mbody attribute, else the visible message cell (full
      // text — the cell only truncates visually), else a fallback.
      var bodyCell = row.querySelector('.mlog-body');
      var body = row.getAttribute('data-mbody') || (bodyCell ? bodyCell.textContent : '') || '(no message body)';
      var m = (window.__mlogRows || [])[parseInt(row.getAttribute('data-mi'), 10)] || {};
      // Detail laid out as labeled groups (Status / Details / Billing) so related
      // fields sit together and fill the width instead of one scattered flow.
      function _row(label, val) { if (val == null || val === '') return ''; return '<div style="display:flex;gap:10px;padding:3px 0;align-items:baseline"><div style="flex:0 0 96px;color:var(--faint);font-size:11px;text-transform:uppercase;letter-spacing:.03em">' + label + '</div><div style="font-size:13px;color:var(--ink-2);word-break:break-word">' + val + '</div></div>'; }
      function _grp(title, rows) { var inner = rows.filter(Boolean).join(''); return inner ? '<div style="background:var(--card,#fff);border:1px solid var(--hairline,#e9ecf1);border-radius:10px;padding:11px 13px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--accent-deep,#1d4ed8);margin-bottom:6px">' + title + '</div>' + inner + '</div>' : ''; }
      var _reason = m.provider_error_name || m.status_description || m.error || '';
      var _st = ('' + (m.status || '')).toLowerCase();
      var _bad = _st.indexOf('fail') >= 0 || _st.indexOf('reject') >= 0 || _st.indexOf('undeliv') >= 0;
      // Provider description only on FAILURE (useful); delivered/sent -> just the status.
      var _statusVal = '<b style="text-transform:capitalize">' + esc(m.status || '—') + '</b>' + (_reason && _bad ? ' <span style="color:var(--red,#dc2626)">— ' + esc(_reason) + '</span>' : '');
      var _CARR = { verizon: 'Verizon', att: 'AT&T', tmobile: 'T-Mobile', sprint: 'Sprint', uscellular: 'U.S. Cellular', other: 'Other', international: 'International', unknown: 'Unknown' };
      var _carrierVal = m.carrier ? esc(_CARR[('' + m.carrier).toLowerCase()] || (m.carrier.charAt(0).toUpperCase() + m.carrier.slice(1))) : '';
      var _fmtUsd = function (n) { n = Number(n); return '$' + n.toFixed(n > 0 && n < 0.01 ? 4 : 2); };
      var _cost = (m.cost_usd != null) ? m.cost_usd : (m.cost != null ? m.cost : null);
      var _seg = (m.segments != null ? Number(m.segments) : 1);
      var _hasCost = (_cost != null && !isNaN(Number(_cost)));
      var _fromTo = (m.from_number || m.to_number) ? (esc(fmtPhone(m.from_number) || m.from_number || '—') + '  →  ' + esc(fmtPhone(m.to_number) || m.to_number || '—')) : '';
      var _campaign = m.campaign_name ? esc(m.campaign_name) : (m.drip_name ? esc(m.drip_name) + ' (drip)' : '');
      var _grpStatus = _grp('Status', [_row('Status', _statusVal), _row('Sent', m.sent_at ? esc(mlogTime(m.sent_at)) : ''), _row('Delivered', m.delivered_at ? esc(mlogTime(m.delivered_at)) : '')]);
      var _grpDetails = _grp('Details', [_row('Direction', m.direction ? (m.direction.charAt(0).toUpperCase() + m.direction.slice(1)) : ''), _row('From → To', _fromTo), _row('Carrier', _carrierVal), (m.segments != null ? _row('Segments', esc('' + m.segments)) : ''), _row('Campaign', _campaign)]);
      // Break the charge into the ReadySMS fee (rate × segments) + the carrier fee
      // (always $0.0045/seg, in + out) so they sum to what was charged. (Anton: say
      // "ReadySMS fee", not "Charged".)
      var _carrierC = _seg * 0.0045;
      var _readyFee = Math.max(0, Number(_cost) - _carrierC);
      var _grpBilling = _hasCost ? _grp('Billing', [_row('ReadySMS fee', _fmtUsd(_readyFee)), _row('Carrier fee', _fmtUsd(_carrierC))]) : '';
      var _bodyFull = '<div style="margin-bottom:12px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--faint);margin-bottom:4px">Message</div><div style="font-size:14px;color:var(--ink);white-space:pre-wrap;word-break:break-word">' + esc(m.body || body) + '</div></div>';
      // Contain the width so the cards stay close together (on a full-width table
      // the groups otherwise fly ~600px apart and stop reading as a unit), and box
      // each group as a card for clear visual grouping.
      var _detailHtml = '<div style="max-width:880px">' + _bodyFull + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;align-items:start">' + _grpStatus + _grpDetails + _grpBilling + '</div></div>';
      // "View conversation" → jump to this contact's inbox thread. The contact's
      // number is the to_number on outbound, the from_number on inbound.
      var _convPhone = (m.direction === 'inbound') ? (m.from_number || '') : (m.to_number || '');
      if (!_convPhone) _convPhone = m.to_number || m.from_number || '';
      var _convName = (mlogContact(m) || '').replace(/<[^>]*>/g, '');
      var _convBtn = _convPhone
        ? '<div style="padding:12px 0 0"><button type="button" class="mlog-open-conv" data-phone="' + esc(_convPhone) + '" data-name="' + esc(_convName) + '" style="display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 14px;font:inherit;font-size:12.5px;font-weight:600;border:1px solid var(--accent,#2563EB);background:var(--accent,#2563EB);color:#fff;border-radius:8px;cursor:pointer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>View conversation</button></div>'
        : '';
      var tr = document.createElement('tr'); tr.className = 'mlog-detail';
      tr.innerHTML = '<td colspan="7" style="padding:14px 20px 16px;background:var(--bg-soft,#f9fafb)">' + _detailHtml + _convBtn + '</td>';
      if (row.parentNode) row.parentNode.insertBefore(tr, row.nextSibling);
    });
  }
  // "View conversation" button inside an expanded message-log row → open the
  // contact's inbox thread. Resolve the CURRENT conversation by phone (ids go
  // stale via contact churn/merge), mirroring the notification click-through.
  if (!window.__mlogOpenConvWired) {
    window.__mlogOpenConvWired = 1;
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.mlog-open-conv'); if (!btn) return;
      e.preventDefault(); e.stopPropagation();
      var phone = btn.getAttribute('data-phone'); if (!phone) return;
      var nm = btn.getAttribute('data-name') || '';
      if (window.__rsmsShowTab) { try { window.__rsmsShowTab('inbox'); } catch (_) {} }
      var digits = String(phone).replace(/\D/g, '').slice(-10);
      var openById = function (targetId) {
        var tries = 0;
        var iv = setInterval(function () {
          tries++;
          var target = document.querySelector('#pane-inbox .conv-row[data-conv-id="' + targetId + '"]');
          if (target) { clearInterval(iv); try { target.click(); target.scrollIntoView({ block: 'nearest' }); } catch (_) {} return; }
          var listLoaded = !!document.querySelector('#pane-inbox .conv-row[data-conv-id]');
          if ((listLoaded && tries >= 4) || tries >= 40) {
            clearInterval(iv);
            if (window.__rsmsOpenConversation && targetId) { try { window.__rsmsOpenConversation(targetId, nm || null, phone); } catch (_) {} }
          }
        }, 200);
      };
      api.request('GET', '/conversations?search=' + encodeURIComponent(phone) + '&limit=10').then(function (r) {
        var list = (r && (r.conversations || r.data || r)) || [];
        if (!Array.isArray(list)) list = [];
        var c = list.find(function (x) { return String(x.phone || x.phone_number || '').replace(/\D/g, '').slice(-10) === digits; }) || list[0];
        if (c && c.id) openById(c.id);
        else if (window.__rsmsToast) window.__rsmsToast('No conversation found for ' + phone);
      }).catch(function () { if (window.__rsmsToast) window.__rsmsToast('Could not open conversation'); });
    });
  }
  function mlogRenderFoot() {
    var foot = document.querySelector('#conv-view-log .mlog-foot');
    if (!foot) return;
    var total = _mlogTotal || 0;
    var start = total ? (_mlogPage * MLOG_PAGE_SIZE + 1) : 0;
    var end = Math.min((_mlogPage + 1) * MLOG_PAGE_SIZE, total);
    var pages = Math.max(1, Math.ceil(total / MLOG_PAGE_SIZE));
    var prevDis = _mlogPage <= 0;
    var nextDis = (_mlogPage + 1) >= pages;
    function btn(label, id, disabled) {
      return '<button type="button" id="' + id + '" ' + (disabled ? 'disabled' : '') +
        ' style="height:30px;padding:0 12px;font:inherit;font-size:12.5px;font-weight:600;border:1px solid var(--hairline-strong);background:var(--card);color:' +
        (disabled ? 'var(--faint)' : 'var(--ink-2)') + ';border-radius:var(--r-sm);cursor:' + (disabled ? 'default' : 'pointer') + '">' + label + '</button>';
    }
    foot.innerHTML =
      '<span>' + (total ? (start.toLocaleString() + '–' + end.toLocaleString() + ' of ' + total.toLocaleString()) : 'No messages') + '</span>' +
      '<span class="mlog-spacer" style="flex:1"></span>' +
      btn('Prev', 'mlog-prev', prevDis) +
      '<span style="padding:0 6px;color:var(--muted)">Page ' + (_mlogPage + 1) + ' of ' + pages.toLocaleString() + '</span>' +
      btn('Next', 'mlog-next', nextDis);
    var p = document.getElementById('mlog-prev'), n = document.getElementById('mlog-next');
    if (p && !prevDis) p.addEventListener('click', function () { if (_mlogPage > 0) { _mlogPage--; loadMsgLog(); } });
    if (n && !nextDis) n.addEventListener('click', function () { _mlogPage++; loadMsgLog(); });
  }
  async function loadMsgLog() {
    var tb = document.getElementById('mlog-tbody');
    if (!tb) { // DOM not parsed yet on deep-link — retry briefly
      if ((loadMsgLog._tries = (loadMsgLog._tries || 0) + 1) <= 40) setTimeout(loadMsgLog, 120);
      return;
    }
    loadMsgLog._tries = 0;
    if (!window.api || !api.getMessageLogs) {
      tb.innerHTML = '<tr><td colspan="7"><div class="mlog-empty">Message log unavailable.</div></td></tr>';
      return;
    }
    // Sequence token instead of a blocking flag: opening the Logs view fires an
    // unfiltered load and a filter applied right after fires another — a blocking
    // guard dropped the 2nd (filter lost) and could wedge the table on "Loading…".
    // Now every load gets a token; only the latest one renders, so the freshest
    // request always wins and nothing sticks.
    var myseq = ++_mlogSeq;
    tb.innerHTML = '<tr><td colspan="7"><div class="mlog-empty">Loading messages…</div></td></tr>';
    try {
      var _mlf = { limit: MLOG_PAGE_SIZE, offset: _mlogPage * MLOG_PAGE_SIZE };
      if (_mlogSearch) _mlf.search = _mlogSearch; // omit when empty (URLSearchParams would send "undefined")
      if (_mlogFilters && _mlogFilters.conds && _mlogFilters.conds.length) {
        _mlf.filters = JSON.stringify(_mlogFilters.conds);
        _mlf.match = _mlogFilters.match || 'and';
      }
      var res = await api.getMessageLogs(_mlf);
      if (myseq !== _mlogSeq) return; // a newer load superseded this one — discard
      var rows = (res && res.data) || [];
      // total comes back as a STRING from the API (Postgres bigint COUNT) — parse
      // it, don't require typeof==='number' (that fell through to rows.length=20,
      // so the footer said "1-20 of 20" instead of the real total).
      var _mt = (res && res.total != null) ? parseInt(res.total, 10) : NaN;
      _mlogTotal = isFinite(_mt) ? _mt : rows.length;
      if (!rows.length) {
        tb.innerHTML = '<tr><td colspan="7"><div class="mlog-empty" style="padding:34px 16px">No messages yet. Every SMS you send and receive shows up here.</div></td></tr>';
      } else {
        window.__mlogRows = rows;
        tb.innerHTML = rows.map(mlogRow).join('');
      }
      mlogRenderFoot();
    } catch (e) {
      if (myseq === _mlogSeq) tb.innerHTML = '<tr><td colspan="7"><div class="mlog-empty">Could not load messages.</div></td></tr>';
    }
  }
  // Exposed so the SMS view switcher (dashboard-mercury-app.html show('log'))
  // can trigger a load whenever the Logs view becomes visible.
  // Message-log filter builder (makeFB onApply) → server-side filter via /sms/logs.
  window.__rsmsApplyMlogFilter = function (conds, match) {
    _mlogFilters = (conds && conds.length) ? { conds: conds, match: match } : null;
    _mlogPage = 0;
    loadMsgLog(); // the seq token makes this supersede any in-flight (unfiltered) load
  };
  window.__rsmsLoadMsgLog = function (reset) {
    if (reset) { _mlogPage = 0; }
    loadMsgLog();
  };
  // Message-log search bar (#mlog-q) → server-side search (debounced). Delegated so
  // it survives re-renders. Resets to page 1 and re-queries /sms/logs?search=.
  if (!window.__mlogSearchWired) {
    window.__mlogSearchWired = 1;
    document.addEventListener('input', function (e) {
      if (!e.target || e.target.id !== 'mlog-q') return;
      _mlogSearch = (e.target.value || '').trim();
      clearTimeout(window.__mlogSearchT);
      window.__mlogSearchT = setTimeout(function () { _mlogPage = 0; loadMsgLog(); }, 300);
    });
  }

  // "View message log" (Usage Reports etc.) navigates to the Inbox, but the
  // Inbox pane defaults to the conversations view — so the message-log view
  // didn't stick (user landed on conversations). Force the log view after the
  // nav settles; re-apply a few times to beat the pane's default-view reset.
  if (!document.__mlogNavWired) {
    document.__mlogNavWired = 1;
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest && e.target.closest('[data-tab="inbox"][data-convview="log"]');
      if (!b) return;
      var tries = 0;
      (function force() {
        var inb = document.getElementById('conv-view-inbox'), log = document.getElementById('conv-view-log');
        if (inb && log) {
          inb.hidden = true; log.hidden = false;
          try { $all('[data-convview]').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-convview') === 'log'); }); } catch (e2) {}
        }
        if (++tries < 5) setTimeout(force, 110);
      })();
      try { window.__rsmsLoadMsgLog && window.__rsmsLoadMsgLog(true); } catch (e3) {}
    }, true);
  }
})();
