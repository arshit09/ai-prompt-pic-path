(() => {
  if (window.__imgPathPickerLoaded) return;
  window.__imgPathPickerLoaded = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action !== 'collect') return;

    const images = collectImages();
    // Await storage write before signalling background to open gallery
    chrome.storage.local
      .set({ ipp_images: images, ipp_source: { url: location.href, title: document.title } })
      .then(() => sendResponse({ ok: true, count: images.length }));

    return true; // keep message channel open for async response
  });

  function collectImages() {
    const seen = new Set();
    const images = [];

    function push(src, alt, type) {
      if (!src || seen.has(src) || src.startsWith('data:')) return;
      seen.add(src);
      images.push({ src, alt: alt || '', filename: extractFilename(src), type });
    }

    for (const img of document.querySelectorAll('img')) {
      push(img.currentSrc || img.src, img.alt, 'img');
    }

    for (const source of document.querySelectorAll('source[srcset]')) {
      for (const entry of source.srcset.split(',')) {
        push(entry.trim().split(/\s+/)[0], '', 'srcset');
      }
    }

    for (const el of document.querySelectorAll('*')) {
      const bg = getComputedStyle(el).backgroundImage;
      if (!bg || bg === 'none') continue;
      for (const m of bg.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
        push(m[1], '', 'css-bg');
      }
    }

    return images;
  }

  function extractFilename(url) {
    try {
      return new URL(url, location.href).pathname.split('/').pop().split('?')[0] || url;
    } catch {
      return url.split('/').pop().split('?')[0] || url;
    }
  }
})();
