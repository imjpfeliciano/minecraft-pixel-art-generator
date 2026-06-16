/**
 * Browser-side image loading and scaling via the Canvas 2D API.
 *
 * `loadAndResizeImage` uses `OffscreenCanvas` when available (no DOM overhead)
 * and falls back to a regular `<canvas>` element otherwise. The image is drawn
 * with `drawImage`, which applies bilinear filtering and scales to the exact
 * requested dimensions — aspect ratio is NOT preserved by design, so the output
 * block grid always matches `targetWidth × targetHeight`.
 *
 * `renderBlockGridToDataUrl` is a utility for exporting a pre-built RGB grid to
 * a PNG preview without re-processing the original image.
 */

/**
 * Load a `File` (or `Blob`) as an `HTMLImageElement`, draw it onto a canvas
 * at the target dimensions, and return the raw RGBA pixel buffer.
 *
 * The `ObjectURL` created for the image is revoked immediately after load to
 * avoid memory leaks.
 *
 * @param file         - Source image file (any browser-supported format)
 * @param targetWidth  - Output width in pixels (= number of block columns)
 * @param targetHeight - Output height in pixels (= number of block rows)
 * @returns Resolved with `{ pixels, width, height }` where `pixels` is a
 *          row-major RGBA `Uint8ClampedArray` of length `targetWidth * targetHeight * 4`
 */
export async function loadAndResizeImage(
  file: File,
  targetWidth: number,
  targetHeight: number
): Promise<{ pixels: Uint8ClampedArray; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        let canvas: HTMLCanvasElement | OffscreenCanvas;
        let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

        if (typeof OffscreenCanvas !== "undefined") {
          canvas = new OffscreenCanvas(targetWidth, targetHeight);
          ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
        } else {
          canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          ctx = (canvas as HTMLCanvasElement).getContext("2d")!;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        resolve({ pixels: imageData.data, width: targetWidth, height: targetHeight });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Render a 2D RGB color grid to a PNG data URL by drawing solid-color squares
 * onto a DOM `<canvas>`.
 *
 * Useful for generating a standalone preview image without going through the
 * full `PixelArtPreview` component (e.g. for testing or export).
 *
 * @param blockColors - Row-major grid of `[r, g, b]` triplets
 * @param blockSize   - Side length in pixels for each block square (default: 4)
 * @returns A `"data:image/png;base64,…"` string ready for use as an `<img src>`
 */
export function renderBlockGridToDataUrl(
  blockColors: [number, number, number][][],
  blockSize: number = 4
): string {
  const height = blockColors.length;
  const width = blockColors[0]?.length ?? 0;

  const canvas = document.createElement("canvas");
  canvas.width = width * blockSize;
  canvas.height = height * blockSize;
  const ctx = canvas.getContext("2d")!;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const [r, g, b] = blockColors[row][col];
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(col * blockSize, row * blockSize, blockSize, blockSize);
    }
  }

  return canvas.toDataURL("image/png");
}
