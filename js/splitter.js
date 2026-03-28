/*
 * splitter.js — PDF Splitter Modal
 * ==================================
 * Implements the two-step workflow behind the "⊞ Split PDF → Images" button.
 *
 * STEP 1 — Upload & configure
 *   The user drops or picks a PDF, sets render DPI and auto-crop options,
 *   then clicks "Analyse PDF pages →".
 *
 * STEP 2 — Per-page assignment
 *   Each page is rendered as a thumbnail. The user assigns each page to
 *   "Front", "Back", or "Skip", and optionally configures a grid split
 *   (N rows × M cols) to dice each page into individual card tiles.
 *   Clicking "⬇ Import" renders full-resolution pages, crops, splits,
 *   and pushes the resulting images directly into state.
 *
 * AUTO-CROP ALGORITHM (findContentRect)
 *   Uses row/column density profiling: for each row and column the fraction
 *   of non-white pixels is compared against a configurable threshold.
 *   A row/column is "content" only when its density exceeds the threshold.
 *   This correctly ignores sparse marks (alignment crosses, fold lines)
 *   while reliably detecting actual card artwork edges.
 *   The same algorithm is implemented in the companion C# ImageGridSplitter.
 *
 * Depends on: state.js (state, sp, uid), utils.js (toast, loadImg, render)
 *             window._pdfjsLib — set by the ES-module snippet in index.html
 */

/* ---------------------------------------------------------------------------
 * Modal open / close / reset
 * --------------------------------------------------------------------------- */

function openSplitter() {
  document.getElementById('splitterModal').classList.add('show');
  showSpStep(1);
}

function closeSplitter() {
  document.getElementById('splitterModal').classList.remove('show');
  resetSplitter();
}

function resetSplitter() {
  sp.pdfDoc     = null;
  sp.pageCount  = 0;
  sp.pageAssign = [];
  sp.pageSkip   = [];
  document.getElementById('spFileName').textContent   = 'No file selected';
  document.getElementById('spPdfInput').value         = '';
  document.getElementById('btnSpAnalyze').disabled    = true;
  document.getElementById('spPagesList').innerHTML    = '';
  document.getElementById('spProgress').classList.remove('show');
  showSpStep(1);
}

/*
 * showSpStep — toggles between step 1 (upload/config) and step 2 (page list).
 * The Back and Import buttons in the footer are only shown in step 2.
 */
function showSpStep(n) {
  document.getElementById('spStep1').style.display     = n === 1 ? 'block'       : 'none';
  document.getElementById('spStep2').style.display     = n === 2 ? 'flex'        : 'none';
  document.getElementById('btnSpBack').style.display   = n === 2 ? 'inline-flex' : 'none';
  document.getElementById('btnSpImport').style.display = n === 2 ? 'inline-flex' : 'none';
}

/* Wire up modal open/close buttons */
document.getElementById('btnOpenSplitter').addEventListener('click',  openSplitter);
document.getElementById('btnCloseSplitter').addEventListener('click', closeSplitter);
document.getElementById('btnSpCancel').addEventListener('click',      closeSplitter);
document.getElementById('btnSpBack').addEventListener('click', function() { showSpStep(1); });

/* ---------------------------------------------------------------------------
 * PDF file selection (click or drag-and-drop)
 * --------------------------------------------------------------------------- */

var spInput = document.getElementById('spPdfInput');
var spZone  = document.getElementById('spUploadZone');

spInput.addEventListener('change', function(e) { loadSpPdf(e.target.files[0]); });

spZone.addEventListener('dragover',  function(e) { e.preventDefault(); spZone.classList.add('drag-over'); });
spZone.addEventListener('dragleave', function()  { spZone.classList.remove('drag-over'); });
spZone.addEventListener('drop', function(e) {
  e.preventDefault(); spZone.classList.remove('drag-over');
  var f = e.dataTransfer.files[0];
  if (f && f.type === 'application/pdf') loadSpPdf(f);
  else toast('Please drop a PDF file', 'err');
});

/*
 * loadSpPdf — loads a PDF file using PDF.js and stores the document in sp.pdfDoc.
 * window._pdfjsLib is set by the ES-module snippet at the top of index.html.
 */
async function loadSpPdf(file) {
  if (!file) return;
  document.getElementById('spFileName').textContent = file.name;
  document.getElementById('btnSpAnalyze').disabled  = false;

  var ab = await file.arrayBuffer();
  sp.pdfDoc    = await window._pdfjsLib.getDocument({ data: ab }).promise;
  sp.pageCount = sp.pdfDoc.numPages;

  document.getElementById('spFileName').textContent =
    file.name + ' (' + sp.pageCount + ' page' + (sp.pageCount !== 1 ? 's' : '') + ')';
}

/* ---------------------------------------------------------------------------
 * Step 1 → Step 2: Analyse pages (render thumbnails)
 * --------------------------------------------------------------------------- */

document.getElementById('btnSpAnalyze').addEventListener('click', async function() {
  if (!sp.pdfDoc) { toast('Load a PDF first', 'err'); return; }

  showSpStep(2);

  var dpi  = Math.max(72, parseInt(document.getElementById('spDpi').value) || 200);
  var list = document.getElementById('spPagesList');
  list.innerHTML = '';
  sp.pageAssign  = [];
  sp.pageSkip    = [];

  var progress = document.getElementById('spProgress');
  var bar      = document.getElementById('spProgBar');
  var txt      = document.getElementById('spProgTxt');
  progress.classList.add('show');

  for (var p = 1; p <= sp.pageCount; p++) {
    bar.style.width  = ((p - 1) / sp.pageCount * 100) + '%';
    txt.textContent  = 'Rendering page ' + p + ' of ' + sp.pageCount + '…';

    /* Yield so the progress bar updates in the browser */
    await new Promise(function(r) { setTimeout(r, 0); });

    var page   = await sp.pdfDoc.getPage(p);
    var vp     = page.getViewport({ scale: dpi / 72 });
    var canvas = document.createElement('canvas');
    canvas.width  = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

    /* Low-quality JPEG thumbnail — only for display, not for export */
    var thumbUrl = canvas.toDataURL('image/jpeg', 0.7);

    sp.pageAssign.push('front');
    sp.pageSkip.push(false);

    /* Build the page row */
    var row = document.createElement('div'); row.className = 'sp-page-row';

    var num = document.createElement('div'); num.className = 'sp-page-num'; num.textContent = p;
    row.appendChild(num);

    var thumb = document.createElement('img'); thumb.className = 'sp-page-thumb'; thumb.src = thumbUrl;
    row.appendChild(thumb);

    /* Front / Back dropdown */
    var destSel = document.createElement('select'); destSel.className = 'sp-page-dest';
    ['front', 'back'].forEach(function(v) {
      var o = document.createElement('option');
      o.value = v; o.textContent = v.charAt(0).toUpperCase() + v.slice(1);
      destSel.appendChild(o);
    });
    destSel.value = 'front';
    /* Capture page index in closure */
    (function(pi) {
      destSel.addEventListener('change', function(e) { sp.pageAssign[pi] = e.target.value; });
    })(p - 1);
    row.appendChild(destSel);

    /* Skip checkbox */
    var skipLabel = document.createElement('label'); skipLabel.className = 'sp-page-skip';
    var skipChk   = document.createElement('input'); skipChk.type = 'checkbox';
    (function(pi, ds) {
      skipChk.addEventListener('change', function(e) {
        sp.pageSkip[pi]  = e.target.checked;
        ds.disabled      = e.target.checked; /* disable Front/Back selector when skipped */
      });
    })(p - 1, destSel);
    skipLabel.appendChild(skipChk);
    skipLabel.appendChild(document.createTextNode(' Skip'));
    row.appendChild(skipLabel);

    list.appendChild(row);
  }

  bar.style.width = '100%';
  txt.textContent = 'Done. Assign pages then click Import.';
});

/* ---------------------------------------------------------------------------
 * Step 2 → Import: render full-res, crop, split, push into state
 * --------------------------------------------------------------------------- */

document.getElementById('btnSpImport').addEventListener('click', async function() {
  if (!sp.pdfDoc) return;

  var dpi         = Math.max(72, parseInt(document.getElementById('spDpi').value)         || 300);
  var autoCrop    = document.getElementById('spAutoCrop').value === 'yes';
  var whiteThresh = parseInt(document.getElementById('spWhiteThresh').value)               || 240;
  var density     = parseFloat(document.getElementById('spDensity').value)                || 0.01;
  var gridRows    = Math.max(1, parseInt(document.getElementById('spRows').value)          || 1);
  var gridCols    = Math.max(1, parseInt(document.getElementById('spCols').value)          || 1);

  var progress = document.getElementById('spProgress');
  var bar      = document.getElementById('spProgBar');
  var txt      = document.getElementById('spProgTxt');
  progress.classList.add('show');
  bar.style.width = '0%';

  var newFronts = [];
  var newBacks  = [];
  var done      = 0;
  var total     = sp.pageAssign.filter(function(_, i) { return !sp.pageSkip[i]; }).length;

  for (var p = 1; p <= sp.pageCount; p++) {
    if (sp.pageSkip[p - 1]) continue;

    var dest = sp.pageAssign[p - 1];
    bar.style.width  = ((done / total) * 100) + '%';
    txt.textContent  = 'Processing page ' + p + '/' + sp.pageCount + ' → ' + dest + '…';
    await new Promise(function(r) { setTimeout(r, 0); });

    /* Render page at full export DPI */
    var page   = await sp.pdfDoc.getPage(p);
    var vp     = page.getViewport({ scale: dpi / 72 });
    var canvas = document.createElement('canvas');
    canvas.width  = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

    /* Auto-crop white borders */
    var cropX = 0, cropY = 0, cropW = canvas.width, cropH = canvas.height;
    if (autoCrop) {
      var ctx     = canvas.getContext('2d');
      var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var rect    = findContentRect(imgData, canvas.width, canvas.height, whiteThresh, density);
      cropX = rect.x; cropY = rect.y; cropW = rect.w; cropH = rect.h;
    }

    /* Grid split: divide the cropped area into gridRows × gridCols tiles */
    var tileW = Math.floor(cropW / gridCols);
    var tileH = Math.floor(cropH / gridRows);

    for (var r = 0; r < gridRows; r++) {
      for (var c = 0; c < gridCols; c++) {
        var tx = cropX + c * tileW;
        var ty = cropY + r * tileH;
        /* Last column/row gets any remainder pixels */
        var tw = c === gridCols - 1 ? cropW - c * tileW : tileW;
        var th = r === gridRows - 1 ? cropH - r * tileH : tileH;

        var tileCanvas    = document.createElement('canvas');
        tileCanvas.width  = tw; tileCanvas.height = th;
        tileCanvas.getContext('2d').drawImage(canvas, tx, ty, tw, th, 0, 0, tw, th);

        var url   = tileCanvas.toDataURL('image/png');
        var img   = await loadImg(url);
        var name  = 'pdf-p' + p + '-r' + (r + 1) + 'c' + (c + 1);
        var entry = { id: uid(), name: name, url: url, img: img };

        if (dest === 'front') newFronts.push(entry);
        else                  newBacks.push(entry);
      }
    }
    done++;
  }

  bar.style.width  = '100%';
  txt.textContent  = 'Imported ' + newFronts.length + ' fronts, ' + newBacks.length + ' backs.';

  /* Push into main application state */
  newFronts.forEach(function(f) {
    state.fronts.push(f);
    state.cards.push({ frontId: f.id, backId: null });
  });
  newBacks.forEach(function(b) { state.backs.push(b); });

  render();

  /* Brief pause so the user sees "100%" before the modal closes */
  setTimeout(function() {
    closeSplitter();
    toast('Imported ' + newFronts.length + ' fronts + ' + newBacks.length + ' backs from PDF');
  }, 500);
});

/* ---------------------------------------------------------------------------
 * findContentRect — auto-crop helper (density profiling)
 *
 * For each row and each column of the image, count non-white pixels.
 * A row/column is "content" when its non-white fraction exceeds `density`.
 * Returns the tightest bounding box of all content rows and columns.
 *
 * Why density profiling instead of first-non-white-pixel?
 *   Alignment marks, fold lines, or registration crosses are sparse —
 *   they affect far fewer pixels per row than the density threshold.
 *   They are therefore ignored while actual card art edges are detected.
 *
 * @param {ImageData} imgData
 * @param {number}    W              Image width in pixels
 * @param {number}    H              Image height in pixels
 * @param {number}    whiteThresh    R/G/B value at or above which a pixel is "white" (0–255)
 * @param {number}    density        Min non-white fraction per row/col (0–1)
 * @returns {{x:number, y:number, w:number, h:number}}
 * --------------------------------------------------------------------------- */
function findContentRect(imgData, W, H, whiteThresh, density) {
  var d        = imgData.data;
  var rowCount = new Int32Array(H);
  var colCount = new Int32Array(W);

  for (var y = 0; y < H; y++) {
    for (var x = 0; x < W; x++) {
      var i = (y * W + x) * 4;
      var r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
      var isWhite = a < 10 || (r >= whiteThresh && g >= whiteThresh && b >= whiteThresh);
      if (!isWhite) { rowCount[y]++; colCount[x]++; }
    }
  }

  var rThresh = W * density, cThresh = H * density;
  var top = H, bottom = 0, left = W, right = 0;

  for (var yy = 0; yy < H; yy++) {
    if (rowCount[yy] > rThresh) { if (yy < top) top = yy; if (yy > bottom) bottom = yy; }
  }
  for (var xx = 0; xx < W; xx++) {
    if (colCount[xx] > cThresh) { if (xx < left) left = xx; if (xx > right) right = xx; }
  }

  if (top > bottom || left > right) return { x: 0, y: 0, w: W, h: H }; /* no content found */
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}
