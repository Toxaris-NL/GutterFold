/*
 * main.js — Sidebar Batch Actions & App Initialisation
 * ======================================================
 * This file must be loaded LAST (after all other js/ files).
 * It wires up the sidebar controls that didn't fit naturally into a
 * feature-specific file, and calls render() to draw the initial state.
 *
 * Depends on: everything else (state.js, utils.js, strip.js, preview.js, …)
 */

/* ===========================================================================
   BATCH BACK ASSIGNMENT
   =========================================================================== */

/*
 * "All cards" — assign the selected back to every card, overwriting any
 * existing back assignments.
 */
document.getElementById('btnApplyAll').addEventListener('click', function() {
  var v = document.getElementById('batchBackSelect').value;
  if (!v) { toast('Pick a back first', 'err'); return; }
  var id = parseInt(v);
  state.cards.forEach(function(c) { c.backId = id; });
  render();
  toast('Applied to all cards');
});

/*
 * "Unassigned" — assign the selected back only to cards that currently have
 * no back, leaving existing assignments untouched.
 */
document.getElementById('btnApplyUnset').addEventListener('click', function() {
  var v = document.getElementById('batchBackSelect').value;
  if (!v) { toast('Pick a back first', 'err'); return; }
  var id = parseInt(v);
  state.cards.forEach(function(c) { if (!c.backId) c.backId = id; });
  render();
  toast('Applied to unassigned cards');
});

/* ===========================================================================
   CARD ORDERING
   =========================================================================== */

/*
 * ↑ Up — move all selected cards one position earlier in the list.
 * Cards are swapped in ascending index order so earlier selected cards
 * don't push later selected cards out of alignment.
 */
document.getElementById('btnMoveUp').addEventListener('click', function() {
  var sel = Array.from(state.selection).sort(function(a, b) { return a - b; });
  if (sel.length === 0 || sel[0] === 0) return;
  sel.forEach(function(i) {
    var tmp = state.cards[i - 1]; state.cards[i - 1] = state.cards[i]; state.cards[i] = tmp;
  });
  state.selection  = new Set(sel.map(function(i) { return i - 1; }));
  lastClickedIdx   = lastClickedIdx !== null ? lastClickedIdx - 1 : null;
  render();
});

/*
 * ↓ Down — move all selected cards one position later in the list.
 * Processed in descending order for the same reason as ↑ Up.
 */
document.getElementById('btnMoveDown').addEventListener('click', function() {
  var sel = Array.from(state.selection).sort(function(a, b) { return b - a; });
  if (sel.length === 0 || sel[0] >= state.cards.length - 1) return;
  sel.forEach(function(i) {
    var tmp = state.cards[i + 1]; state.cards[i + 1] = state.cards[i]; state.cards[i] = tmp;
  });
  state.selection = new Set(sel.map(function(i) { return i + 1; }));
  lastClickedIdx  = lastClickedIdx !== null ? lastClickedIdx + 1 : null;
  render();
});

/*
 * ⊕ Dup — duplicate all selected cards.
 * Copies are inserted immediately after each original (processed in
 * descending index order so earlier insertions don't shift later ones).
 * The new copies become the active selection.
 */
document.getElementById('btnDup').addEventListener('click', function() {
  var sel = Array.from(state.selection).sort(function(a, b) { return b - a; });
  if (sel.length === 0) return;
  var newSel = new Set();
  sel.forEach(function(i) {
    state.cards.splice(i + 1, 0, { frontId: state.cards[i].frontId, backId: state.cards[i].backId });
    newSel.add(i + 1);
  });
  state.selection = newSel;
  render();
});

/* ===========================================================================
   CLEAR ALL
   =========================================================================== */

document.getElementById('btnClear').addEventListener('click', function() {
  if (!confirm('Clear all cards and uploaded images?')) return;
  state.fronts      = [];
  state.backs       = [];
  state.cards       = [];
  state.selection   = new Set();
  lastClickedIdx    = null;
  state.currentPage = 0;
  render();
});

/* ===========================================================================
   INITIALISATION — draw the initial (empty) UI
   =========================================================================== */
render();
