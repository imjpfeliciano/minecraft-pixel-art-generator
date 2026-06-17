/**
 * Perceptual color matching using the CIELAB color space.
 *
 * Pipeline for each pixel:
 *   sRGB (0–255) → linear RGB → CIE XYZ (D65) → CIELAB → nearest block by ΔE CIE76
 *
 * Block Lab values are lazily computed and cached in `blockLabCache` so that
 * repeated calls with the same palette are cheap. Transparent pixels (alpha < 128)
 * are mapped to a synthetic `minecraft:air` record and excluded from the schematic palette.
 */

import { MinecraftBlock, MINECRAFT_BLOCKS } from "./blocks";

// Convert sRGB [0,255] to linear RGB [0,1]
function toLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

// Convert linear RGB to XYZ (D65 illuminant)
function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const rl = toLinear(r);
  const gl = toLinear(g);
  const bl = toLinear(b);
  const x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375;
  const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175;
  const z = rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041;
  return [x, y, z];
}

function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  // D65 reference white
  const xn = 0.95047;
  const yn = 1.0;
  const zn = 1.08883;
  const fx = f(x / xn);
  const fy = f(y / yn);
  const fz = f(z / zn);
  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);
  return [L, a, bVal];
}

function f(t: number): number {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

/**
 * Convert an sRGB color to CIELAB (L*, a*, b*).
 *
 * Uses the D65 illuminant reference white `(Xn=0.95047, Yn=1.0, Zn=1.08883)`.
 *
 * @param r - Red channel, 0–255
 * @param g - Green channel, 0–255
 * @param b - Blue channel, 0–255
 * @returns `[L, a, b]` in CIELAB space
 */
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

function labDistance(
  [L1, a1, b1]: [number, number, number],
  [L2, a2, b2]: [number, number, number]
): number {
  const dL = L1 - L2;
  const da = a1 - a2;
  const db = b1 - b2;
  return Math.sqrt(dL * dL + da * da + db * db);
}

// Pre-compute LAB for all blocks
const blockLabCache: Map<string, [number, number, number]> = new Map();

function getBlockLab(block: MinecraftBlock): [number, number, number] {
  if (!blockLabCache.has(block.id)) {
    blockLabCache.set(block.id, rgbToLab(...block.rgb));
  }
  return blockLabCache.get(block.id)!;
}

/**
 * Find the Minecraft block whose representative color is closest to the given
 * sRGB value, using Euclidean distance in CIELAB space (ΔE CIE76).
 *
 * @param r - Red channel, 0–255
 * @param g - Green channel, 0–255
 * @param b - Blue channel, 0–255
 * @param allowedBlocks - Palette to search; defaults to the full `MINECRAFT_BLOCKS` catalog
 * @returns The closest `MinecraftBlock` in the allowed palette
 */
export function findNearestBlock(
  r: number,
  g: number,
  b: number,
  allowedBlocks: MinecraftBlock[] = MINECRAFT_BLOCKS
): MinecraftBlock {
  const targetLab = rgbToLab(r, g, b);
  let best = allowedBlocks[0];
  let bestDist = Infinity;

  for (const block of allowedBlocks) {
    const dist = labDistance(targetLab, getBlockLab(block));
    if (dist < bestDist) {
      bestDist = dist;
      best = block;
    }
  }

  return best;
}

/**
 * Build a row-major grid of `MinecraftBlock` values from a raw RGBA pixel buffer,
 * matching each pixel to the nearest allowed block.
 *
 * Pixels with alpha < 128 are mapped to `fillBlock` when provided, or to
 * `minecraft:air` (empty space) by default.
 *
 * @param pixels - RGBA `Uint8ClampedArray` as returned by `CanvasRenderingContext2D.getImageData`
 * @param width  - Number of columns (pixels per row)
 * @param height - Number of rows
 * @param allowedBlocks - Palette to use for matching; defaults to `MINECRAFT_BLOCKS`
 * @param fillBlock - Optional block to use for transparent pixels instead of air
 * @returns Row-major grid: `result[row][col]` is the matched block
 */
export function mapPixelsToBlocks(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  allowedBlocks: MinecraftBlock[] = MINECRAFT_BLOCKS,
  fillBlock?: MinecraftBlock
): MinecraftBlock[][] {
  const air: MinecraftBlock = { id: "minecraft:air", name: "Air", rgb: [0, 0, 0], category: "Air", texture: "" };
  const transparentBlock = fillBlock ?? air;
  const result: MinecraftBlock[][] = [];

  for (let row = 0; row < height; row++) {
    const rowBlocks: MinecraftBlock[] = [];
    for (let col = 0; col < width; col++) {
      const idx = (row * width + col) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];

      if (a < 128) {
        rowBlocks.push(transparentBlock);
      } else {
        rowBlocks.push(findNearestBlock(r, g, b, allowedBlocks));
      }
    }
    result.push(rowBlocks);
  }

  return result;
}
