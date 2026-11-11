/* Handbook behaviour: page switching, search palette, table filters, copy-on-click. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };

  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: .08 }) : null;
  function reveal(p) {
    $$(':scope>*', p).forEach(function (el) {
      if (el.classList.contains('in')) return;
      if (io) io.observe(el); else el.classList.add('in');
    });
  }

  var side = $('.side');
  function show(id, focus, push) {
    if (!document.getElementById(id) || !$('#' + CSS.escape(id) + '.page')) id = 'home';
    $$('.page').forEach(function (p) { p.classList.toggle('hidden', p.id !== id); });
    $$('.side nav a').forEach(function (a) {
      var on = a.dataset.p === id;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    side.classList.remove('open');
    var pg = document.getElementById(id);
    reveal(pg);
    document.title = (pg.dataset.title ? pg.dataset.title + ' | ' : '') + document.body.dataset.title;
    if (('#' + id) !== location.hash && (push || location.hash)) history[push ? 'pushState' : 'replaceState'](null, '', '#' + id);
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (focus) {
      var td = $$('td', pg).filter(function (t) { return t.textContent.trim() === focus; })[0];
      if (td) setTimeout(function () { td.parentElement.scrollIntoView({ block: 'center', behavior: 'smooth' }); td.parentElement.classList.add('flash'); }, 120);
    }
  }
  var fromHash = function () { return (location.hash || '#home').slice(1) || 'home'; };
  window.addEventListener('hashchange', function () { show(fromHash(), null, false); });

  var tt;
  function toast(m) {
    var t = $('#toast'); t.textContent = m; t.classList.add('on');
    clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('on'); }, 1400);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-p]');
    if (a) { e.preventDefault(); closePal(); show(a.dataset.p, null, true); return; }
    var c = e.target.closest('td code');
    if (c) {
      var t = c.textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject())
        .then(function () { toast('Copied ' + t); }, function () { toast('Press Ctrl+C to copy'); });
    }
  });
  $('#menu').onclick = function () { side.classList.toggle('open'); };

  // Filters for long tables
  $$('.tw').forEach(function (w) {
    var rows = $$('tbody tr', w);
    if (rows.length < 7) return;
    var i = document.createElement('input');
    i.className = 'flt'; i.placeholder = 'Filter ' + rows.length + ' rows'; i.setAttribute('aria-label', 'Filter table');
    w.before(i);
    i.addEventListener('input', function () {
      var v = i.value.toLowerCase();
      rows.forEach(function (r) { r.classList.toggle('hidden', !!v && r.textContent.toLowerCase().indexOf(v) < 0); });
    });
  });

  // Search palette
  var items = [], sel = 0, cur = [];
  $$('.page').forEach(function (p) {
    items.push({ l: p.dataset.title, s: 'Page', p: p.id, k: p.dataset.title.toLowerCase() });
    $$('tbody tr', p).forEach(function (r) {
      var td = $$('td', r); if (td.length < 2) return;
      var c = td[0].textContent.trim();
      items.push({ l: c, d: td[1].textContent.trim(), s: p.dataset.title, p: p.id, f: c, k: (c + ' ' + td[1].textContent).toLowerCase(), code: /^[\/!]/.test(c) });
    });
  });
  function openPal() { $('#pal').classList.add('open'); $('#pin').value = ''; renderPal(); setTimeout(function () { $('#pin').focus(); }, 10); }
  function closePal() { $('#pal').classList.remove('open'); }
  window.openPal = openPal;
  function renderPal() {
    var v = $('#pin').value.trim().toLowerCase();
    cur = (v ? items.filter(function (i) { return v.split(/\s+/).every(function (w) { return i.k.indexOf(w) > -1; }); }) : items.filter(function (i) { return i.s === 'Page'; })).slice(0, 40);
    sel = 0; paint();
  }
  function paint() {
    var box = $('#plist');
    if (!cur.length) { box.innerHTML = '<div class="pe">Nothing found.</div>'; return; }
    box.innerHTML = cur.map(function (i, n) {
      return '<div class="pi ' + (n === sel ? 'sel' : '') + '" data-n="' + n + '" role="option"><span>' + (i.code ? '<code>' + esc(i.l) + '</code>' : '<b>' + esc(i.l) + '</b>') + (i.d ? ' <span style="opacity:.7;font-size:13px"> ' + esc(i.d.slice(0, 60)) + '</span>' : '') + '</span><small>' + esc(i.s) + '</small></div>';
    }).join('');
    var s = $('.pi.sel', box); if (s) s.scrollIntoView({ block: 'nearest' });
  }
  function go(n) { var i = cur[n]; if (!i) return; closePal(); show(i.p, i.f, true); }
  $('#pin').addEventListener('input', renderPal);
  $('#plist').addEventListener('click', function (e) { var r = e.target.closest('.pi'); if (r) go(+r.dataset.n); });
  $('#pal').addEventListener('click', function (e) { if (e.target.id === 'pal') closePal(); });
  $('#kb').onclick = openPal;
  document.addEventListener('keydown', function (e) {
    var open = $('#pal').classList.contains('open');
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open ? closePal() : openPal(); return; }
    if (e.key === '/' && !open && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); openPal(); return; }
    if (!open) { if (e.key === 'Escape') side.classList.remove('open'); return; }
    if (e.key === 'Escape') closePal();
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(cur.length - 1, sel + 1); paint(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); paint(); }
    if (e.key === 'Enter') { e.preventDefault(); go(sel); }
  });

  // Sections are shown by script, so the browser's own jump-to-#id would land mid-page. Reset after load.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  show(fromHash(), null, false);
  window.addEventListener('load', function () { window.scrollTo({ top: 0, behavior: 'instant' }); });
})();
