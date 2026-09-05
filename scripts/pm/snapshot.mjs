#!/usr/bin/env node
/**
 * pm:snapshot — collect one normalized JSON view of project state.
 *
 *   pnpm pm:snapshot                 Print JSON to stdout.
 *   pnpm pm:snapshot --out FILE      Write to FILE.
 *   pnpm pm:snapshot --no-gh         Spec files only; skip GitHub entirely.
 *
 * All aggregation happens here so the dashboard never asks a model to do arithmetic
 * across dozens of issues. Runs read-only: no `gh` write commands.
 */

import { execFileSync } from "node:child_process";
import { globSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { readSpec, indexSpec, specSlug } from "./lib/spec.mjs";

const argv = process.argv.slice(2);
const OUT = (() => { const i = argv.indexOf("--out"); return i === -1 ? null : argv[i + 1]; })();
const NO_GH = argv.includes("--no-gh");
const STALE_DAYS = 21;

function gh(args) {
  try { return execFileSync("gh", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }); }
  catch { return null; }
}
const ghJson = (a) => { const r = gh(a); try { return r == null ? null : JSON.parse(r); } catch { return null; } };

const keyFromBody = (b) => b?.match(/<!--\s*pm-sync:v\d+\s+key=([^\s>]+)\s*-->/)?.[1] ?? null;
const labelNames = (i) => (i.labels ?? []).map((l) => l.name);
const pick = (names, prefix) => names.find((n) => n.startsWith(prefix))?.slice(prefix.length) ?? null;
const daysSince = (iso) => iso ? Math.floor((Date.now() - Date.parse(iso)) / 86400000) : null;

// ── specs ───────────────────────────────────────────────────────────────────
const specs = [];
const allItems = [];
for (const f of [...globSync("plans/*.md")].sort()) {
  const spec = readSpec(f);
  if (!spec.hasFrontmatter) continue;
  const slug = specSlug(spec);
  const kind = spec.doc.get("kind") ?? "plan";
  if (kind === "reference") {
    specs.push({ slug, name: spec.doc.get("name") ?? slug, kind, path: f, status: spec.doc.get("status") ?? null, todos: 0 });
    continue;
  }
  const items = indexSpec(spec);
  allItems.push(...items);

  const msMap = new Map();
  for (const it of items) {
    if (!msMap.has(it.milestone)) msMap.set(it.milestone, { id: it.milestone, name: it.milestoneName, total: 0, completed: 0, open: 0, blocked: 0 });
    const m = msMap.get(it.milestone);
    m.total++;
    if (it.status === "completed") m.completed++;
    else { m.open++; if (it.status === "blocked") m.blocked++; }
  }

  specs.push({
    slug, kind, path: f,
    name: spec.doc.get("name") ?? slug,
    status: spec.doc.get("status") ?? null,
    area: spec.doc.get("area") ?? null,
    priority: spec.doc.get("priority") ?? null,
    overview: spec.doc.get("overview") ?? null,
    total: items.length,
    completed: items.filter((i) => i.status === "completed").length,
    open: items.filter((i) => i.status !== "completed").length,
    blocked: items.filter((i) => i.status === "blocked").length,
    linked: items.filter((i) => i.issue != null).length,
    milestones: [...msMap.values()],
  });
}

// ── github ──────────────────────────────────────────────────────────────────
let issues = [], prs = [], repo = null, ghOk = false;
if (!NO_GH) {
  const r = ghJson(["repo", "view", "--json", "nameWithOwner"]);
  repo = r?.nameWithOwner ?? null;
  const raw = ghJson(["issue", "list", "--state", "all", "--limit", "500",
    "--json", "number,title,state,stateReason,labels,url,createdAt,updatedAt,closedAt,body"]);
  if (raw) {
    ghOk = true;
    issues = raw.map((i) => {
      const names = labelNames(i);
      return {
        number: i.number, title: i.title, url: i.url,
        state: i.state, stateReason: i.stateReason,
        labels: names,
        area: pick(names, "area/"), type: pick(names, "type/"),
        priority: pick(names, "priority/"), spec: pick(names, "spec/"),
        blocked: names.includes("status/blocked"),
        needsTriage: names.includes("status/needs-triage"),
        key: keyFromBody(i.body),
        createdAt: i.createdAt, updatedAt: i.updatedAt, closedAt: i.closedAt,
        staleDays: i.state === "OPEN" ? daysSince(i.updatedAt) : null,
      };
    });
  }
  prs = (ghJson(["pr", "list", "--state", "merged", "--limit", "15",
    "--json", "number,title,url,mergedAt,labels"]) ?? [])
    .map((p) => ({ number: p.number, title: p.title, url: p.url, mergedAt: p.mergedAt, labels: labelNames(p) }));
}

// ── drift ───────────────────────────────────────────────────────────────────
const byKey = new Map(issues.filter((i) => i.key).map((i) => [i.key, i]));
const drift = [];
if (ghOk) {
  for (const it of allItems) {
    const iss = byKey.get(it.key) ?? (it.issue != null ? issues.find((x) => x.number === it.issue) : null);
    if (!iss) {
      if (it.issue != null) drift.push({ kind: "missing-issue", key: it.key, detail: `spec references #${it.issue}, not found` });
      continue;
    }
    const done = it.status === "completed" || it.status === "cancelled";
    if (done && iss.state === "OPEN") drift.push({ kind: "spec-done-issue-open", key: it.key, issue: iss.number });
    if (!done && iss.state === "CLOSED") drift.push({ kind: "issue-closed-spec-open", key: it.key, issue: iss.number, specStatus: it.status });
  }
  for (const iss of issues) {
    if (iss.state !== "OPEN") continue;
    if (iss.spec && !iss.key) drift.push({ kind: "unlinked", issue: iss.number, detail: "spec label but no marker" });
    if (iss.key && !allItems.some((i) => i.key === iss.key)) drift.push({ kind: "orphan", key: iss.key, issue: iss.number });
  }
}

// ── rollups ─────────────────────────────────────────────────────────────────
const open = issues.filter((i) => i.state === "OPEN");
const byArea = {};
for (const it of allItems) {
  const a = it.area ?? "unassigned";
  byArea[a] ??= { area: a, total: 0, completed: 0, open: 0, blocked: 0 };
  byArea[a].total++;
  if (it.status === "completed") byArea[a].completed++;
  else { byArea[a].open++; if (it.status === "blocked") byArea[a].blocked++; }
}

const snapshot = {
  generatedAt: new Date().toISOString(),
  repo,
  ghAvailable: ghOk,
  commit: (gh(["api", "repos/{owner}/{repo}/commits/main", "--jq", ".sha"]) ?? "").trim().slice(0, 7) || null,
  totals: {
    specs: specs.filter((s) => s.kind !== "reference").length,
    referenceDocs: specs.filter((s) => s.kind === "reference").length,
    todos: allItems.length,
    completed: allItems.filter((i) => i.status === "completed").length,
    open: allItems.filter((i) => i.status !== "completed").length,
    blocked: allItems.filter((i) => i.status === "blocked").length,
    linked: allItems.filter((i) => i.issue != null).length,
    issuesOpen: open.length,
    issuesClosed: issues.length - open.length,
    stale: open.filter((i) => i.staleDays != null && i.staleDays > STALE_DAYS).length,
    needsTriage: open.filter((i) => i.needsTriage || !i.area || !i.type || !i.priority).length,
    closedLast14: issues.filter((i) => i.closedAt && daysSince(i.closedAt) <= 14).length,
  },
  specs,
  byArea: Object.values(byArea).sort((a, b) => b.open - a.open || b.total - a.total),
  openItems: allItems
    .filter((i) => i.status !== "completed")
    .map((i) => ({ ...i, issueUrl: i.issue != null ? issues.find((x) => x.number === i.issue)?.url ?? null : null }))
    .sort((a, b) => String(a.priority).localeCompare(String(b.priority)) || a.key.localeCompare(b.key)),
  staleIssues: open.filter((i) => i.staleDays != null && i.staleDays > STALE_DAYS)
    .sort((a, b) => b.staleDays - a.staleDays)
    .map(({ number, title, url, staleDays, area, priority }) => ({ number, title, url, staleDays, area, priority })),
  blockedIssues: open.filter((i) => i.blocked).map(({ number, title, url, area }) => ({ number, title, url, area })),
  drift,
  recentPRs: prs,
};

const json = JSON.stringify(snapshot, null, 2);
if (OUT) { mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, json + "\n", "utf8"); console.error(`✓ snapshot -> ${OUT}`); }
else console.log(json);
