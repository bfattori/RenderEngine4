Done! I filled in the Grid and built a working demo. The browser tab should now show a live pixel editor you can paint in.

## Files
- Grid.js - the complete `Grid` class
- index.html — demo: editor canvas, foreground/background pickers, zoom buttons, cell-count control, sprite loader, PNG export, and a pixelated 1:1 preview

## What I implemented
- **Canvas drawing**: `draw()` renders cell contents, grid lines, and a high-contrast hover outline; `attachCanvas(canvas)` wires it up (also added as an optional 5th constructor arg, since the skeleton never had a canvas to draw on).
- **Mouse interaction**: hover exposes `hoveredX`, `hoveredY`, and `hoveredColor` (null when the cell is background); left-click fills with the foreground color, right-click clears (context menu suppressed). I also added drag-painting with either button.
- **Zoom**: `zoom(factor)`, `zoomIn()`, `zoomOut()`, `resetZoom()` — rescales cell size (clamped 2px–512px and to the canvas) without changing the output image's pixel dimensions.
- **Colors at runtime**: `grid.foregroundColor = '#ff0000'` / `grid.backgroundColor = ...` (getter/setter pairs; the skeleton's `#forgroundColor` typo is fixed). Changing the background repaints cleared cells live.
- **Preview**: `previewCanvas`, `previewImage` (the 1:1 ImageData), plus `toDataURL()` for exporting.

## Bugs fixed from the skeleton
1. **`clear()` never filled the rows** — `row = new Array(...)` reassigned a local instead of the array; now uses `Array.from({length}, () => new Array(cellsX).fill(...))`.
2. **`updatePreview()` used `ctx.fillColor`** — not a real Canvas API; now `fillStyle`.
3. **`loadContentsFromImage()` referenced undefined `imageData`** and read only the red channel at the wrong index; now reads RGBA at `(y * width + x) * 4` and stores hex colors (fully transparent pixels become background).
4. **Cell contents were raw red-channel bytes** — that can't represent real colors, so cells now store CSS color strings (e.g. `#ff8800`), with `BACKGROUND_COLOR` still as the sentinel.
5. `drawContentsToGrid()` was empty — implemented with 1px overdraw so antialiased seams never show between cells.

Suggested changes I made: `paintCell(x, y)` as the convenience "fill with foreground" method (alongside the explicit `fillCell(x, y, color)`), `getCellColor()` for inspection, and `attachCanvas()`/`detachCanvas()` for clean lifecycle. Verified with `node --check` and a stubbed smoke test of fill/clear/load/preview — all passing.