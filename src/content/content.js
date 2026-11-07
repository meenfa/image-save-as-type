let lastImageUrl = '';

document.addEventListener('contextmenu', (event) => {
  lastImageUrl = '';
  const image = event.target instanceof Element ? event.target.closest('img') : null;
  lastImageUrl = image?.currentSrc || image?.src || '';
}, true);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'GET_CONTEXT_IMAGE') {
    sendResponse({ imageUrl: lastImageUrl });
  } else if (message?.type === 'SHOW_IMAGE_ERROR') {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'closed' });
    const notice = document.createElement('div');
    notice.textContent = `Image Save As Type: ${message.error}`;
    Object.assign(notice.style, {
      position: 'fixed', zIndex: '2147483647', right: '16px', bottom: '16px',
      maxWidth: 'min(480px, calc(100vw - 32px))', padding: '12px 16px',
      borderRadius: '8px', background: '#202124', color: '#fff',
      font: '14px/1.45 system-ui, sans-serif', boxShadow: '0 2px 12px #0006',
    });
    shadow.append(notice);
    document.documentElement.append(host);
    setTimeout(() => host.remove(), 8000);
  }
});
