/*
 * utils.js — Utility Functions & Shared Helpers
 * ================================================
 * Small pure helpers (toast, fileToDataURL, loadImg) plus the two
 * functions called from almost everywhere: getSettings() and render().
 *
 * render() is defined here rather than main.js because every other file
 * needs to call it after state changes, and they are all loaded before
 * main.js. Putting render() here avoids forward-reference issues.
 *
 * Depends on: state.js (must be loaded first)
 */

/* ---------------------------------------------------------------------------
 * toast — brief status notification in the bottom-right corner
 *
 * @param {string} msg   The message to display.
 * @param {string} [type] Pass 'err' for a red left-border style.
 * --------------------------------------------------------------------------- */
function toast(msg, type) {
  var el = document.createElement('div');
  el.className = 'toast' + (type === 'err' ? ' err' : '');
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(function() { el.remove(); }, 3400);
}

/* ---------------------------------------------------------------------------
 * fileToDataURL — reads a File as a base64 data URL
 *
 * @param  {File} file
 * @returns {Promise<string>} Resolves with "data:image/...;base64,..."
 * --------------------------------------------------------------------------- */
function fileToDataURL(file) {
  return new Promise(function(resolve, reject) {
    var r = new FileReader();
    r.onload  = function(e) { resolve(e.target.result); };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* ---------------------------------------------------------------------------
 * loadImg — creates an HTMLImageElement from a URL
 *
 * Resolves only after the image has fully loaded so naturalWidth/Height
 * are available and the image can be drawn onto a canvas immediately.
 *
 * @param  {string} url  Any URL or data URL.
 * @returns {Promise<HTMLImageElement>}
 * --------------------------------------------------------------------------- */
function loadImg(url) {
  return new Promise(function(resolve, reject) {
    var i = new Image();
    i.onload  = function() { resolve(i); };
    i.onerror = reject;
    i.src = url;
  });
}

/* ---------------------------------------------------------------------------
 * getSettings — reads layout settings from the sidebar form
 *
 * Returns a plain object with all dimensions in millimetres, plus several
 * derived values so callers never have to repeat the geometry calculations.
 *
 * Derived values:
 *   pairW  = (cardW + bleed×2) × 2 + gutter   ← width of one front+back pair
 *   pairH  = cardH + bleed×2                   ← height of one pair
 *   cols   = pairs that fit horizontally
 *   rows   = pairs that fit vertically
 *   cardsPerPage = cols × rows
 * --------------------------------------------------------------------------- */
function getSettings() {
  var paper      = document.getElementById('setPaper').value;
  var orient     = document.getElementById('setOrient').value;
  var cardW      = parseFloat(document.getElementById('setCardW').value)    || 63.5;
  var cardH      = parseFloat(document.getElementById('setCardH').value)    || 88.9;
  var gutter     = parseFloat(document.getElementById('setGutter').value)   || 3;
  var margin     = parseFloat(document.getElementById('setMargin').value)   || 8;
  var spacing    = parseFloat(document.getElementById('setSpacing').value)  || 3;
  var bleed      = parseFloat(document.getElementById('setBleed').value)    || 0;
  var gutterLine = document.getElementById('setGutterLine').value;
  var cutMarks   = document.getElementById('setCutMarks').value;

  /* Paper sizes in landscape orientation [width, height] in mm */
  var paperSizes = { A4: [297, 210], Letter: [279.4, 215.9], A3: [420, 297] };
  var pw = paperSizes[paper][0];
  var ph = paperSizes[paper][1];
  if (orient === 'portrait') { var tmp = pw; pw = ph; ph = tmp; }

  var pairW    = (cardW + bleed * 2) * 2 + gutter;
  var pairH    =  cardH + bleed * 2;
  var usableW  = pw - margin * 2;
  var usableH  = ph - margin * 2;
  var cols     = Math.max(1, Math.floor((usableW + spacing) / (pairW + spacing)));
  var rows     = Math.max(1, Math.floor((usableH + spacing) / (pairH + spacing)));

  return {
    pw: pw, ph: ph,
    cardW: cardW, cardH: cardH,
    gutter: gutter, margin: margin, spacing: spacing, bleed: bleed,
    gutterLine: gutterLine, cutMarks: cutMarks,
    pairW: pairW, pairH: pairH,
    cols: cols, rows: rows,
    cardsPerPage: cols * rows,
  };
}

/* ---------------------------------------------------------------------------
 * render — full UI refresh
 *
 * Rebuilds every part of the interface that depends on application state.
 * Call after any change to state.fronts, state.backs, state.cards, or
 * state.selection that requires the UI to catch up.
 *
 * Each sub-function is defined in its own file; they are available here
 * because all scripts share the same global scope.
 * --------------------------------------------------------------------------- */
function render() {
  renderCounts();
  renderBatchSelect();
  renderStrip();
  renderBackAssignBar();
  renderPreview();
}

/* renderCounts — updates the image/card count labels */
function renderCounts() {
  var fl = state.fronts.length, bl = state.backs.length, n = state.cards.length;
  document.getElementById('countFronts').textContent = fl + ' image' + (fl !== 1 ? 's' : '');
  document.getElementById('countBacks').textContent  = bl + ' image' + (bl !== 1 ? 's' : '');
  document.getElementById('cardCount').textContent   = n;
  document.getElementById('cardCount2').textContent  = n + ' card' + (n !== 1 ? 's' : '');
}

/* renderBatchSelect — rebuilds the batch-back-assignment dropdown */
function renderBatchSelect() {
  var sel = document.getElementById('batchBackSelect');
  var cur = sel.value;
  sel.innerHTML = '<option value="">— pick a back image —</option>';
  state.backs.forEach(function(b) {
    var o = document.createElement('option');
    o.value = b.id; o.textContent = b.name;
    sel.appendChild(o);
  });
  sel.value = cur; /* restore previous selection if it still exists */
}
