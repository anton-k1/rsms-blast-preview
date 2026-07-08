// Shared styled dialog helpers — replace native confirm() / alert() / prompt()
// across the app. Self-styling via _ensureStyles() (see below), so it also works
// on pages that don't load styles.css (e.g. the Mercury dashboard). Loaded by
// app.html, admin.html, and dashboard-mercury-app.html.
(function() {
  'use strict';

  function escAttr(s) { return String(s == null ? '' : s).replace(/"/g, '&quot;'); }
  function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = String(s == null ? '' : s);
    return d.innerHTML;
  }

  // Self-contained styles so the dialog looks right on ANY page — including pages
  // that don't load styles.css (the Mercury dashboard is fully inline-styled).
  // Values mirror styles.css's .confirm-* / .btn / .form-input so app.html and
  // admin.html (which DO load styles.css) look identical; the button + input rules
  // are scoped under .confirm-overlay so they never touch host UI. Idempotent.
  function _ensureStyles() {
    if (document.getElementById('rsms-dialogs-styles')) return;
    var css = [
      ".confirm-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.4); z-index: 99998; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); animation: rsmsDlgOverlayIn 0.2s ease; }",
      ".confirm-box { background: #fff; border-radius: 16px; padding: 0; max-width: 400px; width: calc(100% - 32px); box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08); font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; animation: rsmsDlgModalIn 0.25s cubic-bezier(0.16,1,0.3,1); overflow: hidden; }",
      ".confirm-title { font-size: 1.05rem; font-weight: 700; color: #0F172A; padding: 24px 24px 0; margin: 0 0 8px; }",
      ".confirm-message { font-size: 0.9rem; color: #64748B; line-height: 1.6; padding: 0 24px; margin: 0 0 20px; }",
      ".confirm-buttons { display: flex; gap: 8px; justify-content: flex-end; padding: 16px 24px; background: #F8FAFC; border-top: 1px solid rgba(0,0,0,0.06); }",
      ".confirm-overlay .btn { display: inline-flex; align-items: center; justify-content: center; padding: 8px 16px; border-radius: 10px; font-weight: 600; font-size: 0.8rem; text-decoration: none; transition: all 0.2s; cursor: pointer; border: none; font-family: inherit; gap: 6px; }",
      ".confirm-overlay .btn-primary { background: linear-gradient(135deg, #2563EB, #3B82F6); color: #fff; box-shadow: 0 4px 14px rgba(37,99,235,0.25); }",
      ".confirm-overlay .btn-outline { background: transparent; color: #2563EB; border: 1.5px solid #2563EB; }",
      ".confirm-overlay .form-input { box-sizing: border-box; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 10px 12px; font-size: 0.9rem; color: #0F172A; outline: none; background: #fff; }",
      ".confirm-overlay .form-input:focus { border-color: #2563EB; }",
      "@keyframes rsmsDlgOverlayIn { from { opacity: 0; } to { opacity: 1; } }",
      "@keyframes rsmsDlgModalIn { from { transform: scale(0.95) translateY(8px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }"
    ].join('\n');
    var style = document.createElement('style');
    style.id = 'rsms-dialogs-styles';
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  // Only one dialog overlay at a time. Every helper appends a .confirm-overlay to the
  // body; without this, spamming a button that opens a confirm/alert/prompt stacks a
  // fresh overlay on every click (the "press a button 100x -> 100 popups" bug). Clearing
  // any existing overlay before showing a new one gives replace-semantics: the latest
  // open wins and exactly one dialog is ever visible. Called before each append below.
  function _clearExisting() {
    _ensureStyles();
    document.querySelectorAll('.confirm-overlay').forEach((el) => el.remove());
  }

  function showConfirm(title, message, onConfirm, confirmText = 'Confirm', destructive = false) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-box">
        <div class="confirm-title">${escHtml(title)}</div>
        <div class="confirm-message">${String(message || '').replace(/\n/g, '<br>')}</div>
        <div class="confirm-buttons">
          <button class="btn btn-outline btn-sm" id="confirmCancel">Cancel</button>
          <button class="btn btn-primary btn-sm" id="confirmOk" style="${destructive ? 'background:linear-gradient(135deg,#EF4444,#DC2626);box-shadow:0 4px 14px rgba(239,68,68,0.3);' : ''}">${escHtml(confirmText)}</button>
        </div>
      </div>
    `;
    _clearExisting();
    document.body.appendChild(overlay);
    overlay.querySelector('#confirmCancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#confirmOk').addEventListener('click', () => { overlay.remove(); if (typeof onConfirm === 'function') onConfirm(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); }
    });
  }

  // showPrompt(title, message, onSubmit, opts?) — opts: { placeholder, defaultValue, confirmText, multiline }
  function showPrompt(title, message, onSubmit, opts = {}) {
    const { placeholder = '', defaultValue = '', confirmText = 'Submit', multiline = false } = opts;
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    const inputEl = multiline
      ? `<textarea class="form-input" id="promptInput" rows="3" placeholder="${escAttr(placeholder)}" style="margin:0 24px 20px;width:calc(100% - 48px);font-family:inherit;resize:vertical;">${escHtml(defaultValue)}</textarea>`
      : `<input type="text" class="form-input" id="promptInput" placeholder="${escAttr(placeholder)}" value="${escAttr(defaultValue)}" style="margin:0 24px 20px;width:calc(100% - 48px);font-family:inherit;">`;
    overlay.innerHTML = `
      <div class="confirm-box">
        <div class="confirm-title">${escHtml(title)}</div>
        ${message ? `<div class="confirm-message">${String(message).replace(/\n/g, '<br>')}</div>` : ''}
        ${inputEl}
        <div class="confirm-buttons">
          <button class="btn btn-outline btn-sm" id="promptCancel">Cancel</button>
          <button class="btn btn-primary btn-sm" id="promptOk">${escHtml(confirmText)}</button>
        </div>
      </div>
    `;
    _clearExisting();
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#promptInput');
    setTimeout(() => input.focus(), 50);
    const submit = () => {
      const val = input.value;
      overlay.remove();
      if (typeof onSubmit === 'function') onSubmit(val);
    };
    overlay.querySelector('#promptCancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#promptOk').addEventListener('click', submit);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !multiline) { e.preventDefault(); submit(); }
      if (e.key === 'Escape') { overlay.remove(); }
    });
  }

  // Lightweight info dialog when toast isn't enough — single OK button, no cancel.
  function showAlert(title, message, opts = {}) {
    const { okText = 'OK', onClose } = opts;
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-box">
        <div class="confirm-title">${escHtml(title)}</div>
        <div class="confirm-message">${String(message || '').replace(/\n/g, '<br>')}</div>
        <div class="confirm-buttons">
          <button class="btn btn-primary btn-sm" id="alertOk">${escHtml(okText)}</button>
        </div>
      </div>
    `;
    _clearExisting();
    document.body.appendChild(overlay);
    const close = () => { overlay.remove(); if (typeof onClose === 'function') onClose(); };
    overlay.querySelector('#alertOk').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape' || e.key === 'Enter') { document.removeEventListener('keydown', esc); close(); }
    });
  }

  // ── Promise-based variants ────────────────────────────────────────────────
  // Ergonomic for `if (!await confirmDialog(...)) return;` and `var x = await
  // promptDialog(...)`. Render with the SAME .confirm-overlay design as the
  // callback helpers above, so everything stays one visual system.
  function _overlay(inner) {
    const ov = document.createElement('div');
    ov.className = 'confirm-overlay';
    ov.innerHTML = '<div class="confirm-box">' + inner + '</div>';
    _clearExisting();
    document.body.appendChild(ov);
    return ov;
  }
  function _wire(ov, resolve, cfg) {
    function close(val) { ov.remove(); document.removeEventListener('keydown', onKey); resolve(typeof val === 'function' ? val() : val); }
    ov.addEventListener('click', (e) => {
      const act = e.target.getAttribute && e.target.getAttribute('data-act');
      if (act === 'ok') close(cfg.okVal);
      else if (act === 'cancel') close(cfg.cancelVal);
      else if (e.target === ov) close(cfg.cancelVal);
    });
    function onKey(e) {
      if (e.key === 'Escape') close(cfg.cancelVal);
      else if (e.key === 'Enter' && cfg.enterSubmits !== false) { e.preventDefault(); close(cfg.okVal); }
    }
    document.addEventListener('keydown', onKey);
  }
  function confirmDialog(message, opts) {
    const o = (typeof opts === 'string') ? { title: opts } : (opts || {});
    const title = o.title || 'Are you sure?';
    const danger = !!o.danger;
    const okText = o.confirmText || (danger ? 'Delete' : 'Confirm');
    return new Promise((resolve) => {
      const ov = _overlay(
        '<div class="confirm-title">' + escHtml(title) + '</div>' +
        (message ? '<div class="confirm-message">' + String(message).replace(/\n/g, '<br>') + '</div>' : '') +
        '<div class="confirm-buttons">' +
          '<button class="btn btn-outline btn-sm" data-act="cancel">' + escHtml(o.cancelText || 'Cancel') + '</button>' +
          '<button class="btn btn-primary btn-sm" data-act="ok"' + (danger ? ' style="background:linear-gradient(135deg,#EF4444,#DC2626);box-shadow:0 4px 14px rgba(239,68,68,0.3);"' : '') + '>' + escHtml(okText) + '</button>' +
        '</div>'
      );
      _wire(ov, resolve, { okVal: true, cancelVal: false });
    });
  }
  function promptDialog(message, opts) {
    const o = (typeof opts === 'string') ? { title: opts } : (opts || {});
    const title = o.title || 'Enter a value';
    const multiline = !!o.multiline;
    const inputEl = multiline
      ? '<textarea class="form-input" id="__pdInput" rows="3" placeholder="' + escAttr(o.placeholder || '') + '" style="margin:0 24px 20px;width:calc(100% - 48px);font-family:inherit;resize:vertical;">' + escHtml(o.defaultValue || '') + '</textarea>'
      : '<input type="text" class="form-input" id="__pdInput" placeholder="' + escAttr(o.placeholder || '') + '" value="' + escAttr(o.defaultValue || '') + '" style="margin:0 24px 20px;width:calc(100% - 48px);font-family:inherit;">';
    return new Promise((resolve) => {
      const ov = _overlay(
        '<div class="confirm-title">' + escHtml(title) + '</div>' +
        (message ? '<div class="confirm-message">' + String(message).replace(/\n/g, '<br>') + '</div>' : '') +
        inputEl +
        '<div class="confirm-buttons">' +
          '<button class="btn btn-outline btn-sm" data-act="cancel">Cancel</button>' +
          '<button class="btn btn-primary btn-sm" data-act="ok">' + escHtml(o.confirmText || 'Submit') + '</button>' +
        '</div>'
      );
      const input = ov.querySelector('#__pdInput');
      setTimeout(() => { if (input) { input.focus(); if (input.select) input.select(); } }, 50);
      _wire(ov, resolve, { okVal: () => (input ? input.value : ''), cancelVal: null, enterSubmits: !multiline });
    });
  }
  function alertDialog(message, opts) {
    const o = (typeof opts === 'string') ? { title: opts } : (opts || {});
    return new Promise((resolve) => {
      const ov = _overlay(
        '<div class="confirm-title">' + escHtml(o.title || 'Heads up') + '</div>' +
        (message ? '<div class="confirm-message">' + String(message).replace(/\n/g, '<br>') + '</div>' : '') +
        '<div class="confirm-buttons"><button class="btn btn-primary btn-sm" data-act="ok">' + escHtml(o.okText || 'OK') + '</button></div>'
      );
      _wire(ov, resolve, { okVal: true, cancelVal: true });
    });
  }

  window.showConfirm = showConfirm;
  window.showPrompt = showPrompt;
  window.showAlert = showAlert;
  window.confirmDialog = confirmDialog;
  window.promptDialog = promptDialog;
  window.alertDialog = alertDialog;
})();
