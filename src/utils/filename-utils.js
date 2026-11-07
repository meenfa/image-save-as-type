const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/tiff': 'tif',
};

const IMAGE_EXTENSION = /\.(jpe?g|png|webp|avif|gif|svg|bmp|tiff?)$/i;

export function extensionFromMime(mimeType = '') {
  return MIME_EXTENSIONS[mimeType.split(';')[0].trim().toLowerCase()] || '';
}

export function filenameFromResponse(url, mimeType, contentDisposition, outputFormat) {
  let name = '';
  const dispositionName = contentDisposition?.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
  if (dispositionName) {
    try { name = decodeURIComponent(dispositionName[1] || dispositionName[2]); }
    catch { name = dispositionName[2] || ''; }
  }
  if (!name) {
    try {
      const path = new URL(url).pathname;
      name = decodeURIComponent(path.slice(path.lastIndexOf('/') + 1));
    } catch { /* fall back below */ }
  }

  name = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim();
  if (!name || name === '.' || name === '..') name = 'image';

  const extension = outputFormat === 'original'
    ? (extensionFromMime(mimeType) || name.match(IMAGE_EXTENSION)?.[1]?.toLowerCase() || 'img')
    : outputFormat;
  let base = name.replace(IMAGE_EXTENSION, '').replace(/[. ]+$/, '');
  if (!base || base === 'image') base = 'image';
  return `${base}.${extension === 'jpeg' ? 'jpg' : extension}`;
}
