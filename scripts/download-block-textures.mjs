/**
 * Phase 1 of `sync-blocks`: Download all block PNGs from Mojang's bedrock-samples
 * repository and compute per-texture statistics used for palette filtering.
 *
 * Usage:
 *   node scripts/download-block-textures.mjs           # skip existing files
 *   node scripts/download-block-textures.mjs --force   # re-download + recompute all
 *
 * Output:
 *   public/blocks/*.png              — downloaded texture files
 *   scripts/generated-blocks.json   — [{texture, avgRgb, avgAlpha, variance}]
 *
 * Set GITHUB_TOKEN env var to avoid rate limits on the single GitHub API call.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_BLOCKS = path.join(ROOT, "public", "blocks");
const OUTPUT_JSON = path.join(__dirname, "generated-blocks.json");

const REPO = "Mojang/bedrock-samples";
const BRANCH = "main";
const BLOCKS_PREFIX = "resource_pack/textures/blocks/";
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/`;
const TREES_URL = `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`;

// How many files to download in parallel
const CONCURRENCY = 25;

const FORCE = process.argv.includes("--force");
// --local: skip network, recompute stats only for already-downloaded files
const LOCAL_ONLY = process.argv.includes("--local");

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchJSON(url) {
  const headers = { "User-Agent": "minecraft-pixel-art-generator/1.0" };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status} ${res.statusText} — ${url}`);
  }
  return res.json();
}

async function downloadBinary(url, dest) {
  const res = await fetch(url, {
    headers: { "User-Agent": "minecraft-pixel-art-generator/1.0" },
  });
  if (!res.ok) throw new Error(`Download failed ${res.status} — ${url}`);
  const buf = await res.arrayBuffer();
  await writeFile(dest, Buffer.from(buf));
}

/**
 * Compute texture statistics from a PNG file:
 *  - avgRgb     — average color (transparency composited onto grey)
 *  - avgAlpha   — average alpha 0–255 (255 = fully opaque; low = transparent/non-solid)
 *  - variance   — average per-channel color variance (low = uniform/solid-looking)
 */
async function computeTextureStats(filePath) {
  try {
    const { data, info } = await sharp(filePath)
      .ensureAlpha()
      .resize(16, 16, { fit: "fill", kernel: "nearest" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = info.width * info.height;
    let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
    let rSqSum = 0, gSqSum = 0, bSqSum = 0;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      aSum += a;
      // Composite onto a neutral grey background for color stats
      const af = a / 255;
      const r = data[i] * af + 128 * (1 - af);
      const g = data[i + 1] * af + 128 * (1 - af);
      const b = data[i + 2] * af + 128 * (1 - af);
      rSum += r; gSum += g; bSum += b;
      rSqSum += r * r; gSqSum += g * g; bSqSum += b * b;
    }

    const rMean = rSum / pixels;
    const gMean = gSum / pixels;
    const bMean = bSum / pixels;
    const aMean = aSum / pixels;

    const variance = (
      (rSqSum / pixels - rMean * rMean) +
      (gSqSum / pixels - gMean * gMean) +
      (bSqSum / pixels - bMean * bMean)
    ) / 3;

    return {
      avgRgb: [Math.round(rMean), Math.round(gMean), Math.round(bMean)],
      avgAlpha: Math.round(aMean),
      variance: Math.round(variance),
    };
  } catch {
    return { avgRgb: [128, 128, 128], avgAlpha: 255, variance: 0 };
  }
}

/** Run async tasks with bounded concurrency. */
async function withConcurrency(tasks, limit) {
  const results = new Array(tasks.length);
  let next = 0;

  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(PUBLIC_BLOCKS, { recursive: true });

  // ── Step 1: enumerate PNG files ───────────────────────────────────────────
  let pngFiles; // [{path, name}]

  if (LOCAL_ONLY) {
    // Re-use files already on disk — no network call needed
    const { readdirSync } = await import("fs");
    const localFiles = readdirSync(PUBLIC_BLOCKS).filter((f) => f.endsWith(".png"));
    pngFiles = localFiles.map((f) => ({
      path: BLOCKS_PREFIX + f,
      name: f.slice(0, -4), // strip .png
    }));
    console.log(`Using ${pngFiles.length} local files from public/blocks/ (--local mode).`);
  } else {
    console.log("Fetching repository file tree from GitHub Trees API…");
    const tree = await fetchJSON(TREES_URL);

    if (tree.truncated) {
      console.warn("Warning: GitHub Trees response was truncated. Some files may be missing.");
    }

    pngFiles = (tree.tree ?? [])
      .filter((node) => {
        if (node.type !== "blob") return false;
        if (!node.path.startsWith(BLOCKS_PREFIX)) return false;
        const relative = node.path.slice(BLOCKS_PREFIX.length);
        return relative.endsWith(".png") && !relative.includes("/");
      })
      .map((node) => ({ path: node.path, name: path.basename(node.path, ".png") }));
  }

  if (!LOCAL_ONLY) console.log(`Found ${pngFiles.length} PNG files to process.\n`);

  // ── Step 2+3: download + compute RGB ──────────────────────────────────────
  let done = 0;
  let downloaded = 0;
  let skipped = 0;
  let errors = 0;

  const tasks = pngFiles.map((file) => async () => {
    const textureName = file.name;
    const dest = path.join(PUBLIC_BLOCKS, `${textureName}.png`);

    // Download if missing or forced (skipped entirely in --local mode)
    if (!LOCAL_ONLY && (FORCE || !existsSync(dest))) {
      try {
        await downloadBinary(RAW_BASE + file.path, dest);
        downloaded++;
      } catch (err) {
        errors++;
        process.stderr.write(`\n  ERROR downloading ${textureName}: ${err.message}\n`);
        done++;
        return null;
      }
    } else if (!LOCAL_ONLY) {
      skipped++;
    }

    const stats = await computeTextureStats(dest);

    done++;
    if (done % 50 === 0 || done === pngFiles.length) {
      process.stdout.write(
        `\r  ${done}/${pngFiles.length} — downloaded: ${downloaded}, cached: ${skipped}, errors: ${errors}   `
      );
    }

    return { texture: textureName, ...stats };
  });

  const allResults = await withConcurrency(tasks, CONCURRENCY);
  const validResults = allResults.filter(Boolean);

  console.log(
    `\n\nDone. ${validResults.length} textures processed (${downloaded} downloaded, ${skipped} cached, ${errors} errors).`
  );

  // ── Step 4: write generated-blocks.json ───────────────────────────────────
  writeFileSync(OUTPUT_JSON, JSON.stringify(validResults, null, 2));
  console.log(`Wrote ${OUTPUT_JSON}`);
}

main().catch((err) => {
  console.error("\nFatal error:", err.message);
  process.exit(1);
});
