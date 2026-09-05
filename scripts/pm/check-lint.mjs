#!/usr/bin/env node
/**
 * check:lint — a lint ratchet.
 *
 *   pnpm check:lint             Fail only if a file got WORSE than its baseline.
 *   pnpm check:lint --update    Re-record the baseline (do this deliberately).
 *
 * Why not just `pnpm lint`: main currently has 17 errors and 15 warnings, mostly
 * React Compiler diagnostics. A gate that requires zero would either block every
 * change or tempt a wholesale unrelated cleanup into an otherwise focused PR.
 *
 * So the rule is "don't make it worse", per file:
 *   - a file whose error count rose            → fail
 *   - a file with errors that had none before  → fail
 *   - a file whose count fell                  → pass, and nudge to re-baseline
 *
 * Fixing the backlog is real work that deserves its own issue, not a side effect
 * of an unrelated change.
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { relative } from "node:path";

const BASELINE = ".claude/pm/lint-baseline.json";
const UPDATE = process.argv.includes("--update");

function runEslint() {
  let raw;
  try {
    raw = execSync("npx eslint --format json .", { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    // eslint exits non-zero when it finds errors; the JSON is still on stdout.
    raw = e.stdout;
  }
  if (!raw) { console.error("could not run eslint"); process.exit(2); }
  const results = JSON.parse(raw);
  const counts = {};
  for (const r of results) {
    if (!r.errorCount && !r.warningCount) continue;
    counts[relative(process.cwd(), r.filePath)] = { errors: r.errorCount, warnings: r.warningCount };
  }
  return counts;
}

const current = runEslint();
const totals = Object.values(current).reduce(
  (a, c) => ({ errors: a.errors + c.errors, warnings: a.warnings + c.warnings }), { errors: 0, warnings: 0 }
);

if (UPDATE) {
  writeFileSync(BASELINE, JSON.stringify({ recordedAt: new Date().toISOString(), totals, files: current }, null, 2) + "\n");
  console.log(`✓ baseline recorded: ${totals.errors} errors, ${totals.warnings} warnings across ${Object.keys(current).length} file(s)`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.error(`no baseline at ${BASELINE} — run:  pnpm check:lint --update`);
  process.exit(2);
}

const base = JSON.parse(readFileSync(BASELINE, "utf8"));
const regressions = [];
const improvements = [];

for (const [file, c] of Object.entries(current)) {
  const b = base.files[file] ?? { errors: 0, warnings: 0 };
  if (c.errors > b.errors) regressions.push(`${file}: errors ${b.errors} → ${c.errors}`);
  else if (c.errors < b.errors) improvements.push(`${file}: errors ${b.errors} → ${c.errors}`);
}
for (const [file, b] of Object.entries(base.files)) {
  if (!current[file] && b.errors > 0) improvements.push(`${file}: errors ${b.errors} → 0 (or file removed)`);
}

if (regressions.length) {
  console.error(`✗ lint regressed in ${regressions.length} file(s):`);
  for (const r of regressions) console.error(`    ${r}`);
  console.error(`\nFix the new errors. Do not re-baseline to make this pass.`);
  process.exit(1);
}

console.log(`✓ no lint regressions (baseline ${base.totals.errors} errors, now ${totals.errors})`);
if (improvements.length) {
  console.log(`  ${improvements.length} file(s) improved — re-baseline with:  pnpm check:lint --update`);
  for (const i of improvements.slice(0, 5)) console.log(`    ${i}`);
}
