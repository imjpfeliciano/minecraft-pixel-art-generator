#!/usr/bin/env node
/**
 * pm:bootstrap — one-time GitHub substrate setup. Idempotent; safe to re-run.
 *
 *   node scripts/pm/bootstrap.mjs --check          Report what exists vs. what's missing.
 *   node scripts/pm/bootstrap.mjs --labels         Create/update the label taxonomy.
 *   node scripts/pm/bootstrap.mjs --project        Create the Projects v2 board + fields.
 *   node scripts/pm/bootstrap.mjs --all            Labels then project.
 *
 * Areas are derived from the repo's actual Conventional Commit scopes and app/
 * structure, not invented.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`) || argv.includes("--all");
const CHECK = argv.includes("--check");
const STATE_PATH = ".claude/pm/state.json";

const LABELS = [
  // area/* — what part of the product
  ["area/editor",     "0E8A16", "Pixel art editor at /create"],
  ["area/landing",    "0E8A16", "Landing page and marketing surfaces"],
  ["area/gallery",    "0E8A16", "Public gallery, creation detail, profiles"],
  ["area/social",     "0E8A16", "Socialization platform: identity, creations, sharing"],
  ["area/auth",       "0E8A16", "Clerk, identity, onboarding"],
  ["area/api",        "0E8A16", "Route handlers under app/api"],
  ["area/data",       "0E8A16", "Firestore, Storage, rules, admin SDK"],
  ["area/ui",         "0E8A16", "shadcn/base-ui components"],
  ["area/theme",      "0E8A16", "Light/dark theming"],
  ["area/i18n",       "0E8A16", "next-intl, messages/en.json, messages/es.json"],
  ["area/seo",        "0E8A16", "metadata, sitemap, robots, JSON-LD"],
  ["area/analytics",  "0E8A16", "Vercel Analytics events"],
  ["area/3d",         "0E8A16", "three.js / react-three-fiber viewer"],
  ["area/infra",      "0E8A16", "build, config, scripts, deploy"],
  ["area/docs",       "0E8A16", "specs, reference docs, AGENTS.md"],
  // type/* — mirrors the Conventional Commit types already in use
  ["type/feat",       "1D76DB", "New feature or enhancement"],
  ["type/fix",        "D93F0B", "Bug fix"],
  ["type/chore",      "C5DEF5", "Maintenance"],
  ["type/docs",       "C5DEF5", "Documentation"],
  ["type/refactor",   "C5DEF5", "No behaviour change"],
  ["type/perf",       "C5DEF5", "Performance"],
  ["type/test",       "C5DEF5", "Tests and verification"],
  // priority/*
  ["priority/p0",     "B60205", "Drop everything"],
  ["priority/p1",     "D93F0B", "This cycle"],
  ["priority/p2",     "FBCA04", "Next cycle"],
  ["priority/p3",     "EEEEEE", "Someday"],
  // status/* — only states not expressible as open/closed
  ["status/blocked",      "000000", "Waiting on a dependency or decision"],
  ["status/in-progress",  "0052CC", "Actively being worked"],
  ["status/needs-triage", "E99695", "Untriaged — groom me"],
  ["status/needs-spec",   "E99695", "Needs a spec before work can start"],
  // agent/* — dispatch control for /fix-issue
  ["agent/ready",       "5319E7", "Self-contained enough to hand to an AI agent unattended"],
  ["agent/needs-human", "5319E7", "Explicitly do NOT dispatch to an agent"],
  ["agent/in-flight",   "5319E7", "An agent is currently working this"],
  // plan/* — the research-and-approve lifecycle that runs before implementation
  ["plan/needed",       "BFD4F2", "Needs an implementation plan before any code is written"],
  ["plan/proposed",     "BFD4F2", "A plan has been posted as a comment, awaiting author review"],
  ["plan/approved",     "0E8A16", "Plan reviewed and approved — /fix-issue will follow it"],
];

// spec/* labels are created on demand by pm:sync, one per spec file.

function gh(args, { allowFail = false } = {}) {
  try {
    return execFileSync("gh", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  } catch (e) {
    if (allowFail) return null;
    throw new Error(`gh ${args.join(" ")}\n${e.stderr || e.message}`);
  }
}
const ghJson = (a, o) => { const r = gh(a, o); return r == null ? null : JSON.parse(r); };

function loadState() {
  if (!existsSync(STATE_PATH)) return {};
  try { return JSON.parse(readFileSync(STATE_PATH, "utf8")); } catch { return {}; }
}
function saveState(s) {
  mkdirSync(".claude/pm", { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(s, null, 2) + "\n", "utf8");
}

// ── preflight ───────────────────────────────────────────────────────────────
const status = gh(["auth", "status"], { allowFail: true });
if (status == null) {
  console.error("✗ gh not authenticated. Run:  gh auth login -s repo,read:org,project");
  process.exit(1);
}
const hasProjectScope = /\bproject\b/.test(status);
const repo = ghJson(["repo", "view", "--json", "nameWithOwner,owner,hasIssuesEnabled"]);
const owner = repo.owner.login;

console.log(`repo:  ${repo.nameWithOwner}`);
console.log(`issues enabled: ${repo.hasIssuesEnabled ? "yes" : "NO — enable in repo settings"}`);
console.log(`project scope:  ${hasProjectScope ? "yes" : "NO — gh auth refresh -h github.com -s project"}`);

if (CHECK) {
  const existing = new Set((ghJson(["label", "list", "--limit", "200", "--json", "name"]) ?? []).map((l) => l.name));
  const missing = LABELS.filter(([n]) => !existing.has(n)).map(([n]) => n);
  console.log(`\nlabels: ${LABELS.length - missing.length}/${LABELS.length} present`);
  if (missing.length) console.log(`  missing: ${missing.join(", ")}`);
  const st = loadState();
  console.log(`project: ${st.projectNumber ? `#${st.projectNumber}` : "not created"}`);
  console.log(`dashboard artifact: ${st.dashboardUrl ?? "not published"}`);
  process.exit(0);
}

// ── labels ──────────────────────────────────────────────────────────────────
if (has("labels")) {
  console.log(`\ncreating ${LABELS.length} labels…`);
  let made = 0;
  for (const [name, color, desc] of LABELS) {
    gh(["label", "create", name, "--color", color, "--description", desc, "--force"]);
    made++;
  }
  console.log(`✓ ${made} labels created/updated`);
}

// ── project ─────────────────────────────────────────────────────────────────
if (has("project")) {
  if (!hasProjectScope) {
    console.error("✗ cannot create the project: token lacks the `project` scope.");
    console.error("  gh auth refresh -h github.com -s project");
    process.exit(1);
  }
  const state = loadState();
  let number = state.projectNumber;

  if (!number) {
    const list = ghJson(["project", "list", "--owner", owner, "--format", "json"]);
    const found = list.projects?.find((p) => p.title === "MC Pixel Art — Roadmap");
    if (found) {
      number = found.number;
      console.log(`\nreusing existing project #${number}`);
    } else {
      const created = ghJson(["project", "create", "--owner", owner, "--title", "MC Pixel Art — Roadmap", "--format", "json"]);
      number = created.number;
      console.log(`\n✓ created project #${number}`);
    }
  } else {
    console.log(`\nproject #${number} already recorded`);
  }

  const fields = ghJson(["project", "field-list", String(number), "--owner", owner, "--format", "json"]);
  const have = new Set((fields.fields ?? []).map((f) => f.name));

  const WANT = [
    ["Area", "SINGLE_SELECT", "editor,landing,gallery,social,auth,api,data,ui,theme,i18n,seo,analytics,3d,infra,docs"],
    ["Priority", "SINGLE_SELECT", "P0,P1,P2,P3"],
    ["Size", "SINGLE_SELECT", "S,M,L"],
    ["Spec", "TEXT", null],
    ["Milestone", "TEXT", null],
    // phase-2 seam: nothing reads this yet
    ["Agent", "SINGLE_SELECT", "unassigned,human,claude"],
  ];
  for (const [name, type, opts] of WANT) {
    if (have.has(name)) { console.log(`  = field ${name} exists`); continue; }
    const a = ["project", "field-create", String(number), "--owner", owner, "--name", name, "--data-type", type];
    if (opts) a.push("--single-select-options", opts);
    gh(a);
    console.log(`  + field ${name}`);
  }

  const after = ghJson(["project", "field-list", String(number), "--owner", owner, "--format", "json"]);
  saveState({ ...state, owner, repo: repo.nameWithOwner, projectNumber: number, fields: after.fields });
  console.log(`✓ project state written to ${STATE_PATH}`);

  console.log(`
── manual steps (no CLI or public API exists for these) ──
  https://github.com/users/${owner}/projects/${number}/settings

  1. Workflows → enable "Auto-add to project"  (filter: is:issue is:open)
     This removes item-add from the sync path entirely — do it first.
  2. Workflows → enable "Item closed → Status: Done"
  3. Views → add a Board grouped by Status and a Table grouped by Area
  4. Settings → link this project to the ${repo.nameWithOwner} repository
  5. Optional: add a "Blocked" option to the built-in Status field
`);
}

if (!has("labels") && !has("project")) {
  console.log("\nnothing to do — pass --labels, --project, --all, or --check");
}
