/**
 * Minimal binary NBT encoder for the Litematica `.litematic` format.
 *
 * This module is **encode-only** — it produces raw binary NBT data; it cannot
 * parse existing NBT files. All integers are written in **big-endian** byte order
 * as required by the NBT specification.
 *
 * Supported tag types:
 *   TAG_End, TAG_Byte, TAG_Short, TAG_Int, TAG_Long, TAG_Float, TAG_Double,
 *   TAG_String, TAG_List, TAG_Compound, TAG_Int_Array, TAG_Long_Array.
 *
 * Implementation notes:
 * - `NbtValue` is a discriminated union; each variant carries its tag type as a
 *   literal `type` field, which `writeTagPayload` switches on.
 * - `NbtWriter` accumulates binary chunks in an array and concatenates at the end
 *   via a single `Uint8Array` copy, avoiding repeated reallocations during the
 *   recursive compound traversal.
 * - Strings are UTF-8 encoded (`TextEncoder`) with a 2-byte unsigned length prefix.
 * - Empty `TAG_List` nodes write the element type as `TAG_End` (value 0) per spec.
 */

/** Numeric tag type IDs as defined by the NBT specification. */
export const TAG = {
  END: 0,
  BYTE: 1,
  SHORT: 2,
  INT: 3,
  LONG: 4,
  FLOAT: 5,
  DOUBLE: 6,
  BYTE_ARRAY: 7,
  STRING: 8,
  LIST: 9,
  COMPOUND: 10,
  INT_ARRAY: 11,
  LONG_ARRAY: 12,
} as const;

/** Union of all valid NBT tag type IDs. */
export type TagType = (typeof TAG)[keyof typeof TAG];

/**
 * Discriminated union representing any NBT value.
 * Each variant carries a `type` literal that identifies the tag kind,
 * and a `value` (or `elementType` + `value` for lists) payload.
 */
export type NbtValue =
  | { type: typeof TAG.BYTE; value: number }
  | { type: typeof TAG.SHORT; value: number }
  | { type: typeof TAG.INT; value: number }
  | { type: typeof TAG.LONG; value: bigint }
  | { type: typeof TAG.FLOAT; value: number }
  | { type: typeof TAG.DOUBLE; value: number }
  | { type: typeof TAG.BYTE_ARRAY; value: Int8Array }
  | { type: typeof TAG.STRING; value: string }
  | { type: typeof TAG.LIST; elementType: TagType; value: NbtValue[] }
  | { type: typeof TAG.COMPOUND; value: Record<string, NbtValue> }
  | { type: typeof TAG.INT_ARRAY; value: Int32Array }
  | { type: typeof TAG.LONG_ARRAY; value: BigInt64Array };

// --- Helpers ---
export const nbtByte = (v: number): NbtValue => ({ type: TAG.BYTE, value: v });
export const nbtShort = (v: number): NbtValue => ({ type: TAG.SHORT, value: v });
export const nbtInt = (v: number): NbtValue => ({ type: TAG.INT, value: v });
export const nbtLong = (v: bigint): NbtValue => ({ type: TAG.LONG, value: v });
export const nbtString = (v: string): NbtValue => ({ type: TAG.STRING, value: v });
export const nbtIntArray = (v: Int32Array): NbtValue => ({ type: TAG.INT_ARRAY, value: v });
export const nbtLongArray = (v: BigInt64Array): NbtValue => ({ type: TAG.LONG_ARRAY, value: v });
export const nbtCompound = (v: Record<string, NbtValue>): NbtValue => ({
  type: TAG.COMPOUND,
  value: v,
});
export const nbtList = (elementType: TagType, v: NbtValue[]): NbtValue => ({
  type: TAG.LIST,
  elementType,
  value: v,
});

// --- Encoder ---

class NbtWriter {
  private chunks: Uint8Array[] = [];
  private totalLen = 0;

  private alloc(n: number): DataView {
    const buf = new ArrayBuffer(n);
    this.chunks.push(new Uint8Array(buf));
    this.totalLen += n;
    return new DataView(buf);
  }

  writeByte(v: number) {
    const dv = this.alloc(1);
    dv.setInt8(0, v);
  }

  writeUByte(v: number) {
    const dv = this.alloc(1);
    dv.setUint8(0, v);
  }

  writeShort(v: number) {
    const dv = this.alloc(2);
    dv.setInt16(0, v, false);
  }

  writeInt(v: number) {
    const dv = this.alloc(4);
    dv.setInt32(0, v, false);
  }

  writeLong(v: bigint) {
    const dv = this.alloc(8);
    // Mask to 64 bits and write as unsigned big-endian so that values with
    // bit 63 set (from BigUint64Array) are stored with the correct bit pattern
    // without relying on signed-overflow behaviour of setBigInt64.
    dv.setBigUint64(0, BigInt.asUintN(64, v), false);
  }

  writeFloat(v: number) {
    const dv = this.alloc(4);
    dv.setFloat32(0, v, false);
  }

  writeDouble(v: number) {
    const dv = this.alloc(8);
    dv.setFloat64(0, v, false);
  }

  writeString(s: string) {
    const encoded = new TextEncoder().encode(s);
    const dv = this.alloc(2);
    dv.setUint16(0, encoded.length, false);
    this.chunks.push(encoded);
    this.totalLen += encoded.length;
  }

  writeRaw(data: Uint8Array) {
    this.chunks.push(data);
    this.totalLen += data.length;
  }

  toUint8Array(): Uint8Array {
    const out = new Uint8Array(this.totalLen);
    let offset = 0;
    for (const chunk of this.chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }
}

function writeTagPayload(writer: NbtWriter, tag: NbtValue) {
  switch (tag.type) {
    case TAG.BYTE:
      writer.writeByte(tag.value);
      break;
    case TAG.SHORT:
      writer.writeShort(tag.value);
      break;
    case TAG.INT:
      writer.writeInt(tag.value);
      break;
    case TAG.LONG:
      writer.writeLong(tag.value);
      break;
    case TAG.FLOAT:
      writer.writeFloat(tag.value);
      break;
    case TAG.DOUBLE:
      writer.writeDouble(tag.value);
      break;
    case TAG.BYTE_ARRAY: {
      writer.writeInt(tag.value.length);
      writer.writeRaw(new Uint8Array(tag.value.buffer, tag.value.byteOffset, tag.value.byteLength));
      break;
    }
    case TAG.STRING:
      writer.writeString(tag.value);
      break;
    case TAG.LIST: {
      const items = tag.value;
      writer.writeUByte(items.length === 0 ? TAG.END : tag.elementType);
      writer.writeInt(items.length);
      for (const item of items) {
        writeTagPayload(writer, item);
      }
      break;
    }
    case TAG.COMPOUND: {
      for (const [key, val] of Object.entries(tag.value)) {
        writer.writeUByte(val.type);
        writer.writeString(key);
        writeTagPayload(writer, val);
      }
      writer.writeUByte(TAG.END);
      break;
    }
    case TAG.INT_ARRAY: {
      writer.writeInt(tag.value.length);
      for (const v of tag.value) {
        writer.writeInt(v);
      }
      break;
    }
    case TAG.LONG_ARRAY: {
      writer.writeInt(tag.value.length);
      for (const v of tag.value) {
        writer.writeLong(v);
      }
      break;
    }
  }
}

/**
 * Serialize a named root compound tag to a raw (uncompressed) binary NBT buffer.
 *
 * The output matches the standard NBT file structure:
 * `[TAG_Compound (0x0A)] [name length: u16] [name bytes] [payload] [TAG_End (0x00)]`
 *
 * The result should be gzip-compressed (e.g. via `pako.gzip`) before writing to
 * disk as a `.litematic` or `.nbt` file.
 *
 * @param rootName - Name of the root compound tag (typically `""` for Litematica files)
 * @param compound - An `NbtValue` with `type === TAG.COMPOUND`
 * @returns Raw uncompressed NBT bytes
 * @throws If `compound.type` is not `TAG.COMPOUND`
 */
export function encodeNbt(rootName: string, compound: NbtValue): Uint8Array {
  if (compound.type !== TAG.COMPOUND) {
    throw new Error("Root NBT tag must be a Compound");
  }
  const writer = new NbtWriter();
  writer.writeUByte(TAG.COMPOUND);
  writer.writeString(rootName);
  writeTagPayload(writer, compound);
  return writer.toUint8Array();
}
