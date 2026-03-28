/*
 * state.js — Shared Application State
 * =====================================
 * This file must be loaded FIRST (before all other js/ files).
 * It declares the globals that every other script reads and mutates.
 *
 * Why globals and not ES modules?
 *   ES modules require a server (file:// blocks cross-origin module imports).
 *   Plain <script> tags work locally without any build tooling or server.
 *   All js/ files therefore share a single global scope; this file owns
 *   the authoritative state objects so their shape is defined in one place.
 */

/* ---------------------------------------------------------------------------
 * Main application state
 *
 * fronts / backs — arrays of image entry objects:
 *   { id: Number, name: String, url: String (data URL), img: HTMLImageElement }
 *
 * cards — ordered list of card entries (the print order):
 *   { frontId: Number, backId: Number|null }
 *
 * selection — Set of card indices currently selected in the strip.
 *   Multi-select is supported; an empty Set means nothing selected.
 *
 * currentPage — zero-based index of the page shown in the preview canvas.
 * --------------------------------------------------------------------------- */
var state = {
  fronts:      [],
  backs:       [],
  cards:       [],
  selection:   new Set(),
  currentPage: 0,
};

/* ---------------------------------------------------------------------------
 * Unique ID counter
 * Each image entry gets a numeric ID so cards can reference images by ID
 * even after the arrays are reordered or filtered.
 * --------------------------------------------------------------------------- */
var _uid = 0;
function uid() { return ++_uid; }

/* ---------------------------------------------------------------------------
 * Splitter state
 * Holds the in-progress state of the PDF Splitter modal.
 * Lives here (not in splitter.js) so export.js and strip.js can remain
 * unaware of it while still being loaded after state.js.
 *
 * pdfDoc     — PDF.js document object (null when no PDF loaded)
 * pageCount  — total pages in the loaded PDF
 * pageAssign — array of 'front' | 'back' strings, one per page (0-based)
 * pageSkip   — array of booleans, one per page; true = exclude from import
 * --------------------------------------------------------------------------- */
var sp = {
  pdfDoc:     null,
  pageCount:  0,
  pageAssign: [],
  pageSkip:   [],
};

/* ---------------------------------------------------------------------------
 * Strip selection anchor
 * Tracks the last card clicked so Shift+click range selection knows where
 * to start the range from. Declared here because strip.js and main.js
 * both need to reset it.
 * --------------------------------------------------------------------------- */
var lastClickedIdx = null;
