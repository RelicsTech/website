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
    items.push({ l: titles[id], s: 'Page', id: id, k: titles[id].toLowerCase() });
  });
  $$('.tbl tbody tr').forEach(function (r) {
    var td = $$('td', r); if (td.length < 2) return;
    var sec = r.closest('div[id]'); if (!sec) return;
    var c = td[0].textContent.trim();
    items.push({ l: c, d: td[1].textContent.trim(), s: titles[sec.id] || sec.id, id: sec.id, row: r, k: (c + ' ' + td[1].textContent).toLowerCase(), code: /^[\/!]/.test(c) });
  });
  if (!items.length) return;

  var pal = document.createElement('div');
  pal.id = 'pal'; pal.setAttribute('role', 'dialog'); pal.setAttribute('aria-modal', 'true'); pal.setAttribute('aria-label', 'Search the handbook');
  pal.innerHTML = '<div class="pbox"><input id="pin" placeholder="Search pages, commands, tags..." autocomplete="off" aria-label="Search"><div id="plist" role="listbox"></div></div>';
  root.appendChild(pal);
  var pin = $('#pin'), plist = $('#plist'), opener = null;

  function openPal() { opener = document.activeElement; pal.classList.add('open'); pin.value = ''; renderPal(); setTimeout(function () { pin.focus(); }, 10); }
  function closePal() { pal.classList.remove('open'); if (opener && opener.focus) opener.focus(); }
  function renderPal() {
    var v = pin.value.trim().toLowerCase();
    cur = (v ? items.filter(function (i) { return v.split(/\s+/).every(function (w) { return i.k.indexOf(w) > -1; }); }) : items.filter(function (i) { return i.s === 'Page'; })).slice(0, 40);
    sel = 0; paint();
  }
  function paint() {
    if (!cur.length) { plist.innerHTML = '<div class="pe">Nothing found.</div>'; return; }
    plist.innerHTML = cur.map(function (i, n) {
      return '<div class="pi ' + (n === sel ? 'sel' : '') + '" data-n="' + n + '" role="option" aria-selected="' + (n === sel) + '"><span>' + (i.code ? '<span class="code">' + esc(i.l) + '</span>' : '<b>' + esc(i.l) + '</b>') + (i.d ? ' <span class="pd">' + esc(i.d.slice(0, 60)) + '</span>' : '') + '</span><small>' + esc(i.s) + '</small></div>';
    }).join('');
    var s = $('.pi.sel', plist); if (s) s.scrollIntoView({ block: 'nearest' });
  }
  function go(n) {
    var i = cur[n]; if (!i) return;
    pal.classList.remove('open'); opener = null;
    var sec = document.getElementById(i.id);
    if (i.row) {
      var flt = i.row.closest('.tbl').previousElementSibling;
      if (flt && flt.classList.contains('flt')) { flt.value = ''; $$('tbody tr', i.row.closest('.tbl')).forEach(function (r) { r.classList.remove('hidden'); }); }
      i.row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      i.row.classList.remove('flash'); void i.row.offsetWidth; i.row.classList.add('flash');
    } else if (sec) {
      sec.scrollIntoView({ behavior: 'smooth' });
    }
    if (history.replaceState) history.replaceState(null, '', '#' + i.id);
  }
  pin.addEventListener('input', renderPal);
  plist.addEventListener('click', function (e) { var r = e.target.closest('.pi'); if (r) go(+r.dataset.n); });
  pal.addEventListener('click', function (e) { if (e.target === pal) closePal(); });

  // The "Search Ctrl K" buttons already in the page open the palette
  document.addEventListener('click', function (e) {
    var b = e.target.closest('a.btn');
    if (b && /^Search\b/.test(b.textContent.trim())) { e.preventDefault(); openPal(); }
  });

  document.addEventListener('keydown', function (e) {
    var open = pal.classList.contains('open');
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open ? closePal() : openPal(); return; }
    if (e.key === '/' && !open && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); openPal(); return; }
    if (!open) return;
    if (e.key === 'Escape') closePal();
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(cur.length - 1, sel + 1); paint(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); paint(); }
    if (e.key === 'Enter') { e.preventDefault(); go(sel); }
  });
})();
