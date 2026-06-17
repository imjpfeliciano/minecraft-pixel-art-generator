# Minecraft Pixel Art Generator

A browser-based tool that converts any image into a Minecraft pixel art [Litematica](https://www.curseforge.com/minecraft/mc-mods/litematica) schematic (`.litematic`). Upload an image, configure dimensions and block palette, and download a file you can load directly in-game — no server, no account, no uploads.

---

## Features

- **Image upload** — drag-and-drop or click-to-browse; supports PNG, JPG, WEBP, GIF
- **CIELAB perceptual color matching** — each pixel is matched to the closest block in the palette using Euclidean distance in CIELAB color space, which better reflects human vision than raw RGB distance
- **Nearest-neighbor pixel sampling** — the source image is rendered at its native resolution and each output cell samples its center pixel, preventing bilinear-blending artifacts (e.g. anti-aliased edges creating unwanted "shadow" transition blocks)
- **Configurable dimensions** — set exact width × height in blocks (1–512 per axis); no aspect ratio is enforced
- **Orientation control** — vertical (wall art, XY plane) or horizontal (floor art, XZ plane)
- **Block category filters** — toggle which block families are eligible: Wool, Concrete, Terracotta
- **Background fill block** — replace transparent pixels with a chosen solid block instead of leaving them as air
- **Schematic name input** — name the region and the output file before downloading
- **Live pixel art preview** — interactive canvas with:
  - Pan by clicking and dragging
  - Zoom in/out with **+/−** controls, **scroll wheel**, or **trackpad pinch** (zoom centers on cursor)
  - Grid overlay with a custom color picker
  - Original image overlay at 40% opacity for comparison
  - Hover tooltips showing each block's display name and namespaced ID
- **3D schematic previewer** — toggle from 2D to an interactive Three.js 3D view of the generated schematic:
  - Drag to rotate (orbit), scroll to zoom, right-drag to pan
  - **Hover any block** to see its name and namespaced ID — same tooltip style as the 2D preview
  - Vertical schematics render as a wall on the XY plane; horizontal schematics render as floor art on the XZ plane, with the camera positioned above and angled inward
  - **Layer controls** (shown when the schematic has more than one layer): select a layer mode — **All**, **Single**, **Below**, or **Above** — then navigate with ← / →
- **Real Minecraft block textures** — the 2D canvas renders each cell using the actual 16×16 Bedrock texture sprite from Mojang's open-source repository; the 3D viewer applies the same sprites with `NearestFilter` for crisp cube faces
- **Material list panel** — collapsible side panel showing all block types sorted by usage count, with block count and percentage; exports to CSV
- **One-click download** — generates and saves a `.litematic` file compatible with Litematica v6 (Minecraft 1.21.4)
- **Fully client-side** — all processing runs in the browser; no data leaves your machine

---

## How it works

The generation pipeline has four stages:

1. **Center-pixel sampling** (`image-processor.ts`) — the uploaded file is drawn onto a full-resolution `OffscreenCanvas` (or DOM canvas fallback). For each target grid cell the single pixel closest to the cell center is sampled rather than averaging the entire cell area. This nearest-neighbor approach preserves hard edges and avoids bilinear blending artifacts where a green→black boundary would otherwise produce an intermediate "dark shadow" color that maps to a different block.

2. **CIELAB color matching** (`color-matcher.ts`) — each sampled pixel is converted from sRGB to CIELAB (gamma decoding → XYZ with D65 illuminant → L\*a\*b\*) and matched to the nearest allowed block by CIE76 Euclidean distance. Block Lab values are pre-computed and cached on first use. Pixels with alpha < 128 map to air unless a background fill block is set.

3. **Litematica bit-packing** (`litematic-generator.ts`) — the block grid is encoded into a `BigInt64Array` using Litematica's spanning bit-pack format: palette indices are packed into 64-bit longs without crossing long boundaries (`bitsPerBlock = max(2, ceil(log2(paletteSize)))`). Air is always palette index 0.

4. **gzip NBT** (`nbt.ts` + pako) — the packed block states, palette, and metadata are serialized to binary NBT (big-endian, all standard tag types) and compressed with gzip via the `pako` library, producing the final `.litematic` file.

---

## Getting started

**Requirements:** Node.js 20.9+, pnpm

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm dev
# → http://localhost:3000

# Type-check and build for production
pnpm build
```

> **Network access note:** Open the app at `http://localhost:3000`. If you need access from another device on the same network, add your IP to `next.config.ts`:
>
> ```ts
> const nextConfig: NextConfig = {
>   allowedDevOrigins: ["192.168.x.x"],
> };
> ```

---

## Usage walkthrough

**1. Upload an image**

Drag a PNG, JPG, WEBP, or GIF onto the upload area in the sidebar, or click it to open a file picker. The original image appears in the main panel. The step tracker in the sidebar advances automatically.

**2. Name the schematic**

Enter a name in the **Schematic Name** field. This becomes the region name inside the `.litematic` file and the filename when you download.

**3. Configure dimensions and orientation**

Set the output **Width** and **Height** in blocks (1–512 per axis). The total block count is shown below. Choose **Vertical** for a wall that stands on the XY plane, or **Horizontal** for floor art on the XZ plane.

**4. Select block categories**

Toggle the category chips to control which blocks the matcher is allowed to use. At least one category must remain active. The chip labels show how many blocks each category contributes.

**5. Set a background fill (optional)**

If your image has transparent areas (PNG alpha), choose a **Background Fill** block from the dropdown. Transparent pixels will be replaced with that block instead of air, giving the schematic a solid background.

**6. Generate**

Click **Generate Pixel Art**. The canvas shows a loading animation while the image is resized and every pixel is matched to a block. For large outputs (e.g. 512 × 512) this takes a few seconds.

**7. Explore the preview**

Once generation completes, the pixel art canvas is shown with the full toolbar:
- Drag to pan; use **+** / **−** to zoom.
- Toggle **Grid** to draw cell boundaries; pick a grid color with the color swatch.
- Toggle **Overlay** to blend the original image at 40% opacity over the block art.
- Hover over any cell to see a tooltip with the block name and ID.

Click the **3D** button in the panel header to switch to the 3D schematic viewer:
- Rotate by dragging, zoom with the scroll wheel, pan by right-dragging.
- The camera orientation matches your schematic — vertical art faces you as a wall; horizontal art is viewed from above as floor art.
- When the schematic has multiple layers, the layer control bar appears at the bottom. Choose a mode (**All / Single / Below / Above**) and use ← / → to step through layers. Click **2D** to return to the flat pixel art view.

**8. Check the material list**

Click **Materials** (top-right of the preview panel) to open the side panel. It shows every block type used, sorted by count, with percentages. Click **Export CSV** to download a spreadsheet-ready file.

**9. Download and import**

Click **Download .litematic** in the bottom bar. Place the file in your `.minecraft/schematics/` folder, then in-game:

1. Install [Litematica](https://www.curseforge.com/minecraft/mc-mods/litematica) (requires [Fabric](https://fabricmc.net/) or [Forge](https://files.minecraftforge.net/)) for Minecraft 1.21.4.
2. Press `M` (default keybind) to open Litematica → **Load Schematics** → select the file.
3. Use **Placement** and **Easy Place** mode to position and place blocks with ghost-block guidance.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 |
| Styling | Tailwind CSS 4 |
| Language | TypeScript 5 |
| Compression | pako 2 (gzip) |
| 2D Rendering | Browser Canvas 2D API |
| 3D Rendering | Three.js + React Three Fiber + Drei (browser-only, dynamic import) |
| Runtime | Fully client-side — no backend |

---

## Block catalog

The palette is defined in `app/_lib/blocks.ts`. The file is **auto-generated** — do not edit it manually; run `pnpm run sync-blocks` to regenerate from the latest Mojang assets.

```typescript
interface MinecraftBlock {
  id: string;       // "minecraft:white_wool"
  name: string;     // "White Wool"
  rgb: [number, number, number]; // average color sampled from the 16×16 texture
  category: string; // "Wool"
  texture: string;  // Bedrock PNG stem served from /blocks/{texture}.png; "" for synthetic blocks
}
```

The palette contains **49 blocks** across three categories — chosen because they provide the full 16-color Minecraft spectrum with uniform, non-distracting textures:

| Category | Count | Notes |
|---|---|---|
| Concrete | 16 | All 16 colors; near-zero texture variance (var ≈ 0–1); perfectly flat solid colors |
| Wool | 16 | All 16 colors; subtle woven texture (var ≈ 35–280) |
| Terracotta | 17 | All 16 stained colors + plain terracotta; earthy tones (var ≈ 1–5) |

RGB values are pixel-accurate averages computed by `sharp` from the actual 16×16 Bedrock texture sprite.

### Regenerating the palette

```bash
# Full refresh — downloads all textures from Mojang/bedrock-samples and regenerates
pnpm run sync-blocks

# Local-only refresh — reprocesses already-downloaded files, no network needed
pnpm run regen-blocks
```

The generation pipeline in `scripts/generate-blocks.mjs` applies three quality filters before writing the palette:

1. **Alpha filter** (`avgAlpha < 230`) — discards transparent/non-solid blocks (leaves, plants, glass)
2. **Variance filter** (`variance > 800`, bypassed for anchor blocks) — discards visually noisy/patterned blocks whose internal texture would overpower their average color (e.g. cobblestone var ≈ 865, emerald block var ≈ 1286)
3. **Pattern filter** — skip-list for non-block texture files (directional faces, entity textures, UI elements)

All three material groups (concrete, wool, terracotta) are **anchor blocks** — they bypass the variance and color-deduplication steps so that every color variant is always present in the palette.

---

## File structure

```
minecraft-pixel-art-generator/
├── app/
│   ├── _lib/                           # Core logic — no React dependencies
│   │   ├── blocks.ts                   # Block palette (49 blocks, auto-generated — do not edit)
│   │   ├── color-matcher.ts            # CIELAB perceptual color matching
│   │   ├── image-processor.ts          # Center-pixel sampling + PNG export
│   │   ├── nbt.ts                      # Binary NBT encoder (encode-only, all tag types)
│   │   └── litematic-generator.ts      # .litematic file builder + browser download trigger
│   ├── _components/                    # React UI components
│   │   ├── ImageUpload.tsx             # Drag-and-drop / click-to-browse file picker
│   │   ├── ControlPanel.tsx            # Dimensions, orientation, category filters, generate CTA
│   │   ├── PixelArtPreview.tsx         # Pan/zoom/scroll canvas, grid overlay, hover tooltips
│   │   ├── SchematicViewer3D.tsx       # Three.js 3D previewer with hover tooltips + layer controls
│   │   └── BlockLegend.tsx             # Sorted material list with CSV export
│   ├── page.tsx                        # Main page — step tracker, sidebar, preview, download bar
│   ├── layout.tsx                      # Root layout, metadata, Geist font
│   └── globals.css                     # Tailwind base + global overrides
├── public/
│   └── blocks/                         # 1000+ Bedrock texture PNGs (served as static assets)
├── scripts/
│   ├── download-block-textures.mjs     # Downloads textures + computes RGB/alpha/variance stats
│   ├── generate-blocks.mjs             # Generates app/_lib/blocks.ts from stats JSON
│   └── generated-blocks.json           # Intermediate artifact (gitignored)
├── docs/
│   └── features/                       # Design and implementation notes
├── next.config.ts                      # Next.js config (allowedDevOrigins)
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

### Key module responsibilities

**`color-matcher.ts`** — Converts each pixel through the sRGB → XYZ (D65) → CIELAB pipeline, then finds the minimum CIE76 distance across all allowed blocks. Lab values for the palette are computed once and stored in a `Map` for fast repeated lookups. Transparent pixels map to `minecraft:air` unless a fill block is provided.

**`litematic-generator.ts`** — Builds the full NBT tree (metadata, enclosing size, region, palette, block states) and encodes block indices using Litematica's non-spanning bit-pack: indices are packed into 64-bit longs with `floor(64 / bitsPerBlock)` indices per long, never crossing long boundaries. The result is gzip-compressed with pako and downloaded as a blob URL.

**`nbt.ts`** — A minimal encode-only NBT implementation. `NbtValue` is a TypeScript discriminated union covering all tag types. `NbtWriter` accumulates `Uint8Array` chunks and concatenates at the end to avoid repeated buffer reallocations. All integers are big-endian per the NBT spec.

**`image-processor.ts`** — `loadAndResizeImage` renders the source file at native resolution on a full-size canvas, then for each output cell reads the single pixel at the cell's center coordinate. This nearest-neighbor approach avoids bilinear blending so hard edges remain hard in the output. `renderBlockGridToDataUrl` draws the block grid for PNG export, using `drawImage` with the texture sprite when available and falling back to `fillRect` with the block's average RGB.

**`PixelArtPreview.tsx`** — Renders the block grid to a `<canvas>` with `imageRendering: pixelated`. Preloads block texture sprites into an `HTMLImageElement` cache and calls `drawImage` when the sprite is ready. Pan is implemented via absolute positioning inside a clipped viewport div. Zoom (`cellSize`, 2–64 px/cell) is triggered by the +/− buttons or the scroll wheel; wheel zoom is attached as a non-passive native listener so `preventDefault()` suppresses default page scroll. Zoom from buttons centers on the viewport center; scroll zoom centers on the cursor position.

**`SchematicViewer3D.tsx`** — Groups the block grid by block type into `InstancedMesh` objects for efficient rendering. Textures are loaded with `THREE.TextureLoader` and `NearestFilter` for crisp pixel-art cubes. `onPointerMove` / `onPointerOut` events on each `InstancedMesh` feed a `hoverInfo` state that drives a `position: fixed` tooltip overlay identical in style to the 2D preview tooltip.

---

## Architecture overview

```
ImageUpload ──┐
ControlPanel ─┤
              ▼
           page.tsx
              │
    ┌─────────┴──────────┐
    ▼                    ▼
image-processor     blocks.ts (palette)
    │                    │
    └────────┬───────────┘
             ▼
        color-matcher
             │
    ┌────────┼──────────────────┐
    ▼        ▼                  ▼
PixelArt  BlockLegend      litematic-generator
Preview                    (nbt.ts + pako)
    │                           │
    │ (2D/3D toggle)            ▼
    ▼                    .litematic download
SchematicViewer3D
(Three.js, browser-only)
```
