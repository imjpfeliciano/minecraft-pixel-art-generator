---
name: plan-status
description: Read-only project status — what is open, what is blocked, what is stale, and where the spec files disagree with GitHub. Use when asked for project status, progress, what to work on next, or the state of the roadmap.
allowed-tools: Read, Glob, Grep, Bash(pnpm pm:spec*), Bash(node scripts/pm/*), Bash(gh issue list*), Bash(gh pr list*), Bash(git log*)
user-invocable: true
---

# plan-status

A fast, read-only picture of the work. Mutates nothing — no `gh issue edit`, no writes to
`plans/`. If you find something that needs fixing, report it and point at `/plan-groom` or
`/plan-sync`; do not fix it here.

## Live context

Spec totals:
!`node scripts/pm/spec.mjs summary 2>/dev/null || echo "spec library unavailable"`

Open issues:
!`gh issue list --state open --limit 100 --json number,title,labels,updatedAt --jq '.[] | "#\(.number) [\(.labels|map(.name)|join(","))] \(.title)"' 2>/dev/null || echo "gh unavailable — run /plan-bootstrap"`

Recently merged:
!`gh pr list --state merged --limit 10 --json number,title,mergedAt --jq '.[] | "#\(.number) \(.title)"' 2>/dev/null || echo "-"`

## What to report

Lead with the answer, not the data. A useful status is three or four short sections:

1. **Where things stand** — open vs. done across all specs, and which spec is the active
   front. One or two sentences.
2. **Open work by area**, highest priority first. Group by `area/*`; within a group, order
   by `priority/*`. Name the issue numbers.
3. **Needs attention** — anything blocked (`status/blocked`), stale (open, untouched >21
   days), or untriaged (open, missing `area/*`, `type/*` or `priority/*`).
4. **Drift** — todos whose spec status disagrees with their issue state, and open issues
   carrying a `spec/*` label but no marker (human-authored, not tracked in a spec). This is
   the one thing GitHub's own UI cannot show, so it is the most valuable part of the report.

If the user asked "what should I work on next", answer with a short ranked list: highest
priority, unblocked, smallest first — and say why each one is next.

## Notes

- `gh` unavailable or unauthenticated is not an error to work around: say so plainly and
  report what the spec files alone can tell you.
- Do the arithmetic from `pm:spec summary`, not by counting issue lines by eye.
- For a shareable version of this, use `/plan-dashboard`.
