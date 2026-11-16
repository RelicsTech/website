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
    r.setAttribute('data-th', next);
    sync();
    try { localStorage.setItem('relics-th', next); } catch (x) {}
  });
  window.addEventListener('storage', function (e) {
    if (e.key !== 'relics-th' || !root()) return;
    if (e.newValue === 'dark' || e.newValue === 'light') root().setAttribute('data-th', e.newValue);
    sync();
  });

  /* ---- Pointer effects (spotlight, vignette): one update per animation frame ---- */
  var fine = window.matchMedia('(pointer:fine)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (fine && !reduce) {
    var raf = 0, last = null;
    document.addEventListener('mousemove', function (e) {
      last = e;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var r = root(); if (!r || !last) return;
        var b = r.getBoundingClientRect();
        r.style.setProperty('--mx', (last.clientX - b.left) + 'px');
        r.style.setProperty('--my', (last.clientY - b.top) + 'px');
        var t = last.target && last.target.closest ? last.target.closest('.card,.dkc,.hero') : null;
        if (t) {
          var c = t.getBoundingClientRect();
          t.style.setProperty('--cx', (last.clientX - c.left) + 'px');
          t.style.setProperty('--cy', (last.clientY - c.top) + 'px');
        }
        var st = document.documentElement.style;
        st.setProperty('--nx', String((last.clientX / innerWidth - 0.5) * 2));
        st.setProperty('--ny', String((last.clientY / innerHeight - 0.5) * 2));
      });
    }, { passive: true });
  }

  /* ---- Smooth wheel scrolling (inertia). Off for touch, reduced motion, nested scrollers, zoom. ---- */
  if (reduce || window.matchMedia('(pointer:coarse)').matches) return;
  var cur = window.scrollY, target = cur, running = false, EASE = 0.12;
  function maxY() { return document.documentElement.scrollHeight - innerHeight; }
  function clamp(v) { return Math.max(0, Math.min(maxY(), v)); }
  function innerScroll(el, dy) {
    while (el && el !== document.body && el !== document.documentElement) {
      var s = getComputedStyle(el);
      if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1) {
        if ((dy < 0 && el.scrollTop > 0) || (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1)) return true;
      }
      el = el.parentElement;
    }
    return false;
  }
  function tick() {
    var d = target - cur;
    if (Math.abs(d) < 0.5) { cur = target; window.scrollTo({ top: cur, behavior: 'instant' }); running = false; return; }
    cur += d * EASE;
    window.scrollTo({ top: cur, behavior: 'instant' });
    requestAnimationFrame(tick);
  }
  function go() { if (!running) { running = true; requestAnimationFrame(tick); } }
  window.addEventListener('wheel', function (e) {
    if (e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (innerScroll(e.target, e.deltaY)) return;
    e.preventDefault();
    var dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
    if (!running) cur = window.scrollY;
    target = clamp(target + dy);
    go();
  }, { passive: false });
  window.addEventListener('scroll', function () { if (!running) { cur = target = window.scrollY; } }, { passive: true });
  window.addEventListener('resize', function () { target = clamp(target); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    var el = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
    if (!el) return;
    e.preventDefault();
    var pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    if (!running) cur = window.scrollY;
    target = clamp(el.getBoundingClientRect().top + window.scrollY - pad);
    go();
    history.pushState(null, '', a.getAttribute('href'));
  });
})();
