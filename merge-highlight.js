/* merge-highlight.js — render merge fields ({{contact.first_name}}) as BLUE TEXT,
 * live, as you type, inside the message composers. No chip/pill — just blue font.
 *
 * Technique: a browser <textarea> can only render one text color, so we mirror the
 * textarea onto a "backdrop" div positioned exactly behind it (same font, padding,
 * border, line-height), make the textarea's own text transparent (caret stays
 * visible), and paint the backdrop with {{tokens}} wrapped in a blue <span>. The
 * user types in the real textarea; the blue they see is the backdrop showing through.
 *
 * Self-attaching: on focus (and an initial scan) any composer matching SELECTOR gets
 * wired once. Covers dynamically-created composers (modals, drip steps) for free.
 * Token color = the app's --accent (#2563EB). */
(function () {
  'use strict';
  if (window.__mhInit) return;
  window.__mhInit = true;

  // Explicit known composers: .blast-textarea (blast / automation / drip / follow-up),
  // .conv-composer textarea (inbox reply), #bm-message (main blast body).
  var SELECTOR = '.blast-textarea, .conv-composer textarea, #bm-message, .bm-ab-tx, .bm-ab-vextra';
  // Self-identifying catch-all: ANY textarea that advertises merge fields — its
  // placeholder or current value mentions a token — gets highlighted too. This is
  // what makes it truly "everywhere a user types a custom field" (covers the dialer
  // pre-call / text-back / automation composers, settings, and any FUTURE composer)
  // without a brittle hardcoded id list.
  var MERGE_HINT = /\{\{?\s*(contact|first_name|last_name|full_name|booking|company|user|assigned|phone|email)\b/i;
  // {{contact.first_name}} and single-brace {first_name} / {{booking_link}} etc.
  var TOK = /(\{\{[^}]+\}\}|\{[^{}]+\})/g;
  function isMergeComposer(el) {
    if (!el || el.tagName !== 'TEXTAREA') return false;
    if (el.matches && el.matches(SELECTOR)) return true;
    if (MERGE_HINT.test(el.getAttribute('placeholder') || '')) return true;
    return /\{\{[^}]+\}\}|\{[^{}]+\}/.test(el.value || ''); // pre-filled with tokens
  }
  // metrics the backdrop must share with the textarea so glyphs land in the same spot
  var COPY = ['boxSizing', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
    'fontVariant', 'letterSpacing', 'wordSpacing', 'textTransform', 'textIndent',
    'lineHeight', 'tabSize', 'paddingTop', 'paddingRight', 'paddingBottom',
    'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth',
    'borderLeftWidth', 'borderStyle', 'borderRadius'];

  var st = document.createElement('style');
  st.textContent =
    '.mh-wrap{position:relative;display:block}' +
    '.mh-back{position:absolute;top:0;left:0;right:0;bottom:0;margin:0;pointer-events:none;' +
    'overflow:hidden;z-index:0;background:transparent;white-space:pre-wrap;word-wrap:break-word;' +
    'overflow-wrap:break-word}' +
    // Color ONLY — no bold. A heavier weight makes the backdrop token wider than
    // the normal-weight text the real textarea uses to place the caret, so the
    // caret drifts into the middle of the visible token. Same weight = caret lands
    // exactly where it should.
    '.mh-tok{color:var(--accent,#2563EB)}' +
    // Unknown token — a merge field that isn't a real/saved field (e.g. a typo
    // like {{property.city}}). Amber + wavy underline so it reads as "not valid"
    // instead of looking blue-and-fine and then shipping literal/empty.
    '.mh-tok-bad{color:#B45309;text-decoration:underline wavy #F59E0B;text-underline-offset:2px}';
  document.head.appendChild(st);

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  var _painters = [];
  // Re-run every attached highlighter — called by mercury-live once the account's
  // custom fields load, so already-open composers re-validate their tokens.
  window.__rsmsRepaintMerge = function () { _painters.forEach(function (p) { try { p(); } catch (e) {} }); };

  function attach(el) {
    if (!el || el.__mh || el.tagName !== 'TEXTAREA') return;
    el.__mh = 1;
    var cs = getComputedStyle(el);

    var wrap = document.createElement('div');
    wrap.className = 'mh-wrap';
    var back = document.createElement('div');
    back.className = 'mh-back';
    COPY.forEach(function (p) { try { back.style[p] = cs[p]; } catch (e) {} });
    back.style.borderColor = 'transparent';
    back.style.color = cs.color;

    // insert wrapper in place, move textarea + backdrop inside (backdrop BEHIND)
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(back);
    wrap.appendChild(el);

    // textarea sits on top with transparent glyphs but a visible caret
    el.style.position = 'relative';
    el.style.zIndex = '1';
    el.style.background = 'transparent';
    el.style.caretColor = cs.color;
    el.style.color = 'transparent';

    var warnEl = null;
    // Notice below the box listing unknown tokens + a one-click "Create field"
    // that turns the typo into a real custom field (mercury-live) and swaps the
    // token to the canonical {{custom.x}} form (which the send path resolves).
    function updateWarn(bad) {
      if (!bad.length) { if (warnEl) warnEl.style.display = 'none'; return; }
      if (!warnEl) {
        warnEl = document.createElement('div');
        warnEl.style.cssText = 'margin-top:6px;display:flex;flex-direction:column;gap:4px';
        if (wrap.parentNode) wrap.parentNode.insertBefore(warnEl, wrap.nextSibling);
        warnEl.addEventListener('click', function (e) {
          var b = e.target.closest('[data-mhcreate]'); if (!b || !window.__rsmsCreateMergeField) return;
          e.preventDefault(); var tok = b.getAttribute('data-mhcreate');
          b.disabled = true; b.textContent = 'Creating…';
          window.__rsmsCreateMergeField(tok).then(function (res) {
            el.value = el.value.split(tok).join(res.token);
            el.dispatchEvent(new Event('input', { bubbles: true })); // repaint + composer count/autosave
            if (window.__rsmsRepaintMerge) window.__rsmsRepaintMerge();
            if (window.__rsmsToast) window.__rsmsToast('Created “' + res.name + '” — it’s a field now');
          }).catch(function () { b.disabled = false; b.textContent = '+ Create field'; if (window.__rsmsToast) window.__rsmsToast('Could not create the field'); });
        });
      }
      warnEl.style.display = 'flex';
      warnEl.innerHTML = bad.map(function (t) {
        return '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:#92400E"><span>⚠ <code style="background:#FEF3C7;border-radius:4px;padding:1px 5px;font-size:11.5px">' + esc(t) + '</code> isn’t a saved field.</span><button type="button" data-mhcreate="' + esc(t) + '" style="border:1px solid #F59E0B;background:#FFFBEB;color:#92400E;border-radius:6px;padding:3px 9px;font:inherit;font-size:11.5px;font-weight:600;cursor:pointer">+ Create field</button></div>';
      }).join('');
    }
    function paint() {
      var v = el.value || '';
      var bad = {};
      // trailing newline needs a placeholder char or the last line collapses
      back.innerHTML = esc(v).replace(TOK, function (m) {
        // Known field → blue; unknown (typo / not a saved field) → amber warning.
        var known = !window.__rsmsMergeTokenKnown || window.__rsmsMergeTokenKnown(m);
        if (!known) bad[m] = 1;
        return '<span class="mh-tok' + (known ? '' : ' mh-tok-bad') + '">' + m + '</span>';
      }).replace(/\n$/, '\n​');
      updateWarn(Object.keys(bad));
    }
    _painters.push(paint);
    function sync() { back.scrollTop = el.scrollTop; back.scrollLeft = el.scrollLeft; }

    el.addEventListener('input', function () { paint(); sync(); });
    el.addEventListener('scroll', sync);
    // vertical-resize textareas: re-copy metrics + repaint so wrapping stays aligned
    if (window.ResizeObserver) {
      try { new ResizeObserver(function () { paint(); sync(); }).observe(el); } catch (e) {}
    }
    paint();
  }

  function scan() {
    try { document.querySelectorAll('textarea').forEach(function (el) { if (isMergeComposer(el)) attach(el); }); } catch (e) {}
  }

  document.addEventListener('focusin', function (e) {
    if (isMergeComposer(e.target)) attach(e.target);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();

  // exposed so a composer that pre-fills tokens can light them up immediately
  window.attachTokenHighlight = attach;
})();
