---
name: plan-dashboard
description: Generate and publish the shareable project dashboard as an Artifact — milestone progress, open work by area, blocked and stale items, spec-vs-GitHub drift, and recent PRs. Use when asked for the dashboard, a shareable status page, or to refresh/republish it.
allowed-tools: Read, Write, Glob, Bash(pnpm pm:snapshot*), Bash(node scripts/pm/*), Bash(gh issue list*), Bash(gh pr list*)
user-invocable: true
arguments: "[--markdown-only]"
---

# plan-dashboard

Publishes the readable view of project state. GitHub Projects stays the source of record;
this is a generated page, regenerated on demand.

## Procedure

1. **Collect.** Write the snapshot to the scratchpad — never into the repo working tree
   unless the user asks:

   ```
   node scripts/pm/snapshot.mjs --out <scratchpad>/pm-snapshot.json
   ```

   All the arithmetic is already done there. Read it; do not recount issues by hand.

2. **`--markdown-only`?** Print a digest in the terminal and stop. Use this for a quick
   check — it is much cheaper than a publish.

3. **Load the `artifact-design` skill** before writing the page. Then write the HTML to a
   file and publish it with the Artifact tool.

4. **Republish to the same URL.** `.claude/pm/state.json` holds `dashboardUrl` from the
   last publish. If it is set, pass it as the Artifact tool's `url` so the existing page
   updates instead of a second one appearing. If it is absent, publish fresh and then
   record the returned URL into `.claude/pm/state.json`.

5. **Report** the URL and a two-line summary of what changed since last time.

## What the page shows

Order matters — put the thing that GitHub cannot show first.

1. **KPI row** — open / done / total todos, % complete, issues closed in the last 14 days,
   snapshot timestamp and commit sha.
2. **Drift panel** — todos whose spec status disagrees with their issue state, orphans, and
   unlinked issues. **This is the dashboard's unique value**; GitHub's own UI cannot show
   it. If `drift` is empty, say so plainly rather than hiding the section.
3. **Per-spec progress** — a bar per spec, milestones broken out. Reference docs listed
   separately and not counted as work.
4. **Open work by area** — grouped, priority-ordered, linking to the issues.
5. **Needs attention** — blocked, and stale (open >21 days) with day counts.
6. **Recent merged PRs.**

## Constraints

- The snapshot is **inlined into the page** as a `const` at publish time. The page must not
  try to fetch GitHub at render time — it has no credentials, and the repo may go private.
- The page must render correctly in light and dark. Per `AGENTS.md`'s floating-element
  rule, use explicit colours rather than relying on inherited semantic tokens.
- Wide tables need their own `overflow-x: auto` container; the page body must never scroll
  horizontally.
- Keep the `<title>` stable across republishes — viewers find the tab by its name.
- If `ghAvailable` is false in the snapshot, the page must say the GitHub half is missing
  rather than rendering zeros as if they were real.
