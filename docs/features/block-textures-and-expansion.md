# Block Palette Expansion + Texture Sprites

## Overview

All 1000+ block textures from Mojang's open-source `bedrock-samples` repository are downloaded locally and used to:

1. Auto-generate the block palette (`app/_lib/blocks.ts`) with RGB values computed from actual pixel data
2. Render real Minecraft texture sprites in the 2D canvas preview and 3D Three.js viewer

The palette is intentionally limited to **49 blocks** (Concrete × 16, Wool × 16, Terracotta × 17) to eliminate visual noise while covering the full Minecraft 16-color spectrum.

---

## `MinecraftBlock` interface

```ts
export interface MinecraftBlock {
  id: string;       // "minecraft:white_wool"
  name: string;     // "White Wool"
  rgb: [number, number, number]; // average color sampled from the 16×16 texture
  category: string; // "Wool"
  texture: string;  // Bedrock PNG stem, e.g. "wool_colored_white"
                    // "" for synthetic runtime-only blocks (air, foundation)
}
```

`texture: ""` is a sentinel used by renderers to skip sprite lookup and fall back to solid color or transparency.

---

## Scripts

### `scripts/download-block-textures.mjs`

1. **Enumerate** — calls the GitHub Trees API (`GET /repos/Mojang/bedrock-samples/git/trees/main?recursive=1`) and filters to paths matching `resource_pack/textures/blocks/*.png`. Pass `--local` to skip the API call and re-process files already in `public/blocks/`.
2. **Download** — fetches each PNG to `public/blocks/{filename}.png`. Skips existing files unless `--force` is passed.
3. **Compute stats** — uses `sharp` to resize each PNG to 16×16 and compute:
   - `avgRgb` — average color after compositing transparency onto grey
   - `avgAlpha` — average opacity (0–255); used to detect non-solid blocks
   - `variance` — average per-channel color spread; used to detect visually noisy textures
4. Writes results to `scripts/generated-blocks.json` (gitignored).

### `scripts/generate-blocks.mjs`

Reads `generated-blocks.json`, applies filters, and writes `app/_lib/blocks.ts`.

#### Filter pipeline

| Step | Filter | Threshold | What it removes |
|------|--------|-----------|-----------------|
| 1 | Alpha | `avgAlpha < 230` | Leaves, plants, glass, coral, wheat — any partially-transparent non-solid block |
| 2 | Variance (non-anchors only) | `variance > 800` | Visually noisy/patterned textures (e.g. emerald block var≈1286, cobblestone var≈865, glowstone var≈3926) that look jarring in pixel art even when their average color is correct |
| 3 | Pattern | Skip-list of name patterns | Directional face textures, door/stair/slab variants, entity textures, UI elements, water/lava, education-edition blocks |
| 4 | Null mapping | Explicit `null` in `TEXTURE_TO_JAVA_ID` | Texture variants that are redundant with another face (e.g. `quartz_block_bottom`) |
| 5 | Java-ID dedup | First occurrence wins | Bedrock ships some blocks under both old and new names (e.g. `hardened_clay_stained_blue` and `terracotta_blue` both map to `minecraft:blue_terracotta`) |

#### Anchor blocks

Concrete, Wool, and Terracotta blocks are **anchors** — they bypass the variance filter and the CIELAB deduplication step and are always included in the palette with every color variant.

This ensures the color matcher always has the complete 16-color spectrum available in each material group, even when some variants are perceptually close (e.g. Green Wool and Green Concrete have similar average colors but are meaningfully different materials).

```js
function isAnchorTexture(texture) {
  return (
    /^concrete_(?!powder_)/.test(texture) ||   // all 16 concrete colors
    /^wool_colored_/.test(texture) ||           // all 16 wool colors
    /^hardened_clay_stained_/.test(texture) ||  // all 16 stained terracotta (Bedrock)
    /^terracotta_(?=\w)/.test(texture) ||       // stained terracotta (new Bedrock names)
    ANCHOR_EXACT.has(texture)                   // "hardened_clay" = plain terracotta
  );
}
```

Non-anchor blocks that survive all filters also go through a CIELAB deduplication pass (threshold ΔE = 12): a block is dropped if its perceptual color is within 12 units of an already-accepted block. Since the palette is currently anchors-only, this pass has no effect unless the anchor filter is loosened in future.

#### Bedrock → Java ID mapping

Bedrock texture names often diverge from Java Edition block IDs. A hand-maintained `TEXTURE_TO_JAVA_ID` lookup handles the common cases:

- `wool_colored_{color}` → `minecraft:{color}_wool`
- `concrete_{color}` → `minecraft:{color}_concrete`
- `hardened_clay_stained_{color}` and `terracotta_{color}` → `minecraft:{color}_terracotta`
- `concrete_silver` / `wool_colored_silver` / `hardened_clay_stained_silver` → `minecraft:light_gray_*` (Bedrock calls this color "silver"; Java calls it "light_gray")

#### Name derivation

Human-readable names are derived from texture filenames:
- `wool_colored_lime` → `"Lime Wool"`
- `hardened_clay_stained_light_blue` → `"Light Blue Terracotta"`
- `concrete_lime` → `"Lime Concrete"`

#### `package.json` scripts

```json
"download-textures": "node scripts/download-block-textures.mjs",
"generate-blocks":   "node scripts/generate-blocks.mjs",
"sync-blocks":       "node scripts/download-block-textures.mjs && node scripts/generate-blocks.mjs",
"regen-blocks":      "node scripts/download-block-textures.mjs --local && node scripts/generate-blocks.mjs"
```

- **`sync-blocks`** — full refresh: downloads from GitHub then regenerates
- **`regen-blocks`** — local-only: reprocesses already-downloaded files, no network

---

## 2D preview — `PixelArtPreview.tsx`

Block textures are preloaded into an `imageCache: Map<string, HTMLImageElement>` when `blockGrid` changes. The draw loop uses `ctx.drawImage(img, x, y, cellSize, cellSize)` when a sprite is available, and falls back to `fillRect` with `block.rgb` during initial load or for `texture: ""` blocks.

`ctx.imageSmoothingEnabled = false` ensures 16×16 sprites scale up with nearest-neighbor interpolation, matching Minecraft's pixel-art rendering.

---

## 3D preview — `SchematicViewer3D.tsx`

Blocks are grouped into `InstancedMesh` objects by block type (one mesh per unique texture). For each group, `THREE.TextureLoader` loads `/blocks/{texture}.png` and the texture is applied with:

```ts
tex.magFilter = THREE.NearestFilter;
tex.minFilter = THREE.NearestFilter;
tex.colorSpace = THREE.SRGBColorSpace;
mat.map = tex;
mat.color.set(0xffffff); // let the texture provide all color
```

A solid-color `MeshLambertMaterial` is used as fallback for blocks with `texture: ""`.

---

## PNG export — `image-processor.ts`

`renderBlockGridToDataUrl` accepts an optional `textureCache: Map<string, HTMLImageElement>`. When a cache entry exists for a block's texture, `drawImage` is used instead of `fillRect`, so PNG exports match the 2D preview.

---

## Image sampling — nearest-neighbor center pixel

`loadAndResizeImage` renders the source at its native resolution and samples the single pixel at the center of each output grid cell, rather than averaging the full cell area (bilinear downscaling). This prevents anti-aliased source edges from creating blended intermediate colors that map to unwanted "shadow" transition blocks.

```
For each output cell (row, col):
  srcX = floor((col + 0.5) * cellW)
  srcY = floor((row + 0.5) * cellH)
  → sample one pixel from the full-resolution buffer
```

---

## Files changed

| File | Change |
|------|--------|
| `app/_lib/blocks.ts` | `texture` required; 49-block palette auto-generated *(do not edit)* |
| `app/_components/PixelArtPreview.tsx` | Texture cache + `drawImage`; scroll-wheel zoom centered on cursor |
| `app/_components/SchematicViewer3D.tsx` | `THREE.TextureLoader` + `NearestFilter`; hover block tooltip |
| `app/_lib/image-processor.ts` | Center-pixel sampling (nearest-neighbor); optional texture map in PNG export |
| `app/_lib/color-matcher.ts` | Synthetic `air` block gets `texture: ""` |
| `app/_lib/litematic-generator.ts` | Synthetic `air` and foundation blocks get `texture: ""` |
| `scripts/download-block-textures.mjs` | *(new)* enumerate + download + compute RGB/alpha/variance |
| `scripts/generate-blocks.mjs` | *(new)* anchor system, variance cap, CIELAB dedup, writes `blocks.ts` |
| `scripts/generated-blocks.json` | *(new, gitignored)* intermediate artifact |
| `package.json` | `sync-blocks` / `regen-blocks` scripts + `sharp` dev dep |
| `.gitignore` | `scripts/generated-blocks.json` excluded |
