/* Relics staff login, frontend only.
 *
 * There is no backend yet, so `enabled` is false: nothing is gated and every
 * page stays reachable. Once the API exists, flip `enabled` to true.
 *
 * Expected API (same origin, cookie session, see README.md):
 *   GET  {api}/session        200 {user:{id,name,avatar},roles:[...]} | 401
 *   GET  {api}/auth/discord   starts Discord OAuth, redirects back to ?next=
 * Only /dashboard/ is guarded. The handbooks are public.
 *   POST {api}/auth/logout    clears the session
 *
 * NOTE: a static page can only hide content in the browser. The real gate must
 * be the backend serving /handbook/* only to authenticated staff.
 */
(function () {
  var CFG = window.RELICS_AUTH = Object.assign(
    { enabled: false, api: '/api', login: '/login/', home: '/dashboard/' },
    window.RELICS_AUTH || {}
  );
  var root = document.documentElement;
  var requires = root.getAttribute('data-requires'); // e.g. "moderator", or empty = any staff

  // Only allow same-site relative paths as post-login targets (no open redirect).
  CFG.safeNext = function (n) {
    return typeof n === 'string' && /^\/(?!\/|\\)/.test(n) ? n : CFG.home;
  };
  CFG.loginUrl = function (next) {
    return CFG.login + '?next=' + encodeURIComponent(CFG.safeNext(next));
  };
  CFG.discordUrl = function (next) {
    return CFG.api + '/auth/discord?next=' + encodeURIComponent(CFG.safeNext(next));
  };

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (html) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  function ready(fn) {
    if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn);
  }

  function blocked(title, text, action) {
    var main = document.querySelector('main') || document.body;
    main.innerHTML = '<div class="gate"><div class="box"><div class="eyebrow"><span class="dot"></span>Staff area</div><h1>' + esc(title) + '</h1><p>' + esc(text) + '</p>' + (action || '') + '</div></div>';
  }

  function slot(session) {
    var s = document.getElementById('auth-slot');
    if (!s) return;
    if (!session) { s.innerHTML = '<a href="' + CFG.loginUrl(location.pathname) + '">Staff login</a>'; return; }
    s.innerHTML = '<span>Signed in as <b>' + esc(session.user.name) + '</b></span><button class="button secondary small" id="logout" type="button">Log out</button>';
    document.getElementById('logout').onclick = function () {
      fetch(CFG.api + '/auth/logout', { method: 'POST', credentials: 'include' })
        .catch(function () {})
        .then(function () { location.href = CFG.login; });
    };
  }

  if (!CFG.enabled) {
    ready(function () {
      slot(null);
      if (root.hasAttribute('data-private')) {
        var bar = el('div', { class: 'preview-bar', role: 'note' },
          'Preview: staff login is not active yet, so this page is open for now. <a href="' + CFG.login + '">See the login page</a>');
        document.body.insertBefore(bar, document.body.firstChild);
      }
    });
    return;
  }

  // Enabled: hide the page until the session check is done, to avoid a flash of staff content.
  if (root.hasAttribute('data-private')) {
    root.classList.add('auth-pending');
    var done = function () { root.classList.remove('auth-pending'); };
    fetch(CFG.api + '/session', { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (r.status === 401) { location.replace(CFG.loginUrl(location.pathname + location.search + location.hash)); return null; }
        if (!r.ok) throw new Error('status ' + r.status);
        return r.json();
      })
      .then(function (session) {
        if (!session) return;
        var roles = session.roles || [];
        var ok = !requires || roles.indexOf(requires) > -1 || roles.indexOf('admin') > -1;
        ready(function () {
          slot(session);
          if (!ok) blocked('No access', 'Your account is signed in but does not have the ' + requires + ' role.', '<a class="button secondary" href="/">Back to the site</a>');
          done();
        });
      })
      .catch(function () {
        ready(function () {
          blocked('Could not check your login', 'The login service did not answer. Try again in a moment.', '<button class="button" onclick="location.reload()">Retry</button>');
          done();
        });
      });
  } else {
    ready(function () { slot(null); });
  }
})();
