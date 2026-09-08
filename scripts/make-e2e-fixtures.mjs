#!/usr/bin/env node
/**
 * Regenerate the E2E fixtures. Run with `node scripts/make-e2e-fixtures.mjs`.
 *
 * Both outputs are committed — the E2E suite must not depend on this script, or
 * on the very code it is meant to be testing, at run time.
 *
 *   e2e/fixtures/quadrants.png   16x16, four solid quadrants. `loadAndResizeImage`
 *                                samples each target cell's centre pixel, so a 2x2
 *                                generation lands exactly one quadrant per cell.
 *   e2e/fixtures/grid.json.gz    An encoded 2x2 grid, byte-identical to what
 *                                `encodeGrid` uploads, for stubbing
 *                                GET /api/creations/:id/grid.
 */

import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { gzip } from "pako";

const SIZE = 16;
const HALF = SIZE / 2;

// Top-left black, top-right white, bottom-left red, bottom-right blue.
const QUADRANTS = [
  [0, 0, 0],
  [255, 255, 255],
  [220, 20, 20],
  [20, 20, 220],
];

const raw = Buffer.alloc(SIZE * SIZE * 3);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const [r, g, b] = QUADRANTS[(y < HALF ? 0 : 2) + (x < HALF ? 0 : 1)];
    const i = (y * SIZE + x) * 3;
    raw[i] = r;
    raw[i + 1] = g;
    raw[i + 2] = b;
  }
}

await sharp(raw, { raw: { width: SIZE, height: SIZE, channels: 3 } })
  .png()
  .toFile("e2e/fixtures/quadrants.png");

// Mirrors the `EncodedGridPayload` wire format in app/_lib/creation-grid.ts.
const payload = {
  v: 1,
  palette: ["minecraft:black_wool", "minecraft:white_wool"],
  w: 2,
  h: 2,
  indices: [0, 1, 1, 0],
};
writeFileSync("e2e/fixtures/grid.json.gz", Buffer.from(gzip(JSON.stringify(payload))));

console.log("wrote e2e/fixtures/quadrants.png and e2e/fixtures/grid.json.gz");
