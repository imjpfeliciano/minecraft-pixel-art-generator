#!/usr/bin/env node
/**
 * pm:sync — reconcile plans/*.md frontmatter with GitHub Issues.
 *
 *   pnpm pm:sync                       Dry run over every spec. Writes nothing.
 *   pnpm pm:sync --slug seo            Dry run for one spec.
 *   pnpm pm:sync --slug seo --apply    Actually create/update/close issues.
 *   pnpm pm:sync --include-completed   Also create-and-close issues for done todos
 *                                      (historical backfill; off by default).
 *   pnpm pm:sync --prune               Close issues whose todo vanished from the spec.
 *   pnpm pm:sync --delay 3             Seconds between content-creating calls.
 *
 * Safety properties this script is built around:
 *
 *  - Dry run is the default. `--apply` is required for every mutation.
 *  - It never deletes an issue. The worst it can do is close one.
 *  - Re-running with unchanged inputs must produce a zero-action plan. That
 *    idempotency comes from matching on a stable key, never on content.
 *  - Issue lookup uses `--label spec/<slug> --state all`, never `--search`.
 *    GitHub's issue-body search index lags by seconds-to-minutes, so a
 *    search-based lookup right after a create silently misses it and the next
 *    run duplicates the issue.
 *  - Issue numbers are written back to the spec after EACH create, not batched
 *    at the end, so a run interrupted by a rate limit resumes without duplicating.
 */

import { execFileSync } from "node:child_process";
import { globSync } from "node:fs";
import { readSpec, writeSpec, indexSpec, specSlug, setTodoIssue, setTodoField, assertIntact } from "./lib/spec.mjs";

const MARKER_VERSION = "v1";
const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const val = (f, d = null) => { const i = argv.indexOf(`--${f}`); return i === -1 ? d : argv[i + 1]; };

const APPLY = has("apply");
const INCLUDE_COMPLETED = has("include-completed");
const PRUNE = has("prune");
const DELAY_MS = Number(val("delay", "3")) * 1000;
const ONLY_SLUG = val("slug");

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function gh(args, { allowFail = false } = {}) {
  try {
    return execFileSync("gh", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  } catch (e) {
    if (allowFail) return null;
    throw new Error(`gh ${args.join(" ")}\n${e.stderr || e.message}`);
  }
}
const ghJson = (args, o) => { const r = gh(args, o); return r == null ? null : JSON.parse(r); };

function preflight() {
  const status = gh(["auth", "status"], { allowFail: true });
  if (status == null) {
    console.error("✗ gh is not installed or not authenticated.\n  brew install gh && gh auth login -s repo,read:org,project");
    process.exit(1);
  }
  if (!/\bproject\b/.test(status)) {
    console.error("! gh token lacks the `project` scope — issue sync will work, Projects v2 will not.");
    console.error("  Fix with: gh auth refresh -h github.com -s project");
  }
  const repo = ghJson(["repo", "view", "--json", "nameWithOwner,hasIssuesEnabled"]);
  if (!repo.hasIssuesEnabled) {
    console.error(`✗ Issues are disabled on ${repo.nameWithOwner}. Enable them in repo settings first.`);
    process.exit(1);
  }
  return repo.nameWithOwner;
}

const markerFor = (key) => `<!-- pm-sync:${MARKER_VERSION} key=${key} -->`;
const keyFromBody = (body) => body?.match(/<!--\s*pm-sync:v\d+\s+key=([^\s>]+)\s*-->/)?.[1] ?? null;

function labelsFor(item, slug) {
  const l = [`spec/${slug}`];
  if (item.area) l.push(`area/${item.area}`);
  if (item.type) l.push(`type/${item.type}`);
  if (item.priority) l.push(`priority/${item.priority}`);
  if (item.status === "blocked") l.push("status/blocked");
  if (item.status === "in_progress") l.push("status/in-progress");
  if (item.agent === "claude") l.push("agent/ready");
  if (item.agent === "human") l.push("agent/needs-human");
  return l;
}

function titleFor(item) {
  const raw = String(item.content).replace(/\s+/g, " ").trim();
  const head = raw.split(/(?<=[.;:])\s|\s—\s/)[0];
  const t = (head.length > 10 ? head : raw).slice(0, 110);
  return t.length < raw.length ? t.replace(/[\s—·,;:.]+$/, "") + "…" : t;
}

function bodyFor(item, slug, repo) {
  const specUrl = `https://github.com/${repo}/blob/main/plans/${slug}.md`;
  return [
    String(item.content).trim(),
    "",
    `**Spec:** [\`plans/${slug}.md\`](${specUrl}) · **Milestone:** ${item.milestoneName}`,
    "",
    "### Acceptance",
    "- [ ] Implementation matches the spec section for this milestone",
    "- [ ] `pnpm typecheck` passes",
    "- [ ] `messages/en.json` and `messages/es.json` both updated if UI strings changed",
    "",
    markerFor(item.key),
  ].join("\n");
}

/** Remote index for one spec, keyed by marker. Label-scoped, index-lag-free. */
function remoteIndex(slug) {
  const rows = ghJson(
    ["issue", "list", "--label", `spec/${slug}`, "--state", "all", "--limit", "500",
     "--json", "number,title,body,state,stateReason,labels,url,updatedAt"],
    { allowFail: true }
  ) ?? [];
  const byKey = new Map();
  const dupes = [];
  for (const r of rows) {
    const k = keyFromBody(r.body);
    if (!k) continue;
    if (byKey.has(k)) dupes.push([k, byKey.get(k).number, r.number]);
    else byKey.set(k, r);
  }
  return { byKey, byNumber: new Map(rows.map((r) => [r.number, r])), rows, dupes };
}

function planFor(spec, repo) {
  const slug = specSlug(spec);
  const items = indexSpec(spec);
  const remote = remoteIndex(slug);
  const actions = [];

  if (remote.dupes.length) {
    for (const [k, a, b] of remote.dupes) {
      actions.push({ kind: "CONFLICT", key: k, detail: `two issues share this key: #${a} and #${b}` });
    }
  }

  const claimed = new Set();

  for (const it of items) {
    // Match order: frontmatter number is authoritative, then the body marker.
    let issue = null;
    if (it.issue != null) {
      issue = remote.byNumber.get(it.issue) ?? null;
      if (!issue) {
        const probe = ghJson(["issue", "view", String(it.issue), "--json", "number,title,body,state,stateReason,labels,url"], { allowFail: true });
        if (probe) issue = probe;
      }
    }
    if (!issue) issue = remote.byKey.get(it.key) ?? null;
    if (issue) claimed.add(issue.number);

    if (!issue) {
      if (it.status === "completed" && !INCLUDE_COMPLETED) {
        actions.push({ kind: "SKIP", key: it.key, detail: "completed, no backfill (use --include-completed)" });
      } else {
        actions.push({ kind: "CREATE", key: it.key, item: it, closeAfter: it.status === "completed" || it.status === "cancelled" });
      }
      continue;
    }

    const open = issue.state === "OPEN";
    const wantLabels = labelsFor(it, slug).sort().join(",");
    const haveLabels = (issue.labels ?? []).map((l) => l.name).sort().join(",");
    const wantBody = bodyFor(it, slug, repo);

    if (it.status === "completed" && open) {
      actions.push({ kind: "CLOSE", key: it.key, item: it, issue, reason: "completed" });
    } else if (it.status === "cancelled" && open) {
      actions.push({ kind: "CLOSE", key: it.key, item: it, issue, reason: "not planned" });
    } else if (!open && it.status !== "completed" && it.status !== "cancelled") {
      // GitHub wins the "done" transition — closing an issue is a deliberate act,
      // and it is the spec files that have historically drifted.
      const newStatus = issue.stateReason === "NOT_PLANNED" ? "cancelled" : "completed";
      actions.push({ kind: "ADOPT", key: it.key, item: it, issue, newStatus });
    } else if (haveLabels !== wantLabels || issue.body?.trim() !== wantBody.trim()) {
      actions.push({ kind: "UPDATE", key: it.key, item: it, issue, wantLabels: labelsFor(it, slug), wantBody });
    } else {
      actions.push({ kind: "OK", key: it.key, issue });
    }

    if (it.issue == null) actions.push({ kind: "RELINK", key: it.key, item: it, issue });
  }

  for (const r of remote.rows) {
    const k = keyFromBody(r.body);
    if (!k) { actions.push({ kind: "UNLINKED", key: `#${r.number}`, issue: r, detail: "carries the spec label but no marker — human-authored" }); continue; }
    if (claimed.has(r.number)) continue;
    if (r.state !== "OPEN") continue;
    actions.push({ kind: "ORPHAN", key: k, issue: r, detail: "no matching todo in the spec" });
  }

  return { slug, items, actions };
}

const ICON = { CREATE: "+", UPDATE: "~", CLOSE: "x", ADOPT: "<", RELINK: "=", ORPHAN: "?", UNLINKED: "?", CONFLICT: "!", SKIP: ".", OK: " " };

function printPlan(p) {
  const counts = {};
  for (const a of p.actions) counts[a.kind] = (counts[a.kind] ?? 0) + 1;
  const summary = Object.entries(counts).filter(([k]) => k !== "OK").map(([k, v]) => `${k} ${v}`).join("  ") || "no changes";
  console.log(`\n── ${p.slug} ──  ${summary}`);
  for (const a of p.actions) {
    if (a.kind === "OK") continue;
    const num = a.issue ? `#${String(a.issue.number).padEnd(4)}` : "     ";
    const extra = a.detail ? `  (${a.detail})` : a.newStatus ? `  -> spec status: ${a.newStatus}` : "";
    console.log(`  ${ICON[a.kind] ?? "?"} ${a.kind.padEnd(9)} ${num} ${a.key}${extra}`);
  }
  return counts;
}

/**
 * The per-spec label is the query mechanism the whole remote index depends on,
 * so it has to exist before the first issue that carries it. Idempotent via --force.
 */
function ensureSpecLabel(slug, spec) {
  const name = spec.doc.get("name") ?? slug;
  gh(["label", "create", `spec/${slug}`, "--color", "006B75",
      "--description", `${name} — plans/${slug}.md`, "--force"]);
}

function applyPlan(spec, p, repo) {
  const slug = p.slug;
  let created = 0;
  if (p.actions.some((a) => a.kind === "CREATE" || a.kind === "UPDATE")) {
    ensureSpecLabel(slug, spec);
  }
  for (const a of p.actions) {
    switch (a.kind) {
      case "CREATE": {
        if (created > 0) sleep(DELAY_MS); // secondary rate limit is ~20 creations/min
        const args = ["issue", "create", "--title", titleFor(a.item), "--body", bodyFor(a.item, slug, repo)];
        for (const l of labelsFor(a.item, slug)) args.push("--label", l);
        const url = gh(args).trim().split("\n").pop();
        const n = Number(url.match(/\/(\d+)$/)[1]);
        console.log(`  + created #${n}  ${a.key}`);
        // Write back immediately so an interrupted run resumes without duplicating.
        const before = indexSpec(spec);
        setTodoIssue(spec, a.key, n);
        assertIntact(spec, before);
        writeSpec(spec);
        if (a.closeAfter) {
          gh(["issue", "close", String(n), "--reason", a.item.status === "cancelled" ? "not planned" : "completed",
              "--comment", `Completed before tracking began — backfilled from \`plans/${slug}.md\`.`]);
          console.log(`    closed #${n} (historical backfill)`);
        }
        created++;
        break;
      }
      case "UPDATE": {
        const args = ["issue", "edit", String(a.issue.number), "--body", a.wantBody];
        for (const l of a.wantLabels) args.push("--add-label", l);
        gh(args);
        console.log(`  ~ updated #${a.issue.number}  ${a.key}`);
        break;
      }
      case "CLOSE": {
        gh(["issue", "close", String(a.issue.number), "--reason", a.reason,
            "--comment", `Marked ${a.item.status} in \`plans/${slug}.md\`.`]);
        console.log(`  x closed #${a.issue.number}  ${a.key}`);
        break;
      }
      case "ADOPT": {
        const before = indexSpec(spec);
        setTodoField(spec, a.key, "status", a.newStatus);
        assertIntact(spec, before);
        writeSpec(spec);
        console.log(`  < adopted #${a.issue.number} -> spec status ${a.newStatus}  ${a.key}`);
        break;
      }
      case "RELINK": {
        const before = indexSpec(spec);
        setTodoIssue(spec, a.key, a.issue.number);
        assertIntact(spec, before);
        writeSpec(spec);
        console.log(`  = relinked ${a.key} -> #${a.issue.number}`);
        break;
      }
      case "ORPHAN": {
        gh(["issue", "edit", String(a.issue.number), "--add-label", "status/needs-triage"], { allowFail: true });
        if (PRUNE) {
          gh(["issue", "close", String(a.issue.number), "--reason", "not planned",
              "--comment", `No longer present in \`plans/${slug}.md\`.`]);
          console.log(`  x pruned #${a.issue.number}  ${a.key}`);
        } else {
          gh(["issue", "comment", String(a.issue.number), "--body",
              `This issue's todo no longer appears in \`plans/${slug}.md\`. Left open deliberately — re-add the todo or close manually.`], { allowFail: true });
          console.log(`  ? flagged orphan #${a.issue.number}  ${a.key}`);
        }
        break;
      }
    }
  }
}

// ── main ────────────────────────────────────────────────────────────────────
const repo = preflight();
const files = [...globSync("plans/*.md")].sort();
const specs = files
  .map((f) => readSpec(f))
  .filter((s) => s.hasFrontmatter && s.doc.get("kind") !== "reference")
  .filter((s) => !ONLY_SLUG || specSlug(s) === ONLY_SLUG);

if (!specs.length) {
  console.error(ONLY_SLUG ? `no plan spec with slug "${ONLY_SLUG}"` : "no plan specs found");
  process.exit(1);
}

console.log(`repo: ${repo}   mode: ${APPLY ? "APPLY" : "dry run"}${INCLUDE_COMPLETED ? "   backfill: on" : ""}`);

const totals = {};
let conflicts = 0;
for (const spec of specs) {
  const p = planFor(spec, repo);
  const c = printPlan(p);
  for (const [k, v] of Object.entries(c)) totals[k] = (totals[k] ?? 0) + v;
  conflicts += c.CONFLICT ?? 0;
  if (APPLY) {
    if (c.CONFLICT) { console.error(`  ! ${p.slug}: conflicts present — resolve manually before applying. Skipped.`); continue; }
    try {
      applyPlan(spec, p, repo);
    } catch (e) {
      // Issue numbers are written back after each create, so whatever succeeded
      // before this point is already recorded in the spec and will not duplicate.
      console.error(`\n✗ ${p.slug} failed partway through:\n  ${String(e.message).split("\n")[0]}`);
      console.error(`  Issues created before the failure are already linked in plans/${p.slug}.md.`);
      console.error(`  Fix the cause, then re-run — the plan will pick up where it stopped.`);
      process.exit(1);
    }
  }
}

const line = Object.entries(totals).filter(([k]) => k !== "OK").map(([k, v]) => `${k} ${v}`).join("  ") || "no changes";
console.log(`\ntotal: ${line}`);
if (!APPLY) console.log("\ndry run — nothing was written. Re-run with --apply to execute.");
if (conflicts) process.exit(1);
