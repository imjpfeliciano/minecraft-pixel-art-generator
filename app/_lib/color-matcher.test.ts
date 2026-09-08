import { describe, it, expect } from "vitest";
import { rgbToLab, findNearestBlock, mapPixelsToBlocks } from "./color-matcher";
import { GENERATION_BLOCKS, type MinecraftBlock } from "./blocks";

const WOOL_ONLY = GENERATION_BLOCKS.filter((b) => b.category === "Wool");

const byId = (id: string): MinecraftBlock => {
  const block = GENERATION_BLOCKS.find((b) => b.id === id);
  if (!block) throw new Error(`fixture block missing: ${id}`);
  return block;
};

/** Build an RGBA buffer from row-major `[r, g, b, a]` tuples. */
const rgba = (pixels: Array<[number, number, number, number]>) =>
  new Uint8ClampedArray(pixels.flat());

describe("rgbToLab", () => {
  it("maps pure white to L=100 with neutral chroma", () => {
    const [L, a, b] = rgbToLab(255, 255, 255);
    expect(L).toBeCloseTo(100, 4);
    expect(a).toBeCloseTo(0, 4);
    expect(b).toBeCloseTo(0, 4);
  });

  it("maps pure black to L=0", () => {
    expect(rgbToLab(0, 0, 0)).toEqual([0, 0, 0]);
  });

  it("is monotonic in lightness", () => {
    expect(rgbToLab(64, 64, 64)[0]).toBeLessThan(rgbToLab(192, 192, 192)[0]);
  });
});

describe("findNearestBlock", () => {
  it("returns the exact block when the input is that block's own colour", () => {
    const blackWool = byId("minecraft:black_wool");
    expect(findNearestBlock(...blackWool.rgb, GENERATION_BLOCKS).id).toBe(
      "minecraft:black_wool",
    );
  });

  it("respects the allowed palette", () => {
    // (200,200,200)'s nearest block across the whole catalog is white *concrete*.
    // Restricting to Wool must return a wool block, not fall back to the global best.
    expect(findNearestBlock(200, 200, 200, GENERATION_BLOCKS).category).toBe("Concrete");

    const restricted = findNearestBlock(200, 200, 200, WOOL_ONLY);
    expect(restricted.category).toBe("Wool");
    expect(restricted.id).toBe("minecraft:white_wool");
  });

  it("only ever returns a block from the allowed palette", () => {
    const allowed = new Set(WOOL_ONLY.map((b) => b.id));
    const probes: Array<[number, number, number]> = [
      [0, 0, 0],
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [128, 128, 128],
      [255, 255, 255],
    ];
    for (const [r, g, b] of probes) {
      expect(allowed.has(findNearestBlock(r, g, b, WOOL_ONLY).id)).toBe(true);
    }
  });
});

describe("mapPixelsToBlocks", () => {
  it("produces a row-major grid matching the requested dimensions", () => {
    const black = byId("minecraft:black_wool");
    const white = byId("minecraft:white_wool");

    // 3 cols x 2 rows — asymmetric so a row/col swap cannot pass.
    const grid = mapPixelsToBlocks(
      rgba([
        [...black.rgb, 255],
        [...white.rgb, 255],
        [...black.rgb, 255],
        [...white.rgb, 255],
        [...white.rgb, 255],
        [...black.rgb, 255],
      ]),
      3,
      2,
      WOOL_ONLY,
    );

    expect(grid.length).toBe(2);
    expect(grid[0].length).toBe(3);
    expect(grid[0].map((b) => b.id)).toEqual([
      "minecraft:black_wool",
      "minecraft:white_wool",
      "minecraft:black_wool",
    ]);
    expect(grid[1].map((b) => b.id)).toEqual([
      "minecraft:white_wool",
      "minecraft:white_wool",
      "minecraft:black_wool",
    ]);
  });

  it("maps pixels below the alpha threshold to air by default", () => {
    const grid = mapPixelsToBlocks(
      rgba([
        [255, 0, 0, 0],
        [255, 0, 0, 127],
        [255, 0, 0, 128],
        [255, 0, 0, 255],
      ]),
      4,
      1,
      GENERATION_BLOCKS,
    );

    expect(grid[0][0].id).toBe("minecraft:air");
    expect(grid[0][1].id).toBe("minecraft:air"); // 127 < 128 — still transparent
    expect(grid[0][2].id).not.toBe("minecraft:air"); // 128 is opaque
    expect(grid[0][3].id).not.toBe("minecraft:air");
  });

  it("uses fillBlock instead of air for transparent pixels when provided", () => {
    const fill = byId("minecraft:blue_wool");

    const grid = mapPixelsToBlocks(
      rgba([
        [0, 0, 0, 0],
        [255, 255, 255, 255],
      ]),
      2,
      1,
      GENERATION_BLOCKS,
      fill,
    );

    expect(grid[0][0]).toEqual(fill);
    expect(grid[0][1].id).not.toBe("minecraft:blue_wool");
  });
});
