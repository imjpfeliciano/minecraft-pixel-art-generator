/**
 * Spec file library — parse, index, and surgically patch plans/*.md frontmatter.
 *
 * The hard requirement here is round-trip fidelity. plans/socialization-platform.md
 * has a 186-line frontmatter block with folded scalars, a ~1000-char quoted string,
 * em-dashes, and deliberate blank lines between milestones. A parse-and-redump cycle
 * that reformats it produces an unreviewable diff, so every write goes through
 * `yaml`'s parseDocument/toString, which preserves comments, key order, blank lines
 * and scalar styles. (js-yaml cannot do this — it rewrites `>` to `|` and strips
 * quotes and blank lines. Do not substitute it.)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { parseDocument } from "yaml";

const FM_RE = /^---\n([\s\S]*?)\n---\n?/;

/** Statuses a todo or milestone may carry. The first two are the pre-existing values. */
export const TODO_STATUSES = ["pending", "completed", "in_progress", "blocked", "cancelled"];
export const SPEC_KINDS = ["plan", "reference"];
export const SPEC_STATUSES = ["draft", "active", "shipped", "archived"];
export const TODO_TYPES = ["feat", "fix", "chore", "docs", "refactor", "perf", "test"];
export const PRIORITIES = ["p0", "p1", "p2", "p3"];

/** Milestone id used when a spec uses the flat top-level `todos:` shape. */
export const IMPLICIT_MILESTONE = "main";

export function readSpec(path) {
  const raw = readFileSync(path, "utf8");
  const m = raw.match(FM_RE);
  if (!m) {
    return { path, raw, hasFrontmatter: false, doc: null, body: raw };
  }
  const doc = parseDocument(m[1]);
  return {
    path,
    raw,
    hasFrontmatter: true,
    frontmatterText: m[1],
    prefixLength: m[0].length,
    body: raw.slice(m[0].length),
    doc,
  };
}

/** Serialize a spec back to disk, preserving everything outside the edited nodes. */
export function writeSpec(spec) {
  if (!spec.hasFrontmatter) throw new Error(`${spec.path}: no frontmatter to write`);
  const fm = spec.doc.toString({ lineWidth: 0 }).replace(/\n$/, "");
  const next = `---\n${fm}\n---\n${spec.body}`;
  writeFileSync(spec.path, next, "utf8");
  return next;
}

/** Slug for a spec: explicit `slug:` key, else the filename. */
export function specSlug(spec) {
  return spec.doc?.get("slug") ?? basename(spec.path, ".md");
}

/**
 * Flatten a spec into work items.
 * Handles both shapes: `milestones: [{todos: []}]` and a flat top-level `todos: []`.
 * Returns [] for `kind: reference` docs — they are never synced.
 */
export function indexSpec(spec) {
  if (!spec.hasFrontmatter) return [];
  const doc = spec.doc;
  if (doc.get("kind") === "reference") return [];

  const slug = specSlug(spec);
  const items = [];

  const collect = (milestoneId, milestoneName, todosNode, msPath) => {
    if (!todosNode?.items) return;
    todosNode.items.forEach((t, i) => {
      const id = t.get("id");
      if (!id) return;
      items.push({
        key: `${slug}/${milestoneId}/${id}`,
        spec: slug,
        specPath: spec.path,
        milestone: milestoneId,
        milestoneName,
        id,
        content: t.get("content") ?? "",
        status: t.get("status") ?? "pending",
        type: t.get("type") ?? null,
        priority: t.get("priority") ?? doc.get("priority") ?? null,
        area: t.get("area") ?? doc.get("area") ?? slug,
        agent: t.get("agent") ?? null,
        issue: t.getIn(["github", "issue"]) ?? t.get("issue") ?? null,
        // yaml path for surgical patching
        path: [...msPath, "todos", i],
      });
    });
  };

  const milestones = doc.get("milestones");
  if (milestones?.items) {
    milestones.items.forEach((ms, mi) => {
      collect(ms.get("id"), ms.get("name") ?? ms.get("id"), ms.get("todos"), ["milestones", mi]);
    });
  } else {
    collect(IMPLICIT_MILESTONE, doc.get("name") ?? slug, doc.get("todos"), []);
  }
  return items;
}

/**
 * Set the issue number on one todo, addressed by its stable key.
 * Writes `github: { issue: N }` in flow style — a single added line.
 */
export function setTodoIssue(spec, key, issueNumber) {
  const item = indexSpec(spec).find((i) => i.key === key);
  if (!item) throw new Error(`${spec.path}: no todo with key ${key}`);
  spec.doc.setIn([...item.path, "github", "issue"], issueNumber);
  return spec;
}

/** Set a scalar field on one todo, addressed by its stable key. */
export function setTodoField(spec, key, field, value) {
  const item = indexSpec(spec).find((i) => i.key === key);
  if (!item) throw new Error(`${spec.path}: no todo with key ${key}`);
  spec.doc.setIn([...item.path, field], value);
  return spec;
}

/**
 * Guard against a writer that silently corrupts the file.
 * Re-parses the serialized output and asserts every todo key and content string
 * survived byte-identically. Call before any writeSpec that matters.
 */
export function assertIntact(spec, before) {
  const after = indexSpec(spec);
  if (after.length !== before.length) {
    throw new Error(`todo count changed: ${before.length} -> ${after.length}`);
  }
  for (let i = 0; i < before.length; i++) {
    if (before[i].key !== after[i].key) {
      throw new Error(`todo key changed: ${before[i].key} -> ${after[i].key}`);
    }
    if (before[i].content !== after[i].content) {
      throw new Error(`todo content changed for ${before[i].key}`);
    }
  }
  return true;
}

/** Structural validation. Returns an array of human-readable problems. */
export function validateSpec(spec) {
  const problems = [];
  const p = (m) => problems.push(`${basename(spec.path)}: ${m}`);

  if (!spec.hasFrontmatter) {
    p("no YAML frontmatter");
    return problems;
  }
  const doc = spec.doc;
  const kind = doc.get("kind");
  if (!kind) p("missing `kind:` (plan | reference)");
  else if (!SPEC_KINDS.includes(kind)) p(`invalid kind: ${kind}`);

  if (!doc.get("name")) p("missing `name:`");
  if (!doc.get("slug")) p("missing `slug:`");

  const status = doc.get("status");
  if (status && !SPEC_STATUSES.includes(status)) p(`invalid spec status: ${status}`);

  if (kind === "reference") return problems;

  const items = indexSpec(spec);
  if (items.length === 0) p("kind: plan but no todos found");

  const seen = new Set();
  for (const it of items) {
    if (seen.has(it.key)) p(`duplicate todo key: ${it.key}`);
    seen.add(it.key);
    if (!TODO_STATUSES.includes(it.status)) p(`${it.key}: invalid status "${it.status}"`);
    if (it.type && !TODO_TYPES.includes(it.type)) p(`${it.key}: invalid type "${it.type}"`);
    if (it.priority && !PRIORITIES.includes(it.priority)) p(`${it.key}: invalid priority "${it.priority}"`);
    if (!it.content) p(`${it.key}: empty content`);
  }
  return problems;
}
