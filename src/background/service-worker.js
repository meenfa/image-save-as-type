const MENU_ROOT = 'save-as-type';
const FORMATS = [
  ['original', 'Original'],
  ['png', 'PNG'],
  ['jpg', 'JPG'],
  ['webp', 'WebP'],
];
const OFFSCREEN_PATH = 'offscreen.html';
let creatingOffscreen;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENU_ROOT, title: 'Save Image As Type', contexts: ['image'] });
    for (const [format, title] of FORMATS) {
      chrome.contextMenus.create({ id: format, parentId: MENU_ROOT, title, contexts: ['image'] });
    }
  });
});

async function ensureOffscreenDocument() {
  const url = chrome.runtime.getURL(OFFSCREEN_PATH);
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'], documentUrls: [url] });
  if (contexts.length) return;
  if (creatingOffscreen) return creatingOffscreen;
  creatingOffscreen = chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ['BLOBS'],
    justification: 'Decode and convert selected images with createImageBitmap and canvas before downloading.',
  });
  try { await creatingOffscreen; } finally { creatingOffscreen = undefined; }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const format = info.menuItemId;
  if (!FORMATS.some(([id]) => id === format)) return;
  let imageUrl = info.srcUrl || '';
  if (tab?.id != null) {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CONTEXT_IMAGE' });
      imageUrl = response?.imageUrl || imageUrl;
    } catch { /* restricted pages may not allow the content script */ }
  }
  if (!imageUrl) {
    console.error('Could not determine the selected image URL.');
    return;
  }
  try {
    await ensureOffscreenDocument();
    const result = await chrome.runtime.sendMessage({ type: 'PROCESS_IMAGE', imageUrl, format });
    if (!result?.ok) throw new Error(result?.error || 'Image processing failed.');
    let downloadId;
    try {
      downloadId = await chrome.downloads.download({ url: result.objectUrl, filename: result.filename, saveAs: true });
    } catch (error) {
      await chrome.runtime.sendMessage({ type: 'REVOKE_OBJECT_URL', objectUrl: result.objectUrl });
      throw new Error(`Could not start download. ${error.message}`);
    }
    await chrome.runtime.sendMessage({ type: 'SCHEDULE_REVOKE', objectUrl: result.objectUrl });
    // Keep the offscreen-created blob URL alive until Chrome has finished reading it.
    const onChanged = (delta) => {
      if (delta.id === downloadId && ['complete', 'interrupted'].includes(delta.state?.current)) {
        chrome.downloads.onChanged.removeListener(onChanged);
        chrome.runtime.sendMessage({ type: 'REVOKE_OBJECT_URL', objectUrl: result.objectUrl }).catch(() => {});
      }
    };
    chrome.downloads.onChanged.addListener(onChanged);
    setTimeout(() => {
      chrome.downloads.onChanged.removeListener(onChanged);
      chrome.runtime.sendMessage({ type: 'REVOKE_OBJECT_URL', objectUrl: result.objectUrl }).catch(() => {});
    }, 60_000);
  } catch (error) {
    const message = error.message || 'Image processing failed.';
    console.error(message);
    if (tab?.id != null) {
      try { await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_IMAGE_ERROR', error: message }); }
      catch { /* extension or browser pages may not accept content script messages */ }
    }
  }
});
