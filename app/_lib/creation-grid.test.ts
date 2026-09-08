import { describe, it, expect } from "vitest";
import { encodeGrid, decodeGrid } from "./creation-grid";
import { GENERATION_BLOCKS, type MinecraftBlock } from "./blocks";
import { gzip, ungzip } from "pako";

const byId = (id: string): MinecraftBlock => {
  const block = GENERATION_BLOCKS.find((b) => b.id === id);
  if (!block) throw new Error(`fixture block missing: ${id}`);
  return block;
};

const BLACK_WOOL = byId("minecraft:black_wool");
const BLUE_WOOL = byId("minecraft:blue_wool");
const BROWN_WOOL = byId("minecraft:brown_wool");

describe("encodeGrid / decodeGrid round-trip", () => {
  it("restores a 1x1 grid", () => {
    const grid = [[BLACK_WOOL]];
    expect(decodeGrid(encodeGrid(grid))).toEqual(grid);
  });

  it("restores a non-square grid without transposing it", () => {
    // 2 rows x 3 cols. A row/column swap in the `r * w + c` indexing would still
    // round-trip a square grid, so the dimensions have to differ to catch it.
    const grid = [
      [BLACK_WOOL, BLUE_WOOL, BROWN_WOOL],
      [BROWN_WOOL, BLACK_WOOL, BLUE_WOOL],
    ];

    const decoded = decodeGrid(encodeGrid(grid));

    expect(decoded).toEqual(grid);
    expect(decoded.length).toBe(2);
    expect(decoded[0].length).toBe(3);
    expect(decoded[0][2].id).toBe("minecraft:brown_wool");
    expect(decoded[1][0].id).toBe("minecraft:brown_wool");
  });

  it("restores a full-palette grid", () => {
    const grid = [GENERATION_BLOCKS.slice(0, 8), GENERATION_BLOCKS.slice(8, 16)];
    expect(decodeGrid(encodeGrid(grid))).toEqual(grid);
  });

  it("dedupes repeated blocks into a single palette entry", () => {
    const grid = [
      [BLACK_WOOL, BLACK_WOOL],
      [BLACK_WOOL, BLUE_WOOL],
    ];

    // decodeGrid hides the payload, so assert the wire format directly.
    const payload = JSON.parse(ungzip(encodeGrid(grid), { to: "string" }));

    expect(payload.palette).toEqual(["minecraft:black_wool", "minecraft:blue_wool"]);
    expect(payload.indices).toEqual([0, 0, 0, 1]);
    expect(payload.w).toBe(2);
    expect(payload.h).toBe(2);
  });
});

describe("decodeGrid fallbacks", () => {
  it("substitutes a synthetic block for an unknown id rather than throwing", () => {
    const payload = {
      v: 1,
      palette: ["minecraft:not_a_real_block"],
      w: 1,
      h: 1,
      indices: [0],
    };

    const decoded = decodeGrid(gzip(JSON.stringify(payload)));

    expect(decoded).toEqual([
      [
        {
          id: "minecraft:not_a_real_block",
          name: "minecraft:not_a_real_block",
          rgb: [128, 128, 128],
          category: "Unknown",
          texture: "",
        },
      ],
    ]);
  });
});
