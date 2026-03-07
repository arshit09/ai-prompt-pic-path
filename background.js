function drawIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size / 48;

  ctx.fillStyle = '#1d4ed8';
  ctx.beginPath();
  ctx.roundRect(2 * s, 2 * s, 44 * s, 44 * s, 8 * s);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(8 * s, 12 * s, 32 * s, 24 * s);

  ctx.fillStyle = '#93c5fd';
  ctx.fillRect(10 * s, 14 * s, 28 * s, 20 * s);

  ctx.fillStyle = '#1e40af';
  ctx.beginPath();
  ctx.moveTo(10 * s, 34 * s); ctx.lineTo(22 * s, 20 * s); ctx.lineTo(34 * s, 34 * s);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.moveTo(26 * s, 34 * s); ctx.lineTo(34 * s, 23 * s); ctx.lineTo(38 * s, 34 * s);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(33 * s, 19 * s, 3.5 * s, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

function setIcon() {
  chrome.action.setIcon({
    imageData: { 16: drawIcon(16), 32: drawIcon(32), 48: drawIcon(48), 128: drawIcon(128) }
  });
}

chrome.runtime.onInstalled.addListener(setIcon);
chrome.runtime.onStartup.addListener(setIcon);

chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    await chrome.tabs.sendMessage(tab.id, { action: 'collect' });
  } catch {
    // Restricted page (chrome://, new tab, etc.) — gallery will show empty state
  }

  chrome.tabs.create({ url: chrome.runtime.getURL('gallery.html') });
});
