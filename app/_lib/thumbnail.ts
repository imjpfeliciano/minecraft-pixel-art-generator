import type { MinecraftBlock } from "./blocks";

/** Pixels per block in the generated thumbnail. */
const SCALE = 4;

/**
 * Renders a block grid onto an OffscreenCanvas and returns a PNG Blob.
 * Each block is drawn as a SCALE×SCALE rectangle filled with its average RGB.
 *
 * Must be called from a browser context (OffscreenCanvas + convertToBlob).
 */
export async function generateThumbnail(grid: MinecraftBlock[][]): Promise<Blob> {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;

  const canvas = new OffscreenCanvas(w * SCALE, h * SCALE);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get OffscreenCanvas 2D context.");

  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const [red, green, blue] = grid[r][c].rgb;
      ctx.fillStyle = `rgb(${red},${green},${blue})`;
      ctx.fillRect(c * SCALE, r * SCALE, SCALE, SCALE);
    }
  }

  return canvas.convertToBlob({ type: "image/png" });
}
