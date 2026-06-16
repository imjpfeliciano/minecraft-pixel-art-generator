# Minecraft Pixel Art Generator

A browser-based tool that converts any image into a Minecraft pixel art [Litematica](https://www.curseforge.com/minecraft/mc-mods/litematica) schematic (`.litematic`). Upload an image, configure dimensions and block palette, and download a file you can load directly in-game — no server, no account, no uploads.

---

## Features

- **Image upload** — drag-and-drop or click-to-browse; supports PNG, JPG, WEBP, GIF
- **CIELAB perceptual color matching** — each pixel is matched to the closest of ~130 curated Minecraft blocks using Euclidean distance in CIELAB color space, which better reflects human vision than raw RGB distance
- **Configurable dimensions** — set exact width × height in blocks (1–512 per axis); no aspect ratio is enforced
- **Orientation control** — vertical (wall art, XY plane) or horizontal (floor art, XZ plane)
- **Block category filters** — toggle which block families are eligible: Wool, Concrete, Terracotta, Stone, Wood, Natural, Frozen, Mineral, Nether, End, Nature, Decorative
- **Background fill block** — replace transparent pixels with a chosen solid block (White Concrete, Obsidian, Stone, etc.) instead of leaving them as air
- **Schematic name input** — name the region and the output file before downloading
- **Live pixel art preview** — interactive canvas with:
  - Pan by clicking and dragging
  - Zoom in/out with +/− controls (2–64 px per cell)
  - Grid overlay with a custom color picker
  - Original image overlay at 40% opacity for comparison
  - Hover tooltips showing each block's display name and namespaced ID
- **Material list panel** — collapsible side panel showing all block types sorted by usage count, with block count and percentage; exports to CSV
- **One-click download** — generates and saves a `.litematic` file compatible with Litematica v6 (Minecraft 1.21.4)
- **Fully client-side** — all processing runs in the browser; no data leaves your machine

---

## How it works

The generation pipeline has four stages:

1. **Image resize** (`image-processor.ts`) — the uploaded file is drawn onto an `OffscreenCanvas` (or a fallback DOM canvas) at the exact target dimensions using the browser's 2D canvas API. This produces a flat `Uint8ClampedArray` of RGBA pixel values.

2. **CIELAB color matching** (`color-matcher.ts`) — each pixel is converted from sRGB to CIELAB (via gamma decoding → XYZ with D65 illuminant → L\*a\*b\*) and matched to the nearest allowed block by CIE76 Euclidean distance. Block Lab values are pre-computed and cached on first use. Pixels with alpha < 128 map to air unless a background fill block is set.

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
| Rendering | Browser Canvas 2D API |
| Runtime | Fully client-side — no backend |

---

## Block catalog

The palette is defined in `app/_lib/blocks.ts` as a static array of `MinecraftBlock` records:

```typescript
interface MinecraftBlock {
  id: string;                       // "minecraft:white_wool"
  name: string;                     // "White Wool"
  rgb: [number, number, number];    // [233, 236, 236]
  category: string;                 // "Wool"
}
```

There are approximately 130 blocks across 12 categories:

| Category | Count | Example blocks |
|---|---|---|
| Wool | 16 | white_wool … black_wool |
| Concrete | 16 | white_concrete … black_concrete |
| Terracotta | 17 | terracotta, white_terracotta … black_terracotta |
| Stone | 12 | stone, granite, diorite, andesite, deepslate, calcite … |
| Wood | 11 | oak_planks … warped_planks |
| Natural | 7 | sand, red_sand, gravel, dirt, coarse_dirt, clay, mud |
| Frozen | 4 | snow_block, ice, packed_ice, blue_ice |
| Mineral | 13 | coal_block, iron_block, gold_block, diamond_block … |
| Nether | 13 | netherrack, nether_bricks, blackstone, obsidian … |
| End | 3 | end_stone, purpur_block, end_stone_bricks |
| Nature | 7 | moss_block, sea_lantern, sponge, melon … |
| Decorative | 10 | bricks, sandstone, prismarine, glowstone … |

RGB values are approximate average face colors, not texture-sampled. For higher fidelity the palette can be extended or replaced with values derived from actual texture data.

---

## File structure

```
minecraft-pixel-art-generator/
├── app/
│   ├── _lib/                           # Core logic — no React dependencies
│   │   ├── blocks.ts                   # Block palette (~130 blocks, 12 categories)
│   │   ├── color-matcher.ts            # CIELAB perceptual color matching
│   │   ├── image-processor.ts          # OffscreenCanvas image resize + pixel sampling
│   │   ├── nbt.ts                      # Binary NBT encoder (encode-only, all tag types)
│   │   └── litematic-generator.ts      # .litematic file builder + browser download trigger
│   ├── _components/                    # React UI components
│   │   ├── ImageUpload.tsx             # Drag-and-drop / click-to-browse file picker
│   │   ├── ControlPanel.tsx            # Dimensions, orientation, category filters, generate CTA
│   │   ├── PixelArtPreview.tsx         # Pan/zoom canvas, grid overlay, original overlay, tooltips
│   │   └── BlockLegend.tsx             # Sorted material list with CSV export
│   ├── page.tsx                        # Main page — step tracker, sidebar, preview, download bar
│   ├── layout.tsx                      # Root layout, metadata, Geist font
│   └── globals.css                     # Tailwind base + global overrides
├── next.config.ts                      # Next.js config (allowedDevOrigins)
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

### Key module responsibilities

**`color-matcher.ts`** — Converts each pixel through the sRGB → XYZ (D65) → CIELAB pipeline, then finds the minimum CIE76 distance across all allowed blocks. Lab values for the palette are computed once and stored in a `Map` for fast repeated lookups. Transparent pixels map to `minecraft:air` unless a fill block is provided.

**`litematic-generator.ts`** — Builds the full NBT tree (metadata, enclosing size, region, palette, block states) and encodes block indices using Litematica's non-spanning bit-pack: indices are packed into 64-bit longs with `floor(64 / bitsPerBlock)` indices per long, never crossing long boundaries. The result is gzip-compressed with pako and downloaded as a blob URL.

**`nbt.ts`** — A minimal encode-only NBT implementation. `NbtValue` is a TypeScript discriminated union covering all tag types. `NbtWriter` accumulates `Uint8Array` chunks and concatenates at the end to avoid repeated buffer reallocations. All integers are big-endian per the NBT spec.

**`PixelArtPreview.tsx`** — Renders the block grid to a `<canvas>` element with `imageRendering: pixelated`. Pan is implemented via absolute positioning of the canvas inside a clipped viewport div. Zoom adjusts `cellSize` (pixels per block cell) and redraws. The original image overlay is drawn at 40% `globalAlpha` on top of the block colors before grid lines are applied.

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
    ┌────────┼─────────────┐
    ▼        ▼             ▼
PixelArt  BlockLegend  litematic-generator
Preview               (nbt.ts + pako)
                           │
                           ▼
                    .litematic download
```
