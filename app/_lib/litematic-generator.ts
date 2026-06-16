/**
 * Litematica `.litematic` file generator.
 *
 * Converts a `MinecraftBlock[][]` grid (output of `color-matcher`) into a
 * gzip-compressed NBT binary that Litematica can load in-game.
 *
 * File format: Litematica **version 6**, `MinecraftDataVersion 3953` (MC 1.21.4).
 * Compression: gzip via [pako](https://github.com/nodeca/pako).
 *
 * ### Coordinate systems
 *
 * Litematica's linear block index formula:
 * ```
 * index = y * sizeX * sizeZ + z * sizeX + x
 * ```
 *
 * | Orientation | sizeX | sizeY | sizeZ | x    | y              | z    |
 * |-------------|-------|-------|-------|------|----------------|------|
 * | vertical    | cols  | rows  | 1     | col  | rows−1−row     | 0    |
 * | horizontal  | cols  | 1     | rows  | col  | 0              | row  |
 *
 * Row 0 is the **top** of the image, so vertical orientation inverts Y so that
 * the first image row maps to the highest in-game Y coordinate.
 *
 * ### Block state bit-packing
 *
 * Palette indices are packed into a `BigInt64Array`. Unlike vanilla chunks,
 * Litematica does **not** allow indices to span long boundaries:
 * ```
 * bitsPerBlock  = max(2, ceil(log2(paletteSize)))
 * blocksPerLong = floor(64 / bitsPerBlock)
 * longArraySize = ceil(totalBlocks / blocksPerLong)
 * ```
 * `minecraft:air` is always palette index 0.
 */

import { gzip } from "pako";
import { MinecraftBlock } from "./blocks";
import {
  encodeNbt,
  nbtCompound,
  nbtInt,
  nbtLong,
  nbtString,
  nbtList,
  nbtLongArray,
  TAG,
  NbtValue,
} from "./nbt";

/** Whether the pixel art lies flat on the ground (XZ) or stands upright on a wall (XY). */
export type Orientation = "horizontal" | "vertical";

/**
 * Generate a `.litematic` file from a 2D block grid.
 *
 * Builds the full NBT tree (palette, packed `BlockStates`, metadata, single region),
 * serializes it with `nbt.ts`, and compresses with `pako.gzip`.
 *
 * @param blockGrid   - Row-major grid produced by `mapPixelsToBlocks`
 * @param orientation - `"vertical"` for wall art (XY plane) or `"horizontal"` for floor art (XZ plane)
 * @param name        - Schematic name shown in the Litematica UI (default: `"PixelArt"`)
 * @returns GZip-compressed NBT as a `Uint8Array`, ready for writing to a `.litematic` file
 * @throws If `blockGrid` is empty
 */
export function generateLitematic(
  blockGrid: MinecraftBlock[][],
  orientation: Orientation,
  name: string = "PixelArt"
): Uint8Array {
  const rows = blockGrid.length;       // image height (pixels)
  const cols = blockGrid[0]?.length ?? 0; // image width (pixels)

  if (rows === 0 || cols === 0) {
    throw new Error("Block grid is empty");
  }

  // Build unique palette (air first at index 0)
  const paletteMap = new Map<string, number>();
  const paletteList: MinecraftBlock[] = [];

  const ensurePalette = (block: MinecraftBlock) => {
    if (!paletteMap.has(block.id)) {
      paletteMap.set(block.id, paletteList.length);
      paletteList.push(block);
    }
    return paletteMap.get(block.id)!;
  };

  // Air is always index 0
  ensurePalette({ id: "minecraft:air", name: "Air", rgb: [0, 0, 0], category: "Air" });

  // Collect indices, building palette on the fly
  //
  // Litematica coordinate ordering: index = y * sizeX * sizeZ + z * sizeX + x
  // Horizontal (floor): sizeX=cols, sizeY=1, sizeZ=rows  → row=z, col=x, y=0
  // Vertical   (wall):  sizeX=cols, sizeY=rows, sizeZ=1  → row=y, col=x, z=0

  let sizeX: number, sizeY: number, sizeZ: number;

  if (orientation === "horizontal") {
    sizeX = cols;
    sizeY = 1;
    sizeZ = rows;
  } else {
    sizeX = cols;
    sizeY = rows;
    sizeZ = 1;
  }

  const totalBlocks = sizeX * sizeY * sizeZ;
  const blockIndices = new Int32Array(totalBlocks);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const block = blockGrid[row][col];
      const idx = ensurePalette(block);

      let linearIdx: number;
      if (orientation === "horizontal") {
        // y=0, z=row, x=col
        linearIdx = 0 * sizeX * sizeZ + row * sizeX + col;
      } else {
        // y=row (inverted so row=0 is top → y=rows-1), z=0, x=col
        const y = rows - 1 - row;
        linearIdx = y * sizeX * sizeZ + 0 * sizeX + col;
      }

      blockIndices[linearIdx] = idx;
    }
  }

  // Pack block indices into long array
  const paletteSize = paletteList.length;
  const bitsPerBlock = Math.max(2, Math.ceil(Math.log2(paletteSize || 1)));
  const blocksPerLong = Math.floor(64 / bitsPerBlock);
  const longCount = Math.ceil(totalBlocks / blocksPerLong);
  const packedLongs = new BigInt64Array(longCount);

  for (let i = 0; i < totalBlocks; i++) {
    const longIdx = Math.floor(i / blocksPerLong);
    const bitOffset = (i % blocksPerLong) * bitsPerBlock;
    packedLongs[longIdx] |= BigInt(blockIndices[i]) << BigInt(bitOffset);
  }

  // Build palette NBT list
  const paletteTags: NbtValue[] = paletteList.map((block) =>
    nbtCompound({ Name: nbtString(block.id) })
  );

  // Count non-air blocks
  const totalNonAir = Array.from(blockIndices).filter((i) => i !== 0).length;

  const now = BigInt(Date.now());

  const root = nbtCompound({
    MinecraftDataVersion: nbtInt(3953), // 1.21.4
    Version: nbtInt(6),
    Metadata: nbtCompound({
      Name: nbtString(name),
      Description: nbtString("Generated by Minecraft Pixel Art Generator"),
      Author: nbtString("pixel-art-gen"),
      TimeCreated: nbtLong(now),
      TimeModified: nbtLong(now),
      EnclosingSize: nbtCompound({
        x: nbtInt(sizeX),
        y: nbtInt(sizeY),
        z: nbtInt(sizeZ),
      }),
      RegionCount: nbtInt(1),
      TotalBlocks: nbtInt(totalNonAir),
      TotalVolume: nbtInt(totalBlocks),
    }),
    Regions: nbtCompound({
      PixelArt: nbtCompound({
        Position: nbtCompound({
          x: nbtInt(0),
          y: nbtInt(0),
          z: nbtInt(0),
        }),
        Size: nbtCompound({
          x: nbtInt(sizeX),
          y: nbtInt(sizeY),
          z: nbtInt(sizeZ),
        }),
        BlockStatePalette: nbtList(TAG.COMPOUND, paletteTags),
        BlockStates: nbtLongArray(packedLongs),
        Entities: nbtList(TAG.COMPOUND, []),
        TileEntities: nbtList(TAG.COMPOUND, []),
        PendingBlockTicks: nbtList(TAG.COMPOUND, []),
      }),
    }),
  });

  const rawNbt = encodeNbt("", root);
  return gzip(rawNbt);
}

/**
 * Trigger a browser file download for a `.litematic` binary.
 *
 * Creates a temporary blob URL, programmatically clicks a hidden `<a download>`
 * element, and immediately revokes the URL to free memory.
 *
 * @param data     - GZip-compressed NBT bytes (output of `generateLitematic`)
 * @param filename - Download filename (default: `"pixel-art.litematic"`)
 */
export function downloadLitematic(data: Uint8Array, filename: string = "pixel-art.litematic") {
  const blob = new Blob([data.buffer as ArrayBuffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
