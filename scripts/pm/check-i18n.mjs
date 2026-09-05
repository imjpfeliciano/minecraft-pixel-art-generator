#!/usr/bin/env node
/**
 * check:i18n — enforce the AGENTS.md translation rules mechanically.
 *
 *   pnpm check:i18n            Fail on key drift between en and es.
 *   pnpm check:i18n --strict   Also fail on es values identical to en.
 *
 * Two rules from AGENTS.md, neither of which anything enforced until now:
 *   1. every key exists in BOTH messages/en.json and messages/es.json
 *   2. es is a real translation, never the English value copied as a placeholder
 *
 * Rule 2 is a heuristic — some strings are legitimately identical across the two
 * locales (proper nouns, "OK", "Minecraft"). Those live in the ALLOW_IDENTICAL
 * list below rather than being silently tolerated, so the exceptions stay visible.
 */

import { readFileSync } from "node:fs";

const STRICT = process.argv.includes("--strict");

/**
 * Keys whose en and es values are legitimately the same. Keep this list short and
 * justified — every entry is a claim that the Spanish really is the same word.
 * Anything not listed here that matches en is treated as an untranslated placeholder.
 */
const ALLOW_IDENTICAL = new Set([
  "Page.title",                        // brand string
  "Landing.footerGithub",              // proper noun
  "Page.panelOriginal",                // "Original" is the same in es
  "ControlPanel.orientationHorizontal", // "Horizontal" is the same in es
  "ControlPanel.orientationVertical",   // "Vertical" is the same in es
  "PixelArtPreview.zoomLabel",         // "Zoom" is used as-is in es
  "PixelArtPreview.colorLabel",        // "Color" is the same in es
]);

const flatten = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? flatten(v, `${prefix}${k}.`)
      : [[`${prefix}${k}`, v]]
  );

const en = JSON.parse(readFileSync("messages/en.json", "utf8"));
const es = JSON.parse(readFileSync("messages/es.json", "utf8"));

const enMap = new Map(flatten(en));
const esMap = new Map(flatten(es));

const missingInEs = [...enMap.keys()].filter((k) => !esMap.has(k));
const missingInEn = [...esMap.keys()].filter((k) => !enMap.has(k));

const identical = [...enMap.entries()]
  .filter(([k, v]) =>
    esMap.has(k) &&
    typeof v === "string" &&
    esMap.get(k) === v &&
    v.trim().length > 2 &&
    !ALLOW_IDENTICAL.has(k)
  )
  .map(([k, v]) => `${k} = ${JSON.stringify(v)}`);

let failed = false;

if (missingInEs.length) {
  failed = true;
  console.error(`✗ ${missingInEs.length} key(s) in en.json but missing from es.json:`);
  for (const k of missingInEs) console.error(`    ${k}`);
}
if (missingInEn.length) {
  failed = true;
  console.error(`✗ ${missingInEn.length} key(s) in es.json but missing from en.json:`);
  for (const k of missingInEn) console.error(`    ${k}`);
}

if (identical.length) {
  const label = STRICT ? "✗" : "!";
  console.error(`${label} ${identical.length} es value(s) identical to en — likely untranslated placeholders:`);
  for (const k of identical) console.error(`    ${k}`);
  if (STRICT) failed = true;
  else console.error("  (warning only; re-run with --strict to fail on these)");
}

if (failed) {
  console.error(`\ni18n check failed. Per AGENTS.md every user-facing string needs a real translation in both locales.`);
  process.exit(1);
}

console.log(`✓ i18n parity: ${enMap.size} keys in both locales${identical.length ? `, ${identical.length} identical (warned)` : ""}`);
