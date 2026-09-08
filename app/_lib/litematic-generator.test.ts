import { describe, it, expect, vi, afterEach } from "vitest";
import * as nbt from "prismarine-nbt";
import { generateLitematic, type Orientation } from "./litematic-generator";
import { GENERATION_BLOCKS, type MinecraftBlock } from "./blocks";

/**
 * Parse a generated `.litematic` back with an *independent* NBT implementation.
 *
 * `nbt.ts` is encode-only, so a hand-rolled decoder here would share its
 * assumptions and pass on a malformed file. prismarine-nbt reads the spec
 * separately, and auto-detects the gzip wrapper.
 */
async function parseLitematic(data: Uint8Array) {
  const { parsed } = await nbt.parse(Buffer.from(data));
  return nbt.simplify(parsed) as LitematicRoot;
}

interface LitematicRegion {
  Position: { x: number; y: number; z: number };
  Size: { x: number; y: number; z: number };
  BlockStatePalette: Array<{ Name: string; Properties: Record<string, unknown> }>;
  /** prismarine-nbt returns 64-bit longs as `[high, low]` signed int pairs. */
  BlockStates: Array<[number, number]>;
  Entities: unknown[];
  TileEntities: unknown[];
  PendingBlockTicks: unknown[];
}

interface LitematicRoot {
  MinecraftDataVersion: number;
  Version: number;
  Metadata: {
    Name: string;
    Description: string;
    Author: string;
    TimeCreated: [number, number];
    TimeModified: [number, number];
    EnclosingSize: { x: number; y: number; z: number };
    RegionCount: number;
    TotalBlocks: number;
    TotalVolume: number;
  };
  Regions: { PixelArt: LitematicRegion };
}

const byId = (id: string): MinecraftBlock => {
  const block = GENERATION_BLOCKS.find((b) => b.id === id);
  if (!block) throw new Error(`fixture block missing: ${id}`);
  return block;
};

const BLACK = byId("minecraft:black_wool");
const BLUE = byId("minecraft:blue_wool");
const BROWN = byId("minecraft:brown_wool");

/**
 * Read one block's palette index out of `BlockStates` using the *documented*
 * addressing (`index = y * sizeX * sizeZ + z * sizeX + x`), so orientation
 * assertions read as coordinates rather than as bit arithmetic.
 */
function blockIdAt(region: LitematicRegion, x: number, y: number, z: number): string {
  const { x: sizeX, y: sizeY, z: sizeZ } = region.Size;
  const total = sizeX * sizeY * sizeZ;
  const paletteSize = region.BlockStatePalette.length;

  let bitsPerBlock = 1;
  for (let n = paletteSize - 1; n > 1; n >>= 1) bitsPerBlock++;
  bitsPerBlock = Math.max(2, bitsPerBlock);

  // Reassemble each signed [high, low] pair as an unsigned 64-bit value.
  // Skipping asUintN leaves the BigInt negative, and `>>` then sign-extends
  // ones into any index that spans two longs.
  const longs = region.BlockStates.map(([high, low]) =>
    BigInt.asUintN(64, (BigInt(high) << 32n) | BigInt(low >>> 0)),
  );

  const index = y * sizeX * sizeZ + z * sizeX + x;
  if (index < 0 || index >= total) throw new Error(`out of bounds: ${x},${y},${z}`);

  const bitOffset = index * bitsPerBlock;
  const mask = (1n << BigInt(bitsPerBlock)) - 1n;
  const startLong = Math.floor(bitOffset / 64);
  const startBit = BigInt(bitOffset % 64);
  const endLong = Math.floor((bitOffset + bitsPerBlock - 1) / 64);

  let value = (longs[startLong] >> startBit) & mask;
  if (startLong !== endLong) {
    value |= (longs[endLong] << (64n - startBit)) & mask;
  }

  return region.BlockStatePalette[Number(value)].Name;
}

const generate = (
  grid: MinecraftBlock[][],
  orientation: Orientation,
  name = "PixelArt",
  foundation?: { blockId: string },
) => parseLitematic(generateLitematic(grid, orientation, name, foundation));

afterEach(() => {
  vi.useRealTimers();
});

describe("file format identity", () => {
  it("declares Litematica version 6 and the 1.21.4 data version", async () => {
    const root = await generate([[BLACK]], "vertical");
    expect(root.Version).toBe(6);
    expect(root.MinecraftDataVersion).toBe(3953);
  });

  it("writes the schematic name into Metadata and exposes a single region", async () => {
    const root = await generate([[BLACK]], "vertical", "My Art");
    expect(root.Metadata.Name).toBe("My Art");
    expect(root.Metadata.RegionCount).toBe(1);
    expect(Object.keys(root.Regions)).toEqual(["PixelArt"]);
    expect(root.Regions.PixelArt.Position).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("puts minecraft:air at palette index 0", async () => {
    // The bit-packing treats index 0 as air; nothing else may take that slot.
    const root = await generate([[BLACK, BLUE]], "vertical");
    expect(root.Regions.PixelArt.BlockStatePalette[0].Name).toBe("minecraft:air");
  });

  it("gives every palette entry an explicit (possibly empty) Properties compound", async () => {
    const root = await generate([[BLACK, BLUE]], "vertical");
    for (const entry of root.Regions.PixelArt.BlockStatePalette) {
      expect(entry.Properties).toEqual({});
    }
  });

  it("rejects an empty grid", () => {
    expect(() => generateLitematic([], "vertical")).toThrow("Block grid is empty");
    expect(() => generateLitematic([[]], "vertical")).toThrow("Block grid is empty");
  });
});

describe("dimensions per orientation", () => {
  // A 3-row x 2-col grid: rows and cols differ, so an axis swap cannot pass.
  const grid = [
    [BLACK, BLUE],
    [BLUE, BROWN],
    [BROWN, BLACK],
  ];

  it("stands vertical art up in the XY plane", async () => {
    const root = await generate(grid, "vertical");
    expect(root.Regions.PixelArt.Size).toEqual({ x: 2, y: 3, z: 1 });
    expect(root.Metadata.EnclosingSize).toEqual({ x: 2, y: 3, z: 1 });
  });

  it("lays horizontal art flat in the XZ plane", async () => {
    const root = await generate(grid, "horizontal");
    expect(root.Regions.PixelArt.Size).toEqual({ x: 2, y: 1, z: 3 });
    expect(root.Metadata.EnclosingSize).toEqual({ x: 2, y: 1, z: 3 });
  });

  it("adds a second layer on the depth axis when a foundation is requested", async () => {
    const vertical = await generate(grid, "vertical", "PixelArt", { blockId: "minecraft:stone" });
    expect(vertical.Regions.PixelArt.Size).toEqual({ x: 2, y: 3, z: 2 });

    const horizontal = await generate(grid, "horizontal", "PixelArt", { blockId: "minecraft:stone" });
    expect(horizontal.Regions.PixelArt.Size).toEqual({ x: 2, y: 1 + 1, z: 3 });
  });

  it("reports TotalVolume as the full bounding box and TotalBlocks as the non-air count", async () => {
    const root = await generate(grid, "vertical");
    expect(root.Metadata.TotalVolume).toBe(2 * 3 * 1);
    expect(root.Metadata.TotalBlocks).toBe(6);
  });

  it("counts the air left over from a partially transparent grid", async () => {
    const air: MinecraftBlock = {
      id: "minecraft:air", name: "Air", rgb: [0, 0, 0], category: "Air", texture: "",
    };
    const root = await generate([[BLACK, air]], "vertical");
    expect(root.Metadata.TotalVolume).toBe(2);
    expect(root.Metadata.TotalBlocks).toBe(1);
  });
});

describe("block placement", () => {
  it("inverts Y for vertical art so image row 0 is the topmost block", async () => {
    // This is the single assertion that catches the `rows - 1 - row` flip.
    const root = await generate([[BLACK], [BLUE]], "vertical");
    const region = root.Regions.PixelArt;

    expect(region.Size).toEqual({ x: 1, y: 2, z: 1 });
    expect(blockIdAt(region, 0, 1, 0)).toBe("minecraft:black_wool"); // row 0 → highest Y
    expect(blockIdAt(region, 0, 0, 0)).toBe("minecraft:blue_wool");  // row 1 → lowest Y
  });

  it("maps image rows to Z (not Y) for horizontal art", async () => {
    const root = await generate([[BLACK], [BLUE]], "horizontal");
    const region = root.Regions.PixelArt;

    expect(region.Size).toEqual({ x: 1, y: 1, z: 2 });
    expect(blockIdAt(region, 0, 0, 0)).toBe("minecraft:black_wool"); // row 0 → z=0
    expect(blockIdAt(region, 0, 0, 1)).toBe("minecraft:blue_wool");
  });

  it("preserves column order along X", async () => {
    const root = await generate([[BLACK, BLUE, BROWN]], "vertical");
    const region = root.Regions.PixelArt;

    expect(blockIdAt(region, 0, 0, 0)).toBe("minecraft:black_wool");
    expect(blockIdAt(region, 1, 0, 0)).toBe("minecraft:blue_wool");
    expect(blockIdAt(region, 2, 0, 0)).toBe("minecraft:brown_wool");
  });

  it("puts the horizontal foundation below the art", async () => {
    const root = await generate([[BLACK]], "horizontal", "PixelArt", {
      blockId: "minecraft:stone",
    });
    const region = root.Regions.PixelArt;

    expect(region.Size).toEqual({ x: 1, y: 2, z: 1 });
    expect(blockIdAt(region, 0, 0, 0)).toBe("minecraft:stone");      // foundation at y=0
    expect(blockIdAt(region, 0, 1, 0)).toBe("minecraft:black_wool"); // art above it
  });

  it("puts the vertical foundation behind the art", async () => {
    const root = await generate([[BLACK]], "vertical", "PixelArt", {
      blockId: "minecraft:stone",
    });
    const region = root.Regions.PixelArt;

    expect(region.Size).toEqual({ x: 1, y: 1, z: 2 });
    expect(blockIdAt(region, 0, 0, 0)).toBe("minecraft:black_wool"); // art at z=0
    expect(blockIdAt(region, 0, 0, 1)).toBe("minecraft:stone");      // backing at z=1
  });
});

describe("LitematicaBitArray packing", () => {
  // Expected longs below are computed by hand from the format spec, not by
  // re-running the generator's own packing loop — a mirror would test nothing.

  it("packs a 1x2 vertical grid at 2 bits per block", async () => {
    const root = await generate([[BLACK, BLUE]], "vertical");
    // palette = [air, black_wool, blue_wool] → 3 entries → bitsPerBlock = 2.
    // x=0 holds black (index 1) at bits 0-1; x=1 holds blue (index 2) at bits 2-3.
    //   1 | (2 << 2) = 0b1001 = 9
    expect(root.Regions.PixelArt.BlockStates).toEqual([[0, 9]]);
  });

  it("packs the vertical Y-inversion into the expected long", async () => {
    const root = await generate([[BLACK], [BLUE]], "vertical");
    // y=0 holds blue (index 2), y=1 holds black (index 1):
    //   2 | (1 << 2) = 0b0110 = 6
    expect(root.Regions.PixelArt.BlockStates).toEqual([[0, 6]]);
  });

  it("packs a horizontal grid and its foundation layer", async () => {
    const root = await generate([[BLACK, BLUE]], "horizontal", "PixelArt", {
      blockId: "minecraft:stone",
    });
    // palette = [air, stone, black_wool, blue_wool] → 4 entries → bitsPerBlock = 2.
    // Foundation fills y=0 (indices 0,1); art sits at y=1 (indices 2,3):
    //   1 | (1 << 2) | (2 << 4) | (3 << 6) = 1 + 4 + 32 + 192 = 229
    expect(root.Regions.PixelArt.BlockStates).toEqual([[0, 229]]);
  });

  it("uses a minimum of 2 bits per block even for a single-colour grid", async () => {
    const root = await generate([[BLACK]], "vertical");
    // palette = [air, black_wool] → 2 entries; ceil(log2(2)) = 1, floored to 2.
    // One block holding index 1 → 0b01 = 1.
    expect(root.Regions.PixelArt.BlockStates).toEqual([[0, 1]]);
  });

  it("spans a block index across two longs rather than padding the first", async () => {
    // 33 distinct blocks + air = 34 palette entries → bitsPerBlock = 6.
    // 64 / 6 = 10 blocks per long with 4 bits left over, so block 10 straddles
    // the boundary. Litematica spans; the 1.16+ chunk format would not.
    const grid = [GENERATION_BLOCKS.slice(0, 33)];
    const root = await generate(grid, "vertical");
    const region = root.Regions.PixelArt;

    expect(region.BlockStatePalette.length).toBe(34);
    expect(region.BlockStates.length).toBe(Math.ceil((33 * 6) / 64));
    for (let x = 0; x < 33; x++) {
      expect(blockIdAt(region, x, 0, 0)).toBe(GENERATION_BLOCKS[x].id);
    }
  });
});

describe("timestamps", () => {
  it("stamps TimeCreated and TimeModified from the clock", async () => {
    // generateLitematic reads Date.now(), so its output is not byte-stable.
    // Snapshotting the gzip bytes would fail on the second run; pin the clock
    // instead if a deterministic file is ever needed.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const root = await generate([[BLACK]], "vertical");

    // 1767225600000 ms = (411 << 32) | 1994041344
    expect(root.Metadata.TimeCreated).toEqual([411, 1994041344]);
    expect(root.Metadata.TimeModified).toEqual(root.Metadata.TimeCreated);
  });
});
