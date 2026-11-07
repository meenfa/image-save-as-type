# Image Save As Type

Image Save As Type adds an image context menu that downloads the selected image in its original format or converts it to PNG, JPG, or WebP. Conversions encode new image data through the browser's image decoder and canvas; they do not rename the original bytes.

## Technology

- JavaScript, HTML, CSS, and Vite
- Chrome Extension Manifest V3
- Context Menus and Downloads APIs
- Offscreen document with `fetch`, `Blob`, `createImageBitmap`, and canvas; the service worker starts downloads

## Project structure

```text
public/
  manifest.json       Extension manifest copied into dist/
  offscreen.html       Hidden image processor page
  icons/              Logo source and 16/32/48/128 px Chrome icons
src/
  background/          Context menu and service worker
  content/             Captures the displayed img.currentSrc
  processor/           Decode and convert selected images
  utils/               Filename and format helpers
vite.config.js         Bundles the extension scripts
```

## Installation

1. Install Node.js (LTS) if it is not already installed.
2. In this project folder, run `npm install`.
3. Run `npm run build`. Vite writes the loadable extension to `dist/`.
4. Open `chrome://extensions` in Chrome.
5. Turn on **Developer mode** in the upper right.
6. Select **Load unpacked** and choose this project's `dist` folder.

After rebuilding, return to `chrome://extensions` and press the extension's reload button.

## Use

Right-click an image and choose **Save Image As Type**, then choose **Original**, **PNG**, **JPG**, or **WebP**. Chrome's save dialog lets you select the destination and filename. The extension uses `img.currentSrc` when available, so responsive image selections use the displayed source.

## Supported formats

The original download preserves response bytes and recognizes common extensions and MIME types including JPEG, PNG, WebP, AVIF, GIF, and SVG. PNG, JPG, and WebP choices are re-encoded using the browser's image support. JPEG uses quality 0.92 and composites transparency onto white.

## Known limitations

- Conversion depends on the current Chrome version being able to decode the source. AVIF conversion works only when that Chrome build can decode the particular AVIF image.
- A source that requires unavailable credentials, is blocked by CORS or site policy, or returns an error cannot be downloaded through the extension. The extension does not bypass access controls. Some browser-internal pages do not allow content scripts or extension menus.
- SVG and animated GIF can be saved in their original form. Converting them rasterizes a still image; animation and vector properties are not retained.
- Host access is set to `<all_urls>` because an image can be hosted on any site and the offscreen extension page must fetch the user-selected image for conversion. Chrome prompts for this access when loading the extension.
- The V1 menu handles one image per action. Bulk discovery and downloading are not included.

## Testing checklist

Use sample images you are authorized to access. Verify the resulting file contents (for example, open them or inspect their signatures) and confirm each converted file opens as the selected format.

- [ ] JPG → Original, PNG, WebP
- [ ] PNG → Original, JPG, WebP
- [ ] WebP → Original, PNG, JPG
- [ ] AVIF → Original, PNG, JPG (conversion depends on Chrome decoder support)
- [ ] Normal image URL, URL without an extension, and CDN image URL
- [ ] Responsive `srcset` image; confirm the displayed `currentSrc` is saved
- [ ] Cross-origin image where the site permits access
- [ ] Transparent PNG converted to JPG; confirm transparent pixels become white
- [ ] Missing/blocked image; confirm a useful error appears in the extension service worker console
- [ ] Confirm filenames have one correct extension and no invalid path characters

## V1 report

**Implemented:** single-image context menu; original-byte downloads; PNG/JPG/WebP canvas conversion; responsive image URL capture; MIME/URL-based filename handling; fetch, decode, and download error logging.

**Files created:** `package.json`, `vite.config.js`, `public/manifest.json`, `public/offscreen.html`, `src/background/service-worker.js`, `src/content/content.js`, `src/processor/offscreen.js`, `src/processor/format-utils.js`, and `src/utils/filename-utils.js`.

**How to run:** `npm install`, `npm run build`, then load `dist/` through `chrome://extensions` with Developer mode enabled.

**How to test:** follow the checklist above using representative images from each format and confirm converted data opens as its selected format.

**Known limitations:** see the list above, especially decoder support, source access rules, and rasterizing animated/vector sources during conversion.

**Next recommended step:** load V1 in Chrome and complete the format and URL test matrix before planning V2 bulk image support.
