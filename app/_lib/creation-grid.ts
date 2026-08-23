import { gzip, ungzip } from "pako";
import { MINECRAFT_BLOCKS, type MinecraftBlock } from "./blocks";

interface EncodedGridPayload {
  v: 1;
  palette: string[];
  w: number;
  h: number;
  indices: number[];
}

/**
 * Encodes a 2-D block grid into a compact gzipped JSON binary.
 * The palette stores unique block IDs in first-seen order; each grid cell
 * is stored as a palette index (flat row-major array).
 *
 * Output is uploaded as `grid.json.gz` to Firebase Storage.
 */
export function encodeGrid(grid: MinecraftBlock[][]): Uint8Array {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;

  const paletteMap = new Map<string, number>();
  const palette: string[] = [];
  const indices: number[] = new Array(w * h);

  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const id = grid[r][c].id;
      if (!paletteMap.has(id)) {
        paletteMap.set(id, palette.length);
        palette.push(id);
      }
      indices[r * w + c] = paletteMap.get(id)!;
    }
  }

  const payload: EncodedGridPayload = { v: 1, palette, w, h, indices };
  return gzip(JSON.stringify(payload));
}

/**
 * Decodes a gzipped grid payload back into a MinecraftBlock 2-D array.
 * Block IDs not found in the blocks database are replaced with a synthetic
 * fallback block that preserves the original ID.
 */
export function decodeGrid(data: Uint8Array): MinecraftBlock[][] {
  const json = ungzip(data, { to: "string" });
  const payload = JSON.parse(json) as EncodedGridPayload;

  const blockMap = new Map<string, MinecraftBlock>(
    MINECRAFT_BLOCKS.map((b) => [b.id, b]),
  );

  const resolved = payload.palette.map<MinecraftBlock>((id) => {
    return (
      blockMap.get(id) ?? {
        id,
        name: id,
        rgb: [128, 128, 128],
        category: "Unknown",
        texture: "",
      }
    );
  });

  return Array.from({ length: payload.h }, (_, r) =>
    Array.from({ length: payload.w }, (_, c) => resolved[payload.indices[r * payload.w + c]]),
  );
}
