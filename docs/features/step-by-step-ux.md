# Feature Spec: Step-by-step UX with Output Format Selection

**Status:** Partially implemented — see [Implementation Status](#implementation-status) below  
**Affected files:** `app/page.tsx`, `app/_components/ControlPanel.tsx`, `app/_components/PixelArtPreview.tsx`, `app/_lib/image-processor.ts`

---

## Implementation Status

| Section | Item | Status |
|---|---|---|
| 1 UX Flow | Side-by-side Original / Pixel Art panels | Done |
| 1 UX Flow | Step tracker (4 steps, three visual states) | Done |
| 1 UX Flow | Original image panel with empty state | Done |
| 1 UX Flow | Generated panel empty / loading states | Done |
| 1 UX Flow | Download bar below panels | Done (litematic only) |
| 2 Output Format | `outputFormat` state and toggle in ControlPanel | Pending |
| 2 Output Format | `showGridLines` checkbox | Pending |
| 2 Output Format | Schematic name moved into ControlPanel | Pending |
| 3 Component API | `PixelArtPreview` `isLoading` prop | Done |
| 3 Component API | `ControlPanel` new props (`outputFormat`, `showGridLines`, `schematicName`) | Pending |
| 3 Component API | `downloadPixelArtAsPng` function | Pending |

**Bugfixes applied during implementation (not in original spec):**

- `ImageUpload` — replaced outer `div` + `inputRef.click()` with a native `<label>` wrapper; this is more reliable because clicking a label natively opens the file picker without requiring programmatic JS. The now-redundant `useRef` and MIME-type guard were removed.
- `page.tsx` — the `useEffect([imagePreviewUrl])` URL cleanup was revoked immediately by React strict mode's double-invoke behavior. Fixed by using a `ref` (`imagePreviewUrlRef`) that tracks the active blob URL: the previous URL is revoked inside `handleImageSelected` (at the right time), and a single unmount-only `useEffect` (empty deps) handles the final cleanup.
- `next.config.ts` — added `allowedDevOrigins: ["192.168.1.80"]` so the HMR WebSocket connects when accessing the dev server via the machine's network IP.

---

## 1. UX Flow

### 1.1 Previous state *(replaced)*

> This section describes the layout that existed before the UX redesign. It is kept for historical context.

The previous app exposed all controls at once in a sidebar with no sense of progress. The main content area was empty until the user generated output, with the original image visible only as a small thumbnail below the upload zone.

```
┌─ Header ────────────────────────────────────────────────────────┐
├─ Sidebar (320px) ────┬─ Main ────────────────────────────────────┤
│  1. Upload Image     │                                           │
│  [upload zone]       │   (empty — "generate a pixel art first") │
│  [tiny thumbnail]    │                                           │
│                      │                                           │
│  Schematic Name      │                                           │
│  [text input]        │                                           │
│                      │                                           │
│  2. Configure        │                                           │
│  [dimensions]        │                                           │
│  [orientation]       │                                           │
│  [block filters]     │                                           │
│  [Generate button]   │                                           │
└──────────────────────┴───────────────────────────────────────── ┘
```

Problems addressed by the redesign:
- Main area communicated nothing before generation — a large wasted region.
- Steps were labeled 1, 2, 3 but the schematic name and download were unnumbered.
- Controls were enabled but purposeless until an image was uploaded.
- Two competing empty states (`page.tsx` and `PixelArtPreview`) appeared simultaneously.

---

### 1.2 Implemented layout

The sidebar retains its role as the control column. The main area is split into two equal panels that are always visible, each serving a distinct purpose.

```
┌─ Header ────────────────────────────────────────────────────────────┐
├─ Sidebar (320px) ────┬─ Main (flex-1) ──────────────────────────────┤
│                      │                                               │
│  Step tracker        │  ┌── Original ──────┬── Pixel Art ─────────┐ │
│  ● 1  Upload         │  │                  │                       │ │
│  ○ 2  Configure      │  │  <img src>       │  <PixelArtPreview>   │ │
│  ○ 3  Generate       │  │  (shown after    │  (shown after        │ │
│  ○ 4  Download       │  │   upload)        │   generate)          │ │
│                      │  │                  │                       │ │
│  ── Step content ──  │  │  empty state:    │  empty/loading state │ │
│                      │  │  "Upload an      │  driven by           │ │
│  [step 1 content]    │  │  image to begin" │  isProcessing prop   │ │
│  [step 2 content]    │  └──────────────────┴──────────────────────┘ │
│  [Generate CTA]      │                                               │
│                      │  ── After generate ─────────────────────────  │
│                      │  [ ↓ Download PNG ]  [ ↓ Download .litematic ]│
│                      │  [BlockLegend — collapsible]                  │
└──────────────────────┴───────────────────────────────────────────── ┘
```

---

### 1.3 Step tracker

A vertical list in the sidebar header, above the step content. Each step has three visual states:

| State | Visual |
|---|---|
| Completed | Filled green circle with checkmark, label full-brightness |
| Active | Outlined green circle with step number, label full-brightness |
| Pending | Outlined gray circle with step number, label muted |

Steps:
1. **Upload** — completed when `imageFile !== null`
2. **Configure** — active once step 1 is complete; completed when user has changed at least one setting or implicitly on generate
3. **Generate** — active when step 1 is complete; completed when `blockGrid.length > 0`
4. **Download** — active after step 3 is complete

The tracker is purely visual — it does not restrict access to controls. All sidebar controls remain editable at any time.

---

### 1.4 Original image panel (left)

**Before upload:** Shows a centered placeholder with an icon and the text "Upload an image to begin."

**After upload:** Displays the image using `<img src={imagePreviewUrl}>` with `object-contain` so the full image is visible regardless of aspect ratio. The panel label reads "Original" with the filename and pixel dimensions of the source file shown as secondary text.

The original image panel never changes after upload — it always shows the source, not the output.

---

### 1.5 Generated pixel art panel (right)

**Before generate (no image):** Empty — shows nothing (the original panel's placeholder covers the intent).

**Before generate (image uploaded):** Shows a subtle hint: "Configure and click Generate."

**During generate (`isProcessing = true`):** Shows a pulsing skeleton overlay — a grid of gray squares that animate with a shimmer effect to communicate processing activity.

**After generate:** Shows `PixelArtPreview` with its zoom controls and hover tooltips.

---

### 1.6 Download bar

Appears below the two panels only after `blockGrid.length > 0`. Always shows both output buttons regardless of the selected `outputFormat` — the selected format gets the primary green style, the other gets a secondary outline style.

```
[ ↓ Download PNG image ]   [ ↓ Download .litematic ]   [▾ Block list (32 types)]
```

The block legend is collapsible via a toggle button, collapsed by default after generation.

---

## 2. Output Format Selection

### 2.1 New `outputFormat` state

Added to `page.tsx` alongside the existing controls state:

```ts
const [outputFormat, setOutputFormat] = useState<"image" | "litematic">("image");
const [showGridLines, setShowGridLines] = useState(false);
```

`outputFormat` is passed down to `ControlPanel` as a controlled prop. It does not affect the generation pipeline — the `blockGrid` is always computed the same way — but it determines which download is triggered and which output button is styled as primary.

---

### 2.2 Output format toggle in `ControlPanel`

Placed between the Orientation section and the Block Categories section. Renders as two side-by-side buttons (same style as the existing orientation cards but smaller):

```
Output Format
┌─────────────────────┬─────────────────────┐
│  PNG Image          │  .litematic         │
│  [image icon]       │  [block icon]       │
│  Download as pixel  │  Load in Minecraft  │
│  art image          │  via Litematica mod │
└─────────────────────┴─────────────────────┘
```

When **PNG Image** is selected, a "Grid lines" checkbox appears directly below:

```
  ☑  Show grid lines between blocks
```

When **.litematic** is selected, a "Schematic name" text input appears instead:

```
  Schematic name
  [________________]
```

The schematic name input is moved from `page.tsx` into `ControlPanel` and is only rendered when `outputFormat === "litematic"`.

---

### 2.3 Generate button label

The generate button in `ControlPanel` adapts its label based on `outputFormat`:

| `outputFormat` | Button label |
|---|---|
| `"image"` | Generate Image |
| `"litematic"` | Generate Schematic |

The button is disabled and shows the same locked state when `!hasImage` regardless of format.

---

### 2.4 PNG image generation

No changes are needed to the `color-matcher` or `image-processor` resize pipeline — the `blockGrid` is already the correct input. The PNG download renders from `blockGrid` at the time of the download click, not at generate time.

When **Show grid lines** is enabled, a 1px separator line is drawn between each block cell in a semi-transparent dark color (`rgba(0,0,0,0.2)`). This is purely cosmetic and does not affect block matching or the litematic output.

---

## 3. Component API Changes

### 3.1 `ControlPanel` — new and changed props

Current props interface:

```ts
interface Props {
  width: number;
  height: number;
  orientation: Orientation;
  selectedCategories: Set<string>;
  onWidthChange: (v: number) => void;
  onHeightChange: (v: number) => void;
  onOrientationChange: (v: Orientation) => void;
  onCategoryToggle: (cat: string) => void;
  onGenerate: () => void;
  isProcessing: boolean;
  hasImage: boolean;
}
```

New props to add:

```ts
  // Output format
  outputFormat: "image" | "litematic";
  onOutputFormatChange: (v: "image" | "litematic") => void;

  // PNG-specific
  showGridLines: boolean;
  onShowGridLinesChange: (v: boolean) => void;

  // Litematic-specific (moved from page.tsx)
  schematicName: string;
  onSchematicNameChange: (v: string) => void;
```

Props to remove (moved into `ControlPanel`):

- None removed from the interface — `schematicName` and `onSchematicNameChange` replace the separate section in `page.tsx` rather than removing a prop.

---

### 3.2 `PixelArtPreview` — new prop *(implemented)*

Props interface:

```ts
interface Props {
  blockGrid: MinecraftBlock[][];
  isLoading?: boolean;  // default: false
}
```

When `isLoading` is `true`, a pulsing gradient skeleton overlay replaces the canvas, displaying a spinning icon and "Generating pixel art…" message. The internal `"No preview yet"` empty state has been removed — the parent panel layout manages the pre-generate empty state.

---

### 3.3 New function: `downloadPixelArtAsPng` — `app/_lib/image-processor.ts`

**Signature:**

```ts
/**
 * Render the block grid to a canvas and trigger a browser PNG download.
 *
 * Each block is drawn as a solid-color square of `cellSize` pixels. When
 * `showGrid` is true, 1px separator lines are drawn between blocks using
 * `rgba(0,0,0,0.2)` to create a visible grid without significantly altering
 * the appearance of individual block colors.
 *
 * The canvas dimensions will be:
 *   width  = cols * cellSize  (+ cols - 1 separator pixels if showGrid)
 *   height = rows * cellSize  (+ rows - 1 separator pixels if showGrid)
 *
 * @param blockGrid  - Row-major grid of MinecraftBlock values
 * @param cellSize   - Pixels per block cell (recommended: 8–32 for readable output)
 * @param showGrid   - Whether to draw 1px separator lines between blocks
 * @param filename   - Download filename without extension (`.png` is appended automatically)
 */
export function downloadPixelArtAsPng(
  blockGrid: MinecraftBlock[][],
  cellSize: number,
  showGrid: boolean,
  filename: string
): void
```

**Internal implementation outline:**

1. Create a DOM `<canvas>` element.
2. Compute canvas dimensions accounting for grid lines: `cols * cellSize + (showGrid ? cols - 1 : 0)` wide, same formula for height.
3. For each `(row, col)`, set `fillStyle` to `rgb(r,g,b)` from `block.rgb` and draw the cell rect at `(col * stride, row * stride)` where `stride = cellSize + (showGrid ? 1 : 0)`.
4. If `showGrid`, draw a second pass of 1px lines: vertical lines at `x = col * stride + cellSize` for each column, horizontal lines at `y = row * stride + cellSize` for each row, using `rgba(0,0,0,0.2)`.
5. Call `canvas.toBlob((blob) => { ... }, "image/png")` — inside the callback, create a blob URL, click a hidden `<a download="${filename}.png">`, and immediately revoke the URL.

This function is intentionally separate from `renderBlockGridToDataUrl` (which takes `[r,g,b][][]`) to avoid re-extracting RGB values from the grid — the `MinecraftBlock[][]` is passed directly.

---

## 4. Files Changed

| File | Type of change | Summary |
|---|---|---|
| [`app/page.tsx`](../../app/page.tsx) | Refactor + feature | Split main area into original/generated panels; add step tracker; add `outputFormat` and `showGridLines` state; wire `downloadPixelArtAsPng`; pass `isProcessing` to `PixelArtPreview`; move schematic name state into `ControlPanel` props; add download bar with both buttons |
| [`app/_components/ControlPanel.tsx`](../../app/_components/ControlPanel.tsx) | Feature addition | Add output format toggle section; add conditional `showGridLines` checkbox and `schematicName` input; update generate button label; add 6 new props to interface |
| [`app/_components/PixelArtPreview.tsx`](../../app/_components/PixelArtPreview.tsx) | Enhancement | Add `isLoading` prop with shimmer skeleton; remove internal empty state text |
| [`app/_lib/image-processor.ts`](../../app/_lib/image-processor.ts) | New function | Add `downloadPixelArtAsPng` with optional grid lines support |

**No changes required to:**

| File | Reason |
|---|---|
| `app/_lib/blocks.ts` | Block palette is output-format-agnostic |
| `app/_lib/color-matcher.ts` | Matching pipeline is output-format-agnostic |
| `app/_lib/nbt.ts` | Only used for litematic path |
| `app/_lib/litematic-generator.ts` | No changes to litematic generation logic |
| `app/_components/BlockLegend.tsx` | Block inventory display is unchanged; collapsible wrapper is added in `page.tsx` |
| `app/_components/ImageUpload.tsx` | Upload mechanism fixed — now uses a `<label>` wrapper instead of a programmatic `.click()`; see Implementation Status |

---

## 5. Implementation Notes

### State locality

`outputFormat` and `showGridLines` live in `page.tsx` (the orchestrating component) and are passed as controlled props to `ControlPanel`. They are not managed inside `ControlPanel` itself, keeping the download logic centralized in the page.

### Object URL cleanup *(already implemented)*

`page.tsx` manages blob URL lifetime via an `imagePreviewUrlRef`. When a new image is selected, `handleImageSelected` revokes the previous blob URL stored in the ref before creating a new one. A single `useEffect` with empty deps revokes the last URL on unmount:

```ts
// revoke previous URL synchronously inside handleImageSelected
if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
const url = URL.createObjectURL(file);
imagePreviewUrlRef.current = url;

// cleanup on unmount only
useEffect(() => () => {
  if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
}, []);
```

This avoids the React strict-mode double-invoke problem that plagued the earlier `useEffect([imagePreviewUrl])` approach.

### PNG download timing

Unlike the litematic (which is pre-built on generate), the PNG is rendered on download click using the live `blockGrid` and `showGridLines` values. This means:
- No extra memory held between generate and download.
- Changing `showGridLines` after generate and downloading gives the updated version without re-generating.
- The `cellSize` used for PNG export should be a separate, larger value (default: 16px) independent of the preview zoom level. This should be a new prop or local constant, not derived from `PixelArtPreview`'s zoom state.

### Litematic pre-build invalidation

Currently, `lastLitematic` is computed on generate and cached until re-generate. With the new output format selection, the cached litematic should be invalidated (set to `null`) when `orientation` or `schematicName` changes — not just when a new image is uploaded. This prevents stale downloads.
