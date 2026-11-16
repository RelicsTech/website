/* Relics site behaviour: theme toggle, pointer effects, smooth wheel scrolling. No dependencies. */
(function () {
  'use strict';
  var root = function () { return document.querySelector('.root'); };

  /* ---- Theme: default = browser setting, toggle overrides, choice is shared across pages ---- */
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  function effective(r) {
    var th = r.getAttribute('data-th');
    return th ? th === 'dark' : (r.classList.contains('th-dark') || (r.classList.contains('th-auto') && mq.matches));
  }
  function sync() {
    var r = root(); if (!r) return;
    var dark = effective(r);
    r.setAttribute('data-eff', dark ? 'dark' : 'light');
    var b = r.querySelector('.tt');
    if (b) b.setAttribute('aria-pressed', dark ? 'true' : 'false');
  }
  document.addEventListener('DOMContentLoaded', function () {
    var r = root(); if (!r) return;
    try { var s = localStorage.getItem('relics-th'); if (s === 'dark' || s === 'light') r.setAttribute('data-th', s); } catch (e) {}
    sync();
  });
  if (mq.addEventListener) mq.addEventListener('change', sync);
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.tt');
    if (!b) return;
    var r = b.closest('.root');
    var next = effective(r) ? 'light' : 'dark';
    function apply() {
      r.setAttribute('data-th', next);
      sync();
      try { localStorage.setItem('relics-th', next); } catch (x) {}
    }
    b.classList.remove('spin'); void b.offsetWidth; b.classList.add('spin');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { apply(); return; }
    var phone = window.matchMedia('(max-width:820px), (pointer:coarse)').matches;
    if (document.startViewTransition && !phone) {
      var bb = b.getBoundingClientRect(), x = bb.left + bb.width / 2, y = bb.top + bb.height / 2;
      var rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      var de = document.documentElement; de.classList.add('vt-theme');
      var vt = document.startViewTransition(apply);
      vt.finished.then(function () { de.classList.remove('vt-theme'); }, function () { de.classList.remove('vt-theme'); });
      vt.ready.then(function () {
        document.documentElement.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + rad + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 700, easing: 'cubic-bezier(.3,.7,.2,1)', pseudoElement: '::view-transition-new(root)' });
      }, function () {});
    } else {
      r.classList.add('theme-anim'); apply();
      setTimeout(function () { r.classList.remove('theme-anim'); }, 700);
    }
  });
  window.addEventListener('storage', function (e) {
    if (e.key !== 'relics-th' || !root()) return;
    if (e.newValue === 'dark' || e.newValue === 'light') root().setAttribute('data-th', e.newValue);
    sync();
  });

  /* ---- Pointer effects (spotlight, vignette): one update per animation frame, paused while the page scrolls ---- */
  var fine = window.matchMedia('(pointer:fine)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var scrolling = false, scrollTimer = 0;
  function markScrolling() { scrolling = true; clearTimeout(scrollTimer); scrollTimer = setTimeout(function () { scrolling = false; }, 140); }
  window.addEventListener('scroll', markScrolling, { passive: true });
  if (fine && !reduce) {
    var raf = 0, ptr = null, vig = null;
    document.addEventListener('DOMContentLoaded', function () {
      var r = root();
      if (r && r.classList.contains('cur-vignette')) {
        /* a viewport-sized layer of its own: moving it never restyles the page */
        vig = document.createElement('div'); vig.className = 'vig'; vig.setAttribute('aria-hidden', 'true'); r.appendChild(vig);
      }
    });
    document.addEventListener('mousemove', function (e) {
      ptr = e;
      if (raf || scrolling) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        if (!ptr || scrolling) return;
        if (vig) { vig.style.setProperty('--vx', ptr.clientX + 'px'); vig.style.setProperty('--vy', ptr.clientY + 'px'); }
        var t = ptr.target && ptr.target.closest ? ptr.target.closest('.card,.dkc,.hero') : null;
        if (t) {
          var c = t.getBoundingClientRect();
          t.style.setProperty('--cx', (ptr.clientX - c.left) + 'px');
          t.style.setProperty('--cy', (ptr.clientY - c.top) + 'px');
          if (t.classList.contains('hero')) {
            t.style.setProperty('--nx', String(((ptr.clientX - c.left) / c.width - 0.5) * 2));
            t.style.setProperty('--ny', String(((ptr.clientY - c.top) / c.height - 0.5) * 2));
          }
        }
      });
    }, { passive: true });
  }

  /* ---- Gear in the hero art: click (or Enter) to spin it with a ripple ---- */
  document.addEventListener('DOMContentLoaded', function () {
    var NS = 'http://www.w3.org/2000/svg';
    Array.prototype.forEach.call(document.querySelectorAll('svg.artsvg'), function (svg) {
      var g = svg.querySelector('g[transform^="translate"]'); if (!g) return;
      var paths = g.querySelectorAll('path'); if (!paths.length) return;
      var spin = document.createElementNS(NS, 'g');
      spin.setAttribute('class', 'gear-spin'); spin.setAttribute('role', 'button'); spin.setAttribute('tabindex', '0'); spin.setAttribute('aria-label', 'Spin the gear');
      var ring = document.createElementNS(NS, 'circle');
      ring.setAttribute('class', 'gear-ring'); ring.setAttribute('r', '70');
      Array.prototype.forEach.call(paths, function (pa) { spin.appendChild(pa); });
      g.appendChild(ring); g.appendChild(spin);
      var turns = 0;
      function go() {
        if (window.RelicsSearch) window.RelicsSearch();
        turns += 1;
        spin.style.transform = 'rotate(' + (turns * 540) + 'deg) scale(' + (turns % 2 ? 1.12 : 1) + ')';
        ring.classList.remove('go'); void ring.getBoundingClientRect(); ring.classList.add('go');
      }
      spin.addEventListener('click', go);
      spin.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  });

  /* ---- Current chapter in the menu (scroll spy): the link of the section you are in gets .on ---- */
  document.addEventListener('DOMContentLoaded', function () {
    var links = Array.prototype.slice.call(document.querySelectorAll('.side .jl a[href^="#"]'));
    var pairs = links.map(function (a) { return [a, document.getElementById(a.getAttribute('href').slice(1))]; }).filter(function (p) { return p[1]; });
    if (!pairs.length) return;
    var ticking = false;
    function update() {
      ticking = false;
      var line = innerHeight * 0.35, cur = pairs[0];
      pairs.forEach(function (p) { if (p[1].getBoundingClientRect().top <= line) cur = p; });
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) cur = pairs[pairs.length - 1];
      pairs.forEach(function (p) {
        var on = p === cur;
        p[0].classList.toggle('on', on);
        if (on) p[0].setAttribute('aria-current', 'location'); else p[0].removeAttribute('aria-current');
      });
    }
    function req() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    addEventListener('scroll', req, { passive: true }); addEventListener('resize', req);
    update();
  });

  /* ---- Entrance + direction of travel between pages ---- */
  var RANK = { '/': 0, '/handbook/': 1, '/handbook/specialist/': 2, '/handbook/moderation/': 3 };
  function rank(path) { path = path.replace(/index\.html$/, ''); return path in RANK ? RANK[path] : 4; }
  function dirFor(fromPath, toPath) { return rank(toPath) >= rank(fromPath) ? 'forward' : 'back'; }
  var hasVT = 'PageSwapEvent' in window || 'PageRevealEvent' in window;
  function addType(e) { try { if (e.viewTransition) e.viewTransition.types.add(e._dir); } catch (x) {} }
  window.addEventListener('pageswap', function (e) {
    try { e._dir = dirFor(new URL(e.activation.from.url).pathname, new URL(e.activation.entry.url).pathname); addType(e); } catch (x) {}
  });
  var noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function enter() {
    if (noMotion || !document.documentElement.animate) return;
    var EASE = 'cubic-bezier(.16,1,.3,1)';
    function a(sel, from, dur, delay, each) {
      Array.prototype.forEach.call(document.querySelectorAll(sel), function (el, i) {
        el.animate([from, { opacity: 1, transform: 'none' }], { duration: dur, delay: delay + (each || 0) * i, easing: EASE, fill: 'backwards' });
      });
    }
    a('.side .lkb', { opacity: 0, transform: 'translateX(-32px)' }, 800, 0);
    a('.side .jl a', { opacity: 0, transform: 'translateX(-32px)' }, 700, 200, 55);
    a('.side .nvc > *', { opacity: 0, transform: 'translateY(24px)' }, 700, 500, 70);
    a('.hero .artw', { opacity: 0, transform: 'translateY(80px) scale(.84) rotate(-3deg)' }, 1300, 150);
    a('.hero .kick', { opacity: 0, transform: 'translateY(40px)' }, 900, 300);
    a('.hero h1', { opacity: 0, transform: 'translateY(60px)' }, 1100, 380);
    a('.hero .hrow', { opacity: 0, transform: 'translateY(40px)' }, 1000, 650);
    if (!hasVT) {
      var m = document.querySelector('main');
      if (m && document.referrer) {
        try {
          var u = new URL(document.referrer);
          if (u.origin === location.origin) {
            var fwd = dirFor(u.pathname, location.pathname) === 'forward';
            m.animate([{ opacity: 0, transform: 'translateX(' + (fwd ? '8%' : '-8%') + ')' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: EASE });
          }
        } catch (x) {}
      }
    }
  }
  document.addEventListener('DOMContentLoaded', enter);
  /* browsers without cross-page view transitions: slide the content out before leaving */
  document.addEventListener('click', function (e) {
    if (hasVT || noMotion || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target || a.hasAttribute('download')) return;
    var u; try { u = new URL(a.href); } catch (x) { return; }
    if (u.origin !== location.origin || u.pathname === location.pathname) return;
    var m = document.querySelector('main'); if (!m || !m.animate) return;
    e.preventDefault();
    var fwd = dirFor(location.pathname, u.pathname) === 'forward';
    var an = m.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(' + (fwd ? '-8%' : '8%') + ')' }], { duration: 320, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
    an.onfinish = function () { location.href = a.href; };
    setTimeout(function () { location.href = a.href; }, 600);
  });

  /* ---- The corner gear (it flies in from the hero while you scroll): click = search in handbooks, back to top elsewhere ---- */
  window.RelicsGear = function () {
    if (window.RelicsSearch) window.RelicsSearch(); else if (window.RelicsScroll) window.RelicsScroll.top();
  };
  document.addEventListener('DOMContentLoaded', function () {
    var g = document.querySelector('.gind'); if (!g) return;
    function label() { var t = window.RelicsSearch ? 'Search the handbook' : 'Back to top'; g.setAttribute('aria-label', t); g.title = t; }
    g.removeAttribute('aria-hidden'); g.setAttribute('role', 'button'); g.setAttribute('tabindex', '0');
    var spin = g.querySelector('.gspin'), turns = 0, tk = false;
    function upd() { tk = false; g.classList.toggle('live', window.scrollY > 300); }
    window.addEventListener('scroll', function () { if (!tk) { tk = true; requestAnimationFrame(upd); } }, { passive: true });
    function act() { window.RelicsGear(); }
    g.addEventListener('click', act);
    g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
    window.addEventListener('load', function () { label(); upd(); });
    label(); upd();
  });

  /* ---- Phone menu: keep the chip of the current chapter in view ---- */
  document.addEventListener('DOMContentLoaded', function () {
    var jl = document.querySelector('.side .jl'); if (!jl) return;
    var mo = new MutationObserver(function () {
      if (!window.matchMedia('(max-width:820px)').matches) return;
      var a = jl.querySelector('a.on'); if (!a) return;
      jl.scrollTo({ left: a.offsetLeft - (jl.clientWidth - a.offsetWidth) / 2, behavior: 'smooth' });
    });
    mo.observe(jl, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });

  /* ---- Scrolling: RelicsScroll.to(y | element) glides to a spot; the wheel is smoothed on desktop ---- */
  function padTop() { return parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0; }
  function targetY(t, center) {
    if (typeof t === 'number') return t;
    var r = t.getBoundingClientRect();
    return center ? r.top + window.scrollY - (innerHeight / 2 - r.height / 2) : r.top + window.scrollY - padTop();
  }
  window.RelicsScroll = {
    to: function (t, o) { window.scrollTo({ top: targetY(t, o && o.center), behavior: reduce ? 'auto' : 'smooth' }); },
    top: function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); }
  };
  if (reduce || window.matchMedia('(pointer:coarse)').matches) return;
  var cur = window.scrollY, target = cur, running = false, anim = false;
  function maxY() { return document.documentElement.scrollHeight - innerHeight; }
  function clamp(v) { return Math.max(0, Math.min(maxY(), v)); }
  function innerScroll(el, dy) {
    while (el && el.nodeType === 1 && el !== document.body && el !== document.documentElement) {
      var s = getComputedStyle(el);
      if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 6) {
        if ((dy < 0 && el.scrollTop > 0) || (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1)) return true;
      }
      el = el.parentElement;
    }
    return false;
  }
  var TAU = 170, lastTs = 0, hist = [], idle = 0, off = false, dog = 0;
  /* safety net: if smoothing ever stops moving the page, give scrolling back to the browser */
  function bail() { off = true; running = false; anim = false; var t = isFinite(target) ? target : window.scrollY; window.scrollTo({ top: t, behavior: 'instant' }); }
  function tick(ts) {
    var dt = Math.min(48, Math.max(1, ts - (lastTs || ts - 16))); lastTs = ts;
    var d = target - cur;
    if (!isFinite(d) || !isFinite(cur)) { cur = target = window.scrollY; bail(); return; }
    if (Math.abs(d) < 0.4) { cur = target; window.scrollTo({ top: cur, behavior: 'instant' }); running = false; lastTs = 0; return; }
    cur += d * (1 - Math.exp(-dt / TAU));
    window.scrollTo({ top: cur, behavior: 'instant' });
    requestAnimationFrame(tick);
  }
  function go() {
    if (!running) {
      running = true; lastTs = 0; requestAnimationFrame(tick);
      var y0 = window.scrollY; clearTimeout(dog);
      dog = setTimeout(function () { if (running && Math.abs(window.scrollY - y0) < 1 && Math.abs(target - y0) > 20) bail(); }, 400);
    }
  }
  /* timed glide (ease in and out) for jumps: menu links, search results, back to top */
  function glideTo(y) {
    if (off) { window.scrollTo({ top: y, behavior: 'smooth' }); return; }
    var from = window.scrollY, to = clamp(y), dist = Math.abs(to - from);
    if (dist < 2) return;
    var dur = Math.min(1500, Math.max(600, 520 + dist * 0.2)), t0 = null;
    running = false; anim = true;
    (function step(ts) {
      if (!anim) return;
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      cur = from + (to - from) * e;
      window.scrollTo({ top: cur, behavior: 'instant' });
      if (p < 1) requestAnimationFrame(step); else { anim = false; cur = target = to; }
    })(performance.now());
  }
  window.RelicsScroll = {
    to: function (t, o) { glideTo(targetY(t, o && o.center)); },
    top: function () { glideTo(0); }
  };
  window.addEventListener('wheel', function (e) {
    if (off || e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (innerScroll(e.target, e.deltaY)) return;
    e.preventDefault();
    if (anim) { anim = false; cur = target = window.scrollY; }
    var dy = e.deltaMode === 1 ? e.deltaY * 34 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
    if (!running) cur = window.scrollY;
    target = clamp(target + dy);
    go();
    /* a short, gentle glide after the wheel stops */
    var now = Date.now(); hist.push([now, dy]);
    while (hist.length && now - hist[0][0] > 160) hist.shift();
    clearTimeout(idle);
    idle = setTimeout(function () {
      var v = 0; hist.forEach(function (h) { v += h[1]; }); hist = [];
      if (Math.abs(v) > 120) { target = clamp(target + Math.max(-240, Math.min(240, v * 0.45))); go(); }
    }, 70);
  }, { passive: false });
  window.addEventListener('keydown', function () { anim = false; }, true);
  window.addEventListener('scroll', function () { if (!running && !anim) { cur = target = window.scrollY; } }, { passive: true });
  window.addEventListener('resize', function () { target = clamp(target); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    var el = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
    if (!el) return;
    e.preventDefault();
    glideTo(targetY(el));
    history.pushState(null, '', a.getAttribute('href'));
  });
})();
