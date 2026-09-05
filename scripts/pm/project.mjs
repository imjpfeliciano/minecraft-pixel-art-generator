#!/usr/bin/env node
/**
 * pm:project — put every tracked issue on the board and set its custom fields
 * from the labels the issue already carries.
 *
 *   pnpm pm:project              Dry run — show what would change.
 *   pnpm pm:project --apply      Add missing items and set field values.
 *
 * Runs after `pm:sync`. Kept separate because issue state and board presentation
 * are different concerns, and because the board's own "auto-add" workflow may
 * already be doing the add half — this is idempotent either way.
 *
 * Field values are derived from labels, so labels stay the single source of
 * truth and the board is a projection of them, never a second place to edit.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const STATE_PATH = ".claude/pm/state.json";
const APPLY = process.argv.includes("--apply");

function gh(args, { allowFail = false } = {}) {
  try { return execFileSync("gh", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }); }
  catch (e) { if (allowFail) return null; throw new Error(`gh ${args.join(" ")}\n${e.stderr || e.message}`); }
}
const ghJson = (a, o) => { const r = gh(a, o); return r == null ? null : JSON.parse(r); };

const state = JSON.parse(readFileSync(STATE_PATH, "utf8"));
const { owner, projectNumber } = state;
if (!projectNumber) { console.error("no projectNumber in state — run bootstrap --project first"); process.exit(1); }

// Resolve the project node id once and cache it.
let projectId = state.projectId;
if (!projectId) {
  projectId = ghJson(["project", "list", "--owner", owner, "--format", "json"])
    .projects.find((p) => p.number === projectNumber)?.id;
  writeFileSync(STATE_PATH, JSON.stringify({ ...state, projectId }, null, 2) + "\n", "utf8");
}

const fields = Object.fromEntries(state.fields.map((f) => [f.name, f]));
const optionId = (fieldName, optName) =>
  fields[fieldName]?.options?.find((o) => o.name.toLowerCase() === String(optName).toLowerCase())?.id ?? null;

const labelValue = (labels, prefix) => labels.find((l) => l.startsWith(prefix))?.slice(prefix.length) ?? null;

// ── gather ──────────────────────────────────────────────────────────────────
const issues = (ghJson(["issue", "list", "--state", "open", "--limit", "500", "--json", "number,title,url,labels"]) ?? [])
  .map((i) => ({ ...i, labels: i.labels.map((l) => l.name) }))
  .filter((i) => i.labels.some((l) => l.startsWith("spec/")));

const items = (ghJson(["project", "item-list", String(projectNumber), "--owner", owner, "--format", "json"])?.items ?? []);
const itemByNumber = new Map(items.filter((i) => i.content?.number).map((i) => [i.content.number, i]));

console.log(`project #${projectNumber}  tracked issues: ${issues.length}  items on board: ${items.length}  mode: ${APPLY ? "APPLY" : "dry run"}\n`);

let added = 0, set = 0;
for (const iss of issues) {
  const area = labelValue(iss.labels, "area/");
  const prio = labelValue(iss.labels, "priority/");
  const spec = labelValue(iss.labels, "spec/");

  let item = itemByNumber.get(iss.number);
  if (!item) {
    console.log(`  + ADD    #${iss.number}  ${iss.title.slice(0, 50)}`);
    if (APPLY) {
      const res = ghJson(["project", "item-add", String(projectNumber), "--owner", owner, "--url", iss.url, "--format", "json"]);
      item = { id: res.id, ...res };
    }
    added++;
    if (!APPLY) continue;
  }

  const want = [
    ["Area", area && optionId("Area", area), area],
    ["Priority", prio && optionId("Priority", prio.toUpperCase()), prio],
    ["Spec", spec, spec],
    ["Agent", optionId("Agent", "unassigned"), "unassigned"],
  ];

  for (const [fieldName, valueId, display] of want) {
    if (!valueId) continue;
    const f = fields[fieldName];
    if (!f) continue;
    const isSelect = f.type === "ProjectV2SingleSelectField";
    const args = ["project", "item-edit", "--id", item.id, "--project-id", projectId, "--field-id", f.id];
    if (isSelect) args.push("--single-select-option-id", valueId);
    else args.push("--text", String(valueId));
    if (APPLY) gh(args, { allowFail: true });
    set++;
  }
  console.log(`  ~ FIELDS #${iss.number}  area=${area ?? "-"} priority=${prio ?? "-"} spec=${spec ?? "-"}`);
}

console.log(`\n${APPLY ? "applied" : "would apply"}: ${added} item(s) added, ${set} field value(s) set`);
if (!APPLY) console.log("dry run — re-run with --apply to execute.");
