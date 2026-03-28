/*
 * strip.js — Card Strip, Back-Assign Bar, Hover Preview & Context Menu
 * ======================================================================
 * Everything related to the horizontal card strip at the bottom of the
 * screen, including:
 *
 *   • renderStrip()         — builds the strip tiles from state.cards
 *   • renderBackAssignBar() — shows/updates the bar below the strip
 *   • Hover preview tooltip — enlarged card preview on mouse-over
 *   • Right-click context menu — move front↔back, remove card
 *
 * MULTI-SELECT MODEL (matches standard OS file-manager conventions):
 *   Plain click        → select this card, deselect all others
 *                        (click again on the sole selection → deselect)
 *   Ctrl/Cmd + click   → toggle individual card
 *   Shift + click      → range-select from the last clicked card to here
 *   Click empty strip  → deselect all
 *
 * Depends on: state.js (state, lastClickedIdx), utils.js (render, toast)
 */

/* ===========================================================================
   CARD STRIP
   =========================================================================== */

/*
 * renderStrip — rebuilds every tile in the card strip from scratch.
 * Called by render() after any state change that affects the strip.
 */
function renderStrip() {
  var strip = document.getElementById('cardStrip');
  strip.innerHTML = '';

  /* Update the selection-count badge */
  var badge = document.getElementById('selBadge');
  var n = state.selection.size;
  badge.textContent = n + ' selected';
  badge.classList.toggle('show', n > 0);

  if (state.cards.length === 0) {
    strip.innerHTML = '<div style="color:var(--text-faint);font-size:.7rem;padding:0 8px;white-space:nowrap">Upload front images to add cards</div>';
    return;
  }

  state.cards.forEach(function(card, idx) {
    var front = state.fronts.find(function(f) { return f.id === card.frontId; });
    var back  = state.backs.find(function(b)  { return b.id === card.backId;  });
    var isSel = state.selection.has(idx);

    /* ── Outer wrapper ── */
    var wrap = document.createElement('div');
    wrap.className = 'strip-card' + (isSel ? ' selected' : '') + (back ? ' has-back' : '');
    wrap.dataset.idx = idx;

    /* ── × remove button ── */
    var rm = document.createElement('button');
    rm.className = 'strip-rm'; rm.title = 'Remove card'; rm.textContent = '×';
    rm.addEventListener('click', (function(i) {
      return function(e) {
        e.stopPropagation();
        state.cards.splice(i, 1);
        /* Rebuild selection: remove i, shift indices above i down by 1 */
        var newSel = new Set();
        state.selection.forEach(function(x) {
          if      (x < i) newSel.add(x);
          else if (x > i) newSel.add(x - 1);
        });
        state.selection = newSel;
        if (lastClickedIdx !== null) {
          if      (lastClickedIdx === i) lastClickedIdx = null;
          else if (lastClickedIdx >   i) lastClickedIdx--;
        }
        render();
      };
    })(idx));
    wrap.appendChild(rm);

    /* ── Thumbnail pair box ── */
    var pair = document.createElement('div');
    pair.className = 'strip-card-pair';

    var idxLbl = document.createElement('div');
    idxLbl.className = 'strip-idx'; idxLbl.textContent = idx + 1;
    pair.appendChild(idxLbl);

    /* Teal dot indicator — visible when a back is assigned (.has-back CSS) */
    var dot = document.createElement('div');
    dot.className = 'strip-back-dot'; dot.title = 'Back assigned';
    pair.appendChild(dot);

    /* Front thumbnail */
    if (front) {
      var fi = document.createElement('img');
      fi.className = 'strip-thumb'; fi.src = front.url; fi.alt = front.name;
      pair.appendChild(fi);
    } else {
      var fp = document.createElement('div');
      fp.className = 'strip-thumb-empty'; fp.textContent = '?';
      pair.appendChild(fp);
    }

    /* Back thumbnail */
    if (back) {
      var bi = document.createElement('img');
      bi.className = 'strip-thumb'; bi.src = back.url; bi.alt = back.name;
      pair.appendChild(bi);
    } else {
      var bp = document.createElement('div');
      bp.className = 'strip-thumb-empty'; bp.textContent = '↩';
      pair.appendChild(bp);
    }

    wrap.appendChild(pair);

    /* Card name label */
    var lbl = document.createElement('div');
    lbl.className = 'strip-label';
    lbl.textContent = front ? front.name : ('Card ' + (idx + 1));
    wrap.appendChild(lbl);

    /* ── Click handler: multi-select ── */
    wrap.addEventListener('click', (function(i) {
      return function(e) {
        e.stopPropagation();
        if (e.shiftKey && lastClickedIdx !== null) {
          /* Range select from anchor to this card */
          var lo = Math.min(lastClickedIdx, i);
          var hi = Math.max(lastClickedIdx, i);
          if (!e.ctrlKey && !e.metaKey) state.selection.clear();
          for (var x = lo; x <= hi; x++) state.selection.add(x);
        } else if (e.ctrlKey || e.metaKey) {
          /* Toggle individual */
          if (state.selection.has(i)) state.selection.delete(i);
          else                        state.selection.add(i);
          lastClickedIdx = i;
        } else {
          /* Plain click: toggle off if already sole selection */
          if (state.selection.size === 1 && state.selection.has(i)) {
            state.selection.clear();
            lastClickedIdx = null;
          } else {
            state.selection.clear();
            state.selection.add(i);
            lastClickedIdx = i;
          }
        }
        renderStrip();
        renderBackAssignBar();
        renderPreview();
      };
    })(idx));

    /* Hover preview tooltip */
    wrap.addEventListener('mouseenter', (function(i) { return function(e) { showHoverPreview(e, i); }; })(idx));
    wrap.addEventListener('mousemove',  function(e) { moveHoverPreview(e); });
    wrap.addEventListener('mouseleave', hideHoverPreview);

    strip.appendChild(wrap);
  });
}

/* Deselect all when clicking the empty strip background */
document.getElementById('cardStrip').addEventListener('click', function(e) {
  if (e.target === e.currentTarget) {
    state.selection.clear();
    lastClickedIdx = null;
    renderStrip();
    renderBackAssignBar();
    renderPreview();
  }
});

/* ===========================================================================
   BACK-ASSIGN BAR
   =========================================================================== */

/*
 * renderBackAssignBar — shows the assignment bar when ≥1 card is selected.
 *
 * If all selected cards share the same back image, it is pre-selected in
 * the dropdown so the user can see the current assignment at a glance.
 */
function renderBackAssignBar() {
  var bar = document.getElementById('backAssignBar');
  var sel = document.getElementById('selectedCardBack');
  var lbl = document.getElementById('selCountLabel');

  if (state.selection.size === 0) {
    bar.classList.remove('visible');
    return;
  }
  bar.classList.add('visible');

  var n = state.selection.size;
  lbl.textContent = n === 1 ? 'selected card:' : n + ' selected cards:';

  /* Determine whether all selected cards share the same back */
  var indices    = Array.from(state.selection);
  var backIds    = indices.map(function(i) { return state.cards[i] ? state.cards[i].backId : null; });
  var commonBack = backIds.every(function(b) { return b === backIds[0]; }) ? backIds[0] : null;

  sel.innerHTML = '<option value="">No back</option>';
  state.backs.forEach(function(b) {
    var o = document.createElement('option');
    o.value = b.id; o.textContent = b.name;
    if (b.id === commonBack) o.selected = true;
    sel.appendChild(o);
  });
}

/* Apply chosen back to all selected cards */
document.getElementById('selectedCardBack').addEventListener('change', function(e) {
  var val = e.target.value ? parseInt(e.target.value) : null;
  state.selection.forEach(function(idx) {
    if (state.cards[idx]) state.cards[idx].backId = val;
  });
  renderStrip(); renderBackAssignBar(); renderPreview();
});

/* Clear back from all selected cards */
document.getElementById('btnClearBack').addEventListener('click', function() {
  state.selection.forEach(function(idx) {
    if (state.cards[idx]) state.cards[idx].backId = null;
  });
  renderStrip(); renderBackAssignBar(); renderPreview();
});

/* Deselect all */
document.getElementById('btnDeselAll').addEventListener('click', function() {
  state.selection.clear();
  lastClickedIdx = null;
  renderStrip(); renderBackAssignBar(); renderPreview();
});

/* ===========================================================================
   HOVER PREVIEW TOOLTIP
   =========================================================================== */

/* Width (px) of each card image inside the tooltip */
var HP_CARD_W = 150;

/*
 * showHoverPreview — builds and shows the tooltip for card at idx.
 * The tooltip shows enlarged front and back thumbnails side by side.
 */
function showHoverPreview(e, idx) {
  var card  = state.cards[idx];
  var front = state.fronts.find(function(f) { return f.id === card.frontId; });
  var back  = state.backs.find(function(b)  { return b.id === card.backId;  });
  var hp    = document.getElementById('hoverPreview');
  var pair  = document.getElementById('hpPair');
  var label = document.getElementById('hpLabel');
  pair.innerHTML = '';

  pair.appendChild(makeHoverCell(front, 'Front'));

  /* Thin vertical divider between front and back cells */
  var divider = document.createElement('div');
  divider.style.cssText = 'width:1px;background:var(--border);align-self:stretch;margin:0 4px';
  pair.appendChild(divider);

  pair.appendChild(makeHoverCell(back, 'Back'));

  label.textContent =
    '#' + (idx + 1) + ' · ' +
    (front ? front.name : 'Card ' + (idx + 1)) +
    ' / ' +
    (back  ? back.name  : 'No back');

  hp.classList.add('show');
  positionHoverPreview(e);
}

/* Builds one cell (image + name label, or placeholder) for the tooltip */
function makeHoverCell(imgEntry, side) {
  var w = document.createElement('div');
  w.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px';

  if (imgEntry) {
    var ratio = imgEntry.img.naturalHeight / imgEntry.img.naturalWidth;
    var img   = document.createElement('img');
    img.src   = imgEntry.url;
    img.style.cssText = 'width:' + HP_CARD_W + 'px;height:' + Math.round(HP_CARD_W * ratio) + 'px;object-fit:cover;border-radius:5px;border:1px solid var(--border)';
    w.appendChild(img);
    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:.6rem;color:var(--text-dim);text-align:center;max-width:' + HP_CARD_W + 'px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
    lbl.textContent = imgEntry.name;
    w.appendChild(lbl);
  } else {
    var ph = document.createElement('div');
    ph.style.cssText = 'width:' + HP_CARD_W + 'px;height:' + Math.round(HP_CARD_W * 1.4) + 'px;background:var(--surface3);border:1px dashed var(--border);border-radius:5px;display:flex;align-items:center;justify-content:center;color:var(--text-faint);font-size:.7rem';
    ph.textContent = side;
    w.appendChild(ph);
  }
  return w;
}

function moveHoverPreview(e) { positionHoverPreview(e); }
function hideHoverPreview()  { document.getElementById('hoverPreview').classList.remove('show'); }

/*
 * positionHoverPreview — keeps the tooltip fully within the viewport.
 * Prefers placing it above and to the right of the cursor, but flips
 * horizontally or vertically when close to the viewport edges.
 */
function positionHoverPreview(e) {
  var hp  = document.getElementById('hoverPreview');
  var pw  = hp.offsetWidth  || 320;
  var ph  = hp.offsetHeight || 240;
  var x   = e.clientX + 16;
  var y   = e.clientY - ph - 14;
  if (x + pw > window.innerWidth  - 10) x = e.clientX - pw - 16;
  if (y < 8)                             y = e.clientY + 16;
  hp.style.left = x + 'px';
  hp.style.top  = y + 'px';
}

/* ===========================================================================
   RIGHT-CLICK CONTEXT MENU
   =========================================================================== */

/* Index of the card that was right-clicked (set when the menu opens) */
var ctxCardIdx = null;
var ctxMenu    = document.getElementById('stripCtxMenu');

/*
 * Show the context menu when right-clicking a card in the strip.
 * Menu items are shown or hidden based on what the card actually has
 * (e.g. "Move back → Fronts" is hidden when no back is assigned).
 */
document.getElementById('cardStrip').addEventListener('contextmenu', function(e) {
  var card = e.target.closest('.strip-card');
  if (!card) return;
  e.preventDefault();

  ctxCardIdx = parseInt(card.dataset.idx);
  var c        = state.cards[ctxCardIdx];
  var hasFront = c && state.fronts.find(function(f) { return f.id === c.frontId; });
  var hasBack  = c && c.backId && state.backs.find(function(b)  { return b.id === c.backId;  });

  document.getElementById('ctxMoveFrontToBack').style.display = hasFront ? '' : 'none';
  document.getElementById('ctxMoveBackToFront').style.display = hasBack  ? '' : 'none';

  /* Briefly make the menu visible to measure its size, then position it */
  ctxMenu.style.display = 'block';
  var mw = ctxMenu.offsetWidth, mh = ctxMenu.offsetHeight;
  ctxMenu.style.display = '';

  var x = e.clientX, y = e.clientY;
  if (x + mw > window.innerWidth  - 8) x = e.clientX - mw;
  if (y + mh > window.innerHeight - 8) y = e.clientY - mh;
  ctxMenu.style.left = x + 'px';
  ctxMenu.style.top  = y + 'px';
  ctxMenu.classList.add('show');
});

/* Close the menu on any click */
document.addEventListener('click', function() { ctxMenu.classList.remove('show'); });
document.addEventListener('contextmenu', function(e) {
  if (!e.target.closest('#cardStrip')) ctxMenu.classList.remove('show');
});

/*
 * "Move front image → Backs"
 * The front image of the right-clicked card moves to state.backs.
 * The card (and any other card using the same front) is removed because
 * it no longer has a front image.
 */
document.getElementById('ctxMoveFrontToBack').addEventListener('click', function() {
  ctxMenu.classList.remove('show');
  if (ctxCardIdx === null) return;
  var c          = state.cards[ctxCardIdx];
  if (!c) return;
  var frontEntry = state.fronts.find(function(f) { return f.id === c.frontId; });
  if (!frontEntry) return;

  state.fronts = state.fronts.filter(function(f) { return f.id !== frontEntry.id; });
  state.backs.push(frontEntry);
  state.cards  = state.cards.filter(function(card) { return card.frontId !== frontEntry.id; });
  state.selection = new Set();
  lastClickedIdx  = null;

  toast('"' + frontEntry.name + '" moved to Backs');
  render();
});

/*
 * "Move back image → Fronts"
 * The assigned back of this card moves to state.fronts and becomes a new
 * card (with no back assigned). Any other card that used the same back
 * has its backId cleared.
 */
document.getElementById('ctxMoveBackToFront').addEventListener('click', function() {
  ctxMenu.classList.remove('show');
  if (ctxCardIdx === null) return;
  var c         = state.cards[ctxCardIdx];
  if (!c || !c.backId) return;
  var backEntry = state.backs.find(function(b) { return b.id === c.backId; });
  if (!backEntry) return;

  state.backs = state.backs.filter(function(b) { return b.id !== backEntry.id; });
  state.fronts.push(backEntry);
  state.cards.forEach(function(card) { if (card.backId === backEntry.id) card.backId = null; });
  state.cards.push({ frontId: backEntry.id, backId: null });

  toast('"' + backEntry.name + '" moved to Fronts');
  render();
});

/* "Remove card" — same as the × button but via right-click */
document.getElementById('ctxRemoveCard').addEventListener('click', function() {
  ctxMenu.classList.remove('show');
  if (ctxCardIdx === null) return;

  state.cards.splice(ctxCardIdx, 1);
  var newSel = new Set();
  state.selection.forEach(function(i) {
    if      (i < ctxCardIdx) newSel.add(i);
    else if (i > ctxCardIdx) newSel.add(i - 1);
  });
  state.selection = newSel;
  lastClickedIdx  = null;
  render();
});
