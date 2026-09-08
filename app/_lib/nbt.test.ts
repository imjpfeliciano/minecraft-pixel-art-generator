import { describe, it, expect } from "vitest";
import {
  TAG,
  encodeNbt,
  nbtByte,
  nbtShort,
  nbtInt,
  nbtLong,
  nbtString,
  nbtList,
  nbtCompound,
  nbtIntArray,
  nbtLongArray,
} from "./nbt";

/** Readable byte comparison — `Uint8Array` diffs are unreadable in failure output. */
const bytes = (data: Uint8Array) => Array.from(data);

const ascii = (s: string) => Array.from(new TextEncoder().encode(s));

describe("encodeNbt root framing", () => {
  it("writes [0x0A][u16 name length][name][payload][0x00]", () => {
    expect(bytes(encodeNbt("", nbtCompound({})))).toEqual([
      TAG.COMPOUND,
      0x00, 0x00, // empty root name
      TAG.END,    // end of the (empty) root compound
    ]);
  });

  it("writes the root name with a 2-byte length prefix", () => {
    expect(bytes(encodeNbt("Root", nbtCompound({})))).toEqual([
      TAG.COMPOUND,
      0x00, 0x04,
      ...ascii("Root"),
      TAG.END,
    ]);
  });

  it("rejects a non-compound root", () => {
    expect(() => encodeNbt("", nbtInt(1))).toThrow("Root NBT tag must be a Compound");
  });
});

describe("integer payloads are big-endian", () => {
  it("writes TAG_Int most-significant byte first", () => {
    expect(bytes(encodeNbt("", nbtCompound({ a: nbtInt(0x01020304) })))).toEqual([
      TAG.COMPOUND, 0x00, 0x00,
      TAG.INT, 0x00, 0x01, ...ascii("a"),
      0x01, 0x02, 0x03, 0x04,
      TAG.END,
    ]);
  });

  it("writes TAG_Short as a signed big-endian pair", () => {
    expect(bytes(encodeNbt("", nbtCompound({ a: nbtShort(-2) })))).toEqual([
      TAG.COMPOUND, 0x00, 0x00,
      TAG.SHORT, 0x00, 0x01, ...ascii("a"),
      0xff, 0xfe,
      TAG.END,
    ]);
  });

  it("preserves the bit pattern of a long with bit 63 set", () => {
    // BigUint64Array values above 2^63 must not be mangled into a signed write.
    expect(bytes(encodeNbt("", nbtCompound({ a: nbtLong(0xffffffffffffffffn) })))).toEqual([
      TAG.COMPOUND, 0x00, 0x00,
      TAG.LONG, 0x00, 0x01, ...ascii("a"),
      0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
      TAG.END,
    ]);
  });
});

describe("TAG_String", () => {
  it("length-prefixes with UTF-8 byte length, not character count", () => {
    // "ñ" is one character but two UTF-8 bytes.
    expect(bytes(encodeNbt("", nbtCompound({ a: nbtString("ñ") })))).toEqual([
      TAG.COMPOUND, 0x00, 0x00,
      TAG.STRING, 0x00, 0x01, ...ascii("a"),
      0x00, 0x02, 0xc3, 0xb1,
      TAG.END,
    ]);
  });
});

describe("TAG_List", () => {
  it("writes TAG_End as the element type when the list is empty", () => {
    // Per spec an empty list declares element type 0, regardless of the
    // declared element type of the tag.
    expect(bytes(encodeNbt("", nbtCompound({ a: nbtList(TAG.COMPOUND, []) })))).toEqual([
      TAG.COMPOUND, 0x00, 0x00,
      TAG.LIST, 0x00, 0x01, ...ascii("a"),
      TAG.END,             // element type
      0x00, 0x00, 0x00, 0x00, // length
      TAG.END,
    ]);
  });

  it("writes the declared element type and unnamed payloads when non-empty", () => {
    expect(
      bytes(encodeNbt("", nbtCompound({ a: nbtList(TAG.INT, [nbtInt(7), nbtInt(8)]) }))),
    ).toEqual([
      TAG.COMPOUND, 0x00, 0x00,
      TAG.LIST, 0x00, 0x01, ...ascii("a"),
      TAG.INT,
      0x00, 0x00, 0x00, 0x02,
      0x00, 0x00, 0x00, 0x07,
      0x00, 0x00, 0x00, 0x08,
      TAG.END,
    ]);
  });
});

describe("TAG_Compound nesting", () => {
  it("terminates the inner compound before the outer one", () => {
    expect(
      bytes(encodeNbt("", nbtCompound({ outer: nbtCompound({ inner: nbtByte(5) }) }))),
    ).toEqual([
      TAG.COMPOUND, 0x00, 0x00,
      TAG.COMPOUND, 0x00, 0x05, ...ascii("outer"),
      TAG.BYTE, 0x00, 0x05, ...ascii("inner"), 0x05,
      TAG.END, // closes `outer`
      TAG.END, // closes root
    ]);
  });
});

describe("array payloads", () => {
  it("writes TAG_Int_Array as a length followed by big-endian ints", () => {
    expect(
      bytes(encodeNbt("", nbtCompound({ a: nbtIntArray(new Int32Array([1, -1])) }))),
    ).toEqual([
      TAG.COMPOUND, 0x00, 0x00,
      TAG.INT_ARRAY, 0x00, 0x01, ...ascii("a"),
      0x00, 0x00, 0x00, 0x02,
      0x00, 0x00, 0x00, 0x01,
      0xff, 0xff, 0xff, 0xff,
      TAG.END,
    ]);
  });

  it("writes TAG_Long_Array as a length followed by big-endian longs", () => {
    expect(
      bytes(
        encodeNbt("", nbtCompound({ a: nbtLongArray(new BigUint64Array([1n, 0x8000000000000000n])) })),
      ),
    ).toEqual([
      TAG.COMPOUND, 0x00, 0x00,
      TAG.LONG_ARRAY, 0x00, 0x01, ...ascii("a"),
      0x00, 0x00, 0x00, 0x02,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
      0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      TAG.END,
    ]);
  });
});
