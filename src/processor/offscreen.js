import { filenameFromResponse } from '../utils/filename-utils.js';
import { FORMATS } from './format-utils.js';

const JPEG_QUALITY = 0.92;

function canvasBlob(canvas, mimeType) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Conversion failed: the browser could not encode this image.')), mimeType, JPEG_QUALITY);
  });
}

async function processImage({ imageUrl, format }) {
  if (!FORMATS[format]) throw new Error('Unsupported image format selection.');

  let response;
  try {
    response = await fetch(imageUrl, { credentials: 'include', redirect: 'follow' });
  } catch (error) {
    throw new Error(`Could not fetch image. Image access may be blocked by the website or browser. (${error.message})`);
  }
  if (!response.ok) throw new Error(`Could not fetch image (HTTP ${response.status}).`);

  const sourceBlob = await response.blob();
  const sourceType = (response.headers.get('content-type') || sourceBlob.type || '').split(';')[0].trim().toLowerCase();
  const genericBinary = !sourceType || sourceType === 'application/octet-stream' || sourceType === 'binary/octet-stream';
  if (!sourceType.startsWith('image/') && !genericBinary) throw new Error(`Unsupported image format: server returned ${sourceType || 'an unknown content type'}.`);

  let outputBlob = sourceBlob;
  if (format !== 'original') {
    let bitmap;
    try { bitmap = await createImageBitmap(sourceBlob); }
    catch (error) { throw new Error(`Could not decode image. This browser may not support this image format. (${error.message})`); }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Conversion failed: canvas is unavailable.');
      if (format === 'jpg') {
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.drawImage(bitmap, 0, 0);
      outputBlob = await canvasBlob(canvas, FORMATS[format].mimeType);
      if (outputBlob.type !== FORMATS[format].mimeType) throw new Error(`Conversion failed: browser did not produce ${FORMATS[format].mimeType}.`);
    } catch (error) {
      throw error instanceof Error ? error : new Error(`Conversion failed: ${String(error)}`);
    } finally {
      bitmap.close();
    }
  }

  const filename = filenameFromResponse(response.url || imageUrl, sourceType, response.headers.get('content-disposition'), format);
  const objectUrl = URL.createObjectURL(outputBlob);
  return { filename, objectUrl };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'REVOKE_OBJECT_URL') {
    URL.revokeObjectURL(message.objectUrl);
    return;
  }
  if (message?.type === 'SCHEDULE_REVOKE') {
    setTimeout(() => URL.revokeObjectURL(message.objectUrl), 5 * 60_000);
    return;
  }
  if (message?.type !== 'PROCESS_IMAGE') return;
  processImage(message)
    .then(({ filename, objectUrl }) => sendResponse({ ok: true, filename, objectUrl }))
    .catch((error) => {
      console.error('Image Save As Type:', error);
      sendResponse({ ok: false, error: error.message || 'Image processing failed.' });
    });
  return true;
});
