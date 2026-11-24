(() => {
  const top = document.createElement('button');
  top.type = 'button'; top.className = 'tag-top'; top.setAttribute('aria-label', 'Back to top');
  top.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  document.body.append(top);
  const toggleTop = () => top.classList.toggle('show', scrollY > 700);
  addEventListener('scroll', toggleTop, { passive: true }); toggleTop();
  top.addEventListener('click', () => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
  let library;
  const status = document.querySelector('.tag-toast');
  let timer;
  const notify = message => {
    status.textContent = message;
    status.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => status.classList.remove('show'), 6000);
  };
  const data = async () => {
    if (!library) library = fetch('/tags/data.json').then(response => {
      if (!response.ok) throw Error('Could not load the tag text.');
      return response.json();
    }).catch(error => { library = null; throw error; });
    return library;
  };
  async function copy(text) {
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw Error('fallback');
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const previous = document.activeElement;
      const area = document.createElement('textarea');
      area.value = text;
      area.style.cssText = 'position:fixed;inset:0;width:2px;height:2px;opacity:.01';
      document.body.append(area);
      area.focus(); area.select();
      const ok = document.execCommand('copy');
      area.remove();
      if (previous) previous.focus();
      if (!ok) throw Error('Clipboard unavailable. Open the tag and select its Discord Markdown for manual copying.');
    }
    notify(text.length > 2000 ? 'Full text copied. Discord may require splitting long messages or sending them as a text file.' : 'Full text copied for Discord.');
  }
  document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const [slug, version] = button.dataset.copy.split(':');
      const entry = (await data()).find(item => item.slug === slug);
      await copy(entry.variants[Number(version)].copy);
    } catch (error) { notify(error.message || 'Could not copy. Use the manual Markdown field.'); }
    finally { button.disabled = false; }
  }));
  document.querySelectorAll('[data-copy-image]').forEach(button => button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      if (!navigator.clipboard || !window.ClipboardItem || !window.isSecureContext) throw Error('Image copy is not supported here. Long-press or right-click the image and choose Copy image.');
      const bitmap = await createImageBitmap(await (await fetch(button.dataset.copyImage)).blob());
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      canvas.getContext('2d').drawImage(bitmap, 0, 0);
      const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      notify('Image copied. Paste it into Discord.');
    } catch (error) { notify(error.message || 'Could not copy the image.'); }
    finally { button.disabled = false; }
  }));
  document.querySelectorAll('.tag-raw').forEach(area => area.addEventListener('focus', () => area.select()));
  const search = document.getElementById('tag-search');
  if (!search) return;
  const category = document.getElementById('tag-category');
  const cards = [...document.querySelectorAll('.tag-card')];
  const all = document.getElementById('copy-all-tags');
  const normalize = text => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function filter() {
    const words = normalize(search.value).trim().split(/\s+/).filter(Boolean);
    let count = 0;
    for (const card of cards) {
      const matches = (!category.value || card.dataset.category === category.value) && words.every(word => normalize(card.dataset.search).includes(word));
      card.hidden = !matches;
      count += Number(matches);
    }
    document.getElementById('tag-count').textContent = `${count} of ${cards.length} tags`;
    document.getElementById('tag-empty').hidden = count > 0;
    all.disabled = count === 0;
    const url = new URL(location.href);
    for (const [key, value] of [['q', search.value], ['category', category.value]]) {
      if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    }
    history.replaceState(null, '', url);
  }
  const params = new URLSearchParams(location.search);
  search.value = params.get('q') || '';
  const selected = params.get('category');
  if ([...category.options].some(option => option.value === selected)) category.value = selected;
  search.addEventListener('input', filter);
  category.addEventListener('change', filter);
  document.getElementById('clear-tags').addEventListener('click', () => { search.value = ''; category.value = ''; filter(); search.focus(); });
  all.addEventListener('click', async () => {
    all.disabled = true;
    try {
      const visible = new Set(cards.filter(card => !card.hidden).map(card => card.dataset.slug));
      const entries = (await data()).filter(entry => visible.has(entry.slug));
      await copy(entries.map(entry => entry.variants[0].copy).join('\n\n────────────\n\n'));
    } catch (error) { notify(error.message || 'Could not copy all results.'); }
    finally { filter(); }
  });
  filter();
})();
