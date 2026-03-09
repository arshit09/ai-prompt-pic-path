const grid       = document.getElementById('grid');
const countEl    = document.getElementById('count');
const emptyEl    = document.getElementById('empty');
const emptyMsg   = document.getElementById('empty-msg');
const filterEl   = document.getElementById('filter');
const sourceLink     = document.getElementById('source-link');
const sourceWrapLink = document.getElementById('source-wrap-link');
const dlAllBtn   = document.getElementById('dl-all');
const sizeSlider = document.getElementById('size-slider');
const resetBtn        = document.getElementById('reset-btn');
const prefBtn         = document.getElementById('pref-btn');
const prefPanel       = document.getElementById('pref-panel');

const themeDarkBtn    = document.getElementById('theme-dark-btn');
const themeLightBtn   = document.getElementById('theme-light-btn');
const badgeToggleBtn  = document.getElementById('badge-toggle-btn');
const infoToggleBtn   = document.getElementById('info-toggle-btn');

const resetViewBtn    = document.getElementById('reset-view');
const selectionRect   = document.getElementById('selection-rect');
const actionBar       = document.getElementById('action-bar');
const selCount        = document.getElementById('sel-count');
const hideSelBtn      = document.getElementById('hide-sel-btn');
const showOnlySelBtn  = document.getElementById('show-only-sel-btn');
const cancelSelBtn    = document.getElementById('cancel-sel-btn');

let hiddenImages = new Set();
try {
  const storedHidden = sessionStorage.getItem('ipp_hidden_images');
  if (storedHidden) hiddenImages = new Set(JSON.parse(storedHidden));
} catch (e) {}

function saveHidden() {
  sessionStorage.setItem('ipp_hidden_images', JSON.stringify([...hiddenImages]));
  resetViewBtn.style.display = hiddenImages.size > 0 ? '' : 'none';
}

const DEFAULT_SIZE = 220;
let totalImages = 0;

// ── Preferences panel ──────────────────────────────────────────────────────────

prefBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = prefPanel.classList.toggle('hidden');
  prefBtn.classList.toggle('active', !open);
});

document.addEventListener('click', (e) => {
  if (!prefPanel.classList.contains('hidden') &&
      !prefPanel.contains(e.target) && e.target !== prefBtn) {
    prefPanel.classList.add('hidden');
    prefBtn.classList.remove('active');
  }
});



// ── Theme (dark / light) ───────────────────────────────────────────────────────

function applyTheme(dark) {
  document.body.classList.toggle('light', !dark);
  themeDarkBtn.classList.toggle('active', dark);
  themeLightBtn.classList.toggle('active', !dark);
}

themeDarkBtn.addEventListener('click', () => {
  applyTheme(true);
  chrome.storage.local.set({ ipp_dark_mode: true });
});

themeLightBtn.addEventListener('click', () => {
  applyTheme(false);
  chrome.storage.local.set({ ipp_dark_mode: false });
});

// ── Badge visibility ───────────────────────────────────────────────────────────

function applyBadgeVisible(visible) {
  document.body.classList.toggle('badges-hidden', !visible);
  badgeToggleBtn.classList.toggle('on', visible);
}

badgeToggleBtn.addEventListener('click', () => {
  const nowVisible = document.body.classList.contains('badges-hidden');
  applyBadgeVisible(nowVisible);
  chrome.storage.local.set({ ipp_badge_visible: nowVisible });
});

// ── Info visibility ────────────────────────────────────────────────────────────

function applyInfoVisible(visible) {
  document.body.classList.toggle('info-hidden', !visible);
  infoToggleBtn.classList.toggle('on', visible);
}

infoToggleBtn.addEventListener('click', () => {
  const nowVisible = !document.body.classList.contains('info-hidden');
  applyInfoVisible(!nowVisible);
  chrome.storage.local.set({ ipp_info_visible: !nowVisible });
});

// ── Grid size control ──────────────────────────────────────────────────────────

function applySize(px) {
  grid.style.setProperty('--col-min', px + 'px');
  sizeSlider.value = px;
  resetBtn.classList.toggle('active', px !== DEFAULT_SIZE);
}

sizeSlider.addEventListener('input', () => {
  const size = +sizeSlider.value;
  applySize(size);
  chrome.storage.local.set({ ipp_grid_size: size });
});

resetBtn.addEventListener('click', () => {
  applySize(DEFAULT_SIZE);
  chrome.storage.local.remove('ipp_grid_size');
});

// ── Bootstrap ──────────────────────────────────────────────────────────────────

chrome.storage.local.get(['ipp_images', 'ipp_source', 'ipp_grid_size', 'ipp_dark_mode', 'ipp_badge_visible', 'ipp_info_visible'], ({ ipp_images = [], ipp_source, ipp_grid_size, ipp_dark_mode = true, ipp_badge_visible = false, ipp_info_visible = false }) => {
  applyTheme(ipp_dark_mode);
  applySize(ipp_grid_size ?? DEFAULT_SIZE);
  applyBadgeVisible(ipp_badge_visible);
  applyInfoVisible(ipp_info_visible);
  if (ipp_source) {
    let preview = '';
    try { preview = new URL(ipp_source.url).hostname.replace(/^www\./, ''); } catch { preview = ipp_source.url.slice(0, 30); }
    sourceLink.textContent    = preview;
    sourceWrapLink.href       = ipp_source.url;
    sourceWrapLink.title      = ipp_source.url;
  }
  saveHidden();
  renderAll(ipp_images);
  applyFilter(); // make sure to hide items if reload happens
});

// ── Live refresh for sidebar mode (images arrive after the panel opens) ────────

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (!changes.ipp_images && !changes.ipp_source) return;

  const newSource = changes.ipp_source?.newValue;
  if (newSource) {
    let preview = '';
    try { preview = new URL(newSource.url).hostname.replace(/^www\./, ''); } catch { preview = newSource.url.slice(0, 30); }
    sourceLink.textContent = preview;
    sourceWrapLink.href    = newSource.url;
    sourceWrapLink.title   = newSource.url;
  }

  if (changes.ipp_images) {
    grid.innerHTML = '';
    filterEl.value = '';
    emptyEl.classList.add('hidden');
    renderAll(changes.ipp_images.newValue ?? []);
    applyFilter();
  }
});

// ── Render all cards once ──────────────────────────────────────────────────────

function renderAll(images) {
  totalImages = images.length;
  setCount(totalImages, totalImages);

  if (!images.length) {
    showEmpty('No images found on this page.');
    return;
  }

  const badge = { img: 'IMG', srcset: 'SRC', 'css-bg': 'CSS' };
  const DL_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
  const OPEN_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

  const fragment = document.createDocumentFragment();

  for (const img of images) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.src      = img.src.toLowerCase();
    card.dataset.alt      = img.alt.toLowerCase();
    card.dataset.url      = img.src;
    card.dataset.filename = img.filename;

    card.innerHTML = `
      <div class="card-img-wrap">
        <img class="card-img" src="${esc(img.src)}" alt="${esc(img.alt)}" loading="lazy" decoding="async"/>
        <span class="card-badge">${badge[img.type] ?? 'IMG'}</span>
        <div class="card-overlay-btns">
          <a class="card-icon-btn" href="${esc(img.src)}" target="_blank" rel="noopener" title="Open full image">${OPEN_ICON}</a>
          <button class="card-icon-btn card-dl" data-url="${esc(img.src)}" data-filename="${esc(img.filename)}" title="Download image">${DL_ICON}</button>
        </div>
      </div>
      <div class="card-body">
        <div class="card-name" title="${esc(img.alt || img.filename)}">${escHtml(img.alt || img.filename)}</div>
        <div class="card-url" title="${esc(img.src)}">${escHtml(img.src)}</div>
        <div class="card-actions">
          <button class="copy-btn" data-url="${esc(img.src)}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copy</span>
          </button>
          <button class="hide-img-btn" data-url="${esc(img.src)}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Hide</span>
          </button>
        </div>
      </div>`;

    fragment.appendChild(card);
  }

  grid.appendChild(fragment);
}

// ── Filter — show/hide existing cards, no DOM rebuild ─────────────────────────

let filterTimer;
filterEl.addEventListener('input', () => {
  clearTimeout(filterTimer);
  filterTimer = setTimeout(applyFilter, 120);
});

function applyFilter() {
  const q = filterEl.value.toLowerCase().trim();
  let shown = 0;

  for (const card of grid.children) {
    const isHiddenUser = hiddenImages.has(card.dataset.src.toLowerCase());
    card.classList.toggle('hidden-user', isHiddenUser);
    
    if (isHiddenUser) {
      card.classList.add('hidden');
      continue;
    }

    const match = !q || card.dataset.src.includes(q) || card.dataset.alt.includes(q);
    card.classList.toggle('hidden', !match);
    if (match) shown++;
  }

  setCount(shown, totalImages, q);
  if (shown === 0) {
    showEmpty(
      q
        ? `No results for "${q}"\nTry a different filename, URL, or alt text.`
        : 'No images found on this page.'
    );
  } else {
    emptyEl.classList.add('hidden');
  }
}

// ── Event delegation ───────────────────────────────────────────────────────────

grid.addEventListener('click', (e) => {
  const copyBtn = e.target.closest('.copy-btn');
  if (copyBtn) { copyToClipboard(copyBtn.dataset.url, copyBtn); return; }

  const dlBtn = e.target.closest('.card-dl');
  if (dlBtn) { downloadSingle(dlBtn.dataset.url, dlBtn.dataset.filename); return; }
  
  const hideBtn = e.target.closest('.hide-img-btn');
  if (hideBtn) {
    const url = hideBtn.dataset.url.toLowerCase();
    hiddenImages.add(url);
    saveHidden();
    applyFilter();
    return;
  }
});

grid.addEventListener('error', (e) => {
  if (e.target.matches('.card-img')) {
    e.target.closest('.card-img-wrap').classList.add('img-broken');
    e.target.remove();
  }
}, true);

dlAllBtn.addEventListener('click', downloadAllAsZip);

// ── Individual download ────────────────────────────────────────────────────────

function downloadSingle(url, filename) {
  chrome.downloads.download({
    url,
    filename: sanitizeFilename(filename),
    conflictAction: 'uniquify',
    saveAs: false
  });
}

// ── Download All as ZIP ────────────────────────────────────────────────────────

async function downloadAllAsZip() {
  const cards = [...grid.querySelectorAll('.card:not([hidden])')];
  if (!cards.length || dlAllBtn.disabled) return;

  dlAllBtn.disabled = true;

  const seen = new Set();
  const files = [];
  let i = 0;

  for (const card of cards) {
    setDlLabel(`Fetching ${++i} / ${cards.length}…`);
    const name = uniqueFilename(sanitizeFilename(card.dataset.filename), seen);
    try {
      const res = await fetch(card.dataset.url);
      if (res.ok) files.push({ name, data: new Uint8Array(await res.arrayBuffer()) });
    } catch { /* CORS / network error — skip */ }
  }

  if (!files.length) {
    resetDlLabel();
    return;
  }

  setDlLabel('Creating ZIP…');
  const blobUrl = URL.createObjectURL(buildZip(files));
  const skipped = cards.length - files.length;

  chrome.downloads.download({ url: blobUrl, filename: 'images.zip', saveAs: false }, () => {
    URL.revokeObjectURL(blobUrl);
    setDlLabel(skipped ? `Done — ${skipped} skipped` : 'Done!');
    setTimeout(resetDlLabel, 3000);
  });
}

function setDlLabel(text) { dlAllBtn.querySelector('.dl-all-label').textContent = text; }
function resetDlLabel()   { setDlLabel('Download All'); dlAllBtn.disabled = false; }

// ── ZIP builder (STORE mode — images are already compressed) ──────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(data) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function buildZip(files) {
  const enc = new TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const { name, data } of files) {
    const nameBytes = enc.encode(name);
    const crc = crc32(data);
    const size = data.length;

    // Local file header (30 + name)
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0,  0x04034b50, true); // signature
    lv.setUint16(4,  20,         true); // version needed
    lv.setUint32(14, crc,        true); // CRC-32
    lv.setUint32(18, size,       true); // compressed size
    lv.setUint32(22, size,       true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);

    // Central directory entry (46 + name)
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0,  0x02014b50, true); // signature
    cv.setUint16(4,  20,         true); // version made by
    cv.setUint16(6,  20,         true); // version needed
    cv.setUint32(16, crc,        true); // CRC-32
    cv.setUint32(20, size,       true); // compressed size
    cv.setUint32(24, size,       true); // uncompressed size
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset,     true); // local header offset
    central.set(nameBytes, 46);

    locals.push(local, data);
    centrals.push(central);
    offset += local.length + size;
  }

  const centralSize = centrals.reduce((s, c) => s + c.length, 0);

  // End of central directory (22 bytes)
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0,  0x06054b50,    true); // signature
  ev.setUint16(8,  files.length,  true); // entries on disk
  ev.setUint16(10, files.length,  true); // total entries
  ev.setUint32(12, centralSize,   true); // central dir size
  ev.setUint32(16, offset,        true); // central dir offset

  return new Blob([...locals, ...centrals, eocd], { type: 'application/zip' });
}

// ── Copy ───────────────────────────────────────────────────────────────────────

function copyToClipboard(text, btn) {
  const done = () => {
    const span = btn.querySelector('span');
    if (span) span.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { 
      if (span) span.textContent = 'Copy'; 
      btn.classList.remove('copied'); 
    }, 2000);
  };
  navigator.clipboard?.writeText(text).then(done).catch(() => fallbackCopy(text, done))
    ?? fallbackCopy(text, done);
}

function fallbackCopy(text, onSuccess) {
  const ta = Object.assign(document.createElement('textarea'), {
    value: text, style: 'position:fixed;opacity:0'
  });
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); onSuccess(); } catch {}
  ta.remove();
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function setCount(shown, total, q) {
  countEl.textContent = (q && shown !== total)
    ? `${shown} of ${total}`
    : `${total} image${total !== 1 ? 's' : ''}`;
}

function showEmpty(msg) {
  const [line1, line2] = msg.split('\n');
  emptyMsg.innerHTML = line2
    ? `${escHtml(line1)}<span class="empty-hint">${escHtml(line2)}</span>`
    : escHtml(line1);
  emptyEl.classList.remove('hidden');
}

function uniqueFilename(name, seen) {
  if (!seen.has(name)) { seen.add(name); return name; }
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext  = dot > 0 ? name.slice(dot)    : '';
  let i = 1, out;
  do { out = `${base} (${i++})${ext}`; } while (seen.has(out));
  seen.add(out);
  return out;
}

function sanitizeFilename(name) {
  return String(name).replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().slice(0, 200) || 'image';
}

function esc(s) {
  return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Marquee Selection ────────────────────────────────────────────────────────
let isSelecting = false;
let startX = 0, startY = 0;
let hasDragged = false;

document.addEventListener('mousedown', (e) => {
  hasDragged = false;
  if (e.target.closest('.card') || e.target.closest('.header') || e.target.closest('.footer') || e.target.closest('.action-bar') || e.target.closest('.pref-panel')) return;
  if (e.button !== 0) return;
  
  isSelecting = true;
  startX = e.clientX;
  startY = e.clientY;
  
  document.body.classList.add('selecting');
  
  selectionRect.classList.remove('hidden');
  selectionRect.style.left = startX + 'px';
  selectionRect.style.top = startY + 'px';
  selectionRect.style.width = '0px';
  selectionRect.style.height = '0px';
});

document.addEventListener('mousemove', (e) => {
  if (!isSelecting) return;
  
  e.preventDefault();
  
  const width = Math.abs(e.clientX - startX);
  const height = Math.abs(e.clientY - startY);
  if (width > 3 || height > 3) {
    hasDragged = true;
  }
  
  const left = Math.min(startX, e.clientX);
  const top = Math.min(startY, e.clientY);
  
  selectionRect.style.left = left + 'px';
  selectionRect.style.top = top + 'px';
  selectionRect.style.width = width + 'px';
  selectionRect.style.height = height + 'px';
  
  const rect = selectionRect.getBoundingClientRect();
  
  for (const card of grid.children) {
    if (card.classList.contains('hidden') || card.classList.contains('hidden-user')) continue;
    
    const cardRect = card.getBoundingClientRect();
    const isIntersecting = !(rect.right < cardRect.left || 
                             rect.left > cardRect.right || 
                             rect.bottom < cardRect.top || 
                             rect.top > cardRect.bottom);
                             
    card.classList.toggle('selected', isIntersecting);
  }
});

document.addEventListener('mouseup', (e) => {
  if (!isSelecting) return;
  isSelecting = false;
  document.body.classList.remove('selecting');
  selectionRect.classList.add('hidden');
  updateActionBar(e.clientX, e.clientY);
});

function updateActionBar(mouseX, mouseY) {
  const selectedCount = grid.querySelectorAll('.card.selected').length;
  if (selectedCount > 0) {
    selCount.textContent = `${selectedCount} selected`;
    actionBar.classList.remove('hidden');

    if (mouseX !== undefined && mouseY !== undefined) {
      // Small delay to let browser calculate correct dimensions for new vertical layout
      requestAnimationFrame(() => {
        const gap = 12;
        const barRect = actionBar.getBoundingClientRect();
        const margin = 20;

        let left = mouseX - (barRect.width / 2);
        let top = mouseY + gap;

        // Ensure it stays within viewport horizontally
        if (left + barRect.width > window.innerWidth - margin) {
          left = window.innerWidth - barRect.width - margin;
        }
        if (left < margin) {
          left = margin;
        }

        // Check bottom edge
        if (top + barRect.height > window.innerHeight - margin) {
          // Flip above cursor if no space below
          top = mouseY - barRect.height - gap;
        }
        
        // Final safety check for top edge
        if (top < margin) top = margin;

        actionBar.style.left = left + 'px';
        actionBar.style.top = top + 'px';
        actionBar.style.bottom = 'auto';
        actionBar.style.transform = 'none';
      });
    }
  } else {
    actionBar.classList.add('hidden');
  }
}

document.addEventListener('click', (e) => {
  if (hasDragged) return;
  if (e.target.closest('.header') || e.target.closest('.footer') || e.target.closest('.action-bar') || e.target.closest('.pref-panel')) return;
  if (e.target.closest('button') || e.target.closest('a')) return;

  grid.querySelectorAll('.card.selected').forEach(c => c.classList.remove('selected'));
  updateActionBar();
});

hideSelBtn.addEventListener('click', () => {
  const selected = grid.querySelectorAll('.card.selected');
  for (const card of selected) {
    hiddenImages.add(card.dataset.src.toLowerCase());
    card.classList.remove('selected');
  }
  saveHidden();
  updateActionBar();
  applyFilter();
});

showOnlySelBtn.addEventListener('click', () => {
  const allVisible = grid.querySelectorAll('.card:not(.hidden-user):not(.hidden)');
  for (const card of allVisible) {
    if (!card.classList.contains('selected')) {
      hiddenImages.add(card.dataset.src.toLowerCase());
    } else {
      card.classList.remove('selected');
    }
  }
  saveHidden();
  updateActionBar();
  applyFilter();
});

cancelSelBtn.addEventListener('click', () => {
  grid.querySelectorAll('.card.selected').forEach(c => c.classList.remove('selected'));
  updateActionBar();
});

resetViewBtn.addEventListener('click', () => {
  hiddenImages.clear();
  saveHidden();
  applyFilter();
});
