const FALLBACK_TITLE = "PixelArt";
const MAX_TITLE_LENGTH = 80;

/**
 * Default schematic title from an uploaded file name.
 * Drops the extension and characters that are unsafe in a download name.
 * Falls back when the stem is empty (for example ".png").
 */
export function titleFromImageName(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : dot === 0 ? "" : base;
  const cleaned = stem.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
  const title = [...cleaned].slice(0, MAX_TITLE_LENGTH).join("");
  return title || FALLBACK_TITLE;
}
