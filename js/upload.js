/*
 * upload.js — Image File Upload Handlers
 * ========================================
 * Wires up the two sidebar upload zones (Fronts and Backs) to handle
 * both click-to-pick and drag-and-drop file selection.
 *
 * TIFF SUPPORT
 * ------------
 * Browsers cannot display TIFF images natively — <img src="data:image/tiff…">
 * silently fails. To support TIFF uploads we use UTIF.js (loaded via CDN in
 * index.html), a pure-JS TIFF decoder. When a TIFF file is detected:
 *   1. Read raw bytes via ArrayBuffer.
 *   2. Decode the first IFD (page) with UTIF.
 *   3. Convert the decoded RGBA pixel data to a PNG data URL via a canvas.
 *   4. Use that PNG data URL everywhere the original data URL would have been.
 * All other formats (JPEG, PNG, WebP, GIF, BMP) are handled by the browser.
 *
 * When new front images are loaded, a matching card entry is created
 * automatically in state.cards so the card appears in the strip
 * without the user having to do anything extra.
 *
 * When back images are loaded they go into state.backs only; the user
 * assigns them to cards manually (or via batch assignment).
 *
 * Depends on: state.js, utils.js (fileToDataURL, loadImg, render, uid, toast)
 *             window.UTIF — optional, loaded from CDN; required only for TIFFs
 */
 
/* ---------------------------------------------------------------------------
 * isTiff — returns true when the file is a TIFF by MIME type or extension.
 * MIME type is not always reliable (some OS report it as 'application/octet-stream'),
 * so we check the filename extension as a fallback.
 * --------------------------------------------------------------------------- */
function isTiff(file) {
  if (file.type === 'image/tiff' || file.type === 'image/x-tiff') return true;
  return /\.tiff?$/i.test(file.name);
}
 
/* ---------------------------------------------------------------------------
 * tiffToDataURL — decodes a TIFF file and returns a PNG data URL.
 *
 * UTIF.decode() returns an array of IFD objects (one per page/layer).
 * UTIF.decodeImage() fills in the rgba property on the first IFD.
 * We then paint those RGBA bytes onto a canvas and export as PNG.
 *
 * @param  {File} file   A TIFF file.
 * @returns {Promise<string>}  PNG data URL ("data:image/png;base64,…")
 * --------------------------------------------------------------------------- */
async function tiffToDataURL(file) {
  if (!window.UTIF) {
    throw new Error('UTIF.js is not loaded — cannot decode TIFF files.');
  }
 
  /* Read the raw file bytes */
  var arrayBuffer = await file.arrayBuffer();
 
  /* Decode all IFDs (image pages/layers); we only use the first */
  var ifds = UTIF.decode(arrayBuffer);
  if (!ifds || ifds.length === 0) {
    throw new Error('UTIF could not find any images in this TIFF file.');
  }
 
  /* Decode the RGBA pixel data for the first image */
  UTIF.decodeImage(arrayBuffer, ifds[0]);
  var ifd    = ifds[0];
  var width  = ifd.width;
  var height = ifd.height;
 
  /* Paint the RGBA bytes onto a canvas */
  var canvas    = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  var ctx       = canvas.getContext('2d');
  var imageData = ctx.createImageData(width, height);
 
  /* UTIF.toRGBA8() converts whatever internal format the TIFF uses to plain RGBA */
  var rgba = UTIF.toRGBA8(ifd);
  imageData.data.set(rgba);
  ctx.putImageData(imageData, 0, 0);
 
  /* Return as a PNG data URL (universally supported by browsers) */
  return canvas.toDataURL('image/png');
}
 
/* ---------------------------------------------------------------------------
 * fileToImageEntry — converts any supported image file to an image entry
 * object ready to push into state.fronts or state.backs.
 *
 * Handles TIFF via UTIF and all other formats via the standard FileReader.
 *
 * @param  {File} file
 * @returns {Promise<{id, name, url, img}>}
 * --------------------------------------------------------------------------- */
async function fileToImageEntry(file) {
  var url;
  if (isTiff(file)) {
    url = await tiffToDataURL(file);
  } else {
    url = await fileToDataURL(file); /* standard base64 data URL */
  }
  var img = await loadImg(url);
  return {
    id:   uid(),
    name: file.name.replace(/\.[^.]+$/, ''), /* strip file extension for display */
    url:  url,
    img:  img,
  };
}
 
/* ---------------------------------------------------------------------------
 * handleFiles — loads files into the fronts or backs image pool.
 *
 * Processes files sequentially (one await per file) so the UI stays
 * responsive and errors on individual files don't abort the whole batch.
 *
 * @param {FileList|File[]} files
 * @param {'fronts'|'backs'} kind
 * --------------------------------------------------------------------------- */
async function handleFiles(files, kind) {
  var arr = Array.from(files);
  for (var i = 0; i < arr.length; i++) {
    try {
      var entry = await fileToImageEntry(arr[i]);
      state[kind].push(entry);
    } catch (err) {
      toast('Could not load "' + arr[i].name + '": ' + err.message, 'err');
      /* Continue processing remaining files in the batch */
    }
  }
 
  /* For every new front image that doesn't already have a card, create one */
  if (kind === 'fronts') {
    var existing = new Set(state.cards.map(function(c) { return c.frontId; }));
    state.fronts.forEach(function(f) {
      if (!existing.has(f.id)) {
        state.cards.push({ frontId: f.id, backId: null });
      }
    });
  }
 
  render();
}
 
/* ---------------------------------------------------------------------------
 * Wire up both upload zones (click-to-pick and drag-and-drop).
 * --------------------------------------------------------------------------- */
['Fronts', 'Backs'].forEach(function(Kind) {
  var input = document.getElementById('input' + Kind);
  var zone  = document.getElementById('zone'  + Kind);
  var kind  = Kind.toLowerCase();
 
  input.addEventListener('change', function(e) {
    handleFiles(e.target.files, kind);
  });
 
  zone.addEventListener('dragover', function(e) {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', function() {
    zone.classList.remove('drag-over');
  });
  zone.addEventListener('drop', function(e) {
    e.preventDefault();
    zone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files, kind);
  });
});
 