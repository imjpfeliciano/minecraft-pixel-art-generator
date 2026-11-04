import sharp from "sharp";

/** Social-card size expected by Discord, X, and iMessage. */
export const SHARE_CARD_WIDTH = 1200;
export const SHARE_CARD_HEIGHT = 630;

const BACKGROUND = { r: 15, g: 23, b: 42, alpha: 1 }; // slate-900, matches the site card
const PADDING_X = 56;
const PADDING_TOP = 40;
const FOOTER_HEIGHT = 132;

function xmlText(value: string): string {
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(value: string, max: number): string {
  const chars = [...value];
  if (chars.length <= max) return value;
  return `${chars.slice(0, max - 1).join("")}…`;
}

/**
 * Where the preview is drawn. The scale is `contain` into the art area so a
 * wide build and a tall one both stay fully visible above the title band.
 */
export function shareCardArtBox(srcWidth: number, srcHeight: number) {
  const maxW = SHARE_CARD_WIDTH - PADDING_X * 2;
  const maxH = SHARE_CARD_HEIGHT - PADDING_TOP - FOOTER_HEIGHT;
  const scale = Math.min(maxW / srcWidth, maxH / srcHeight);
  const width = Math.min(maxW, Math.max(1, Math.round(srcWidth * scale)));
  const height = Math.min(maxH, Math.max(1, Math.round(srcHeight * scale)));
  const left = Math.round((SHARE_CARD_WIDTH - width) / 2);
  const top = PADDING_TOP + Math.round((maxH - height) / 2);
  return { left, top, width, height };
}

/**
 * Compose a 1200×630 PNG. The preview is scaled with a nearest-neighbor kernel
 * so block edges stay hard — a bilinear scale turns a 4px-per-block thumbnail
 * into a blur that unfurls badly.
 */
export async function renderShareCard(input: {
  preview: Buffer;
  title: string;
  nickname: string | null;
}): Promise<Buffer> {
  const meta = await sharp(input.preview).metadata();
  const srcWidth = meta.width ?? 1;
  const srcHeight = meta.height ?? 1;
  const art = shareCardArtBox(srcWidth, srcHeight);

  const artPng = await sharp(input.preview)
    .resize(art.width, art.height, { kernel: "nearest", fit: "fill" })
    .png()
    .toBuffer();

  const title = xmlText(truncate(input.title.trim() || "Pixel art", 42));
  const byline = input.nickname ? xmlText(`@${truncate(input.nickname, 32)}`) : "";

  const svg = `<svg width="${SHARE_CARD_WIDTH}" height="${SHARE_CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <text x="${PADDING_X}" y="${SHARE_CARD_HEIGHT - 72}" font-family="sans-serif" font-size="40" font-weight="700" fill="#f8fafc">${title}</text>
  ${byline ? `<text x="${PADDING_X}" y="${SHARE_CARD_HEIGHT - 32}" font-family="sans-serif" font-size="24" font-weight="600" fill="#79C05A">${byline}</text>` : ""}
  <text x="${SHARE_CARD_WIDTH - PADDING_X}" y="${SHARE_CARD_HEIGHT - 32}" font-family="sans-serif" font-size="22" font-weight="600" fill="#94a3b8" text-anchor="end">mc-pixel</text>
</svg>`;

  return sharp({
    create: {
      width: SHARE_CARD_WIDTH,
      height: SHARE_CARD_HEIGHT,
      channels: 4,
      background: BACKGROUND,
    },
  })
    .composite([
      { input: artPng, left: art.left, top: art.top },
      { input: Buffer.from(svg), top: 0, left: 0 },
    ])
    .png()
    .toBuffer();
}
