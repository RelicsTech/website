/* Handbook behaviour: search palette (Ctrl K or /), table filters, copy-on-click, phone labels for tables. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var root = $('.root') || document.body;

  // Column labels for the stacked table layout on phones
  $$('table').forEach(function (t) {
    var h = $$('thead th', t).map(function (x) { return x.textContent.trim(); });
    $$('tbody tr', t).forEach(function (r) {
      $$('td', r).forEach(function (c, i) { if (h[i]) c.setAttribute('data-label', h[i]); });
    });
  });

  // Toast + copy on click
  var toastEl = document.createElement('div');
  toastEl.id = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite');
  root.appendChild(toastEl);
  var tt;
  function toast(m) {
    toastEl.textContent = m; toastEl.classList.add('on');
    clearTimeout(tt); tt = setTimeout(function () { toastEl.classList.remove('on'); }, 1400);
  }
  document.addEventListener('click', function (e) {
    var c = e.target.closest('td .code');
    if (!c) return;
    var t = c.textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject())
      .then(function () { toast('Copied ' + t); }, function () { toast('Press Ctrl+C to copy'); });
  });

  // Filters for long tables
  $$('.tbl').forEach(function (w) {
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

  // Search palette: sections (from the side menu) and every table row
  var items = [], sel = 0, cur = [];
  var titles = {};
  $$('.side .jl a[href^="#"]').forEach(function (a) {
    var id = a.getAttribute('href').slice(1), el = document.getElementById(id);
    if (!el) return;
    titles[id] = a.textContent.trim();
    if (!window.RELICS_GUIDES) items.push({ l: titles[id], s: 'Page', id: id, k: titles[id].toLowerCase() });
  });
  $$('.tbl tbody tr').forEach(function (r) {
    var td = $$('td', r); if (td.length < 2) return;
    var sec = r.closest('div[id]'); if (!sec) return;
    var c = td[0].textContent.trim();
    items.push({ l: c, d: td[1].textContent.trim(), s: titles[sec.id] || sec.id, id: sec.id, row: r, k: (c + ' ' + td[1].textContent).toLowerCase(), code: /^[\/!]/.test(c) });
  });
  var GUIDES = window.RELICS_GUIDES || [];
  GUIDES.forEach(function (g) { items.push({ l: g.t, s: g.s || 'Guide', url: g.u, k: (g.t + ' ' + g.d).toLowerCase() }); });
  if (!items.length) return;

  var pal = document.createElement('div');
  pal.id = 'pal'; pal.setAttribute('role', 'dialog'); pal.setAttribute('aria-modal', 'true'); pal.setAttribute('aria-label', GUIDES.length ? (window.RELICS_SEARCH_LABEL || 'Search the guides') : 'Search the handbook');
  pal.innerHTML = '<div class="pbox"><div class="pbar"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 21 21"/></svg><input id="pin" placeholder="' + (GUIDES.length ? ((window.RELICS_SEARCH_LABEL || 'Search the guides') + '...') : 'Search pages, commands, tags...') + '" autocomplete="off" aria-label="Search"><kbd>Esc</kbd></div><div id="plist" role="listbox"><i class="phl" aria-hidden="true"></i><div id="pitems"></div></div><div class="pfoot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span id="pcount"></span></div></div>';
  root.appendChild(pal);
  var pin = $('#pin'), plist = $('#plist'), pitems = $('#pitems'), phl = $('.phl', plist), pcount = $('#pcount'), opener = null, closeT = 0;

  function openPal() { clearTimeout(closeT); opener = document.activeElement; pal.classList.remove('closing'); pal.classList.add('open'); pin.value = ''; renderPal(); pin.focus({ preventScroll: true }); }
  window.RelicsSearch = function () { if (pal.classList.contains('open')) { closePal(); } else { openPal(); } };
  function hidePal() { pal.classList.add('closing'); clearTimeout(closeT); closeT = setTimeout(function () { pal.classList.remove('open', 'closing'); }, 200); }
  function closePal() { hidePal(); if (opener && opener.focus) opener.focus({ preventScroll: true }); opener = null; }
  function renderPal() {
    var v = pin.value.trim().toLowerCase();
    cur = (v ? items.filter(function (i) { return v.split(/\s+/).every(function (w) { return i.k.indexOf(w) > -1; }); }) : items.filter(function (i) { return i.s === 'Page' || i.s === 'Guide' || i.s === 'Tag'; })).slice(0, 40);
    sel = 0; paint();
  }
  function paint() {
    pcount.textContent = cur.length ? cur.length + (cur.length === 1 ? ' result' : ' results') : '';
    if (!cur.length) { pitems.innerHTML = '<div class="pe">Nothing found.</div>'; phl.style.opacity = 0; return; }
    pitems.innerHTML = cur.map(function (i, n) {
      return '<div class="pi ' + (n === sel ? 'sel' : '') + '" style="--i:' + Math.min(n, 12) + '" data-n="' + n + '" role="option" aria-selected="' + (n === sel) + '"><span>' + (i.code ? '<span class="code">' + esc(i.l) + '</span>' : '<b>' + esc(i.l) + '</b>') + (i.d ? ' <span class="pd">' + esc(i.d.slice(0, 60)) + '</span>' : '') + '</span><small>' + esc(i.s) + '</small></div>';
    }).join('');
    moveHl(true);
  }
  // The blue bar glides to the row you are on (arrows or mouse). The list scrolls by itself, never the page.
  function moveHl(instant) {
    var s = $('.pi.sel', pitems); if (!s) return;
    var t = s.offsetTop, b = t + s.offsetHeight;
    if (t < plist.scrollTop) plist.scrollTop = t - 8; else if (b > plist.scrollTop + plist.clientHeight) plist.scrollTop = b - plist.clientHeight + 8;
    phl.style.transition = instant ? 'none' : '';
    phl.style.opacity = 1; phl.style.height = s.offsetHeight + 'px'; phl.style.transform = 'translateY(' + t + 'px)';
    if (instant) { void phl.offsetWidth; phl.style.transition = ''; }
  }
  function select(n) {
    if (n === sel) return;
    sel = n; $$('.pi', pitems).forEach(function (el, k) { el.classList.toggle('sel', k === sel); el.setAttribute('aria-selected', k === sel); }); moveHl(false);
  }
  function go(n) {
    var i = cur[n]; if (!i) return;
    if (i.url) { hidePal(); opener = null; window.location.href = i.url; return; }
    hidePal(); opener = null;
    var sec = document.getElementById(i.id);
    if (i.row) {
      var flt = i.row.closest('.tbl').previousElementSibling;
      if (flt && flt.classList.contains('flt')) { flt.value = ''; $$('tbody tr', i.row.closest('.tbl')).forEach(function (r) { r.classList.remove('hidden'); }); }
      if (window.RelicsScroll) window.RelicsScroll.to(i.row, { center: true }); else i.row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      i.row.classList.remove('flash'); void i.row.offsetWidth; i.row.classList.add('flash');
    } else if (sec) {
      if (window.RelicsScroll) window.RelicsScroll.to(sec); else sec.scrollIntoView({ behavior: 'smooth' });
    }
    if (history.replaceState) history.replaceState(null, '', '#' + i.id);
  }
  pin.addEventListener('input', renderPal);
  pitems.addEventListener('click', function (e) { var r = e.target.closest('.pi'); if (r) go(+r.dataset.n); });
  pitems.addEventListener('mouseover', function (e) { var r = e.target.closest('.pi'); if (r) select(+r.dataset.n); });
  pal.addEventListener('click', function (e) { if (e.target === pal) closePal(); });

  // The "Search Ctrl K" buttons already in the page open the palette
  document.addEventListener('click', function (e) {
    var b = e.target.closest('a.btn');
    if (b && /^Search\b/.test(b.textContent.trim())) { e.preventDefault(); openPal(); }
  });

  document.addEventListener('keydown', function (e) {
    var open = pal.classList.contains('open') && !pal.classList.contains('closing');
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open ? closePal() : openPal(); return; }
    if (e.key === '/' && !open && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); openPal(); return; }
    if (!open) return;
    if (e.key === 'Escape') closePal();
    if (e.key === 'ArrowDown') { e.preventDefault(); select(Math.min(cur.length - 1, sel + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); select(Math.max(0, sel - 1)); }
    if (e.key === 'Enter') { e.preventDefault(); go(sel); }
  });
})();
