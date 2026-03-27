# GutterFold — Playing Card PDF Maker

A single-file, browser-based tool for creating **gutterfold print sheets** for print-and-play playing cards. Upload front and back images, arrange them into a gutterfold layout, and export a print-ready PDF — no installation, no server, no account required.

---

## What is a gutterfold?

A gutterfold layout places the **front** and **back** of each card side-by-side on the same sheet, separated by a narrow fold line (the *gutter*). To assemble a card:

1. Print the sheet single-sided.
2. Fold along the gutter line so the back aligns behind the front.
3. Apply glue to bond the two halves together.
4. Cut out the card.

```
┌──────────────┬──────┬──────────────┐
│              │      │              │
│    FRONT     │  ←   │    BACK      │
│              │ fold │              │
└──────────────┴──────┴──────────────┘
```

Because both sides are printed on the same face of the paper, a **duplex (double-sided) printer is not required**.

---

## Quick start

1. Download `gutterfold.html`.
2. Open it in any modern browser (Chrome, Firefox, Edge, Safari).
3. Upload your card front images using the **Fronts** upload zone.
4. Upload your card back images using the **Backs** upload zone (optional).
5. Assign backs to cards in the strip at the bottom.
6. Click **⬇ Generate PDF** and print.

> **Note:** Because the PDF splitter feature uses PDF.js as an ES module, opening the file via `file://` may be blocked in some browsers due to CORS restrictions on module imports. If the splitter does not work when opening the file directly from disk, serve it via a local web server (e.g. `python3 -m http.server` in the same folder, then open `http://localhost:8000`). All other features work from `file://` without restriction.

---

## User interface overview

The application is divided into three main areas:

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER  — toolbar buttons and app title                      │
├──────────────┬───────────────────────────────────────────────┤
│              │                                               │
│   SIDEBAR    │        PREVIEW CANVAS                        │
│  (settings,  │   (live gutterfold page preview)             │
│   uploads,   │                                               │
│   ordering)  ├───────────────────────────────────────────────┤
│              │   CARD STRIP  (horizontal scrollable strip)   │
│              ├───────────────────────────────────────────────┤
│              │   BACK-ASSIGN BAR  (shown when cards selected)│
└──────────────┴───────────────────────────────────────────────┘
```

---

## Features in detail

### 1. Uploading images

**Fronts** and **Backs** are uploaded separately via the sidebar upload zones.

- Click either zone or drag-and-drop image files onto it.
- Accepted formats: JPEG, PNG, WebP, GIF, BMP — anything the browser's `<img>` element can decode.
- Multiple files can be selected at once; they are appended in filename order.
- Each new front image automatically creates a corresponding card entry in the strip.
- Back images are added to the backs pool and are available for assignment but do not create cards by themselves.

---

### 2. The card strip

The **horizontal scrollable strip** at the bottom of the screen is the primary card management interface. Each card is represented as a small tile showing its front thumbnail on the left and back thumbnail on the right.

**Visual indicators:**
- A small number in the top-left corner shows the card's position in the print order.
- A teal dot in the top-right corner indicates that a back has been assigned.
- An empty placeholder (`↩`) is shown where no back has been assigned yet.
- A golden border appears around cards that are currently selected.

**Removing a card:**
Hover over a card to reveal a small `×` button in its top-right corner. Clicking it removes the card from the list. The underlying front and back images remain in the image pools and can still be used by other cards.

---

### 3. Selecting cards (multi-select)

Multiple cards can be selected simultaneously for bulk back assignment or reordering.

| Action | Result |
|---|---|
| **Click** | Select that card; deselect all others. Click the same card again to deselect it. |
| **Ctrl + click** (or **Cmd + click** on Mac) | Toggle individual card without affecting other selections. |
| **Shift + click** | Range-select all cards between the last clicked card and this one. |
| **Click empty strip area** | Deselect all cards. |

The number of selected cards is shown as a gold badge in the strip header.

---

### 4. Hover preview

Hovering the mouse over any card in the strip shows an **enlarged floating tooltip** containing:

- A large preview of the front image (150 px wide).
- A large preview of the back image (or a placeholder if none is assigned).
- The card number, front image name, and back image name.

The tooltip automatically repositions itself to stay fully within the viewport.

---

### 5. Assigning backs to cards

There are three ways to assign a back image to a card.

**Per-card assignment (back-assign bar):**
Select one or more cards in the strip. A bar appears below the strip showing:
- How many cards are selected.
- A dropdown listing all available back images. If all selected cards share the same back, it is pre-selected.
- A **Clear** button to remove the back assignment from all selected cards.
- A **Deselect all** button.

Choosing a back from the dropdown applies it immediately to all selected cards.

**Batch assignment (sidebar):**
In the *Batch Back Assignment* section of the sidebar:
1. Choose a back image from the dropdown.
2. Click **All cards** to apply it to every card in the list, or **Unassigned** to apply it only to cards that currently have no back.

**Right-click context menu:**
Right-clicking any card in the strip opens a context menu with image management options (see section 8 below).

---

### 6. Reordering cards

Cards are printed in the order they appear in the strip, left to right, then row by row. To change the order, select one or more cards and use the **Card Order** buttons in the sidebar:

| Button | Action |
|---|---|
| **↑ Up** | Move all selected cards one position earlier in the list. |
| **↓ Down** | Move all selected cards one position later in the list. |
| **⊕ Dup** | Duplicate all selected cards, inserting copies immediately after each original. |

Reordering works on multi-selections; all selected cards shift together as a group.

---

### 7. Layout settings

All layout dimensions are in **millimetres**. The preview canvas updates live as settings change.

| Setting | Default | Description |
|---|---|---|
| **Paper size** | Letter | A4 (297×210 mm), Letter (279.4×215.9 mm), or A3 (420×297 mm). |
| **Orientation** | Landscape | Landscape or portrait. Landscape is recommended as it fits more card pairs per row. |
| **Card W** | 63.5 mm | Card width, not including bleed. Standard poker size is 63.5 × 88.9 mm. |
| **Card H** | 88.9 mm | Card height, not including bleed. |
| **Gutter** | 3 mm | Width of the gap between the front and back images. The fold line runs down the centre of this gap. |
| **Margin** | 8 mm | Distance from the edge of the paper to the first card pair on each side. |
| **Spacing** | 3 mm | Gap between adjacent card pairs on the same page. |
| **Bleed** | 0 mm | Extra image area printed outside the card edge on all four sides. Set this if your card artwork includes a bleed allowance for cutting tolerance. |
| **Gutter line** | Dashed | A visual fold guide printed on the sheet: **Dashed**, **Solid**, or **None**. |
| **Cut marks** | None | Small corner registration marks printed just outside each card pair to guide cutting: **Corner** or **None**. |

**How many cards fit per page** is calculated automatically from these settings. The formula is:

```
pairWidth  = (cardW + bleed × 2) × 2 + gutter
pairHeight = cardH + bleed × 2

columns = floor((pageWidth  − margin × 2 + spacing) / (pairWidth  + spacing))
rows    = floor((pageHeight − margin × 2 + spacing) / (pairHeight + spacing))
cardsPerPage = columns × rows
```

---

### 8. Right-click context menu on strip cards

Right-clicking any card in the strip opens a context menu with three options. Menu items that are not applicable for the selected card are hidden automatically.

**🂡 Move front image → Backs**
Transfers this card's front image from the fronts pool to the backs pool. Because the card no longer has a front, it is removed from the card list. Any other card that also used this image as a front is removed in the same operation. The image is now available for back assignment.

*Use this when a PDF page you imported as a front is actually a card back.*

**🂠 Move back image → Fronts**
Transfers the back image currently assigned to this card from the backs pool to the fronts pool. The card's back assignment is cleared (as are any other cards that used the same back). A new card entry is created for the newly promoted front image, with no back assigned.

*Use this when a PDF page you imported as a back is actually a card front.*

**✕ Remove card**
Removes the card entry from the list. The front and back images remain in their respective pools.

---

### 9. PDF splitter (⊞ Split PDF → Images)

The splitter lets you extract individual card images from an existing PDF — for example, a print-and-play rulebook or card sheet PDF — without any external software.

**Step 1 — Upload and configure**

Drop or click to select a PDF file. Configure the extraction settings:

| Setting | Default | Description |
|---|---|---|
| **Render DPI** | 200 | Resolution at which each PDF page is rasterised to a bitmap. 200 DPI is a good balance between quality and file size. Increase to 300 for sharper output. |
| **Auto-crop white border** | Yes | Automatically detects and removes white margins around card content before importing. Uses density profiling (see below). |
| **White threshold** | 240 | Any pixel with R, G, and B channels all at or above this value (0–255) is treated as white. Lower this value if your card backgrounds are cream or off-white rather than pure white. |
| **Content density** | 0.01 | Minimum fraction of non-white pixels in a row or column for it to be considered content rather than border. The default of 0.01 (1%) means alignment marks or thin border lines — which affect far fewer than 1% of pixels per row — are ignored. Increase this value if very fine card borders are being incorrectly trimmed. |

Click **Analyse PDF pages →** to render thumbnails of all pages.

**Step 2 — Assign pages**

Each page is shown as a thumbnail with two controls:

- **Front / Back dropdown** — assign the page to either the fronts pool or the backs pool.
- **Skip checkbox** — exclude the page entirely (useful for cover pages, rules text, etc.).

**Grid split settings** allow each page to be divided into a grid of tiles before importing. Set *Grid rows per page* and *Grid cols per page* to the number of card rows and columns on each sheet. For example, a 3×4 grid extracts 12 individual card images from a single page. Each tile is cropped and imported independently.

Click **⬇ Import into GutterFold** to render all non-skipped pages at full resolution, apply cropping and grid splitting, and add the results directly to the fronts and backs pools.

**Auto-crop algorithm — density profiling**

The auto-crop does not simply look for the first non-white pixel from each edge. Instead it uses row and column density profiling:

1. For every row and every column in the rendered image, count the number of non-white pixels.
2. A row is considered to contain *content* only if its non-white pixel count exceeds `imageWidth × contentDensity`.
3. The same applies to columns using `imageHeight × contentDensity`.
4. The crop rectangle is the tightest box around all content rows and columns.

This approach correctly ignores alignment crosses, registration marks, and thin border lines, which are sparse and stay well below the density threshold, while reliably detecting the edges of actual card artwork.

---

### 10. Download Images (⬇ Download Images)

The **Download Images** button in the header packages all currently loaded front and back images into a single ZIP archive and downloads it.

The ZIP is organised into two folders:

```
gutterfold_images.zip
├── fronts/
│   ├── card-01.png
│   ├── card-02.png
│   └── ...
└── backs/
    ├── back-standard.png
    └── ...
```

Each image is saved in its original format (PNG or JPEG, determined from the data URL). This is useful for:

- Archiving all images that were extracted from a PDF.
- Moving images between sessions (since the app holds no persistent storage).
- Inspecting or further editing extracted tiles before importing.

---

### 11. Preview canvas

The centre of the screen shows a live canvas rendering of one page of the gutterfold layout exactly as it will appear in the exported PDF.

**Zoom controls** are in the preview toolbar:

| Control | Action |
|---|---|
| **−** | Zoom out by 15%. |
| **+** | Zoom in by 15%. |
| **⊡** | Reset to *Fit* mode — scale to fill the available area. |
| **Ctrl + scroll wheel** | Zoom in or out continuously. |

In *Fit* mode the canvas rescales automatically when the window is resized or settings change. In manual zoom mode the scale is fixed until **⊡** is clicked or a layout setting is changed.

**Page navigation** (‹ and ›) steps through pages when the card list is longer than one page. The current page number and total are shown between the buttons.

Selected cards are highlighted in the preview with a dashed golden outline so you can visually confirm which cards are selected before a batch back assignment.

Card index numbers (`#1`, `#2`, …) are overlaid on the preview for identification. These labels do not appear in the exported PDF.

---

### 12. Generating the PDF

Click **⬇ Generate PDF** to export the layout. A progress bar modal is shown during rendering.

**Technical details of the export:**

- Each page is rendered onto an off-screen `<canvas>` at **200 DPI** (approximately 1575 × 1237 pixels for a Letter landscape page).
- The canvas is converted to a JPEG at 93% quality and embedded as a full-page image in the PDF using jsPDF.
- The resulting PDF has one page per sheet of cards. For a 20-card set with 4 cards per page, the PDF will have 5 pages.
- The file is saved as `gutterfold_cards.pdf`.

**Printing recommendations:**

- Print at **100% scale** (also called *Actual size* or *None* in the printer scaling options). Do not use *Fit to page* or *Shrink to fit* as this will alter the card dimensions.
- Use the heaviest paper your printer supports (200–300 gsm card stock if available), or print on regular paper and glue onto card stock.
- After printing, fold each pair along the gutter line, apply a thin layer of PVA or stick glue, press flat, and let dry before cutting.

---

## Dependencies

All dependencies are loaded from CDN. No local installation is required.

| Library | Version | CDN | Purpose |
|---|---|---|---|
| [jsPDF](https://github.com/parallax/jsPDF) | 2.5.1 | cdnjs | PDF generation |
| [PDF.js](https://mozilla.github.io/pdf.js/) | 4.4.168 | cdnjs | PDF rendering for the splitter |
| [JSZip](https://stuk.github.io/jszip/) | 3.10.1 | cdnjs | ZIP archive creation for image download |
| [Google Fonts](https://fonts.google.com) | — | fonts.googleapis.com | Playfair Display + DM Mono typefaces |

---

## Browser compatibility

The application uses ES modules (for the PDF.js import), the Canvas 2D API, FileReader, Blob URLs, and the Clipboard/download API. All of these are available in any evergreen browser.

| Browser | Support |
|---|---|
| Chrome 90+ | ✅ Full support |
| Firefox 90+ | ✅ Full support |
| Edge 90+ | ✅ Full support |
| Safari 15+ | ✅ Full support |

> If the PDF splitter fails when opening the file via `file://`, use a local HTTP server. Chrome and some other browsers restrict ES module imports across the `file://` protocol due to CORS policy.

---

## Workflow examples

### Example A — Simple deck with one shared back

1. Upload all card front images using the **Fronts** zone.
2. Upload one back image using the **Backs** zone.
3. In the **Batch Back Assignment** section, select the back from the dropdown and click **All cards**.
4. Adjust paper size, margins, and gutter as needed.
5. Click **⬇ Generate PDF**.

### Example B — Deck with individually paired backs

1. Upload all front images.
2. Upload all back images (named to match the fronts for ease of identification).
3. In the card strip, click a card to select it.
4. In the **back-assign bar** that appears below the strip, choose the matching back from the dropdown.
5. Repeat for each card, or use Shift+click to select multiple cards with the same back and assign in bulk.
6. Export.

### Example C — Extracting cards from a PDF

1. Click **⊞ Split PDF → Images**.
2. Drop the source PDF onto the upload zone.
3. Set the render DPI (200 is sufficient for home printing).
4. If each PDF page contains a grid of cards (e.g. 3 rows × 4 columns), set *Grid rows per page* to 3 and *Grid cols per page* to 4 before clicking import.
5. Set pages containing fronts to **Front** and pages containing backs to **Back**. Skip pages that are not card images (rules, cover, etc.).
6. Click **⬇ Import into GutterFold**.
7. If some images ended up in the wrong pool (e.g. a back page was labelled as front), right-click the affected cards in the strip and use **Move front image → Backs** or **Move back image → Fronts** to correct them.
8. Assign backs to cards and export.

---

## Tips and troubleshooting

**Cards are printing smaller or larger than expected.**
Make sure you are printing at 100% scale. Most PDF viewers default to *Fit to page*. In Adobe Reader: *File → Print → Page Sizing → Actual size*. In a browser: disable *Fit to page* and set scale to 100%.

**The auto-crop is trimming part of the card artwork.**
The crop is cutting too aggressively. Lower the **Content density** value (e.g. from 0.01 to 0.005) so that rows and columns with sparser content are still counted as artwork rather than border.

**The auto-crop is not removing enough of the white border.**
The border contains content-like marks. Raise the **Content density** value (e.g. from 0.01 to 0.03) so that only rows/columns with denser content are counted, and sparse border marks are ignored.

**The PDF splitter does not open or shows no pages.**
The splitter requires an internet connection to load PDF.js from the CDN. If you are offline, the splitter will not function. All other features (image upload, layout, PDF export) work offline.

**I imported images from a PDF and some fronts are actually backs.**
Right-click each affected card in the strip and choose **🂡 Move front image → Backs**. This moves the image to the backs pool without deleting it. You can then assign it as a back to the appropriate card.

**The PDF is very large.**
The export renders at 200 DPI as JPEG at 93% quality. If file size is a concern, consider reducing the DPI of the PDF splitter extraction step, which reduces the source image resolution before it is embedded in the PDF.

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| **Ctrl + scroll** over preview | Zoom in / out |
| **Click** card in strip | Select / deselect |
| **Shift + click** card | Range select |
| **Ctrl + click** card | Toggle individual card |
| **Right-click** card | Open context menu |

---

## License

MIT — free to use, modify, and distribute for any purpose.
