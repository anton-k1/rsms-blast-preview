// ReadySMS Frontend API Client
const API_BASE = 'https://api.readysms.io';
// Dialer calls now route through the main ReadySMS backend (mounted at /dialer/*)
const DIALER_API_BASE = API_BASE;

// Storage keys. Impersonation tokens live in sessionStorage so they're scoped
// to a single tab and never clobber the admin's persistent localStorage
// session in other tabs. Admin tokens live in localStorage as before.
const TOKEN_KEY = 'readysms_token';
const IMPERSONATE_TOKEN_KEY = 'readysms_impersonate_token';

class ReadySMSApi {
  constructor() {
    // Per-tab impersonation token wins over the admin token. If this tab was
    // opened via ?impersonate=... the impersonate token is in sessionStorage
    // and we use it; other tabs of the same origin still see their own
    // localStorage admin token, untouched.
    //
    // CRITICAL: capture ?impersonate=<token> from the URL HERE, in the
    // constructor, BEFORE anything else reads a token. On the first load of an
    // impersonation tab the token lives only in the URL — it isn't in
    // sessionStorage yet (dashboard.js's initApp sets it later). Without this,
    // the constructor fell through to the admin's localStorage token, so the
    // session loaded as the ADMIN (e.g. anton@rts) instead of the impersonated
    // user, and early inline scripts that read storage directly did the same.
    let urlImp = null;
    try {
      urlImp = new URLSearchParams(window.location.search).get('impersonate');
      if (urlImp) sessionStorage.setItem(IMPERSONATE_TOKEN_KEY, urlImp);
    } catch (_) { /* no window/sessionStorage — ignore */ }

    const impTok = urlImp || sessionStorage.getItem(IMPERSONATE_TOKEN_KEY);
    if (impTok) {
      this.token = impTok;
      this.impersonating = true;
    } else {
      this.token = localStorage.getItem(TOKEN_KEY);
      this.impersonating = false;
    }
  }

  setToken(token) {
    this.token = token;
    // If we're already in an impersonation tab, route writes to sessionStorage
    // so refreshed-token responses don't clobber the admin's localStorage.
    if (this.impersonating) {
      sessionStorage.setItem(IMPERSONATE_TOKEN_KEY, token);
    } else {
      localStorage.setItem(TOKEN_KEY, token);
    }
  }

  // Used by app.html when this tab is opened via ?impersonate=<token>.
  // Stores the token in sessionStorage ONLY — never touches localStorage,
  // so the admin's session in other tabs is unaffected. Closing the tab
  // ends the impersonation automatically.
  setImpersonateToken(token) {
    this.token = token;
    this.impersonating = true;
    sessionStorage.setItem(IMPERSONATE_TOKEN_KEY, token);
  }

  clearToken() {
    this.token = null;
    this._swr = {};  // drop the SWR cache so the next session never sees prior-user data
    if (this.impersonating) {
      sessionStorage.removeItem(IMPERSONATE_TOKEN_KEY);
      this.impersonating = false;
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  isLoggedIn() {
    return !!this.token;
  }

  isImpersonating() {
    return !!this.impersonating;
  }

  // Cache the result for 30s so a burst of parallel 401s doesn't spam /auth/me.
  // Returns true if /auth/me confirms the token is still good, false if it's
  // really dead. On network error we return true (don't kick the user when
  // their connection blips).
  async verifyTokenStillValid() {
    const now = Date.now();
    if (this._lastVerifyAt && (now - this._lastVerifyAt) < 30 * 1000) {
      return this._lastVerifyResult;
    }
    if (!this.token) return false;
    // Hard 8s timeout. This runs inside request()'s 401 handler, so a hung
    // /auth/me (backend cold/stuck) would block EVERY caller awaiting that
    // request indefinitely — e.g. a settings card frozen on "Loading…". Abort
    // after 8s and fall through to the network-error branch (keep the user).
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(`${API_BASE}/auth/me`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.token}` },
        signal: ctrl.signal,
      });
      this._lastVerifyAt = now;
      // 401/403 = token genuinely rejected. Anything else (200, 5xx) = keep user.
      this._lastVerifyResult = !(r.status === 401 || r.status === 403);
      return this._lastVerifyResult;
    } catch (_) {
      // Network error or 8s timeout — assume token is fine, don't punish the user
      this._lastVerifyAt = now;
      this._lastVerifyResult = true;
      return true;
    } finally {
      clearTimeout(tid);
    }
  }

  async request(method, endpoint, body = null, opts = {}) {
    // opts.silent — skip the top loading bar. Use for background/polling calls
    // (e.g. Number Health's drift resync) so the bar doesn't keep trickling
    // after the page has already painted.
    const silent = !!opts.silent;
    // ── SWR cache (read) ── serve a fresh-enough cached copy INSTANTLY for
    // whitelisted collection GETs. Foreground reads only: background/poll calls
    // pass opts.silent and always hit the network (so they stay live), but they
    // still refresh the cache below for the next foreground read. opts.fresh bypasses.
    if (!this._swr) this._swr = {};
    const _swrCfg = (method === 'GET') ? this._swrMatch(endpoint, opts) : null;
    if (_swrCfg && !opts.fresh && !silent) {
      const _hit = this._swr[endpoint];
      if (_hit && (Date.now() - _hit.at) < _swrCfg.maxAge) {
        // getting stale (>1/3 of maxAge) → refresh in the background, non-blocking
        if ((Date.now() - _hit.at) > _swrCfg.maxAge / 3 && !_hit._rv) {
          _hit._rv = true;
          this.request(method, endpoint, body, Object.assign({}, opts, { silent: true })).catch(() => {});
        }
        if (typeof opts.onData === 'function') { try { opts.onData(_hit.data, { cached: true }); } catch (_) {} }
        return _hit.data;
      }
    }
    // ── In-flight coalescing ── The dashboard boot fires the SAME collection GET
    // from many independent widgets within a few ms (measured: /contacts/tags ×6,
    // and nearly every endpoint ×2, all inside <16ms). The SWR cache above can't
    // help — none have RESOLVED yet — so all N hit the network and hammer the
    // 2-instance pool, which is the bulk of the ~11s cold dashboard load. Merge
    // concurrent identical GETs into ONE network request. GET-only, no body, and
    // skipped when the caller wants its own callback/fresh copy (opts.onData /
    // opts.fresh). The entry is cleared the instant it settles, so this only ever
    // merges truly-overlapping calls — it never serves a stale value.
    if (method === 'GET' && !body && !opts.onData && !opts.fresh) {
      if (!this._inflight) this._inflight = {};
      const _ifKey = endpoint;
      if (this._inflight[_ifKey]) return this._inflight[_ifKey];
      const _p = this._networkRequest(method, endpoint, body, opts, _swrCfg, silent);
      this._inflight[_ifKey] = _p;
      _p.finally(() => { if (this._inflight[_ifKey] === _p) delete this._inflight[_ifKey]; });
      return _p;
    }
    return this._networkRequest(method, endpoint, body, opts, _swrCfg, silent);
  }

  // Network + retry + parse + SWR-write for a single request. Split out of
  // request() so request() can coalesce concurrent identical GETs into ONE call
  // of this (see the comment there).
  async _networkRequest(method, endpoint, body, opts, _swrCfg, silent) {
    if (!silent && window._topBar) window._topBar.start();
    try {
      const controller = new AbortController();
      // Per-endpoint timeout. /conversations and /contacts can take 20-30s
      // on cold-buffer reads against large tables (user 3 has 436K
      // conversations; bigger accounts have multiples of that). The
      // previous 30s timeout caught these cold faults right at the edge
      // and produced the "blank inbox for 60s" report — frontend aborted,
      // empty state rendered, then the next 30s auto-refresh poll caught
      // the now-warm query. Bumping to 60s gives the backend headroom;
      // the backend ALSO added an SWR cache + login-time prewarm so this
      // ceiling shouldn't normally matter.
      // The usage-report AI endpoints (/reports/ai-count, /reports/ai-chat) run a
      // DB-heavy metrics scan plus one or two Haiku calls — 8-18s warm, more on a
      // cold cache. They're POSTs, so they need the long budget explicitly or the
      // 30s default aborts a cold call and the UI shows "couldn't read that".
      const isLongRead = (method === 'GET' && (
        endpoint.startsWith('/conversations') ||
        endpoint.startsWith('/contacts')
      )) || endpoint.startsWith('/reports/ai-');
      const timeoutMs = isLongRead ? 60000 : 30000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        cache: 'no-store',
      };

      if (this.token) {
        options.headers['Authorization'] = `Bearer ${this.token}`;
      }

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE')) {
        options.body = JSON.stringify(body);
      }

      // Auto-retry on transient network failures (server down briefly during
      // Railway redeploys, pool saturation hiccup, mobile-network dropout).
      // 2 retries with 600ms/1500ms backoff covers a ~2s blip without the user
      // noticing. Legitimate API errors (401/403/4xx with response) are NOT
      // retried — only `fetch threw` cases (no response at all).
      let response;
      let lastErr;
      for (let attempt = 0; attempt <= 2; attempt++) {
        try {
          response = await fetch(`${API_BASE}${endpoint}`, options);
          lastErr = null;
          break;
        } catch (networkErr) {
          lastErr = networkErr;
          const isTimeout = networkErr.name === 'AbortError';
          if (isTimeout || attempt === 2) break; // timeouts don't benefit from retry; last attempt fails through
          const delayMs = attempt === 0 ? 600 : 1500;
          console.warn(`[api] network error on ${endpoint} (attempt ${attempt + 1}/3), retrying in ${delayMs}ms: ${networkErr.message}`);
          await new Promise(r => setTimeout(r, delayMs));
        }
      }
      if (lastErr) {
        clearTimeout(timeoutId);
        const isTimeout = lastErr.name === 'AbortError';
        console.warn('[api] ' + (isTimeout ? 'TIMEOUT' : 'network error after retries') + ' on', endpoint, lastErr.message);
        return { success: false, error: isTimeout ? 'timeout' : 'network_error', message: isTimeout ? 'Request timed out — server may be slow.' : 'Connection error. Please try again.' };
      }
      clearTimeout(timeoutId);

      // Auto-save refreshed token if backend sends one
      const refreshedToken = response.headers.get('X-Refreshed-Token');
      if (refreshedToken) {
        this.setToken(refreshedToken);
      }

      if (response.status === 401 && !endpoint.startsWith('/auth/')) {
        // Don't blindly wipe the token on a single 401 — that's how users get
        // signed out after PC sleep / Railway cold start / a single buggy
        // endpoint. Verify the token is actually dead by calling /auth/me;
        // only if THAT also returns 401 do we treat the session as expired.
        const stillValid = await this.verifyTokenStillValid();
        if (stillValid) {
          // The original endpoint's 401 was transient (server bug, race,
          // cold start). Bubble the error up like any other failure but
          // keep the user signed in.
          return { success: false, error: 'auth_transient', message: 'Auth check failed for this request — please retry.' };
        }
        const wasImpersonating = this.impersonating;
        this.clearToken();
        if (!wasImpersonating) {
          localStorage.removeItem('readysms_user_id');
        }
        window.top.void 0 /*preview:no-login*/;
        return;
      }

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        // Server returned non-JSON (HTML error page, etc.) — treat as network error
        console.warn('[api] non-JSON response on', endpoint, response.status);
        return { success: false, error: 'network_error', message: 'Server error. Please try again.' };
      }

      // ── SWR cache (write + auto-invalidate) ──
      if (_swrCfg && data && data.success !== false) {
        this._swr[endpoint] = { at: Date.now(), data: data };
        if (typeof opts.onData === 'function' && !silent) { try { opts.onData(data, { cached: false }); } catch (_) {} }
      } else if (method !== 'GET' && data && data.success !== false) {
        this._swrInvalidate(endpoint);  // a write to /X clears cached /X reads
      }
      return data;
    } finally {
      if (!silent && window._topBar) window._topBar.done();
    }
  }

  // ── SWR helpers (see request) ── whitelist of read-heavy collection GETs
  // where a few seconds of staleness is fine. Extend cautiously: any endpoint a
  // poll relies on must be polled with opts.silent so it keeps hitting the network.
  _swrMatch(endpoint, opts) {
    if (opts && opts.swr) return { maxAge: (typeof opts.swr === 'number') ? opts.swr : 20000 };
    const path = String(endpoint).split('?')[0];
    const list = this._swrWhitelist || (this._swrWhitelist = [
      { path: '/phone-numbers', maxAge: 30000 },
      { path: '/contacts', maxAge: 15000 },
      { path: '/lists', maxAge: 30000 },
      { path: '/drip-sequences', maxAge: 20000 },
      { path: '/automations', maxAge: 30000 },
    ]);
    for (let i = 0; i < list.length; i++) { if (path === list[i].path) return { maxAge: list[i].maxAge }; }
    return null;
  }
  _swrInvalidate(endpoint) {
    if (!this._swr) return;
    const res = '/' + (String(endpoint).split('?')[0].split('/')[1] || '');
    if (res === '/') return;
    for (const k of Object.keys(this._swr)) { const kp = k.split('?')[0]; if (kp === res || kp.indexOf(res + '/') === 0) delete this._swr[k]; }
  }
  invalidate(prefix) { if (!this._swr) return; for (const k of Object.keys(this._swr)) { if (k.indexOf(prefix) === 0) delete this._swr[k]; } }

  // ============== Dialer (wholesale-dialer-backend) ==============
  // "Book a call with your account manager" (CSM) link — configurable backend-side.
  async getCsmBookingLink() {
    try { const r = await this.request('GET', '/public/csm-booking'); return (r && r.link) || ''; }
    catch (e) { return ''; }
  }

  // Mirrors request() but hits the dialer service. Same Bearer token, same
  // error envelope. Used by admin-dialer.js for the Sales Dialer tab.
  async requestDialer(method, endpoint, body = null) {
    // Ensure all dialer endpoints are prefixed with /dialer since the ReadySMS
    // backend mounts dialer routes at /dialer/*. Endpoints that already start
    // with /dialer (e.g. /dialer/webrtc-token) are left as-is.
    const resolvedEndpoint = endpoint.startsWith('/dialer') ? endpoint : `/dialer${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'readysms_signup',
      },
      signal: controller.signal,
    };

    if (this.token) {
      options.headers['Authorization'] = `Bearer ${this.token}`;
    }

    // If the admin Dialer tab has bootstrapped a ReadySMS Sales org membership,
    // send X-Org-Id so the dialer's existing orgContext middleware resolves to
    // the correct org. Works even on stale dialer deploys (pre-X-Source).
    const orgIdHint = (typeof window !== 'undefined' && window.__readysmsDialerOrgId)
      || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('readysms_dialer_org_id'));
    if (orgIdHint) {
      options.headers['X-Org-Id'] = String(orgIdHint);
    }

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE')) {
      options.body = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(`${API_BASE}${resolvedEndpoint}`, options);
    } catch (networkErr) {
      clearTimeout(timeoutId);
      const isAbort = networkErr.name === 'AbortError';
      console.warn('[api] dialer ' + (isAbort ? 'TIMEOUT' : 'network error') + ' on', resolvedEndpoint, networkErr.message);
      return { success: false, error: isAbort ? 'timeout' : 'network_error', message: isAbort ? 'Dialer request timed out (15s) — backend hung or unreachable' : 'Connection error: ' + networkErr.message };
    }
    clearTimeout(timeoutId);

    // Honor refreshed-token header from dialer too (shared JWT secret)
    const refreshedToken = response.headers.get('X-Refreshed-Token');
    if (refreshedToken) {
      this.setToken(refreshedToken);
    }

    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      console.warn('[api] dialer non-JSON response on', resolvedEndpoint, response.status);
      return { success: false, error: 'parse_error', status: response.status, message: 'Dialer returned non-JSON (HTTP ' + response.status + ')' };
    }

    if (!response.ok) {
      console.warn('[api] dialer HTTP', response.status, 'on', resolvedEndpoint, data);
      return { success: false, error: data.error || 'http_' + response.status, status: response.status, message: data.message || data.error || ('HTTP ' + response.status) };
    }

    return data;
  }

  // ============== Auth ==============
  // Passwordless email-code auth — see backend routes/auth.js
  async requestLoginCode(email, extra = {}) {
    return this.request('POST', '/auth/request-code', { email, ...extra });
  }

  async verifyLoginCode(email, code, extra = {}) {
    const result = await this.request('POST', '/auth/verify-code', { email, code, ...extra });
    if (result && result.success && result.data && result.data.token) {
      this.setToken(result.data.token);
    }
    return result;
  }

  // Phone sign-in (existing accounts only — anti-enumeration generic response).
  async requestSmsLoginCode(phone, extra = {}) {
    return this.request('POST', '/auth/request-sms-code', { phone, ...extra });
  }

  async verifySmsLoginCode(phone, code, extra = {}) {
    const result = await this.request('POST', '/auth/verify-sms-code', { phone, code, ...extra });
    if (result && result.success && result.data && result.data.token) {
      this.setToken(result.data.token);
    }
    return result;
  }

  // Second leg of phone sign-in when one verified number is shared by several
  // accounts: exchange the short-lived select_token + chosen account id for a
  // real session token.
  async selectAccount(selectToken, userId) {
    const result = await this.request('POST', '/auth/select-account', { select_token: selectToken, user_id: userId });
    if (result && result.success && result.data && result.data.token) {
      this.setToken(result.data.token);
    }
    return result;
  }

  async getMe() {
    return this.request('GET', '/auth/me');
  }

  async googleSignIn(credential, allowSignup = false, extra = {}) {
    const body = { credential, ...extra };
    if (allowSignup) body.allow_signup = true;
    const result = await this.request('POST', '/auth/google', body);
    if (result && result.success) this.setToken(result.data.token);
    return result;
  }

  logout() {
    // Capture mode before clearToken flips the flag.
    const wasImpersonating = this.impersonating;
    this.clearToken();
    // Wipe all user-specific cached data so the next login starts fresh
    // and doesn't flash the previous account's UI.
    if (!wasImpersonating) {
      const keep = [
        'readysms_parent_token', 'readysms_parent_user_id',
        // Preserve Ready Ralph onboarding progress across login/logout
        'rs_ralph_clicked_actions', 'rs_ralph_state_cache', 'rs_ralph_seen',
        'rs_ralph_banner_dismissed', 'rs_ralph_reset_seen_at',
        'plg_first_send_seen', 'readysms_brand_wizard_skipped',
      ];
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
      keys.forEach(k => { if (!keep.includes(k)) localStorage.removeItem(k); });
    }
    window.top.void 0 /*preview:no-login*/;
  }

  async savePhone(phone) {
    return this.request('POST', '/auth/save-phone', { phone });
  }

  // Update profile fields. Backend (PUT /auth/profile) accepts:
  //   first_name, last_name, phone, company_name, timezone, email_10dlc_updates
  // Extra fields like `industry` are forwarded for forward-compat — backend
  // silently ignores unknown fields today; once the column lands they'll persist.
  async saveProfile(data) {
    return this.request('PUT', '/auth/profile', data);
  }

  // ============== SMS ==============
  async sendSMS(to, message, fromPhoneNumberId, conversationId, quotedMessageId) {
    const body = { to, message, from_phone_number_id: fromPhoneNumberId };
    if (conversationId) body.conversation_id = conversationId;
    if (quotedMessageId) body.quoted_message_id = quotedMessageId;
    return this.request('POST', '/sms/send', body);
  }

  async getMessageLogs(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request('GET', `/sms/logs?${params}`);
  }

  async getMessageLogFilters() {
    return this.request('GET', '/sms/logs/filters');
  }

  async deleteMessage(id) {
    return this.request('DELETE', `/messages/${id}`);
  }

  async bulkDeleteMessages(ids) {
    return this.request('POST', '/messages/bulk-delete', { ids });
  }

  async clearChatHistory(contactId) {
    return this.request('DELETE', `/conversations/by-contact/${contactId}`);
  }

  async diagnoseCampaign(id) {
    return this.request('GET', `/campaigns/${id}/diagnose`);
  }

  // Per-blast carrier breakdown + top 5 errors with plain-English explanations.
  // Backend: routes/campaigns.js GET /:id/breakdown
  async getCampaignBreakdown(id) {
    return this.request('GET', `/campaigns/${id}/breakdown`);
  }

  async requestCampaignHelp(id, note = '') {
    return this.request('POST', `/campaigns/${id}/request-help`, { note });
  }

  // ============== Delivery analytics (customer-scoped) ==============

  // Headline delivery dashboard for the authenticated user. Filter shape:
  //   { provider?, carrier?, days?, since?, until?,
  //     compare_to_days?, compare_to_since?, compare_to_until?,
  //     aggregate_only? }
  // Backend: routes/sms.js GET /sms/my-delivery-rate
  async getMyDeliveryRate(filters = {}) {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return this.request('GET', `/sms/my-delivery-rate${params ? `?${params}` : ''}`);
  }

  // Per-number deliverability page: 24h/7d/30d delivery rate scoped to one
  // phone, 7d carrier breakdown, top 5 errors.
  // Backend: routes/phone-numbers.js GET /phone-numbers/:id/deliverability
  async getPhoneDeliverability(phoneId) {
    return this.request('GET', `/phone-numbers/${phoneId}/deliverability`);
  }

  // ============== In-app notifications ==============

  // Backend: routes/sms.js GET /sms/notifications
  async getNotifications({ unreadOnly = false, limit = 20 } = {}) {
    const params = new URLSearchParams();
    if (unreadOnly) params.set('unread_only', '1');
    if (limit) params.set('limit', String(limit));
    return this.request('GET', `/sms/notifications?${params.toString()}`);
  }

  async markNotificationRead(id) {
    return this.request('POST', `/sms/notifications/${id}/read`);
  }

  async markAllNotificationsRead() {
    return this.request('POST', `/sms/notifications/read-all`);
  }

  // ============== Contacts ==============
  async getContacts(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request('GET', `/contacts?${params}`);
  }

  async createContact(data) {
    return this.request('POST', '/contacts', data);
  }

  async updateContact(id, data) {
    return this.request('PUT', `/contacts/${id}`, data);
  }

  async getContactTimeline(id, page) {
    return this.request('GET', `/contacts/${id}/timeline` + (page ? '?page=' + page : ''));
  }

  async getContact(id) {
    return this.request('GET', `/contacts/${id}`);
  }

  async getTenDlcStatus(live) {
    // live=true → server does a targeted Infobip status sync first, so a freshly
    // approved registration reflects in seconds (used by the in-review poll).
    return this.request('GET', '/10dlc/status' + (live ? '?live=1' : ''));
  }

  async scrubContacts() {
    return this.request('POST', '/contacts/scrub');
  }

  // ============== Billing ==============
  // Single-flight: dashboard boot fires getBalance() from ~4 different
  // code paths (topbar load, billing view open, header refresh, sandbox
  // status). They were landing as concurrent /billing/balance requests
  // (network trace showed 2× 3.19s on the billing page). One in-flight
  // promise is now shared between them. No TTL — once it resolves the
  // next call starts fresh, so we never serve stale.
  async getBalance() {
    if (this._balancePromise) return this._balancePromise;
    this._balancePromise = (async () => {
      try {
        // silent: the credit badge has its own "$…" placeholder and reconciles
        // when this lands — it must never hold the global top loading bar
        // (this aggregate runs 3-4s on heavy accounts and was a big chunk of
        // the ~17s first-load bar).
        return await this.request('GET', '/billing/balance', null, { silent: true });
      } finally {
        this._balancePromise = null;
      }
    })();
    return this._balancePromise;
  }

  async getTransactions(limit = 20, offset = 0, opts) {
    if (opts) {
      if (opts.days && !opts.from) {
        var d = new Date();
        d.setDate(d.getDate() - opts.days);
        opts.from = d.toISOString().split('T')[0];
      }
      if (opts.since && !opts.from) {
        opts.from = opts.since;
      }
    }
    var qs = 'limit=' + limit + '&offset=' + offset;
    if (opts && opts.from) qs += '&from=' + encodeURIComponent(opts.from);
    if (opts && opts.to)   qs += '&to='   + encodeURIComponent(opts.to);
    return this.request('GET', '/billing/transactions?' + qs);
  }

  async purchaseCredits(credits, carrierAmount) {
    var body = { credits: credits };
    if (carrierAmount) body.carrier_amount = carrierAmount;
    return this.request('POST', '/billing/purchase', body);
  }

  async updateAutoRebill(settings) {
    return this.request('PUT', '/billing/auto-rebill', settings);
  }

  async getPricing() {
    return this.request('GET', '/billing/pricing');
  }

  // Monthly volume-commitment plans removed (feature retired 2026-06-23).

  // ============== Conversations ==============
  async getConversations(limit = 50, offset = 0, search = '', filter = '', tags = '', tagMode = 'or', extraFilters = {}) {
    const params = new URLSearchParams({ limit, offset });
    if (search) params.set('search', search);
    if (filter) params.set('filter', filter);
    if (tags) { params.set('tag', tags); params.set('tag_mode', tagMode); }
    // Forward every extra filter key generically so new filters (the
    // layerable filter panel) flow through without per-key edits here. Skip
    // empty/null/undefined values and the tag keys already handled above.
    if (extraFilters && typeof extraFilters === 'object') {
      for (const k of Object.keys(extraFilters)) {
        if (k === 'tag' || k === 'tag_mode') continue;
        const v = extraFilters[k];
        if (v === undefined || v === null || v === '') continue;
        params.set(k, v);
      }
    }
    return this.request('GET', `/conversations?${params}`);
  }

  async getConversationTagCounts(categories) {
    // categories: [{key, tags, mode}]
    return this.request('GET', `/conversations/tag-counts?categories=${encodeURIComponent(JSON.stringify(categories))}`);
  }

  async getConversationMessages(id, limit = 50) {
    return this.request('GET', `/conversations/${id}/messages?limit=${limit}`);
  }

  // Dialer call history for a contact, merged into the inbox thread as call cards.
  async getContactCalls(contactId) {
    return this.request('GET', `/conversations/by-contact/${contactId}/calls`, null, { swr: 30000 });
  }

  async assignConversation(id, assignedTo) {
    return this.request('PUT', `/conversations/${id}/assign`, { assigned_to: assignedTo });
  }

  async bulkMarkRead(conversationIds) {
    return this.request('PUT', '/conversations/bulk-read', { conversation_ids: conversationIds });
  }

  async markAllRead() {
    return this.request('PUT', '/conversations/mark-all-read');
  }

  async togglePinConversation(id) {
    return this.request('PUT', `/conversations/${id}/pin`);
  }

  async archiveConversation(id) {
    return this.request('PUT', `/conversations/${id}/archive`);
  }

  async unarchiveConversation(id) {
    return this.request('PUT', `/conversations/${id}/unarchive`);
  }

  // Snooze a conversation until `snoozedUntil` (a Date or ISO string); it leaves
  // the inbox and auto-resurfaces (marked unread) when that time passes.
  async snoozeConversation(id, snoozedUntil) {
    var iso = (snoozedUntil && snoozedUntil.toISOString) ? snoozedUntil.toISOString() : snoozedUntil;
    return this.request('PUT', `/conversations/${id}/snooze`, { snoozed_until: iso });
  }
  async unsnoozeConversation(id) {
    return this.request('PUT', `/conversations/${id}/unsnooze`);
  }

  async bulkArchiveConversations(conversationIds) {
    return this.request('PUT', '/conversations/bulk-archive', { conversation_ids: conversationIds });
  }

  async autoArchiveConversations(days) {
    return this.request('POST', '/conversations/auto-archive', { days });
  }

  // ============== Chat Categories ==============
  async getChatCategories() {
    return this.request('GET', '/conversations/chat-categories');
  }

  async saveChatCategories(categories) {
    return this.request('PUT', '/conversations/chat-categories', { categories });
  }

  async moveConversationToCategory(conversationId, tag, clearTags) {
    return this.request('PUT', `/conversations/${conversationId}/category`, { tag, clear_tags: clearTags });
  }

  // Shared helper — robust file-download from a fetch Response.
  // Bugs this fixes vs. the previous inline version:
  //  1. Appends the anchor to <body> before .click(). A detached anchor
  //     silently no-ops in Firefox + several Safari versions, which was
  //     the root cause of "export not working" on those browsers.
  //  2. Surfaces server errors instead of downloading a 401/500 JSON body
  //     as a fake CSV named "conversation_export.csv".
  //  3. Defers URL.revokeObjectURL via setTimeout so it doesn't race the
  //     browser's download initialization.
  //  4. Robust filename parsing — handles quoted, unquoted, and
  //     RFC 5987 (filename*=UTF-8''...) variants.
  async _downloadResponseAsFile(response, fallbackName) {
    if (!response.ok) {
      let errMsg = `Export failed (HTTP ${response.status})`;
      try {
        const text = await response.text();
        try { const j = JSON.parse(text); if (j.error || j.message) errMsg = j.error || j.message; }
        catch (_) { if (text) errMsg = text.slice(0, 200); }
      } catch (_) {}
      throw new Error(errMsg);
    }
    const blob = await response.blob();
    if (!blob || blob.size === 0) throw new Error('Export returned no data');

    // Parse Content-Disposition: prefer RFC 5987 filename* > filename="..." > filename=...
    const cd = response.headers.get('Content-Disposition') || '';
    let filename = fallbackName;
    const star = cd.match(/filename\*\s*=\s*(?:UTF-8|utf-8)''([^;\r\n]+)/i);
    const quoted = cd.match(/filename\s*=\s*"([^"]+)"/i);
    const bare = cd.match(/filename\s*=\s*([^;\r\n"]+)/i);
    if (star) { try { filename = decodeURIComponent(star[1]); } catch (_) { filename = star[1]; } }
    else if (quoted) filename = quoted[1];
    else if (bare) filename = bare[1].trim();

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // Tiny delay so the browser can hand the URL off to the download manager
    // before we revoke it (race seen on Safari + Firefox).
    setTimeout(() => {
      try { document.body.removeChild(a); } catch (_) {}
      try { URL.revokeObjectURL(url); } catch (_) {}
    }, 200);
    return { success: true, filename };
  }

  async exportConversation(id, format = 'csv') {
    const response = await fetch(`${API_BASE}/conversations/${id}/export?format=${format}`, {
      headers: { 'Authorization': `Bearer ${this.token}` },
    });
    if (format === 'json') {
      if (!response.ok) throw new Error(`Export failed (HTTP ${response.status})`);
      return response.json();
    }
    return this._downloadResponseAsFile(response, `conversation_export.${format}`);
  }

  async bulkExportConversations(conversationIds, all = false, format = 'csv') {
    const response = await fetch(`${API_BASE}/conversations/bulk-export?format=${format}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify({ conversation_ids: conversationIds, all }),
    });
    if (format === 'json') {
      if (!response.ok) throw new Error(`Bulk export failed (HTTP ${response.status})`);
      return response.json();
    }
    return this._downloadResponseAsFile(response, `conversations_export.${format}`);
  }

  // Export CONTACTS matching the given CRM filters straight from the server
  // (GET /contacts/export) — used by the bulk "Export" action when the user
  // chose "Select all N matching", so the CSV covers every match, not just the
  // 50 rows rendered on the current page. `filters` mirrors the list query
  // (tag/status/assigned_to/drip_sequence_id/search/etc.).
  async exportContacts(filters = {}) {
    const qs = Object.keys(filters)
      .filter((k) => filters[k] != null && filters[k] !== '')
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(filters[k])}`)
      .join('&');
    const response = await fetch(`${API_BASE}/contacts/export${qs ? `?${qs}` : ''}`, {
      headers: { 'Authorization': `Bearer ${this.token}` },
    });
    return this._downloadResponseAsFile(response, 'contacts_export.csv');
  }

  // ============== Campaigns ==============
  async getCampaigns() {
    return this.request('GET', '/campaigns');
  }

  // One-off scheduled SMS (composer "Schedule" from inbox/CRM) — a separate
  // store from campaign blasts. Powers the Blasts → Scheduled tab's one-off rows.
  async getScheduledSms() {
    return this.request('GET', '/sms/scheduled');
  }
  async cancelScheduledSms(id) {
    return this.request('DELETE', '/sms/schedule/' + encodeURIComponent(id));
  }

  async createCampaign(data) {
    return this.request('POST', '/campaigns', data);
  }

  async updateCampaign(id, data) {
    return this.request('PUT', `/campaigns/${id}`, data);
  }

  async sendCampaign(id, body) {
    // The /send endpoint runs its OWN attestation gate (consent is checked at SEND
    // for immediate blasts, since create doesn't record it for those). Callers that
    // already confirmed consent must forward it here, else the send 403s with
    // "Consent attestation required" even though the box was ticked (Bluestone 06-30).
    return this.request('POST', `/campaigns/${id}/send`, body || {});
  }

  async deleteCampaign(id) {
    return this.request('DELETE', `/campaigns/${id}`);
  }

  async cancelCampaign(id) {
    return this.request('POST', `/campaigns/${id}/cancel`);
  }

  // ============== Phone Numbers ==============
  async getPhoneNumbers(opts = {}) {
    // In-flight dedup: on a /numbers deep-link the activate-banner check, the
    // deliverability KPIs, and the number-health loader all call this within the
    // same ~3s window — three identical (slow) queries fired in parallel, tripling
    // cold-load time + server load. Share the single in-flight request. Cleared on
    // settle, so there's NO staleness (the next call after it resolves re-fetches);
    // pass {fresh:true} to always bypass.
    if (!opts.fresh && this._pnInflight) return this._pnInflight;
    const p = this.request('GET', '/phone-numbers', null, opts);
    this._pnInflight = p;
    const clear = () => { if (this._pnInflight === p) this._pnInflight = null; };
    p.then(clear, clear);
    return p;
  }

  async buyPhoneNumber(areaCode, paymentIntentId) {
    return this.request('POST', '/phone-numbers/buy', { area_code: areaCode, payment_intent_id: paymentIntentId });
  }

  async syncPhoneNumbers() {
    return this.request('GET', '/phone-numbers/sync');
  }

  // ============== Drip Sequences ==============
  async getDripSequences() {
    return this.request('GET', '/drip-sequences');
  }

  // Fast variant — sequences + steps only, no per-enrollment stats/forecast.
  // For dropdowns + the bulk "Add to drip" modal (the heavy default ~20s on big
  // accounts timed out and showed "No drip sequences yet" — Kevin VP 2026-06-24).
  async getDripSequencesLight() {
    return this.request('GET', '/drip-sequences?light=1');
  }

  async createDripSequence(data) {
    return this.request('POST', '/drip-sequences', data);
  }

  // AI automation builder — plain-English description -> proposed {name, summary,
  // steps} OR {questions} (preview only; nothing is persisted until create).
  // forceBuild=true (sent after the user answers questions) makes it always build.
  async aiBuildAutomation(description, forceBuild) {
    return this.request('POST', '/drip-sequences/ai-build', { description, force_build: !!forceBuild });
  }
  // Visual-builder AI: turn a plain-English goal into a rule shape
  // ({name, trigger_type, trigger_config, actions, explanation}).
  async aiGenerateAutomation(goal, answers, current) {
    const body = { goal };
    if (answers) body.answers = answers;
    if (current) body.current = current;   // existing rule → AI edits it (refine)
    return this.request('POST', '/automations/ai-generate', body);
  }

  // Create an automation RULE (the "WHEN" trigger). Used by the AI builder to
  // attach a keyword/reply/tag trigger that enrolls contacts into a sequence.
  async createAutomationRule(rule) {
    return this.request('POST', '/automations', rule);
  }

  async enrollInSequence(sequenceId, contactIds, opts = {}) {
    const payload = { contact_ids: contactIds };
    if (opts.spread_days && opts.spread_days > 1) payload.spread_days = opts.spread_days;
    if (opts.add_tag && String(opts.add_tag).trim()) payload.add_tag = String(opts.add_tag).trim();
    // TCPA consent attestation — backend (ensureAttestation) 403s without it.
    if (opts.consent_attested) {
      payload.consent_attested = true;
      if (opts.consent_attestation_text) payload.consent_attestation_text = opts.consent_attestation_text;
    }
    return this.request('POST', `/drip-sequences/${sequenceId}/enroll`, payload);
  }

  async updateSequenceStatus(id, status) {
    return this.request('PUT', `/drip-sequences/${id}/status`, { status });
  }

  // Replace-all write: send the FULL steps array (the backend DELETEs + re-INSERTs
  // every step atomically). Each step object must carry all its fields —
  // message_body, delay_*, step_type, condition_* — or omitted fields get nulled.
  // Returns { success:false, step_index, message } when the content gate rejects.
  async updateSequenceSteps(id, steps) {
    return this.request('PUT', `/drip-sequences/${id}/steps`, { steps });
  }

  async renameSequence(id, name) {
    return this.request('PUT', `/drip-sequences/${id}/rename`, { name });
  }

  // Live CSM/OB call context for a lead — journey stage (call_moment), recommended
  // next_action, account-health funnel signals. Hub reps only (returns is_specialist:false otherwise).
  async getCsmContext(phone) {
    return this.request('GET', `/csm-call/context?phone=${encodeURIComponent(phone)}`);
  }

  // Customer-facing Contact Insights — a pre-call recap of a contact's OWN history
  // (calls + last disposition, texts, last AI call summary, tags/pipeline). Owner-
  // scoped; shown when the internal specialist panel (getCsmContext) doesn't apply.
  async getContactInsight(phone) {
    return this.request('GET', `/dialer-contact-insight?phone=${encodeURIComponent(phone)}`);
  }

  // Set/clear the sending window (delivery window). Pass null fields to clear.
  // Body: { delivery_window_start, delivery_window_end, delivery_window_days, timezone }.
  async updateDeliveryWindow(id, win) {
    return this.request('PUT', `/drip-sequences/${id}/delivery-window`, win);
  }

  // Hard-deletes the sequence: stops active enrollments, then drops steps +
  // enrollments + the sequence row. Irreversible.
  async deleteSequence(id) {
    return this.request('DELETE', `/drip-sequences/${id}`);
  }

  // Drill-down behind the dashboard "Replies" stat: the actual inbound
  // messages for a single campaign. opts: { dripSequenceId?, campaignBlastId?, days?, limit? }
  async getCampaignInbounds(opts = {}) {
    const qs = [];
    if (opts.dripSequenceId) qs.push('drip_sequence_id=' + encodeURIComponent(opts.dripSequenceId));
    if (opts.campaignBlastId) qs.push('campaign_blast_id=' + encodeURIComponent(opts.campaignBlastId));
    if (opts.days) qs.push('days=' + encodeURIComponent(opts.days));
    if (opts.limit) qs.push('limit=' + encodeURIComponent(opts.limit));
    return this.request('GET', '/reports/campaign-inbounds?' + qs.join('&'));
  }

  // ============== Groups ==============
  async getGroups() {
    return this.request('GET', '/groups');
  }

  async createGroup(name, contactIds) {
    return this.request('POST', '/groups', { name, contact_ids: contactIds });
  }

  async sendGroupMessage(groupId, message) {
    return this.request('POST', `/groups/${groupId}/messages`, { message });
  }

  // ============== Consent / Legal ==============
  async logConsent(eventType, data = {}) {
    return this.request('POST', '/consent/log', {
      event_type: eventType,
      tos_version: data.tos_version || undefined,
      scroll_depth: data.scroll_depth || undefined,
      time_on_page_ms: data.time_on_page_ms || undefined,
      page_url: data.page_url || window.location.href,
      metadata: data.metadata || undefined,
    });
  }

  async checkConsent() {
    return this.request('GET', '/consent/check');
  }

  async getConsentHistory() {
    return this.request('GET', '/consent/history');
  }

  // ============== Templates ==============
  async getTemplates(scope) {
    return this.request('GET', '/templates' + (scope ? '?scope=' + encodeURIComponent(scope) : ''));
  }

  async createTemplate(data) {
    return this.request('POST', '/templates', data);
  }

  async updateTemplate(id, data) {
    return this.request('PUT', `/templates/${id}`, data);
  }

  async deleteTemplate(id) {
    return this.request('DELETE', `/templates/${id}`);
  }

  async useTemplate(id) {
    return this.request('POST', `/templates/${id}/use`);
  }

  // ============== Segments ==============
  async getSegments() {
    return this.request('GET', '/segments');
  }

  async createSegment(data) {
    return this.request('POST', '/segments', data);
  }

  async updateSegment(id, data) {
    return this.request('PUT', `/segments/${id}`, data);
  }

  async deleteSegment(id) {
    return this.request('DELETE', `/segments/${id}`);
  }

  async getSegmentContacts(id, limit = 50, offset = 0) {
    return this.request('GET', `/segments/${id}/contacts?limit=${limit}&offset=${offset}`);
  }

  async refreshSegment(id) {
    return this.request('POST', `/segments/${id}/refresh`);
  }

  async previewSegment(filterRules, opts) {
    const body = { filter_rules: filterRules };
    if (opts && opts.include_sample) body.include_sample = 1;
    return this.request('POST', '/segments/preview', body);
  }

  // ============== Contact Lists ==============
  async getContactLists() {
    return this.request('GET', '/contact-lists');
  }
  async createContactList(data) {
    return this.request('POST', '/contact-lists', data);
  }
  async updateContactList(id, data) {
    return this.request('PUT', `/contact-lists/${id}`, data);
  }
  async deleteContactList(id) {
    return this.request('DELETE', `/contact-lists/${id}`);
  }
  async getContactListMembers(id, limit = 50, offset = 0) {
    return this.request('GET', `/contact-lists/${id}/members?limit=${limit}&offset=${offset}`);
  }
  async addContactListMembers(id, contactIds) {
    return this.request('POST', `/contact-lists/${id}/members`, { contact_ids: contactIds });
  }
  async removeContactListMembers(id, contactIds) {
    return this.request('DELETE', `/contact-lists/${id}/members`, { contact_ids: contactIds });
  }
  async importCsvToContactList(id, csv) {
    return this.request('POST', `/contact-lists/${id}/import-csv`, { csv });
  }

  // ============== Notes ==============
  async getNotes(contactId) {
    return this.request('GET', `/notes?contact_id=${contactId}`);
  }
  async createNote(contactId, body) {
    return this.request('POST', '/notes', { contact_id: contactId, body });
  }
  async deleteNote(id) {
    return this.request('DELETE', `/notes/${id}`);
  }

  // ============== Tasks ==============
  async getTasks(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request('GET', `/tasks?${params}`);
  }
  async createTask(data) {
    return this.request('POST', '/tasks', data);
  }
  async updateTask(id, data) {
    return this.request('PUT', `/tasks/${id}`, data);
  }
  async deleteTask(id) {
    return this.request('DELETE', `/tasks/${id}`);
  }
  async completeTask(id) {
    return this.request('POST', `/tasks/${id}/complete`);
  }

  // ============== Opportunities ==============
  async getOpportunities(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request('GET', `/opportunities?${params}`);
  }
  async getOpportunitySummary(pipelineId) {
    const q = pipelineId ? `?pipeline_id=${pipelineId}` : '';
    return this.request('GET', `/opportunities/summary${q}`);
  }
  async createOpportunity(data) {
    return this.request('POST', '/opportunities', data);
  }
  async updateOpportunity(id, data) {
    return this.request('PUT', `/opportunities/${id}`, data);
  }
  async deleteOpportunity(id) {
    return this.request('DELETE', `/opportunities/${id}`);
  }
  async moveOpportunity(id, stageId) {
    return this.request('PUT', `/opportunities/${id}/move`, { stage_id: stageId });
  }
  async getPipelines() {
    return this.request('GET', '/opportunities/pipelines');
  }
  async createPipeline(data) {
    return this.request('POST', '/opportunities/pipelines', data);
  }
  async seedDefaultPipeline() {
    return this.request('POST', '/opportunities/seed-default');
  }

  // ============== Reports ==============
  // Filterable "messages sent under X" count (date / direction / status /
  // number / campaign / sub-account). Pass any subset.
  async getMessageCount(filters = {}) {
    const qs = Object.entries(filters)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return this.request('GET', '/reports/count' + (qs ? '?' + qs : ''));
  }

  // Natural-language wrapper: "how many failed texts to client X last month?"
  // → { data:{messages,segments,spend}, filters, interpreted, unsupported }.
  async aiCountQuery(query) {
    return this.request('POST', '/reports/ai-count', { query });
  }
  // Multi-turn grounded follow-up chat on the usage-report AI analysis.
  async aiChat(messages) {
    return this.request('POST', '/reports/ai-chat', { messages });
  }

  async getReportOverview(days = 30, fromDate, toDate, opts = {}) {
    let qs = `days=${days}`;
    if (fromDate) qs += `&from=${encodeURIComponent(fromDate)}`;
    if (toDate) qs += `&to=${encodeURIComponent(toDate)}`;
    if (opts.lite) qs += `&lite=1`;
    if (opts.dripSequenceId) qs += `&drip_sequence_id=${encodeURIComponent(opts.dripSequenceId)}`;
    if (opts.campaignBlastId) qs += `&campaign_blast_id=${encodeURIComponent(opts.campaignBlastId)}`;
    // opts.silent passthrough — the dashboard stats card has its own inline
    // loader, so on first load it shouldn't also hold the global top bar.
    return this.request('GET', `/reports/overview?${qs}`, null, { silent: !!opts.silent });
  }

  // Drip sequences — needed to populate the dashboard "Key Numbers by campaign" filter.
  async getDripSequences() {
    return this.request('GET', '/drip-sequences');
  }

  async getDailyReport(days = 15) {
    return this.request('GET', `/reports/daily?days=${days}`);
  }

  async getCarrierReport() {
    return this.request('GET', '/reports/carriers');
  }

  async getTopCampaigns(days = 30) {
    return this.request('GET', `/reports/top-campaigns?days=${days}`);
  }

  async getMonthlyReport(months = 12) {
    return this.request('GET', `/reports/monthly?months=${months}`);
  }

  async getHourlyReport(days = 30) {
    // Pass the browser-detected IANA tz so the chart shows local hours
    // (without it the backend buckets by UTC).
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (_) {}
    const qs = `days=${days}` + (tz ? `&tz=${encodeURIComponent(tz)}` : '');
    return this.request('GET', `/reports/hourly?${qs}`);
  }

  // ============== Short Links ==============
  async getLinks(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request('GET', `/links?${params}`);
  }
  async createLink(url, customCode) {
    return this.request('POST', '/links', { url, custom_code: customCode });
  }
  async getLinkStats(id) {
    return this.request('GET', `/links/${id}/stats`);
  }
  async deleteLink(id) {
    return this.request('DELETE', `/links/${id}`);
  }

  // ============== Campaign Calendar ==============
  async getCampaignCalendar(month) {
    const q = month ? `?month=${month}` : '';
    return this.request('GET', `/campaigns/calendar${q}`);
  }

  // ============== Signup Forms ==============
  async getSignupForms() {
    return this.request('GET', '/signup-forms');
  }
  async createSignupForm(data) {
    return this.request('POST', '/signup-forms', data);
  }
  async updateSignupForm(id, data) {
    return this.request('PUT', `/signup-forms/${id}`, data);
  }
  async deleteSignupForm(id) {
    return this.request('DELETE', `/signup-forms/${id}`);
  }
  async getSignupFormSubmissions(id, limit = 50, offset = 0) {
    return this.request('GET', `/signup-forms/${id}/submissions?limit=${limit}&offset=${offset}`);
  }
  async getSignupFormQR(id, size = 256) {
    return this.request('GET', `/signup-forms/${id}/qr?size=${size}`);
  }

  // ============== Webchat Widgets ==============
  async getWidgets() {
    return this.request('GET', '/widgets');
  }
  async createWidget(data) {
    return this.request('POST', '/widgets', data);
  }
  async updateWidget(id, data) {
    return this.request('PUT', `/widgets/${id}`, data);
  }
  async deleteWidget(id) {
    return this.request('DELETE', `/widgets/${id}`);
  }
  async getWidgetSnippet(id) {
    return this.request('GET', `/widgets/${id}/snippet`);
  }
  // ============== Affiliates ==============
  async getAffiliateStats() {
    return this.request('GET', '/affiliates');
  }

  async getAffiliateLeaderboard() {
    return this.request('GET', '/affiliates/leaderboard');
  }

  async requestAffiliatePayout(method) {
    return this.request('POST', '/affiliates/payout', { method });
  }

  // ============== Automations (rules: trigger → actions) ==============
  // Backend: routes/automations.js — { success, data } envelope on every call.
  async getAutomations() {
    return this.request('GET', '/automations');
  }
  // ---- AI reply agents ----
  async getAiAgents() {
    return this.request('GET', '/ai-agents');
  }
  async createAiAgent(data) {
    return this.request('POST', '/ai-agents', data);
  }
  async updateAiAgent(id, data) {
    return this.request('PUT', '/ai-agents/' + id, data);
  }
  async deleteAiAgent(id) {
    return this.request('DELETE', '/ai-agents/' + id);
  }
  async setAiAgentStatus(id, status) {
    return this.request('PUT', '/ai-agents/' + id + '/status', { status: status });
  }
  // Per-agent activity stats (active contacts / replies / handed-off, 7d window).
  async getAiAgentStats(id) {
    return this.request('GET', '/ai-agents/' + id + '/stats');
  }
  // Training (QA loop) — learn from how the team actually replied.
  async trainPreviewAiAgent(id, filters) {
    return this.request('POST', '/ai-agents/' + id + '/train-preview', filters || {});
  }
  async trainAiAgent(id, opts) {
    return this.request('POST', '/ai-agents/' + id + '/train', opts || {});
  }
  async getBulkJob(id) {
    return this.request('GET', '/bulk-jobs/' + id);
  }
  // Live "test as you build" — runs an UNSAVED config (persona/knowledge/goals)
  // against a scripted thread and returns the agent's reply. Read-only.
  async testDraftAiAgent(payload) {
    return this.request('POST', '/ai-agents/test-draft', payload || {});
  }
  // Learn a knowledge base from a website URL (scrape → draft persona + facts).
  async scrapeAndDraftAiAgent(payload) {
    return this.request('POST', '/ai-agents/scrape-and-draft', payload || {});
  }
  // Build an agent (persona + knowledge) from the account's past conversations.
  async generateAgentFromConversations(payload) {
    return this.request('POST', '/ai-agents/generate-from-conversations', payload || {});
  }
  async createAutomation(data) {
    return this.request('POST', '/automations', data);
  }
  async updateAutomation(id, data) {
    return this.request('PUT', `/automations/${id}`, data);
  }
  async deleteAutomation(id) {
    return this.request('DELETE', `/automations/${id}`);
  }
  async testAutomation(id, sampleData) {
    return this.request('POST', `/automations/${id}/test`, sampleData || {});
  }
  async getAutomationGraph(id) {
    return this.request('GET', `/automations/${id}/graph`);
  }
  async saveAutomationGraph(id, graph, opts) {
    return this.request('PUT', `/automations/${id}/graph`, { graph: graph, name: opts && opts.name, enabled: opts && opts.enabled });
  }
  async createAutomationFromGraph(name, graph, enabled) {
    return this.request('POST', '/automations/from-graph', { name: name, graph: graph, enabled: !!enabled });
  }
  // Recent rule executions ("fires") — every lead the system dispatched to
  // a downstream webhook (Shape, Zapier, etc.) so users can reconcile.
  // opts: { days, limit, offset, rule_id, intent }
  // Manually re-fire a rule's webhook actions for a specific message —
  // powers the "Send to Shape" button on inbound chat bubbles.
  async manualDispatchAutomation(message_id, rule_id) {
    return this.request('POST', '/automations/manual-dispatch', { message_id, rule_id });
  }
  async getAutomationFires(opts) {
    const o = opts || {};
    const qs = [];
    if (o.days != null) qs.push(`days=${encodeURIComponent(o.days)}`);
    if (o.limit != null) qs.push(`limit=${encodeURIComponent(o.limit)}`);
    if (o.offset != null) qs.push(`offset=${encodeURIComponent(o.offset)}`);
    if (o.rule_id != null) qs.push(`rule_id=${encodeURIComponent(o.rule_id)}`);
    if (o.intent) qs.push(`intent=${encodeURIComponent(o.intent)}`);
    if (o.campaign) qs.push(`campaign=${encodeURIComponent(o.campaign)}`);
    const q = qs.length ? `?${qs.join('&')}` : '';
    return this.request('GET', `/automations/fires${q}`);
  }
  // Campaigns/drips that produced Lead Activity — for the "Campaign" filter.
  async getAutomationFireCampaigns(days) {
    const q = days != null ? `?days=${encodeURIComponent(days)}` : '';
    return this.request('GET', `/automations/fire-campaigns${q}`);
  }

  // AI intent classification toggle. Backend reads this flag before routing
  // an inbound message into the classifier (Claude Haiku, 0.2 credits/run).
  // Default OFF — `inbound_intent` automation rules won't fire until enabled.
  async getIntentClassificationSetting() {
    return this.request('GET', '/settings/intent-classification');
  }
  // setIntentClassificationSetting(enabled[, opts])
  // opts: { default_prompt?: string, apply_all?: boolean }
  // Pass an opts field to update it; omit to leave it unchanged on the server.
  async setIntentClassificationSetting(enabled, opts) {
    const body = { enabled: !!enabled };
    if (opts && Object.prototype.hasOwnProperty.call(opts, 'default_prompt')) body.default_prompt = String(opts.default_prompt || '');
    if (opts && Object.prototype.hasOwnProperty.call(opts, 'apply_all')) body.apply_all = !!opts.apply_all;
    return this.request('PUT', '/settings/intent-classification', body);
  }

  // ============== Sandbox SMS (free first-send) ==============
  async getSandboxStatus() {
    return this.request('GET', '/sms/sandbox-status');
  }
  async sendSandboxMessage(message) {
    return this.request('POST', '/sms/send-sandbox', { message });
  }

  // ============== Forced /welcome onboarding flow ==============
  // Backs the four-step UI in welcome.html. The backend implementation lives
  // in routes/onboarding.js (built but not yet pushed — see project backlog).
  async sendOnboardingVerification(phone) {
    return this.request('POST', '/onboarding/send-verification', { phone });
  }
  async verifyOnboardingPhone(phone, code) {
    return this.request('POST', '/onboarding/verify-phone', { phone, code });
  }
  async sendOnboardingTest(message) {
    return this.request('POST', '/onboarding/send-test', { message });
  }
  async getOnboardingState() {
    return this.request('GET', '/onboarding/state');
  }

  // ============== Funnel Event Tracking ==============
  // Fire-and-forget event tracking for onboarding analytics.
  // Auth optional: pre-signup events (e.g. signup_page_viewed) are tracked
  // anonymously by session_id; post-signup events get user_id via JWT.
  // Never throws, never blocks the UI.
  track(eventName, properties = {}) {
    try {
      // Persist a session id across the onboarding journey
      let sessionId = localStorage.getItem('readysms_session_id');
      if (!sessionId) {
        sessionId = 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem('readysms_session_id', sessionId);
      }

      const body = JSON.stringify({
        event_name: eventName,
        session_id: sessionId,
        properties: properties || {},
      });

      const url = `${API_BASE}/events/track`;

      // Prefer sendBeacon for fire-and-forget on page-unload events.
      // sendBeacon doesn't support Authorization headers, so use it only when
      // we have no token (pre-signup) — otherwise fall back to fetch keepalive.
      if (!this.token && navigator.sendBeacon) {
        try {
          navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
          return;
        } catch (_) { /* fall through to fetch */ }
      }

      const headers = { 'Content-Type': 'application/json' };
      if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

      fetch(url, { method: 'POST', headers, body, keepalive: true }).catch(() => {
        // swallow — analytics must never break the app
      });
    } catch (_) {
      // swallow
    }
  }

  // ============== Dialer: Campaigns ==============
  async getDialerCampaigns() {
    return this.request('GET', '/dialer/campaigns');
  }
  // OBS support view — every client's in-progress / stuck 10DLC registration + the
  // exact profile they entered. Backend gates this to hub specialists + platform admins.
  async getObsRegistrations(opts = {}) {
    let url = '/dialer/obs/registrations';
    if (opts.q) url += '?q=' + encodeURIComponent(opts.q);
    return this.request('GET', url);
  }
  // OBS detail / edit / submit — open a client's registration, fill it, file it.
  async getObsRegistration(id) {
    return this.request('GET', '/dialer/obs/registrations/' + id);
  }
  async saveObsRegistration(id, fields) {
    return this.request('PUT', '/dialer/obs/registrations/' + id, fields || {});
  }
  async submitObsRegistration(id) {
    return this.request('POST', '/dialer/obs/registrations/' + id + '/submit', {});
  }
  // Dual Pre-Submission Verification — field check + TCR-rules check (read-only).
  async verifyDlcRegistration(id) {
    return this.request('GET', '/10dlc/' + id + '/verify');
  }
  // OBS rep verifying a client's registration cross-tenant (hub-specialist gate).
  async verifyObsRegistration(id) {
    return this.request('GET', '/dialer/obs/registrations/' + id + '/verify');
  }
  // Dual Pre-Submission Verification — text + email the client their details to confirm.
  async sendObsVerification(id) {
    return this.request('POST', '/dialer/obs/registrations/' + id + '/send-verification', {});
  }
  async createDialerCampaign(data) {
    return this.request('POST', '/dialer/campaigns', data);
  }
  async updateDialerCampaign(id, data) {
    return this.request('PUT', `/dialer/campaigns/${id}`, data);
  }
  async deleteDialerCampaign(id) {
    return this.request('DELETE', `/dialer/campaigns/${id}`);
  }
  async pauseDialerCampaign(id) {
    return this.request('POST', `/dialer/campaigns/${id}/pause`);
  }
  async resumeDialerCampaign(id) {
    return this.request('POST', `/dialer/campaigns/${id}/resume`);
  }
  async getNextLead(campaignId, mode, opts) {
    const params = new URLSearchParams();
    if (mode) params.set('mode', mode);
    if (opts && opts.reset) params.set('reset', '1');
    return this.request('GET', `/dialer/campaigns/${campaignId}/next-lead?${params}`);
  }
  // Read-only preview: is this campaign dialable now, or are its leads outside
  // their local calling window? Used to warn the rep at campaign-select time.
  async getCallingWindow(campaignId) {
    return this.request('GET', `/dialer/campaigns/${campaignId}/calling-window`);
  }
  async recordDial(data) {
    return this.request('POST', '/dialer/dials', data);
  }
  async releaseLead(reservationId) {
    return this.request('POST', '/dialer/release-reservation', { reservation_id: reservationId });
  }
  // Keeps a lead reserved while the agent is working it (extends expires_at).
  // Backend: POST /dialer/campaigns/:id/heartbeat-lead { contact_id }
  async heartbeatLead(campaignId, contactId) {
    return this.request('POST', `/dialer/campaigns/${campaignId}/heartbeat-lead`, { contact_id: contactId });
  }

  // ============== Dialer: Calls ==============
  async createCall(data) {
    return this.request('POST', '/dialer/calls', data);
  }
  async hangupCall(callId) {
    return this.request('POST', `/dialer/calls/${callId}/hangup`);
  }
  async recordCall(callId, action) {
    return this.request('POST', `/dialer/calls/${callId}/record`, { action });
  }
  async transferCall(callId, data) {
    return this.request('POST', `/dialer/calls/${callId}/transfer`, data);
  }

  // ============== Dialer: Dials & Dispositions ==============
  async getDials(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request('GET', `/dialer/dials?${params}`);
  }
  async createDial(data) {
    return this.request('POST', '/dialer/dials', data);
  }
  async exportDials() {
    return this.request('GET', '/dialer/dials/export');
  }
  async getDispositions() {
    return this.request('GET', '/dialer/dispositions');
  }
  async createDisposition(data) {
    return this.request('POST', '/dialer/dispositions', data);
  }

  // ============== Dialer: Lists ==============
  async getDialerLists() {
    return this.request('GET', '/dialer/lists');
  }
  async createDialerList(data) {
    return this.request('POST', '/dialer/lists', data);
  }
  async deleteDialerList(id) {
    return this.request('DELETE', `/dialer/lists/${id}`);
  }
  async renameDialerList(id, data) {
    return this.request('PATCH', `/dialer/lists/${id}`, data);
  }
  async importDialerListContacts(id, data) {
    return this.request('POST', `/dialer/lists/${id}/import`, data);
  }
  async getDialerListContacts(id) {
    return this.request('GET', `/dialer/lists/${id}/contacts`);
  }
  async addContactToDialerList(id, contactId, phone) {
    // Send phone too so a conversation with no matched contact (contact_id 0/null)
    // can still be added — the backend resolves-or-creates the contact from phone.
    return this.request('POST', `/dialer/lists/${id}/add-contact`, { contact_id: contactId, phone: phone || '' });
  }

  // ============== Dialer: Callbacks ==============
  async getCallbacks() {
    return this.request('GET', '/dialer/callbacks');
  }
  async createCallback(data) {
    return this.request('POST', '/dialer/callbacks', data);
  }
  async acknowledgeCallback(id) {
    return this.request('POST', `/dialer/callbacks/${id}/acknowledge`);
  }
  async dismissCallback(id) {
    return this.request('POST', `/dialer/callbacks/${id}/dismiss`);
  }
  async rescheduleCallback(id, reminder_at) {
    return this.request('POST', `/dialer/callbacks/${id}/reschedule`, { reminder_at });
  }

  // ============== Dialer: Voicemail drop ==============
  // Play a saved recording into a live call (auto-drop on answering machine).
  async dropVoicemail(callId, recordingId, opts = {}) {
    return this.request('POST', '/dialer-voicemail/drop', {
      call_id: callId,
      recording_id: recordingId,
      ...opts,
    });
  }
  // Saved voicemail recordings (for the auto-drop picker).
  async getVoicemailRecordings() {
    return this.request('GET', '/dialer-voicemail/recordings');
  }
  // Multipart upload — can't go through request() (which forces JSON); let the
  // browser set the multipart boundary by NOT setting Content-Type.
  async uploadVoicemailRecording(file, name, durationSeconds, scriptTemplate) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', name || file.name || 'Voicemail');
    if (durationSeconds) fd.append('duration_seconds', String(durationSeconds));
    // When set, the backend clones this sample's voice and personalizes each
    // lead's clip from this script (with a {first_name} merge tag).
    if (scriptTemplate && scriptTemplate.trim()) fd.append('script_template', scriptTemplate.trim());
    const res = await fetch(API_BASE + '/dialer-voicemail/recordings', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + this.token },
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || ('Upload failed (' + res.status + ')'));
    return data;
  }
  // Upload an MMS image/PDF → returns { url } (a durable public link stored in
  // our DB). Used by the automation builder's Media (MMS) field.
  async uploadMmsMedia(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(API_BASE + '/automations/media', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + this.token },
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || ('Upload failed (' + res.status + ')'));
    return data;
  }

  // ============== Dialer: Voicemail follow-up ==============
  async getVoicemailFollowupTemplates() {
    return this.request('GET', '/dialer-voicemail/followup-templates');
  }
  // Send the templated after-voicemail follow-up (text + email) to one lead.
  async sendVoicemailFollowup(contactId, template, channels) {
    return this.request('POST', '/dialer-voicemail/followup', {
      contact_id: contactId,
      template: template || 'after_voicemail',
      channels: channels || ['sms', 'email'],
    });
  }

  // ============== Dialer: Agents ==============
  async getDialerAgents() {
    return this.request('GET', '/dialer-agents');
  }
  // Real-time floor snapshot: live agent states + in-progress calls + today rollup.
  async getDialerLive() {
    return this.request('GET', '/dialer/live');
  }
  async inviteDialerAgent(data) {
    return this.request('POST', '/dialer-agents/invite', data);
  }
  async removeDialerAgent(id) {
    return this.request('DELETE', `/dialer-agents/${id}`);
  }
  async getAgentLeaderboard(period) {
    const params = new URLSearchParams();
    if (period) params.set('period', period);
    return this.request('GET', `/dialer-agents/leaderboard?${params}`);
  }

  // ============== Dialer: Scripts ==============
  async getScripts() {
    return this.request('GET', '/dialer-scripts');
  }
  async createScript(data) {
    return this.request('POST', '/dialer-scripts', data);
  }
  async updateScript(id, data) {
    return this.request('PUT', `/dialer-scripts/${id}`, data);
  }
  async deleteScript(id) {
    return this.request('DELETE', `/dialer-scripts/${id}`);
  }
  async renderScript(id, contactId) {
    const params = new URLSearchParams();
    if (contactId) params.set('contact_id', contactId);
    return this.request('GET', `/dialer-scripts/${id}/render?${params}`);
  }
  // Scripts whose trigger tags match a contact, each pre-filled with that
  // contact's merge + custom fields. Drives the on-call script popup.
  async matchScripts(contactId, campaignId) {
    const params = new URLSearchParams();
    if (contactId) params.set('contact_id', contactId);
    if (campaignId) params.set('campaign_id', campaignId);
    return this.request('GET', `/dialer-scripts/match?${params}`);
  }

  // ============== Dialer: DNC ==============
  async getDncList(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request('GET', `/dialer-dnc?${params}`);
  }
  async addToDnc(data) {
    return this.request('POST', '/dialer-dnc', data);
  }
  async removeFromDnc(id, opts = {}) {
    const q = (opts && opts.attested) ? '?attested=1' : '';
    return this.request('DELETE', `/dialer-dnc/${id}${q}`);
  }
  async checkDnc(phone) {
    return this.request('GET', `/dialer-dnc/check?phone=${encodeURIComponent(phone)}`);
  }

  // ============== Dialer: Auto-Text ==============
  async getAutoTextRules() {
    return this.request('GET', '/dialer-auto-text/rules');
  }
  async createAutoTextRule(data) {
    return this.request('POST', '/dialer-auto-text/rules', data);
  }
  async triggerAutoText(data) {
    return this.request('POST', '/dialer-auto-text/trigger', data);
  }

  // ============== Dialer: Dashboard ==============
  async getDialerDashboard(opts) {
    // Optional {date_from, date_to} (YYYY-MM-DD). Without a range the backend
    // counts ALL dials ever — so "Calls today" tiles MUST pass a range or they
    // silently show all-time totals.
    var qs = '';
    if (opts && opts.date_from && opts.date_to) {
      var p = new URLSearchParams();
      p.set('date_from', opts.date_from); p.set('date_to', opts.date_to);
      qs = '?' + p.toString();
    }
    return this.request('GET', '/dialer/dashboard' + qs);
  }
  async getDialerRepPerformance(opts) {
    // Per-rep dialing breakdown, rolled up across the account hierarchy.
    // Optional {date_from, date_to} (YYYY-MM-DD).
    var qs = '';
    if (opts && opts.date_from && opts.date_to) {
      var p = new URLSearchParams();
      p.set('date_from', opts.date_from); p.set('date_to', opts.date_to);
      qs = '?' + p.toString();
    }
    return this.request('GET', '/dialer/rep-performance' + qs);
  }

  // ============== Dialer: WebRTC ==============
  async getWebRtcToken() {
    return this.request('GET', '/dialer/webrtc-token');
  }

  // ============== Dialer: Inbound-call settings ==============
  async getInboundSettings() {
    return this.request('GET', '/dialer/inbound-settings');
  }
  async saveInboundSettings(data) {
    return this.request('PUT', '/dialer/inbound-settings', data);
  }

  // ============== Dialer: Webhook Config ==============
  async getWebhookConfig() {
    return this.request('GET', '/dialer-leads/webhook/config');
  }
  async createWebhookKey(data) {
    return this.request('POST', '/dialer-leads/webhook/config', data);
  }
  async updateWebhookKey(id, data) {
    return this.request('PATCH', `/dialer-leads/webhook/config/${id}`, data);
  }
  async deleteWebhookKey(id) {
    return this.request('DELETE', `/dialer-leads/webhook/config/${id}`);
  }

  // ============== Dead-vs-alive tracking helpers ==============
  // Convenience wrappers around .track() — keep call sites tidy and enforce
  // session-level deduping where it makes sense (feature touches fire once
  // per feature per session instead of once per click, so the table doesn't
  // explode with noise).

  // Feature touch — "this user actually used feature X this session".
  // Deduped in sessionStorage so calling trackFeature('contacts') on every
  // page-load of contacts only fires once.
  trackFeature(feature) {
    try {
      if (!feature) return;
      const key = 'readysms_feat_seen';
      const seen = JSON.parse(sessionStorage.getItem(key) || '{}');
      if (seen[feature]) return;
      seen[feature] = 1;
      sessionStorage.setItem(key, JSON.stringify(seen));
      this.track('feature_touched', { feature });
    } catch (_) {}
  }

  // Generic UI click — tabs, nav items, major CTAs. No dedupe: we want
  // total click counts so zero-click elements stand out.
  trackClick(element, extra) {
    if (!element) return;
    this.track('ui_clicked', { element, ...(extra || {}) });
  }

  // Admin tab view — "which admin dashboards nobody looks at".
  trackAdminTab(tab) {
    if (!tab) return;
    this.track('admin_tab_viewed', { tab });
  }

  // Setting change — "toggles nobody touches".
  trackSettingChange(key, from, to) {
    if (!key) return;
    this.track('setting_changed', { key, from: from ?? null, to: to ?? null });
  }

  // Modal lifecycle — shown/dismissed/accepted. Used for dismiss-rate.
  // action: 'shown' | 'dismissed' | 'accepted'
  trackModal(modal, action) {
    if (!modal || !action) return;
    const name = action === 'shown' ? 'modal_shown'
               : action === 'accepted' ? 'modal_accepted'
               : 'modal_dismissed';
    this.track(name, { modal });
  }

  // Docs page view — "which docs pages nobody reads".
  trackDocsPage(page) {
    if (!page) return;
    this.track('docs_page_viewed', { page });
  }

  // Integration touch — "which integrations nobody uses".
  trackIntegration(integration) {
    if (!integration) return;
    this.track('integration_used', { integration });
  }
}

// Global instance
const api = new ReadySMSApi();
window.api = api;
