import { describe, it, expect } from "vitest";
import { titleFromImageName } from "./schematic-name";

describe("titleFromImageName", () => {
  it("uses the file stem as the title", () => {
    expect(titleFromImageName("castle gate.png")).toBe("castle gate");
    expect(titleFromImageName("IMG_2048.JPEG")).toBe("IMG_2048");
  });

  it("keeps a dotted stem and only drops the last extension", () => {
    expect(titleFromImageName("my.cool.photo.png")).toBe("my.cool.photo");
  });

  it("falls back when there is no usable name", () => {
    expect(titleFromImageName(".png")).toBe("PixelArt");
    expect(titleFromImageName("")).toBe("PixelArt");
  });

  it("strips characters that break a download filename and caps the length", () => {
    expect(titleFromImageName('cat:night?.png')).toBe("cat night");
    expect(titleFromImageName(`${"a".repeat(90)}.png`).length).toBe(80);
  });
});
