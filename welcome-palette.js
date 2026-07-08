// welcome-palette.js — Welcome / onboarding palette for new users
// Self-executing IIFE; exposes window.setupWelcomePalette + window.deriveWelcomeState
(function () {
  'use strict';

  // Capture ?welcome=1 at SCRIPT-LOAD time. This script loads before
  // mercury-live.js, which rewrites the URL to the tab path during its sync init
  // and strips the query param — so by the time setupWelcomePalette() runs async
  // the param is already gone. Snapshot it here while it's still present.
  var _isWelcomeLaunch = /[?&]welcome=1\b/.test(location.search);

  // ── State machine ──────────────────────────────────────────────────────
  var STATES = {
    no_number:     { sub:'Complete these steps to start sending texts and making calls.', steps:[0,0,0], bannerText:'Activate your number to unlock SMS and dialing', bannerSub:'Takes under a minute', bannerCta:'Activate now \u2192', step1State:'open', step2Lock:'Activate first', step3Lock:'Activate first', ctaLabel:'Activate your number \u2014 $5/mo', ctaAction:'activate', footSub:'No commitment \u00b7 Cancel anytime' },
    provisioning:  { sub:'Your number is being set up \u2014 almost ready!', steps:[1,0,0], bannerText:'Your number is being provisioned', bannerSub:'', bannerCta:'Earn $5 credit \u2192', bannerCtaAction:'survey', step1State:'done', step2Lock:'Provisioning\u2026', step3Lock:'Provisioning\u2026', ctaLabel:'', ctaAction:'none', footSub:'' },
    ready:         { sub:'Your number is live! Try sending a text and making a call.', steps:[1,0,0], bannerText:'Your number is ready \u2014 send your first text', bannerSub:'', bannerCta:'Send a text \u2192', step1State:'done', step2Lock:'', step3Lock:'', ctaLabel:'Send your first text', ctaAction:'sms', footSub:'' },
    sent_text:     { sub:'Nice! Now try the dialer \u2014 it works right now.', steps:[1,1,0], bannerText:'Try the dialer \u2014 make your first call', bannerSub:'', bannerCta:'Open dialer \u2192', step1State:'done', step2Lock:'', step3Lock:'', ctaLabel:'Open the dialer', ctaAction:'dialer', footSub:'' },
    prov_rejected: { sub:'Your area code isn\u2019t available \u2014 pick a new one for free.', steps:[0,0,0], bannerText:'Your number couldn\u2019t be provisioned', bannerSub:'', bannerCta:'Choose new area code \u2192', bannerCtaAction:'activate', step1State:'rejected', step2Lock:'Activate first', step3Lock:'Activate first', ctaLabel:'Choose a new area code \u2014 free', ctaAction:'activate', footSub:'No additional charge' },
    prov_timeout:  { sub:'Your area code has limited availability \u2014 our team is on it.', steps:[0,0,0], bannerText:'Provisioning taking longer than expected', bannerSub:'', bannerCta:'View status \u2192', bannerCtaAction:'toggle', step1State:'escalated', step2Lock:'Pending\u2026', step3Lock:'Pending\u2026', ctaLabel:'Explore your dashboard', ctaAction:'close', footSub:'We\u2019ll notify you when your number is ready' },
    all_done:      { sub:'You\u2019re all set! Your number is live, texts are sending, and the dialer works.', steps:[1,1,1], bannerText:'You\u2019re all set! Setup complete.', bannerSub:'', bannerCta:'Dismiss', bannerCtaAction:'dismiss', step1State:'done', step2Lock:'', step3Lock:'', ctaLabel:'', ctaAction:'close', footSub:'' }
  };

  // ── Module-scoped state ────────────────────────────────────────────────
  var _currentState = 'no_number';
  var _creditClaimed = false;
  var _wpContext = null;      // { phoneNumbers, onboardingState, api }
  var _wpWired = false;
  var _pollInterval = null;
  var _provInterval = null;
  var _provFloorUntil = 0;        // deadline for the 60s "almost ready" survey window (Alex 06-27)
  var _provFloorTimer = null;
  var _provFloorUsed = false;     // one-shot per activation cycle
  var _provPendingRealKey = null; // real state to resume once the floor lifts
  var _provSeconds = 240;
  var _statePoll = null;      // background re-sync of /onboarding/state
  var _fabTick = null;        // 1s re-eval of launcher visibility (backstop)
  var _fabHooks = false;      // one-time instant re-eval hooks (click + body-class)
  var _lastDone = 0;          // steps done (for the bottom-right launcher)
  var _refreshing = false;
  var _bannerDismissed = false;  // user dismissed the setup banner — dont force it back on setState
  var _svStep = 1;
  var _svUseCase = 'both';
  var _svTotalSteps = 6;
  var _svAnswers = {};
  var selectedAC = '';
  var _rejectMode = false;
  var _paletteManualClose = false;

  // Question keys by step index
  var SV_KEYS = { 1:'heard_from', 2:'role', 3:'industry', 4:'use_case', 5:'team_size', 6:'sms_volume', 7:'dialer_volume' };

  // ── deriveWelcomeState ─────────────────────────────────────────────────
  function deriveWelcomeState(phoneNumbers, onboardingState) {
    var nums = Array.isArray(phoneNumbers) ? phoneNumbers : [];
    var pending = nums.find(function(n) { return n.status === 'pending_provisioning'; });
    var rejected = nums.find(function(n) { return n.status === 'provider_rejected'; });
    var active = nums.find(function(n) { return n.status === 'active'; });

    if (active) {
      if (onboardingState.has_sent_test && onboardingState.has_made_call) return 'all_done';
      if (onboardingState.has_sent_test) return 'sent_text';
      return 'ready';
    }
    if (rejected) return 'prov_rejected';
    if (pending) {
      var created = new Date(pending.created_at).getTime();
      if (Date.now() - created > 4 * 60 * 1000) return 'prov_timeout';
      return 'provisioning';
    }
    return 'no_number';
  }

  // ── setState ───────────────────────────────────────────────────────────
  function setState(key) {
    var s = STATES[key]; if (!s) return;
    // 2-min "almost ready" floor (Alex 06-27; bumped 60s→120s 06-28): when the user
    // activates, hold the provisioning view + $5 survey window ~2 min even if the warm
    // pool makes the number active instantly — the carrier still needs a couple minutes
    // to finish attaching the number to the campaign before it can reliably send.
    // One-shot per activation; an instant 'ready' is downgraded back to 'provisioning'
    // until the floor lifts. Self-healing: once Date.now() passes the deadline the next
    // poll lets the real state through. Matches the backend send-hold (NUMBER_ACTIVATION_HOLD_MIN=2).
    if ((key === 'provisioning' || key === 'ready' || key === 'sent_text' || key === 'all_done')
        && _isWelcomeLaunch && !_creditClaimed && !_provFloorUsed) {
      _provFloorUsed = true; _provFloorUntil = Date.now() + 120000; _scheduleProvFloorLift();
    }
    // While the floor holds, PIN the view to provisioning so an instant 'ready' or a
    // stale 'no_number' poll cant end the window early. Genuine failures pass through.
    if (_provFloorUntil && Date.now() < _provFloorUntil
        && key !== 'provisioning' && key !== 'prov_rejected' && key !== 'prov_timeout') {
      _provPendingRealKey = (key === 'no_number' ? 'ready' : key);
      key = 'provisioning'; s = STATES.provisioning;
    }
    _currentState = key;
    // If a welcome survey is owed (?welcome=1, just finished onboarding) and the
    // user has now ACTIVATED their number, surface the $5 survey here — see the
    // gate in _tryWelcomeSurvey. Fires once (one-shot flag); cheap no-op otherwise.
    if (_isWelcomeLaunch) { try { _tryWelcomeSurvey(); } catch (e) {} }
    var done = s.steps.filter(function(v){return v;}).length;
    var allDone = done >= 3;
    _lastDone = done;
    // NB: updateFab() runs at the END of setState, after the overlay's open/closed
    // state is set — otherwise it reads a stale state and shows the launcher on
    // top of the just-opened modal.

    // Subtitle
    document.getElementById('dpSub').textContent = s.sub;

    // Progress bar
    document.getElementById('dpFuelLabel').textContent = done + ' of 3 done';
    document.getElementById('dpFuelFill').style.width = Math.round((done/3)*100) + '%';

    // Step states
    var stepEls = [document.getElementById('step1'), document.getElementById('step2'), document.getElementById('step3')];
    var checkEls = [document.getElementById('check1'), document.getElementById('check2'), document.getElementById('check3')];
    for (var i=0;i<3;i++) {
      stepEls[i].classList.remove('done','locked','provisioning');
      checkEls[i].classList.remove('on');
      if (s.steps[i]) { stepEls[i].classList.add('done'); checkEls[i].classList.add('on'); }
    }

    // Step 1 check icon + badge + CTA reset
    var s1CtaEl = stepEls[0].querySelector('.dp-cta'); if(s1CtaEl) s1CtaEl.style.display = '';
    var s1Badge = document.getElementById('step1Badge');
    var s1Desc = document.getElementById('step1Desc');
    var c1 = document.getElementById('check1');
    c1.className = 'dp-check'; // reset
    c1.innerHTML = '<svg viewBox="0 0 24 24" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    if (s.step1State === 'done') {
      s1Badge.style.display = 'none';
      c1.classList.add('on');
      s1Desc.innerHTML = 'Your number is active and ready to use.';
    } else if (s.step1State === 'rejected') {
      s1Badge.style.display = ''; s1Badge.textContent = 'UNAVAILABLE'; s1Badge.className = 'dp-lock dp-lock-red';
      s1Desc.innerHTML = '<span style="color:var(--red);font-weight:550">Carrier has no numbers in your area code right now.</span> <span class="dp-gain" style="color:var(--accent);cursor:pointer">Pick a new area code \u2014 free \u2192</span>';
      c1.className = 'dp-check dp-check-red';
      c1.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>';
    } else if (s.step1State === 'escalated') {
      s1Badge.style.display = ''; s1Badge.textContent = 'IN PROGRESS'; s1Badge.className = 'dp-lock dp-lock-amber';
      s1Desc.innerHTML = '<span class="dp-prov-status" style="color:var(--amber)"><span class="dp-prov-dot" style="background:var(--amber)"></span> Your area code has limited availability \u2014 our team is sourcing a number for you</span>';
      c1.className = 'dp-check dp-check-amber';
      c1.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
      var s1Cta = stepEls[0].querySelector('.dp-cta'); if(s1Cta) s1Cta.style.display = 'none';
    } else {
      s1Badge.style.display = ''; s1Badge.textContent = '$5/mo'; s1Badge.className = 'dp-lock';
      s1Desc.innerHTML = 'Pick an area code and activate your local number. <span class="dp-gain">Takes under a minute.</span>';
    }

    // Step 2 lock
    var s2Lock = document.getElementById('step2Lock');
    if (s.step2Lock) {
      stepEls[1].classList.add(s.step2Lock === 'Provisioning\u2026' ? 'provisioning' : 'locked');
      s2Lock.style.display = ''; s2Lock.textContent = s.step2Lock;
      s2Lock.className = s.step2Lock === 'Provisioning\u2026' ? 'dp-lock dp-lock-prov' : 'dp-lock dp-lock-needed';
    } else { s2Lock.style.display = 'none'; stepEls[1].classList.remove('locked','provisioning'); }

    // Step 3 lock
    var s3Lock = document.getElementById('step3Lock');
    if (s.step3Lock) {
      stepEls[2].classList.add(s.step3Lock === 'Provisioning\u2026' ? 'provisioning' : 'locked');
      s3Lock.style.display = ''; s3Lock.textContent = s.step3Lock;
      s3Lock.className = s.step3Lock === 'Provisioning\u2026' ? 'dp-lock dp-lock-prov' : 'dp-lock dp-lock-needed';
    } else { s3Lock.style.display = 'none'; stepEls[2].classList.remove('locked','provisioning'); }

    // Main CTA
    var ctaEl = document.getElementById('dpMainCta');
    var ctaLabel = document.getElementById('dpCtaLabel');
    if (s.ctaLabel) { ctaEl.style.display = ''; ctaLabel.textContent = s.ctaLabel; }
    else { ctaEl.style.display = 'none'; }
    document.getElementById('dpFootSub').textContent = s.footSub;

    // Banner
    document.getElementById('sbText').textContent = s.bannerText;
    document.querySelector('.sb-step').textContent = s.bannerSub;
    document.getElementById('sbCta').textContent = s.bannerCta;
    document.getElementById('sbCta').style.display = s.bannerCta ? '' : 'none';
    document.getElementById('sbCta').style.opacity = '';
    document.getElementById('sbCta').style.pointerEvents = '';
    // Show the setup banner unless the user dismissed it — was force-shown on EVERY
    // setState, so any send/call (which fires setState) popped a dismissed banner back
    // up. Respect _bannerDismissed (set by the Dismiss button / X).
    if (!_bannerDismissed) document.getElementById('setupBanner').classList.remove('hidden');

    // Provisioning timer in banner — run in BOTH provisioning AND prov_timeout so
    // the elapsed timer keeps ticking and never looks frozen while sourcing.
    if (key === 'provisioning' || key === 'prov_timeout') {
      var _sbStep = document.querySelector('.sb-step'); if (_sbStep) _sbStep.id = 'provCountdown';
      startProvCountdown();
      document.getElementById('setupBanner').classList.add('sb-prov');
    } else {
      stopProvCountdown();
      document.getElementById('setupBanner').classList.remove('sb-prov');
    }

    // Earn credit card in palette: show during provisioning if not yet claimed
    document.getElementById('dpEarnCard').style.display = (!_creditClaimed && (key === 'provisioning' || key === 'ready' || key === 'sent_text' || key === 'all_done')) ? 'flex' : 'none'; // keep it there until they do it (Alex 06-27)

    // Registration row: HIDDEN until the number is active. Per Alex 06-27 flow —
    // activate-number is the low-friction first step; registration only "shows up
    // at the bottom once activate number is done", and never competes with the
    // Activate CTA in no_number / provisioning / rejected states.
    var _regRow = document.getElementById('stepRegister');
    if (_regRow) _regRow.style.display = (key === 'ready' || key === 'sent_text' || key === 'all_done') ? '' : 'none';

    // Credit claimed state — if already claimed, show in banner
    if (_creditClaimed && key === 'provisioning') {
      document.getElementById('sbCta').textContent = '\u2713 Credit claimed';
      document.getElementById('sbCta').style.opacity = '.7';
      document.getElementById('sbCta').style.pointerEvents = 'none';
    }

    // Provisioning failure alerts (hidden — info is now inline in the step)
    document.getElementById('dpProvRejected').style.display = 'none';
    document.getElementById('dpProvTimeout').style.display = 'none';

    // Banner style classes
    document.getElementById('setupBanner').classList.remove('sb-rejected','sb-timeout');
    if (key === 'prov_rejected') document.getElementById('setupBanner').classList.add('sb-rejected');
    if (key === 'prov_timeout') document.getElementById('setupBanner').classList.add('sb-timeout');

    // Palette + blur
    var appBody = document.querySelector('.app-body');
    if (allDone) {
      document.getElementById('paletteOverlay').classList.add('hidden');
      if (appBody) appBody.classList.remove('blurred');
    } else if (!_paletteManualClose) {
      document.getElementById('paletteOverlay').classList.remove('hidden');
      if (appBody) appBody.classList.add('blurred');
    }
    try { updateFab(); } catch(_) {}
  }

  // ── Palette open/close ─────────────────────────────────────────────────
  function togglePalette() {
    var ov = document.getElementById('paletteOverlay');
    if (!ov) return;
    var isHidden = ov.classList.contains('hidden');
    ov.classList.toggle('hidden', !isHidden);
    var bg = document.querySelector('.app-body');
    if (bg) bg.classList.toggle('blurred', isHidden);
    if (isHidden) _paletteManualClose = false;
    try { updateFab(); } catch(_) {}
  }
  function closePalette() {
    _paletteManualClose = true;
    var ov = document.getElementById('paletteOverlay');
    if (ov) ov.classList.add('hidden');
    var bg = document.querySelector('.app-body');
    if (bg) bg.classList.remove('blurred');
    try { updateFab(); } catch(_) {}
  }

  // ── Re-sync /onboarding/state and re-render (no page reload) ──────────────
  // Lets the checklist reflect a call/send made elsewhere in the app. Does NOT
  // force the modal open — only re-derives + repaints steps + the launcher.
  function refreshState() {
    var api = (_wpContext && _wpContext.api) || window.api;
    if (!api || !api.request || _refreshing) return;
    _refreshing = true;
    // Refresh BOTH onboarding state AND the phone-numbers snapshot. The snapshot was
    // taken once at boot and went stale, so deriveWelcomeState kept re-deriving an
    // earlier state (e.g. regressing to "activate your number" after the number was
    // already active) — which popped the setup banner back up on every send/call.
    Promise.all([
      api.request('GET', '/onboarding/state', null, { silent: true }).catch(function () { return null; }),
      api.request('GET', '/phone-numbers', null, { silent: true }).catch(function () { return null; })
    ]).then(function (rs) {
      var res = rs[0], nums = rs[1];
      if (nums && _wpContext) {
        var arr = Array.isArray(nums) ? nums : (nums.data || nums.numbers || null);
        if (Array.isArray(arr)) _wpContext.phoneNumbers = arr;
      }
      var st = (res && (res.data || res)) || (_wpContext && _wpContext.onboardingState) || null;
      if (st && _wpContext) {
        _wpContext.onboardingState = st;
        setState(deriveWelcomeState(_wpContext.phoneNumbers, st));
      }
    }).then(function () { _refreshing = false; }, function () { _refreshing = false; });
  }

  // ── Bottom-right setup launcher ──────────────────────────────────────────
  // Persistent "Setup · N/3" pill so the checklist can be re-opened any time
  // (previously the only way back was a full page reload). Auto-hides at 3/3
  // and while the modal itself is open.
  function ensureFab() {
    var fab = document.getElementById('wpSetupFab');
    if (fab) return fab;
    fab = document.createElement('button');
    fab.id = 'wpSetupFab';
    fab.type = 'button';
    fab.setAttribute('aria-label', 'Open setup checklist');
    fab.style.cssText = 'position:fixed;right:22px;bottom:22px;z-index:9998;display:none;align-items:center;gap:9px;height:44px;padding:0 17px 0 14px;border:0;border-radius:999px;background:var(--accent,#2563EB);color:#fff;font:600 13.5px/1 Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;letter-spacing:-.01em;cursor:pointer;box-shadow:0 6px 20px rgba(37,99,235,.34)';
    fab.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg><span id="wpSetupFabLabel">Finish setup</span>';
    fab.addEventListener('click', function () {
      var ov = document.getElementById('paletteOverlay');
      if (ov) { ov.classList.remove('hidden'); _paletteManualClose = false; }
      var bg = document.querySelector('.app-body'); if (bg) bg.classList.add('blurred');
      updateFab();
      refreshState();
    });
    document.body.appendChild(fab);
    return fab;
  }
  // Is anything currently covering the page that the launcher must NOT sit on
  // top of — the palette modal, the dialer dock, or any open popup/overlay?
  function _fabBlocked() {
    var ov = document.getElementById('paletteOverlay');
    if (ov && !ov.classList.contains('hidden')) return true;
    if (document.body.classList.contains('dock-open')) return true;
    // Hide the FAB whenever ANY popup/modal/sheet is open so it can never sit on
    // top of (and block taps to) its buttons — e.g. the registration wizard's
    // Continue button. Explicit known layers + a generic sweep for scrims/
    // backdrops/dialogs covers current and future overlays.
    var blockers = document.querySelectorAll(
      '.modal-overlay, .nc-overlay, [data-rsms-modal], #surveyOverlay, .wb-overlay,' +
      '.obw, .fb-pop, .bell-pop, #blast-modal.is-open,' +
      '[class*="-scrim"], [class*="-backdrop"], [role="dialog"]'
    );
    for (var i = 0; i < blockers.length; i++) {
      var el = blockers[i];
      if (el.hasAttribute('hidden')) continue;
      // NB: offsetParent is null for position:fixed overlays even when visible —
      // use computed display/visibility so fixed modals are detected.
      var cs = window.getComputedStyle(el);
      if (cs && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0') {
        var r = el.getBoundingClientRect();
        if (r.width > 40 && r.height > 40) return true;
      }
    }
    return false;
  }
  function updateFab() {
    var fab = ensureFab();
    var lbl = document.getElementById('wpSetupFabLabel');
    if (lbl) lbl.textContent = 'Setup · ' + _lastDone + '/3';
    // Show on EVERY tab while setup is incomplete (was home-only — Anton wanted
    // it reachable from anywhere). Full-screen surfaces that must NOT be covered
    // (the automation builder .wb-overlay, an open dialer dock, modals, the
    // palette itself) are excluded by _fabBlocked() instead of a blunt home gate.
    fab.style.display = (_lastDone < 3 && !_fabBlocked()) ? 'inline-flex' : 'none';
  }

  // ── Navigate to inbox + open compose modal ────────────────────────────
  function goSendText() {
    closePalette();
    if (window.__rsmsShowTab) window.__rsmsShowTab('inbox');
    // Open the New Conversation modal after the pane renders
    setTimeout(function() {
      if (window.__rsmsNcOpen) window.__rsmsNcOpen();
      else { var btn = document.getElementById('conv-newmsg'); if (btn) btn.click(); }
      // Pre-fill the To field with the user's own verified phone so they can text themselves
      setTimeout(function() {
        var toInput = document.getElementById('nc-to');
        if (!toInput) return;
        // Get user's personal phone from the auth data
        var userPhone = '';
        if (_wpContext && _wpContext.onboardingState && _wpContext.onboardingState.phone) {
          userPhone = _wpContext.onboardingState.phone;
        }
        if (userPhone) {
          toInput.value = userPhone;
          toInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, 200);
    }, 300);
  }

  // ── Navigate to dialer + open sidebar with user's number pre-filled ───
  function goOpenDialer() {

    closePalette();
    // First call (welcome step 3): DON'T navigate to the noisy Dialer tab. Open the
    // same dialer as a CENTERED modal over the current page so it's the clear focus.
    // Reuses #panel-dial (the real dialer) — we just re-anchor it via a class + add a
    // backdrop, then clean both up the moment the dialer closes.
    setTimeout(function() {
      if (window.__rsmsOpenDock) window.__rsmsOpenDock('dial');
      else { var db = document.querySelector('.rdock-btn[data-dock="dial"]'); if (db) db.click(); }
      var panel = document.getElementById('panel-dial');
      if (panel) {
        panel.classList.add('dial-onboard-centered');
        panel.style.top = '';   // openDock sets an inline top for the setup banner; clear it so the centered CSS (top:50%) wins
        var bd = document.getElementById('dial-onboard-backdrop');
        if (!bd) {
          bd = document.createElement('div'); bd.id = 'dial-onboard-backdrop';
          bd.addEventListener('click', function() { var x = panel.querySelector('[data-dock-close]'); if (x) x.click(); });
          document.body.appendChild(bd);
        }
        var obs = new MutationObserver(function() {
          if (!panel.hidden) return;
          panel.classList.remove('dial-onboard-centered');
          var b2 = document.getElementById('dial-onboard-backdrop'); if (b2 && b2.parentNode) b2.parentNode.removeChild(b2);
          obs.disconnect();
        });
        obs.observe(panel, { attributes: true, attributeFilter: ['hidden'] });
      }
      // Switch to Manual mode and select the Dialpad tab
      var manualBtn = document.querySelector('.dial-modeseg button[data-mode="manual"]');
      if (manualBtn) manualBtn.click();
      var dialpadTab = document.querySelector('.dial-st[data-dview="keypad"]');
      if (dialpadTab) dialpadTab.click();
      // Pre-fill the user's OTP-verified phone (not the provisioned number) so
      // step 3 = "call yourself" is ready to go. Poll for the keypad to mount —
      // the dock + keypad can take >200ms, and a single fixed delay silently
      // missed it (Anton: dialer didn't open with the number typed in).
      var _tries = 0;
      (function fillDialpad() {
        var userPhone = null;
        if (_wpContext && _wpContext.onboardingState && _wpContext.onboardingState.phone) {
          userPhone = _wpContext.onboardingState.phone.replace(/[^0-9]/g, '');
          if (userPhone.length === 11 && userPhone[0] === '1') userPhone = userPhone.slice(1);
        }
        if (!userPhone) return;
        var pad = document.getElementById('dial-pad');
        var firstKey = pad && pad.querySelector('[data-k="' + userPhone[0] + '"]');
        if (!firstKey) { if (_tries++ < 20) setTimeout(fillDialpad, 150); return; }
        for (var i = 0; i < userPhone.length; i++) {
          var key = pad.querySelector('[data-k="' + userPhone[i] + '"]');
          if (key) key.click();
        }
      })();
    }, 300);
  }

  // ── Banner CTA dispatch ────────────────────────────────────────────────
  function sbCtaClick() {

    var s = STATES[_currentState];
    if (!s) return;
    if (s.bannerCtaAction === 'dismiss') {
      // Slide banner up and dismiss permanently
      _bannerDismissed = true;
      var banner = document.getElementById('setupBanner');
      if (banner) {
        banner.classList.add('slide-up');
        banner.addEventListener('animationend', function() { banner.classList.add('hidden'); banner.classList.remove('slide-up'); }, { once: true });
      }
      if (_wpContext && _wpContext.api) _wpContext.api.request('POST', '/onboarding/dismiss-banner');
    }
    else if (s.bannerCtaAction === 'survey') openSurveyModal();
    else if (s.bannerCtaAction === 'activate') openActivateModal();
    else if (s.bannerCtaAction === 'toggle') togglePalette();
    else if (_currentState === 'no_number') openActivateModal();
    else if (_currentState === 'ready') {
      goSendText();
    }
    else if (_currentState === 'sent_text') {
      goOpenDialer();
    }
  }

  // ── Survey modal ───────────────────────────────────────────────────────
  function openSurveyModal() {
    if (_creditClaimed) return;
    document.getElementById('surveyOverlay').style.display = 'flex';
    // Show the survey ALONE — keep the post-onboarding palette hidden behind it
    // so the two overlays don't stack. The palette is revealed on close.
    _paletteManualClose = true;
    var _pal = document.getElementById('paletteOverlay');
    if (_pal) _pal.classList.add('hidden');
    _svStep = 1; _svTotalSteps = 6; _svUseCase = 'both';
    _svAnswers = {};
    ['svq1','svq2','svq3','svq4','svq5','svq6','svq7','svqDone'].forEach(function(id){ var el=document.getElementById(id); if(el) el.style.display = 'none'; });
    document.getElementById('svq1').style.display = '';
    ['svOtherWrap1','svOtherWrap2','svOtherWrap3'].forEach(function(id){ var el=document.getElementById(id); if(el) el.style.display='none'; });
    document.querySelectorAll('.sv-opt,.sv-opt-lg').forEach(function(b){ b.classList.remove('picked'); });
    // Reset dots: remove extra 7th dot if exists, show 6 base dots
    var d7 = document.getElementById('svd7'); if(d7) d7.remove();
    for(var i=1;i<=6;i++){var d=document.getElementById('svd'+i); if(d) d.style.display='';}
    var badgeWrap = document.querySelector('.sv-badge-wrap');
    if (badgeWrap) badgeWrap.style.display = '';
    var svTitle = document.getElementById('surveyOverlay').querySelector('.act-title');
    if (svTitle) svTitle.style.display = '';
    var subtitle = svTitle ? svTitle.nextElementSibling : null;
    if (subtitle && subtitle.tagName === 'P') subtitle.style.display = '';
    var svNav = document.querySelector('.sv-nav');
    if (svNav) svNav.style.display = '';
    updateSvDots();
  }
  function closeSurveyModal() {
    document.getElementById('surveyOverlay').style.display = 'none';
    // Survey done/closed — now reveal the post-onboarding palette (the 3-step
    // guide). If setState hasn't run yet (slow dashboard load), clearing the flag
    // lets it show the palette when it does.
    _paletteManualClose = false;
    if (_currentState && _currentState !== 'all_done') {
      var _pal = document.getElementById('paletteOverlay');
      if (_pal && _wpContext) {
        _pal.classList.remove('hidden');
        var _body = document.querySelector('.app-body');
        if (_body) _body.classList.add('blurred');
      }
    }
  }
  function updateSvDots() {
    var total = _svTotalSteps;
    var cur = _svStep;
    var start = Math.max(1, Math.min(cur - 1, total - 2));
    var end = Math.min(total, start + 2);
    for (var i=1;i<=7;i++) {
      var d = document.getElementById('svd'+i);
      if (!d) continue;
      d.classList.remove('on','done');
      if (i < 1 || i > total) { d.style.display = 'none'; continue; }
      if (i >= start && i <= end) {
        d.style.display = '';
        if (i < cur) d.classList.add('done');
        else if (i === cur) d.classList.add('on');
      } else {
        d.style.display = 'none';
      }
    }
    document.getElementById('svBack').style.visibility = _svStep > 1 ? 'visible' : 'hidden';
  }
  function svGoBack() {
    if (_svStep <= 1) return;
    document.getElementById('svq'+_svStep).style.display = 'none';
    _svStep--;
    document.getElementById('svq'+_svStep).style.display = '';
    updateSvDots();
  }
  function showOtherInput(q) {
    var qEl = document.getElementById('svq'+q);
    if(qEl) qEl.querySelectorAll('.sv-opt,.sv-opt-lg').forEach(function(b){b.classList.remove('picked');});
    var otherBtn = qEl ? qEl.querySelector('.sv-opt-other') : null;
    if(otherBtn) otherBtn.classList.add('picked');
    var wrap = document.getElementById('svOtherWrap'+q);
    if(wrap){
      wrap.style.display = '';
      var oi = wrap.querySelector('input');
      if(oi){ oi.focus(); oi.onkeydown = function(e){ if(e.key === 'Enter'){ e.preventDefault(); submitOther(); } }; }
    }
  }
  function submitOther() {
    // Capture the "other" text input value for the current question
    var wrap = document.getElementById('svOtherWrap' + _svStep);
    if (wrap) {
      var inp = wrap.querySelector('input');
      var answerKey = SV_KEYS[_svStep];
      if (inp && answerKey) _svAnswers[answerKey] = inp.value || 'other';
    }
    advanceSV();
  }
  function pickSV(q, btn, extra) {
    btn.parentElement.querySelectorAll('.sv-opt,.sv-opt-lg').forEach(function(b){ b.classList.remove('picked'); });
    btn.classList.add('picked');

    // Record answer
    var answerKey = SV_KEYS[q];
    if (answerKey) _svAnswers[answerKey] = extra || btn.textContent.trim();

    // Q4: SMS/Dialer/Both — determines volume questions
    if (q === 4 && extra) {
      _svUseCase = extra;
      var t = document.getElementById('svq6Title');
      var opts = document.getElementById('svq6Opts');
      if (_svUseCase === 'dialer') {
        _svTotalSteps = 6;
        // Rename Q6 to dialer volume and remap key
        SV_KEYS[6] = 'dialer_volume';
        if (t) t.textContent = 'How many calls do you plan to make per month?';
        if (opts) opts.innerHTML = '<button class="sv-opt">Under 500</button><button class="sv-opt">500 \u2013 2,000</button><button class="sv-opt">2,000 \u2013 10,000</button><button class="sv-opt">10,000+</button>';
        var d7 = document.getElementById('svd7'); if(d7) d7.remove();
      } else if (_svUseCase === 'both') {
        _svTotalSteps = 7;
        SV_KEYS[6] = 'sms_volume';
        if (t) t.textContent = 'How many texts do you plan to send per month?';
        if (opts) opts.innerHTML = '<button class="sv-opt">Less than 500</button><button class="sv-opt">500 \u2013 25,000</button><button class="sv-opt">25,000 \u2013 100,000</button><button class="sv-opt">100,000 \u2013 250,000</button><button class="sv-opt">250,000 \u2013 1,000,000</button><button class="sv-opt">1,000,000+</button>';
        if (!document.getElementById('svd7')) {
          var d7 = document.createElement('span'); d7.className='sv-dot'; d7.id='svd7';
          var prog = document.querySelector('.sv-progress');
          if (prog) prog.appendChild(d7);
        }
      } else {
        // sms only
        _svTotalSteps = 6;
        SV_KEYS[6] = 'sms_volume';
        if (t) t.textContent = 'How many texts do you plan to send per month?';
        if (opts) opts.innerHTML = '<button class="sv-opt">Less than 500</button><button class="sv-opt">500 \u2013 25,000</button><button class="sv-opt">25,000 \u2013 100,000</button><button class="sv-opt">100,000 \u2013 250,000</button><button class="sv-opt">250,000 \u2013 1,000,000</button><button class="sv-opt">1,000,000+</button>';
        var d7 = document.getElementById('svd7'); if(d7) d7.remove();
      }
    }
    setTimeout(function(){ advanceSV(); }, 350);
  }
  function advanceSV() {
    document.getElementById('svq'+_svStep).style.display = 'none';
    _svStep++;
    if (_svStep <= _svTotalSteps) {
      document.getElementById('svq'+_svStep).style.display = '';
      updateSvDots();
      // A step was just answered but the survey isn't finished — persist the
      // answers-so-far so a half-completed survey isn't lost if they bail.
      savePartialSurvey();
    } else {
      // Hide all chrome, show just the done screen
      var badgeWrap = document.querySelector('.sv-badge-wrap');
      if (badgeWrap) badgeWrap.style.display = 'none';
      var svTitle = document.getElementById('surveyOverlay').querySelector('.act-title');
      if (svTitle) svTitle.style.display = 'none';
      var subtitle = svTitle ? svTitle.nextElementSibling : null;
      if (subtitle && subtitle.tagName === 'P') subtitle.style.display = 'none';
      var svNav = document.querySelector('.sv-nav');
      if (svNav) svNav.style.display = 'none';
      for(var i=1;i<=7;i++){var d=document.getElementById('svd'+i);if(d)d.style.display='none';}
      document.getElementById('svqDone').style.display = '';
      _creditClaimed = true;
      // Re-render the banner for the CURRENT state instead of hard-setting
      // "Credit claimed". On a no_number account the banner CTA must stay the
      // actionable "Activate now \u2192"; only the provisioning state (whose CTA WAS
      // "Earn $5 credit") flips to "Credit claimed" (handled inside setState).
      if (_currentState) setState(_currentState);
      // Submit survey answers to backend
      submitSurvey();
    }
  }

  // ── Partial autosave ───────────────────────────────────────────────────
  // Save answers-so-far as the user progresses (fire-and-forget). partial:true
  // → the server persists the answers but does NOT grant the $5 or mark the
  // survey completed (credit_granted stays 0), so the survey still re-prompts
  // and the credit is claimable when they finish. Skips once the credit's been
  // claimed and when nothing's been answered yet.
  function savePartialSurvey() {
    if (_creditClaimed) return;
    if (!_svAnswers || !Object.keys(_svAnswers).length) return;
    var _api = (_wpContext && _wpContext.api) || window.api;
    if (!_api) return;
    var payload = { partial: true };
    for (var k in _svAnswers) { if (Object.prototype.hasOwnProperty.call(_svAnswers, k)) payload[k] = _svAnswers[k]; }
    try { _api.request('POST', '/onboarding/survey', payload).catch(function(){}); } catch (_) {}
  }

  // ── Survey API submit ──────────────────────────────────────────────────
  function submitSurvey() {
    // window.api fallback so the survey can submit even when it was opened EARLY
    // (before setupWelcomePalette set _wpContext from the slow dashboard load).
    var _api = (_wpContext && _wpContext.api) || window.api;
    if (!_api) return;
    _api.request('POST', '/onboarding/survey', _svAnswers).then(function() {
      // Update credit display in topbar
      var creditEl = document.querySelector('.credit-amt');
      if (creditEl) {
        var current = parseFloat(creditEl.textContent.replace('$','')) || 0;
        creditEl.textContent = '$' + (current + 5).toFixed(2);
      }
    }).catch(function(e) { console.error('Survey submit failed:', e); });
  }

  // ── Activate modal ─────────────────────────────────────────────────────
  function openActivateModal() {
    // Ensure the modal's handlers (area-code buttons + Search + input) are wired.
    // wireEventListeners() otherwise only runs via the welcome-survey path, so a
    // user who reaches this modal through "Buy a number" without ever triggering
    // the survey got a dead area-code picker (clicks/Search did nothing).
    if (!_wpWired) { try { wireEventListeners(); _wpWired = true; } catch (e) {} }
    var isRejected = _currentState === 'prov_rejected';
    _rejectMode = isRejected;
    document.getElementById('actOverlay').style.display = 'flex';
    if (isRejected) {
      document.getElementById('actStep1').querySelector('.act-eyebrow').textContent = 'Choose a new area code';
      document.getElementById('actStep1').querySelector('.act-sub').textContent = 'Your payment is already on file \u2014 just pick a new area code and we\u2019ll provision it immediately.';
      document.getElementById('actStep1Cta').textContent = 'Activate this number';
    } else {
      document.getElementById('actStep1').querySelector('.act-eyebrow').textContent = 'Step 1 of 2';
      document.getElementById('actStep1').querySelector('.act-sub').textContent = 'Tap an area code \u2014 we\u2019ll assign you a number instantly.';
      document.getElementById('actStep1Cta').textContent = 'Continue';
    }
    goActStep(1);
    // Pre-fill the area code the user already picked in onboarding (saved server-side
    // before they bailed on paying) — so a returning user just confirms + pays instead
    // of choosing again. Skip in reject mode (they're explicitly picking a NEW one).
    var savedAC = _wpContext && _wpContext.onboardingState && _wpContext.onboardingState.chosen_area_code;
    var didPrefill = false;
    if (!isRejected && savedAC && /^\d{3}$/.test(String(savedAC))) {
      var inp0 = document.getElementById('customACInput');
      if (inp0) {
        inp0.value = String(savedAC);
        try { pickCustomAC(); } catch (e) {}   // reveals the green "(ac) •••• Ready to activate" box
        didPrefill = true;
        // Close the typeahead dropdown that focusing/typing would open — otherwise a
        // "No matches" menu covers the reveal. Don't focus the input (focus reopens it).
        setTimeout(function(){ try { var m = document.querySelector('.area-code-ac-menu'); if (m) m.classList.remove('open'); } catch (e) {} }, 30);
      }
    }
    // Auto-focus the area-code field so typing lands without a click first — but NOT
    // when pre-filled (focus would reopen the typeahead over the revealed number).
    if (!didPrefill) setTimeout(function(){ var i = document.getElementById('customACInput'); if (i) i.focus(); }, 120);
  }
  try { window.__rsmsOpenActivate = openActivateModal; } catch (e) {}
  function closeActivateModal() {
    document.getElementById('actOverlay').style.display = 'none';
  }
  function goActStep(n) {
    document.getElementById('actStep1').style.display = n===1 ? '' : 'none';
    document.getElementById('actStep2').style.display = n===2 ? '' : 'none';
    if (n === 2) {
      mountStripeCard();
      var btn = document.getElementById('actActivateBtn');
      if (btn) { btn.disabled = true; btn.textContent = 'Activate — $5/mo'; }
    }
  }
  function pickAC(btn, ac) {
    selectedAC = ac;
    document.querySelectorAll('.ac-opt').forEach(function(b){ b.classList.remove('selected'); });
    btn.classList.add('selected');
    document.getElementById('nrNumberModal').textContent = '(' + ac + ') •••-••••';
    document.getElementById('nrResult').style.display = '';
    document.getElementById('actStep1Cta').disabled = false;
    document.getElementById('actACDisplay').textContent = ac;
  }
  function pickCustomAC() {
    var v = document.getElementById('customACInput').value.replace(/\D/g,'');
    var err = document.getElementById('acErr');
    // Reject made-up area codes (e.g. 111) — only real US/CA NPAs activate.
    var valid = v.length === 3 && (!window.isValidAreaCode || window.isValidAreaCode(v));
    if (!valid) {
      if (err) { err.textContent = v.length === 3 ? 'That’s not a valid US area code.' : 'Enter a 3-digit area code.'; err.style.display = ''; }
      document.getElementById('nrResult').style.display = 'none';
      document.getElementById('actStep1Cta').disabled = true;
      return;
    }
    if (err) err.style.display = 'none';
    document.querySelectorAll('.ac-opt').forEach(function(b){ b.classList.remove('selected'); });
    selectedAC = v;
    document.getElementById('nrNumberModal').textContent = '(' + v + ') •••-••••';
    document.getElementById('nrResult').style.display = '';
    document.getElementById('actStep1Cta').disabled = false;
    document.getElementById('actACDisplay').textContent = v;
  }

  // ── Stripe integration ─────────────────────────────────────────────────
  var _stripeInstance = null;
  var _stripeElement = null;
  var _stripeReady = false;

  function getStripeKey() {
    return (window.getBrandStripeKey && window.getBrandStripeKey()) ||
      'pk_live_51TAxu9QY4uZAjt2pTZzXTbEce5FbqgusvLnyPX8zaZHrn3Ih8Dq8oFIqjLtSyQdeD2kz3Z2dFvnsVanBkHzcebgR00f7v8CWNv';
  }

  function loadStripeJs(cb) {
    if (window.Stripe) { cb(); return; }
    var s = document.createElement('script');
    s.src = 'https://js.stripe.com/v3/';
    s.onload = cb;
    document.head.appendChild(s);
  }

  function mountStripeCard() {
    if (_stripeElement) {
      // Already created — just make sure it's mounted and focusable
      try { _stripeElement.focus(); } catch(e) {}
      return;
    }
    var mountEl = document.getElementById('actCardElement');
    if (!mountEl) return;
    // Show loading state until Stripe element is ready
    mountEl.innerHTML = '<div style="color:var(--faint);font-size:13px;text-align:center;padding:2px 0">Loading payment form\u2026</div>';
    loadStripeJs(function() {
      _stripeInstance = Stripe(getStripeKey());
      var elements = _stripeInstance.elements();
      _stripeElement = elements.create('card', {
        style: {
          base: {
            fontSize: '15px',
            fontFamily: 'Inter, -apple-system, sans-serif',
            color: '#0F172A',
            '::placeholder': { color: '#94A3B8' },
            iconColor: '#6F7287'
          },
          invalid: { color: '#EF4444' }
        },
        hidePostalCode: false
      });
      mountEl.innerHTML = '';
      _stripeElement.mount(mountEl);
      _stripeElement.on('ready', function() {
        mountEl.classList.add('stripe-ready');
      });
      _stripeElement.on('focus', function() { mountEl.classList.add('is-focused'); });
      _stripeElement.on('blur', function() { mountEl.classList.remove('is-focused'); });
      _stripeElement.on('change', function(ev) {
        _stripeReady = ev.complete;
        var btn = document.getElementById('actActivateBtn');
        if (btn) btn.disabled = !ev.complete;
        var errEl = document.getElementById('actCardError');
        if (errEl) errEl.textContent = (ev.error && ev.error.message) || '';
      });
    });
  }

  // ── Number activation (real API + Stripe) ─────────────────────────────
  function activateNumber() {
    if (!_wpContext || !_wpContext.api) return;
    var btn = document.getElementById('actActivateBtn');
    var errEl = document.getElementById('actCardError');
    if (errEl) errEl.textContent = '';

    if (!_stripeInstance || !_stripeElement) {
      if (errEl) errEl.textContent = 'Payment form not ready — try again.';
      return;
    }
    if (!_stripeReady) {
      if (errEl) errEl.textContent = 'Please enter your card details.';
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Processing…'; }

    _wpContext.api.request('POST', '/phone-numbers/checkout', { area_code: selectedAC })
      .then(function(res) {
        if (!res || !res.success) throw new Error((res && res.error) || 'Checkout failed');
        var d = res.data || res;
        // If card was already on file and charged
        if (d.charged === true) {
          return _wpContext.api.request('POST', '/phone-numbers/buy', {
            payment_intent_id: d.payment_intent_id,
            area_code: selectedAC
          });
        }
        // Need to confirm card payment with Stripe
        var clientSecret = d.client_secret;
        if (!clientSecret) throw new Error('Payment setup failed');
        return _stripeInstance.confirmCardPayment(clientSecret, {
          payment_method: { card: _stripeElement }
        }).then(function(result) {
          if (result.error) throw new Error(result.error.message || 'Card declined');
          return _wpContext.api.request('POST', '/phone-numbers/buy', {
            payment_intent_id: result.paymentIntent.id,
            area_code: selectedAC
          });
        });
      })
      .then(function(buyRes) {
        if (!buyRes || buyRes.success === false) throw new Error((buyRes && buyRes.error) || 'Could not provision number');
        closeActivateModal();
        setState('provisioning');
        startProvisioningPoll();
      })
      .catch(function(e) {
        console.error('Activate failed:', e);
        if (errEl) errEl.textContent = e.message || 'Failed to activate. Please try again.';
        if (btn) { btn.disabled = false; btn.textContent = 'Activate — $5/mo'; }
      });
  }

  // ── Reprovision (rejected number picks new area code) ──────────────────
  function reprovisionNumber() {
    if (!_wpContext || !_wpContext.api) return;
    var rejectedNum = (_wpContext.phoneNumbers || []).find(function(n) { return n.status === 'provider_rejected'; });
    if (!rejectedNum) return;
    _wpContext.api.request('POST', '/phone-numbers/' + rejectedNum.id + '/reprovision', { area_code: selectedAC })
      .then(function(res) {
        if (!res || res.success === false) throw new Error(res && res.message || 'Reprovision failed');
        closeActivateModal();
        setState('provisioning');
        startProvisioningPoll();
      })
      .catch(function(e) {
        console.error('Reprovision failed:', e);
        window.alertDialog('Failed to reprovision. Please try again.', { title: 'Reprovision failed' });
      });
  }

  // ── Provisioning poll ──────────────────────────────────────────────────
  function startProvisioningPoll() {
    stopProvisioningPoll();
    _pollInterval = setInterval(function() {
      if (!_wpContext || !_wpContext.api) return;
      _wpContext.api.request('GET', '/phone-numbers', null, { silent: true }).then(function(nums) {
        var arr = Array.isArray(nums) ? nums : (nums && nums.numbers) || [];
        if (nums && nums.data) arr = Array.isArray(nums.data) ? nums.data : arr;
        var active = arr.find(function(n) { return n.status === 'active'; });
        var rejected = arr.find(function(n) { return n.status === 'provider_rejected'; });
        if (active) {
          stopProvisioningPoll();
          _wpContext.phoneNumbers = arr;
          setState('ready');
        } else if (rejected) {
          stopProvisioningPoll();
          _wpContext.phoneNumbers = arr;
          setState('prov_rejected');
        }
      }).catch(function() {});
    }, 15000);
  }
  function stopProvisioningPoll() {
    if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null; }
  }

  // ── Provisioning countdown ─────────────────────────────────────────────
  // Continuous ELAPSED timer (counts UP from the number's created_at), shown in
  // BOTH provisioning AND prov_timeout so it NEVER looks frozen while a number is
  // still being sourced (Anton: "shouldn't this have a timer... they have no clue
  // what's going on" after 5-7 min).
  function startProvCountdown() {
    stopProvCountdown();
    updateProvDisplay();
    _provInterval = setInterval(updateProvDisplay, 1000);
  }
  function _provElapsedSec() {
    if (_wpContext && _wpContext.phoneNumbers) {
      var pending = _wpContext.phoneNumbers.find(function(n) { return n.status === 'pending_provisioning'; });
      if (pending && pending.created_at) return Math.max(0, Math.floor((Date.now() - new Date(pending.created_at).getTime()) / 1000));
    }
    return 0;
  }
  function stopProvCountdown() {
    if (_provInterval) { clearInterval(_provInterval); _provInterval = null; }
  }
  function _scheduleProvFloorLift() {
    if (_provFloorTimer) return;
    var ms = Math.max(0, _provFloorUntil - Date.now()) + 80;
    _provFloorTimer = setTimeout(function () {
      _provFloorTimer = null; _provFloorUntil = 0;
      var k = _provPendingRealKey; _provPendingRealKey = null;
      if (k) setState(k); else { try { refreshState(); } catch (e) {} }
    }, ms);
  }
  function updateProvDisplay() {
    // 60s "almost ready" floor — count DOWN so the user sees a clear window to do
    // the $5 survey (warm-pool activation is instant; this is the wait UX).
    if (_provFloorUntil && Date.now() < _provFloorUntil) {
      var left = Math.max(1, Math.ceil((_provFloorUntil - Date.now()) / 1000));
      var elc = document.getElementById('provCountdown');
      if (elc) elc.textContent = 'Almost ready… ' + left + 's';
      var s1c = document.getElementById('step1Desc');
      if (s1c) s1c.innerHTML = '<span class="dp-prov-status"><span class="dp-prov-dot"></span> Your number is almost ready — ' + left + 's</span>';
      return;
    }
    var elapsed = _provElapsedSec();
    // Past 4 min, flip to the "taking longer" banner/CTA \u2014 keep THIS interval ticking
    // (it keeps running in prov_timeout via the setState wiring).
    if (elapsed >= 240 && _currentState === 'provisioning') { setState('prov_timeout'); return; }
    // Do NOT show a climbing m:ss count-up \u2014 it reads as "stuck/slow" (Anton). Steady
    // calm status + the animated dot conveys progress. (Most activations are instant
    // from the warm pool; this only shows for a non-pooled code's fresh provision.)
    var el = document.getElementById('provCountdown');
    if (el) el.textContent = elapsed < 240 ? 'Setting up your number\u2026' : 'Still working \u2014 almost there';
    var s1d = document.getElementById('step1Desc');
    if (s1d) {
      var msg = elapsed < 240
        ? 'Setting up your number\u2026 this usually takes a moment.'
        : 'Still sourcing your number \u2014 hang tight, we\u2019ll text you the moment it\u2019s ready.';
      s1d.innerHTML = '<span class="dp-prov-status"><span class="dp-prov-dot"></span> ' + msg + '</span>';
    }
  }

  // ── wireEventListeners ─────────────────────────────────────────────────
  function wireEventListeners() {
    // Setup banner click -> toggle palette
    var banner = document.getElementById('setupBanner');
    if (banner) banner.addEventListener('click', function() { togglePalette(); });

    // Banner CTA click
    var sbCtaEl = document.getElementById('sbCta');

    if (sbCtaEl) sbCtaEl.addEventListener('click', function(e) { e.stopPropagation(); sbCtaClick(); });

    // Banner dismiss
    var sbDismiss = document.getElementById('sbDismiss');
    if (sbDismiss) sbDismiss.addEventListener('click', function(e) {
      e.stopPropagation();
      _bannerDismissed = true;
      document.getElementById('setupBanner').classList.add('hidden');
      if (_wpContext && _wpContext.api) _wpContext.api.request('POST', '/onboarding/dismiss-banner');
    });

    // Palette backdrop -> close
    var backdrop = document.querySelector('.palette-backdrop');
    if (backdrop) backdrop.addEventListener('click', closePalette);

    // Step clicks
    var step1 = document.getElementById('step1');
    if (step1) step1.addEventListener('click', function() {
      // While a number is being sourced/provisioned, DON'T re-open the area-code
      // chooser — we're already getting them a number (Anton: "why does it give
      // them the chooser like they can get a new number"). Only open it when not
      // started (no_number) or their pick was rejected (pick a new one free).
      if (_currentState === 'provisioning' || _currentState === 'prov_timeout') return;
      if (!this.classList.contains('done')) openActivateModal();
    });
    var step2 = document.getElementById('step2');
    if (step2) step2.addEventListener('click', function() {

      if (!this.classList.contains('done') && !this.classList.contains('locked') && !this.classList.contains('provisioning')) {
        goSendText();
      }
    });
    var step3 = document.getElementById('step3');
    if (step3) step3.addEventListener('click', function() {

      if (!this.classList.contains('done') && !this.classList.contains('locked') && !this.classList.contains('provisioning')) {
        goOpenDialer();
      }
    });

    // Main CTA
    var dpMainCta = document.getElementById('dpMainCta');

    if (dpMainCta) dpMainCta.addEventListener('click', function() {

      var s = STATES[_currentState];
      if (!s) return;
      if (s.ctaAction === 'activate') openActivateModal();
      else if (s.ctaAction === 'sms') { goSendText(); }
      else if (s.ctaAction === 'dialer') { goOpenDialer(); }
      else if (s.ctaAction === 'close') closePalette();
    });

    // Earn credit button
    var earnBtn = document.querySelector('.dp-earn-btn');
    if (earnBtn) earnBtn.addEventListener('click', openSurveyModal);

    // Survey modal close
    var svClose = document.querySelector('#surveyOverlay .act-close');
    if (svClose) svClose.addEventListener('click', closeSurveyModal);
    var svBackdrop = document.querySelector('#surveyOverlay .act-backdrop');
    if (svBackdrop) svBackdrop.addEventListener('click', closeSurveyModal);

    // Survey back button
    var svBackBtn = document.getElementById('svBack');
    if (svBackBtn) svBackBtn.addEventListener('click', svGoBack);

    // Survey option clicks — event delegation
    var surveyOverlay = document.getElementById('surveyOverlay');
    if (surveyOverlay) surveyOverlay.addEventListener('click', function(e) {
      var opt = e.target.closest('.sv-opt:not(.sv-opt-other)');
      if (opt) {
        var qEl = opt.closest('.sv-q');
        if (qEl) {
          var q = parseInt(qEl.id.replace('svq',''));
          // The survey markup carries data-sv-val (data-extra was never
          // rendered) — reading only data-extra left `extra` undefined, so
          // pickSV never configured the Q6/Q7 volume steps: dialer_volume was
          // unrecordable and use_case stored display text ("Both") instead of
          // the canonical sms/dialer/both.
          var extra = opt.getAttribute('data-extra') || opt.getAttribute('data-sv-val') || undefined;
          pickSV(q, opt, extra);
        }
        return;
      }
      var optLg = e.target.closest('.sv-opt-lg');
      if (optLg) {
        var qEl = optLg.closest('.sv-q');
        if (qEl) {
          var q = parseInt(qEl.id.replace('svq',''));
          var extra = optLg.getAttribute('data-extra') || optLg.getAttribute('data-sv-val') || undefined;
          pickSV(q, optLg, extra);
        }
        return;
      }
      var otherBtn = e.target.closest('.sv-opt-other');
      if (otherBtn) {
        var qEl = otherBtn.closest('.sv-q');
        if (qEl) {
          var q = parseInt(qEl.id.replace('svq',''));
          showOtherInput(q);
        }
        return;
      }
      var submitBtn = e.target.closest('.dp-earn-btn');
      if (submitBtn && submitBtn.closest('.sv-other-input')) {
        submitOther();
        return;
      }
      var doneBtn = e.target.closest('.sv-done-btn');
      if (doneBtn) {
        closeSurveyModal();
        return;
      }
    });

    // Activate modal close
    var actClose = document.querySelector('#actOverlay .act-close');
    if (actClose) actClose.addEventListener('click', closeActivateModal);
    var actBackdrop = document.querySelector('#actOverlay .act-backdrop');
    if (actBackdrop) actBackdrop.addEventListener('click', closeActivateModal);

    // Area code option clicks + search button — delegation on overlay
    var actOverlay = document.getElementById('actOverlay');
    if (actOverlay) actOverlay.addEventListener('click', function(e) {
      var acOpt = e.target.closest('.ac-opt');
      if (acOpt) {
        var acCode = acOpt.querySelector('.ac-code');
        if (acCode) pickAC(acOpt, acCode.textContent);
        return;
      }
      if (e.target.closest('.ac-search-btn')) {
        pickCustomAC();
      }
    });

    // Custom area code input — Enter key support
    var customACInp = document.getElementById('customACInput');
    if (customACInp) {
      customACInp.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          pickCustomAC();
          // If that left us with a valid, ready number, Enter advances to the next
          // step (same as clicking Continue) so the user doesn't have to reach for it.
          var cta = document.getElementById('actStep1Cta');
          if (cta && !cta.disabled) cta.click();
        }
      });
      // The area-code autocomplete fires 'change' when a suggestion is picked.
      customACInp.addEventListener('change', function() { pickCustomAC(); });
    }

    // Activate step 1 CTA
    var actStep1Cta = document.getElementById('actStep1Cta');
    if (actStep1Cta) actStep1Cta.addEventListener('click', function() {
      if (_rejectMode) {
        reprovisionNumber();
      } else {
        goActStep(2);
      }
    });

    // Activate step 2 button
    var activateBtn = document.querySelector('.act-activate-btn');
    if (activateBtn) activateBtn.addEventListener('click', function() {
      activateNumber();
    });

    // Back button in step 2
    var actBack = document.querySelector('.act-back');
    if (actBack) actBack.addEventListener('click', function() { goActStep(1); });

    // "Pick a new area code" link inside step1 desc (rejected state)
    document.addEventListener('click', function(e) {
      var gain = e.target.closest('#step1Desc .dp-gain');
      if (gain) openActivateModal();
    });
  }

  // ── setupWelcomePalette (main entry point) ─────────────────────────────
  function setupWelcomePalette(state, context) {
    _wpContext = context;

    // Check if onboarding state says survey was already completed
    if (context && context.onboardingState && context.onboardingState.survey_completed) {
      _creditClaimed = true;
    }

    // $5 "how did you hear" survey also fires for REGISTRANTS, not just new-signup
    // ?welcome=1 launches (Alex 2026-06-28: capture attribution from people who went
    // straight through 10DLC registration). Only when they've registered (has_10dlc)
    // and have NOT already completed it — so it never re-prompts a finisher. The
    // existing _tryWelcomeSurvey is one-shot and defers while there's no number, so
    // it still never reads as "$5 pays for the number".
    if (context && context.onboardingState
        && context.onboardingState.has_10dlc
        && !context.onboardingState.survey_completed) {
      _isWelcomeLaunch = true;
    }

    // Wire event listeners (only once)
    if (!_wpWired) {
      wireEventListeners();
      _wpWired = true;
      // Listen for first SMS send from the compose modal
      window.__rsmsOnFirstSend = function() {
        if (_currentState === 'ready') {
          setState('sent_text');
          var ov = document.getElementById('paletteOverlay');
          if (ov) { ov.classList.remove('hidden'); _paletteManualClose = false; }
        }
        // Backstop: re-sync from the server so it self-corrects even if the
        // optimistic guard above didn't match the current state.
        setTimeout(refreshState, 2500);
      };
      // Listen for first call from the dialer
      window.__rsmsOnFirstCall = function() {
        if (_currentState === 'sent_text') setState('all_done');
        // Re-open the palette so the rep SEES the call milestone tick over —
        // parity with first-send (Anton: "after the first call, shouldn't the
        // palette open again"). It was only updating the banner before.
        var ov = document.getElementById('paletteOverlay');
        if (ov) { ov.classList.remove('hidden'); _paletteManualClose = false; }
        // Backstop: the call's dialer_usage / dials row may write a beat after
        // this hook fires, so re-sync shortly after to flip step 3 from truth.
        setTimeout(refreshState, 3000);
      };
    }

    // Set initial state
    setState(state);

    // If provisioning, start poll
    if (state === 'provisioning') {
      startProvisioningPoll();
    }

    // Background re-sync so a call/send made elsewhere flips the checklist
    // without a page reload. Stops once setup is complete. Skips backgrounded
    // tabs to avoid needless polling.
    if (!_statePoll) {
      _statePoll = setInterval(function () {
        if (_currentState === 'all_done') { clearInterval(_statePoll); _statePoll = null; return; }
        if (typeof document !== 'undefined' && document.hidden) return;
        refreshState();
      }, 30000);
    }
    // Cheap DOM-only re-eval of the launcher so it hides/shows correctly as the
    // user switches tabs or opens/closes popups (no network). Stops at 3/3.
    if (!_fabTick) {
      _fabTick = setInterval(function () {
        try { updateFab(); } catch(_) {}
        if (_lastDone >= 3) { clearInterval(_fabTick); _fabTick = null; }
      }, 1000);
    }
    // INSTANT re-eval (don't wait for the 1s backstop): the dialer dock toggles
    // body.dock-open programmatically — a MutationObserver catches that the moment
    // it opens; a capture-phase click re-checks right after any tab/modal action.
    if (!_fabHooks) {
      _fabHooks = true;
      var nudge = function () { if (_lastDone < 3) { try { requestAnimationFrame(function () { try { updateFab(); } catch(_) {} }); } catch(_) { try { updateFab(); } catch(__) {} } } };
      document.addEventListener('click', nudge, true);
      try { new MutationObserver(function () { if (_lastDone < 3) { try { updateFab(); } catch(_) {} } })
        .observe(document.body, { attributes: true, attributeFilter: ['class'] }); } catch(_) {}
    }

    // Check ?welcome=1 to auto-open the welcome survey (use-case + "how many
    // texts/month") for users who just finished onboarding — INCLUDING those who
    // skipped the number/card step ("I'll do this later"). The volume answer
    // feeds the unregistered send-cap routing. Self-skips if already completed.
    _tryWelcomeSurvey(); // fallback if the early trigger didn't fire (one-shot)
  }

  // Open the welcome survey ASAP on ?welcome=1 — independent of the (slow)
  // dashboard data load, so it doesn't sit behind a ~5s skeleton. Wires the
  // survey listeners first (idempotent) since this can run before
  // setupWelcomePalette(). Self-skips if the survey credit was already claimed.
  function _tryWelcomeSurvey() {
    if (!_isWelcomeLaunch) return;
    if (!document.getElementById('surveyOverlay')) return; // DOM not parsed yet
    if (_creditClaimed) { _isWelcomeLaunch = false; return; }
    // Hold the $5 survey until the number is actually activated. Otherwise it
    // pops the instant onboarding finishes (state 'no_number') and reads as if
    // the $5 credit pays for the number. setState() re-calls this on every
    // transition, so it fires the moment they activate (-> provisioning/ready).
    if (_currentState === 'no_number') return; // defer; one-shot flag left intact
    _isWelcomeLaunch = false; // one-shot
    try { history.replaceState({}, '', location.pathname); } catch (e) {}
    if (!_wpWired) { try { wireEventListeners(); _wpWired = true; } catch (e) {} }
    openSurveyModal();
  }
  if (_isWelcomeLaunch) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _tryWelcomeSurvey);
    else _tryWelcomeSurvey();
  }

  // Robust banner → welcome-modal opener. The direct listener in wireEventListeners
  // only attaches when setupWelcomePalette() runs; on mobile Anton found tapping the
  // onboarding banner did nothing. This document-level delegate runs at script load
  // and always fires (immune to init timing / DOM re-renders). Excludes the CTA and
  // dismiss control, which have their own actions.
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (!t.closest('#setupBanner')) return;
    if (t.closest('#sbCta') || t.closest('#sbDismiss')) return;
    e.preventDefault();
    try { togglePalette(); } catch (_) {}
  });

  // ── Exports ────────────────────────────────────────────────────────────
  window.setupWelcomePalette = setupWelcomePalette;
  window.deriveWelcomeState = deriveWelcomeState;
})();
