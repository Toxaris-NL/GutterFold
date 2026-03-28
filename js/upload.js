/*
 * upload.js — Image File Upload Handlers
 * ========================================
 * Wires up the two sidebar upload zones (Fronts and Backs) to handle
 * both click-to-pick and drag-and-drop file selection.
 *
 * When new front images are loaded, a matching card entry is created
 * automatically in state.cards so the card appears in the strip
 * without the user having to do anything extra.
 *
 * When back images are loaded they go into state.backs only; the user
 * assigns them to cards manually (or via batch assignment).
 *
 * Depends on: state.js, utils.js (fileToDataURL, loadImg, render, uid)
 */

/* ---------------------------------------------------------------------------
 * handleFiles — loads files into the fronts or backs image pool
 *
 * @param {FileList|File[]} files
 * @param {'fronts'|'backs'} kind
 * --------------------------------------------------------------------------- */
async function handleFiles(files, kind) {
  var arr = Array.from(files);
  for (var i = 0; i < arr.length; i++) {
    var url = await fileToDataURL(arr[i]);
    var img = await loadImg(url);
    state[kind].push({
      id:   uid(),
      name: arr[i].name.replace(/\.[^.]+$/, ''), /* strip file extension */
      url:  url,
      img:  img,
    });
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
 * Wire up both upload zones
 * Runs immediately when the script is parsed (DOM is ready by this point
 * because all <script> tags are at the end of <body>).
 * --------------------------------------------------------------------------- */
['Fronts', 'Backs'].forEach(function(Kind) {
  var input = document.getElementById('input' + Kind);
  var zone  = document.getElementById('zone'  + Kind);
  var kind  = Kind.toLowerCase(); /* 'fronts' or 'backs' */

  /* Standard file-picker */
  input.addEventListener('change', function(e) {
    handleFiles(e.target.files, kind);
  });

  /* Drag-and-drop: highlight zone on dragover */
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
