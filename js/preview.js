/*
 * preview.js — Canvas Preview, Zoom Controls & Page Drawing
 * ===========================================================
 * Manages the live canvas preview in the centre of the screen and contains
 * all canvas drawing logic shared between the preview and the PDF export.
 *
 * ZOOM MODEL
 * ----------
 * manualZoom === null  → "Fit" mode: scale is computed to fill the area.
 * manualZoom === number → explicit scale set by the user via +/- or scroll.
 *
 * The zoom label shows "Fit" in auto mode, or "NNN%" in manual mode.
 * Any layout setting change resets back to Fit so the new layout is visible.
 *
 * Depends on: state.js, utils.js (getSettings)
 */

/* ---------------------------------------------------------------------------
 * Constants
 * --------------------------------------------------------------------------- */
var PREVIEW_DPI = 96;                   /* screen reference DPI */
var MM2PX       = PREVIEW_DPI / 25.4;  /* mm → screen pixels at 1× scale */
var ZOOM_STEP   = 0.15;                 /* scale change per button click */
var ZOOM_MIN    = 0.2;
var ZOOM_MAX    = 4.0;

/* null = auto-fit; number = explicit scale factor chosen by user */
var manualZoom = null;

/* ---------------------------------------------------------------------------
 * Scale helpers
 * --------------------------------------------------------------------------- */

/* fitScale — computes the scale that fits the page in the available area */
function fitScale(s) {
  var wrap = document.getElementById('previewWrap');
  var maxW = wrap.clientWidth  - 48;
  var maxH = wrap.clientHeight - 48;
  return Math.min(1.8, maxW / (s.pw * MM2PX), maxH / (s.ph * MM2PX));
}

function currentScale(s) {
  return manualZoom !== null ? manualZoom : fitScale(s);
}

function updateZoomLabel(s) {
  document.getElementById('zoomLevel').textContent =
    manualZoom === null ? 'Fit' : Math.round(currentScale(s) * 100) + '%';
}

/* ---------------------------------------------------------------------------
 * Zoom control event listeners
 * --------------------------------------------------------------------------- */
document.getElementById('btnZoomIn').addEventListener('click', function() {
  var s = getSettings();
  manualZoom = Math.min(ZOOM_MAX, parseFloat((currentScale(s) + ZOOM_STEP).toFixed(2)));
  renderPreview();
});

document.getElementById('btnZoomOut').addEventListener('click', function() {
  var s = getSettings();
  manualZoom = Math.max(ZOOM_MIN, parseFloat((currentScale(s) - ZOOM_STEP).toFixed(2)));
  renderPreview();
});

document.getElementById('btnZoomFit').addEventListener('click', function() {
  manualZoom = null;
  renderPreview();
});

/* Ctrl + scroll wheel zooms without a page scroll */
document.getElementById('previewWrap').addEventListener('wheel', function(e) {
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault();
  var s     = getSettings();
  var delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
  manualZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN,
    parseFloat((currentScale(s) + delta).toFixed(2))));
  renderPreview();
}, { passive: false });

/* Page navigation */
document.getElementById('btnPrev').addEventListener('click', function() {
  if (state.currentPage > 0) { state.currentPage--; renderPreview(); }
});
document.getElementById('btnNext').addEventListener('click', function() {
  var s     = getSettings();
  var pages = Math.max(1, Math.ceil(state.cards.length / s.cardsPerPage));
  if (state.currentPage < pages - 1) { state.currentPage++; renderPreview(); }
});

/* Reset to Fit whenever a layout setting changes */
document.querySelectorAll(
  '#setPaper,#setOrient,#setCardW,#setCardH,#setGutter,' +
  '#setMargin,#setSpacing,#setBleed,#setGutterLine,#setCutMarks'
).forEach(function(el) {
  el.addEventListener('change', function() { manualZoom = null; renderPreview(); });
});

/* Re-fit on window resize (only in auto mode; manual scale stays fixed) */
window.addEventListener('resize', function() {
  if (manualZoom === null) renderPreview();
});

/* ---------------------------------------------------------------------------
 * renderPreview — redraws the canvas for the current page
 * Called by render() and by zoom/page-navigation events.
 * --------------------------------------------------------------------------- */
function renderPreview() {
  var canvas = document.getElementById('previewCanvas');
  var empty  = document.getElementById('emptyState');

  if (state.cards.length === 0) {
    canvas.style.display = 'none';
    empty.style.display  = 'flex';
    document.getElementById('pageInfo').textContent     = 'Page 1 / 1';
    document.getElementById('btnPrev').disabled          = true;
    document.getElementById('btnNext').disabled          = true;
    document.getElementById('zoomLevel').textContent     = 'Fit';
    return;
  }

  canvas.style.display = 'block';
  empty.style.display  = 'none';

  var s     = getSettings();
  var pages = Math.max(1, Math.ceil(state.cards.length / s.cardsPerPage));
  state.currentPage = Math.min(state.currentPage, pages - 1);

  document.getElementById('pageInfo').textContent = 'Page ' + (state.currentPage + 1) + ' / ' + pages;
  document.getElementById('btnPrev').disabled     = state.currentPage === 0;
  document.getElementById('btnNext').disabled     = state.currentPage >= pages - 1;

  var scale  = currentScale(s);
  updateZoomLabel(s);

  var W = Math.round(s.pw * MM2PX * scale);
  var H = Math.round(s.ph * MM2PX * scale);
  canvas.width  = W;
  canvas.height = H;

  var m2p = function(mm) { return mm * MM2PX * scale; };
  drawPage(canvas.getContext('2d'), s, state.currentPage, m2p, W, H, false);
}

/* ===========================================================================
   PAGE DRAWING
   ===========================================================================
   drawPage() is called both by renderPreview() (screen, low DPI, with UI
   decorations) and by the PDF exporter (off-screen canvas, high DPI, clean).

   The `forPdf` flag suppresses selection highlights and card-number labels
   so they don't appear in the printed output.

   GUTTERFOLD GEOMETRY — each pair on the sheet:
     ┌──────────────┬──────┬──────────────┐
     │  FRONT+bleed │ gtr  │  BACK+bleed  │
     └──────────────┴──────┴──────────────┘
   The back is NOT mirrored. When the sheet is folded along the gutter the
   back naturally ends up behind the front, both facing outward.
   =========================================================================== */

/*
 * drawPage — draws one complete sheet page onto a canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object}   s        Layout settings from getSettings()
 * @param {number}   pageIdx  Zero-based page index
 * @param {function} m2p      mm → px converter: mm => number
 * @param {number}   W        Canvas width in pixels
 * @param {number}   H        Canvas height in pixels
 * @param {boolean}  forPdf   true = omit UI decorations (labels, highlights)
 */
function drawPage(ctx, s, pageIdx, m2p, W, H, forPdf) {
  var margin     = s.margin,   spacing  = s.spacing,   pairW    = s.pairW;
  var pairH      = s.pairH,    cols     = s.cols,       rows     = s.rows;
  var cardW      = s.cardW,    cardH    = s.cardH,      gutter   = s.gutter;
  var bleed      = s.bleed,    gutterLine = s.gutterLine, cutMarks = s.cutMarks;
  var cardsPerPage = s.cardsPerPage;
  var pageStart  = pageIdx * cardsPerPage;

  /* White page background */
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  for (var row = 0; row < rows; row++) {
    for (var col = 0; col < cols; col++) {
      var cardIdx = pageStart + row * cols + col;
      if (cardIdx >= state.cards.length) continue;

      var card  = state.cards[cardIdx];
      var front = state.fronts.find(function(f) { return f.id === card.frontId; });
      var back  = state.backs.find(function(b)  { return b.id === card.backId;  });
      var isSel = !forPdf && state.selection.has(cardIdx);

      var px = m2p(margin + col * (pairW + spacing));
      var py = m2p(margin + row * (pairH + spacing));
      var cw = m2p(cardW + bleed * 2);
      var ch = m2p(cardH + bleed * 2);
      var gw = m2p(gutter);

      /* Front (left cell) */
      drawCell(ctx, front, px, py, cw, ch, 'Front');

      /* Back (right cell) — no mirroring */
      drawCell(ctx, back, px + cw + gw, py, cw, ch, 'Back');

      /* Gutter fold line */
      if (gutterLine !== 'none') {
        var glx = px + cw + gw / 2;
        ctx.save();
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth   = forPdf ? 0.5 : Math.max(0.5, m2p(0.1));
        if (gutterLine === 'dashed') ctx.setLineDash([m2p(2), m2p(1.5)]);
        ctx.beginPath(); ctx.moveTo(glx, py); ctx.lineTo(glx, py + ch); ctx.stroke();
        ctx.restore();
      }

      /* Corner cut marks */
      if (cutMarks === 'corner') drawCutMarks(ctx, px, py, m2p(pairW), ch, m2p, bleed);

      /* Selection highlight (preview only — dashed gold rectangle) */
      if (isSel) {
        ctx.save();
        ctx.strokeStyle = 'rgba(200,169,110,0.85)';
        ctx.lineWidth   = m2p(0.45);
        ctx.setLineDash([m2p(1.5), m2p(1)]);
        ctx.strokeRect(px - m2p(.8), py - m2p(.8), m2p(pairW) + m2p(1.6), ch + m2p(1.6));
        ctx.restore();
      }

      /* Card index label (preview only — helps identify cards on-screen) */
      if (!forPdf) {
        ctx.save();
        ctx.fillStyle = 'rgba(200,169,110,0.75)';
        ctx.font      = 'bold ' + Math.max(8, m2p(2.6)) + 'px DM Mono,monospace';
        ctx.textAlign = 'left';
        ctx.fillText('#' + (cardIdx + 1), px + m2p(1), py + m2p(4.5));
        ctx.restore();
      }
    }
  }
}

/*
 * drawCell — draws one card image (clipped) or a placeholder if no image.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{img:HTMLImageElement}|undefined} imgEntry
 * @param {number} x, y, w, h  Cell bounds in pixels
 * @param {string} label        Placeholder text ('Front' or 'Back')
 */
function drawCell(ctx, imgEntry, x, y, w, h, label) {
  if (imgEntry) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.drawImage(imgEntry.img, x, y, w, h);
    ctx.restore();
  } else {
    ctx.fillStyle   = '#f4f4f4'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle   = '#bbb';
    ctx.font        = Math.max(9, Math.round(h * 0.07)) + 'px DM Mono,monospace';
    ctx.textAlign   = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 3);
  }
}

/*
 * drawCutMarks — draws small L-shaped corner registration marks outside each
 * card pair. The marks start `gap` px beyond the card edge (= bleed amount,
 * minimum 1 mm) and extend `len` px further out.
 */
function drawCutMarks(ctx, x, y, w, h, m2p, bleed) {
  var len = m2p(3);
  var gap = m2p(Math.max(bleed, 1));
  ctx.save();
  ctx.strokeStyle = '#999'; ctx.lineWidth = 0.5; ctx.setLineDash([]);
  /* corners: [x, y, dx, dy] where dx/dy indicate direction away from centre */
  [[x, y, -1, -1], [x + w, y, 1, -1], [x, y + h, -1, 1], [x + w, y + h, 1, 1]]
    .forEach(function(c) {
      var cx = c[0], cy = c[1], dx = c[2], dy = c[3];
      ctx.beginPath(); ctx.moveTo(cx + dx * gap, cy); ctx.lineTo(cx + dx * (gap + len), cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy + dy * gap); ctx.lineTo(cx, cy + dy * (gap + len)); ctx.stroke();
    });
  ctx.restore();
}
