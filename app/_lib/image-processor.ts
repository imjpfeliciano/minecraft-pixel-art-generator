/**
 * Browser-side image loading and scaling via the Canvas 2D API.
 *
 * `loadAndResizeImage` first renders the source image at its natural resolution,
 * then samples the **center pixel** of each target grid cell — a nearest-neighbor
 * approach that preserves hard edges and avoids the anti-aliasing artifact where
 * bilinear downscaling blends green+black border pixels into an unwanted
 * intermediate "shadow" color.
 *
 * Aspect ratio is NOT preserved by design; the output block grid always matches
 * `targetWidth × targetHeight`.
 *
 * `renderBlockGridToDataUrl` is a utility for exporting a pre-built RGB grid to
 * a PNG preview without re-processing the original image.
 */

/**
 * Load a `File` (or `Blob`) as an `HTMLImageElement`, then sample the center
 * pixel of each target grid cell from the full-resolution image.
 *
 * Sampling the center pixel (rather than averaging the full cell area) prevents
 * anti-aliased source edges from creating blended intermediate colors that map
 * to incorrect transition blocks in the output.
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
        const srcW = img.naturalWidth;
        const srcH = img.naturalHeight;

        // Draw the image at its native resolution so we can sample individual pixels.
        let fullCanvas: HTMLCanvasElement | OffscreenCanvas;
        let fullCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

        if (typeof OffscreenCanvas !== "undefined") {
          fullCanvas = new OffscreenCanvas(srcW, srcH);
          fullCtx = fullCanvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
        } else {
          fullCanvas = document.createElement("canvas");
          fullCanvas.width = srcW;
          fullCanvas.height = srcH;
          fullCtx = (fullCanvas as HTMLCanvasElement).getContext("2d")!;
        }

        fullCtx.drawImage(img, 0, 0);
        const srcData = fullCtx.getImageData(0, 0, srcW, srcH).data;

        // For each output cell, sample the single pixel closest to the cell center.
        // This is a nearest-neighbor downscale: no blending between cells, so
        // hard edges in the source stay hard edges in the output.
        const cellW = srcW / targetWidth;
        const cellH = srcH / targetHeight;
        const out = new Uint8ClampedArray(targetWidth * targetHeight * 4);

        for (let row = 0; row < targetHeight; row++) {
          for (let col = 0; col < targetWidth; col++) {
            const srcX = Math.min(Math.floor((col + 0.5) * cellW), srcW - 1);
            const srcY = Math.min(Math.floor((row + 0.5) * cellH), srcH - 1);
            const srcIdx = (srcY * srcW + srcX) * 4;
            const dstIdx = (row * targetWidth + col) * 4;
            out[dstIdx]     = srcData[srcIdx];
            out[dstIdx + 1] = srcData[srcIdx + 1];
            out[dstIdx + 2] = srcData[srcIdx + 2];
            out[dstIdx + 3] = srcData[srcIdx + 3];
          }
        }

        resolve({ pixels: out, width: targetWidth, height: targetHeight });
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
 * Render a 2D block grid to a PNG data URL.
 *
 * When `textureCache` is supplied and a block has a loaded texture image,
 * `drawImage` is used for pixel-accurate Minecraft sprites. Falls back to
 * solid `fillRect` for blocks with no loaded texture (e.g. during initial
 * load, or for synthetic blocks like air).
 *
 * @param blockGrid    - Row-major grid of `MinecraftBlock` values
 * @param blockSize    - Side length in pixels for each block square (default: 4)
 * @param textureCache - Optional pre-loaded texture images keyed by texture stem
 * @returns A `"data:image/png;base64,…"` string ready for use as an `<img src>`
 */
export function renderBlockGridToDataUrl(
  blockGrid: { rgb: [number, number, number]; texture: string }[][],
  blockSize: number = 4,
  textureCache?: Map<string, HTMLImageElement>,
): string {
  const height = blockGrid.length;
  const width = blockGrid[0]?.length ?? 0;

  const canvas = document.createElement("canvas");
  canvas.width = width * blockSize;
  canvas.height = height * blockSize;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const block = blockGrid[row][col];
      const x = col * blockSize;
      const y = row * blockSize;
      const texImg = block.texture && textureCache ? textureCache.get(block.texture) : undefined;
      if (texImg) {
        ctx.drawImage(texImg, x, y, blockSize, blockSize);
      } else {
        const [r, g, b] = block.rgb;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, blockSize, blockSize);
      }
    }
  }

  return canvas.toDataURL("image/png");
}
