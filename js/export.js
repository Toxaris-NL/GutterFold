/*
 * export.js — PDF Generation & Image ZIP Download
 * ==================================================
 * Contains two export features:
 *
 *   1. "⬇ Generate PDF" — renders each page onto an off-screen canvas at
 *      200 DPI, converts to JPEG, and embeds in a PDF via jsPDF.
 *
 *   2. "⬇ Download Images" — packages all loaded front and back images into
 *      a ZIP archive (fronts/ and backs/ subfolders) via JSZip.
 *
 * Depends on: state.js, utils.js (getSettings, toast),
 *             preview.js (drawPage — shared drawing logic),
 *             window.jspdf (CDN), window.JSZip (CDN)
 */

/* ===========================================================================
   PDF GENERATION
   =========================================================================== */

document.getElementById('btnGenerate').addEventListener('click', async function() {
  if (state.cards.length === 0) {
    toast('No cards to export', 'err');
    return;
  }

  /* Show progress modal */
  var modal = document.getElementById('progressModal');
  var bar   = document.getElementById('progBar');
  var ptxt  = document.getElementById('progTxt');
  modal.classList.add('show');

  var s      = getSettings();
  var jsPDF  = window.jspdf.jsPDF;
  var orient = s.pw > s.ph ? 'landscape' : 'portrait';
  var doc    = new jsPDF({ orientation: orient, unit: 'mm', format: [s.pw, s.ph] });

  /* Render at 200 DPI for crisp print output */
  var PDF_DPI = 200;
  var m2p     = function(mm) { return mm * (PDF_DPI / 25.4); };
  var W       = Math.round(s.pw * (PDF_DPI / 25.4));
  var H       = Math.round(s.ph * (PDF_DPI / 25.4));

  /* Off-screen canvas — never attached to the DOM */
  var off    = document.createElement('canvas');
  off.width  = W; off.height = H;
  var offCtx = off.getContext('2d');

  var pages = Math.ceil(state.cards.length / s.cardsPerPage);

  for (var p = 0; p < pages; p++) {
    bar.style.width  = ((p / pages) * 100) + '%';
    ptxt.textContent = 'Rendering page ' + (p + 1) + ' of ' + pages + '…';

    /* Yield to the browser so the progress bar actually repaints */
    await new Promise(function(r) { setTimeout(r, 10); });

    /* Draw the page with forPdf=true (no labels or selection highlights) */
    drawPage(offCtx, s, p, m2p, W, H, true);

    if (p > 0) doc.addPage([s.pw, s.ph], orient);

    /* Embed as JPEG at 93% quality — good balance of size vs sharpness */
    doc.addImage(off.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, s.pw, s.ph);
  }

  bar.style.width  = '100%';
  ptxt.textContent = 'Saving…';
  await new Promise(function(r) { setTimeout(r, 80); });

  doc.save('gutterfold_cards.pdf');
  modal.classList.remove('show');
  toast('PDF saved — ' + pages + ' page' + (pages !== 1 ? 's' : ''));
});

/* ===========================================================================
   DOWNLOAD ALL IMAGES AS ZIP
   ===========================================================================
   Packages state.fronts into a "fronts/" folder and state.backs into a
   "backs/" folder inside a single ZIP file, then triggers a download.
   Preserves the original format (PNG vs JPEG) by inspecting the data URL.
   =========================================================================== */

document.getElementById('btnDownloadImages').addEventListener('click', async function() {
  var allFronts = state.fronts;
  var allBacks  = state.backs;
  var total     = allFronts.length + allBacks.length;

  if (total === 0) {
    toast('No images to download — upload some first', 'err');
    return;
  }
  if (!window.JSZip) {
    toast('JSZip not loaded', 'err');
    return;
  }

  var zip = new JSZip();
  var ff  = zip.folder('fronts');
  var bf  = zip.folder('backs');

  allFronts.forEach(function(e) {
    var b64 = e.url.split(',')[1];
    var ext = e.url.indexOf('image/png') !== -1 ? 'png' : 'jpg';
    ff.file(e.name + '.' + ext, b64, { base64: true });
  });
  allBacks.forEach(function(e) {
    var b64 = e.url.split(',')[1];
    var ext = e.url.indexOf('image/png') !== -1 ? 'png' : 'jpg';
    bf.file(e.name + '.' + ext, b64, { base64: true });
  });

  toast('Preparing ZIP…');
  var blob = await zip.generateAsync({ type: 'blob' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = 'gutterfold_images.zip';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast('Downloaded ' + allFronts.length + ' fronts + ' + allBacks.length + ' backs as ZIP');
});
