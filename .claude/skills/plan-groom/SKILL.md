---
name: plan-groom
description: Triage the issue backlog — find untriaged, stale, blocked, duplicate or orphaned issues, and flag specs whose frontmatter has drifted from issue state. Proposes fixes and applies them only on confirmation. Use when asked to groom, triage, or clean up the backlog.
allowed-tools: Read, Glob, Grep, Bash(pnpm pm:spec*), Bash(pnpm pm:sync*), Bash(node scripts/pm/*), Bash(gh issue list*), Bash(gh issue view*), Bash(gh issue edit*), Bash(gh issue comment*), Bash(gh pr list*)
user-invocable: true
context: fork
arguments: "[--area <area>] [--apply]"
---

# plan-groom

A triage pass over the backlog. Read-only by default.

## Boundaries

- **Never close an issue.** Closing is a human decision. Recommend it, with a reason.
- **Never edit `plans/*.md`.** Spec drift is reported here and fixed by `/plan-sync`,
  which has the round-trip-safe writer.
- With `--apply` you may add or remove labels and leave comments. Nothing else.

## Checks

Run each and report only what fires. An empty section is noise — omit it.

| Check | Query |
|---|---|
| **Untriaged** | open, missing any of `area/*`, `type/*`, `priority/*` |
| **Stale** | open, `updatedAt` older than 21 days |
| **Blocked** | carries `status/blocked` — report how long, and what it is waiting on |
| **Orphaned** | carries a `spec/*` label, has a `pm-sync` marker, but the key no longer exists in that spec |
| **Unlinked** | carries a `spec/*` label but no marker — human-authored, not tracked by any spec |
| **Drift** | spec says `completed` but the issue is open, or the issue is closed but the spec says `pending` |
| **Duplicates** | similar titles within one area |

For drift, `pnpm pm:sync` (dry run) already computes it — read its `ADOPT` and `CLOSE`
lines rather than recomputing by hand.

## Ranking what's next

When asked what to work on, rank by: priority descending, then unblocked, then smallest.
Say why each item is where it is. An item whose spec neighbours are all `completed` is
usually a better pick than an isolated one — finishing a milestone beats starting one.

## Output

A short report, grouped by check, with issue numbers. Then a single proposed action list.
Ask before applying anything. If `--apply` was passed, still show the list and confirm —
the flag permits the writes, it does not authorize them unseen.
