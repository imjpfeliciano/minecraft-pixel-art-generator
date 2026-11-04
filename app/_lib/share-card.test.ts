import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { renderShareCard, SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from "./share-card";

function isPureRed(r: number, g: number, b: number) {
  return r > 250 && g < 8 && b < 8;
}

function isPureBlue(r: number, g: number, b: number) {
  return b > 250 && r < 8 && g < 8;
}

describe("renderShareCard", () => {
  it("upscales a tiny preview to a 1200×630 card with a hard block edge", async () => {
    // 2×2: left column red, right column blue. A 4px thumbnail of two blocks.
    const raw = Buffer.from([
      255, 0, 0, 0, 0, 255,
      255, 0, 0, 0, 0, 255,
    ]);
    const preview = await sharp(raw, {
      raw: { width: 2, height: 2, channels: 3 },
    })
      .png()
      .toBuffer();

    const card = await renderShareCard({
      preview,
      title: "Castle gate",
      nickname: "builder",
    });

    const meta = await sharp(card).metadata();
    expect(meta.width).toBe(SHARE_CARD_WIDTH);
    expect(meta.height).toBe(SHARE_CARD_HEIGHT);
    expect(meta.width).not.toBe(2);
    expect(meta.height).not.toBe(2);

    const { data, info } = await sharp(card).raw().toBuffer({ resolveWithObject: true });
    const pixel = (x: number, y: number) => {
      const i = (y * info.width + x) * info.channels;
      return [data[i], data[i + 1], data[i + 2]] as const;
    };

    // The slate margin is the card, not the stretched thumbnail.
    const corner = pixel(4, 4);
    expect(corner).toEqual([15, 23, 42]);

    // A nearest-neighbor scale keeps a run of pure red that ends on pure blue.
    // A bilinear scale would put a purple blend on that boundary, and pasting
    // the 2×2 thumbnail untouched would make the red run a single pixel.
    let redRun = 0;
    let foundHardEdge = false;
    for (let y = 0; y < info.height; y++) {
      let x = 0;
      while (x < info.width) {
        const [r, g, b] = pixel(x, y);
        if (!isPureRed(r, g, b)) {
          x++;
          continue;
        }
        let run = 0;
        while (x + run < info.width) {
          const [rr, gg, bb] = pixel(x + run, y);
          if (!isPureRed(rr, gg, bb)) break;
          run++;
        }
        const nextX = x + run;
        if (nextX < info.width) {
          const [nr, ng, nb] = pixel(nextX, y);
          if (isPureBlue(nr, ng, nb) && run > redRun) {
            redRun = run;
            foundHardEdge = true;
          }
        }
        x += run;
      }
    }

    expect(foundHardEdge).toBe(true);
    expect(redRun).toBeGreaterThan(8);
  });
});
