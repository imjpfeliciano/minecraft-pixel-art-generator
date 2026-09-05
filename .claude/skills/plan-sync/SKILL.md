---
name: plan-sync
description: Reconcile plans/*.md spec frontmatter with GitHub Issues — create issues for new todos, update labels, close completed ones, and write issue numbers back into the spec. Idempotent. Use when a spec is added or edited, when issues changed on GitHub, or when asked to sync, push a plan to GitHub, or create issues from a plan.
allowed-tools: Read, Edit, Glob, Grep, Bash(pnpm pm:sync*), Bash(node scripts/pm/*), Bash(gh issue list*), Bash(gh issue view*), Bash(gh auth status*), Bash(git diff*), Bash(git status*)
disable-model-invocation: true
user-invocable: true
arguments: "[slug] [--apply] [--include-completed] [--prune]"
---

# plan-sync

Reconciles the work items in `plans/*.md` with GitHub Issues. `scripts/pm/sync.mjs` does the
deterministic work; your job is to interpret the plan it prints, catch anything that looks
wrong, and get the user's agreement before anything mutates.

## Non-negotiables

1. **Never pass `--apply` on the first run of a turn.** Always show the dry-run plan first.
2. **Never pass `--apply` without the user agreeing to that specific plan.** If they asked
   to "sync", that is a request to see the plan, not to execute it.
3. **Never edit `plans/*.md` by hand to fix a sync problem.** Use `pnpm pm:spec patch`, or
   fix the script. Hand-edits break the round-trip guarantees.
4. **Stop on `CONFLICT`.** Two issues sharing one key needs a human decision. The script
   already refuses to apply for that spec; surface it clearly rather than working around it.

## Procedure

1. **Preflight.** Run `gh auth status`. If unauthenticated, stop and tell the user to run
   `gh auth login -s repo,read:org,project`. If the `project` scope is missing, note that
   issue sync will work but the Projects board will not.

2. **Dry run.** `pnpm pm:sync` for all specs, or `pnpm pm:sync --slug <slug>` for one.

3. **Read the plan critically** before showing it. Specifically check:
   - Does the `CREATE` count match the number of genuinely open todos? A first sync of a
     spec whose todos are mostly `pending` but whose feature has visibly shipped means the
     spec has drifted — **stop and reconcile the spec against the code first.** This is the
     exact trap `landing-page.md` and `light-dark-mode.md` were in.
   - Any `ADOPT` line changes a spec file. Say so explicitly; the user may disagree.
   - Any `ORPHAN` means a todo was deleted or renamed. A rename shows up as one `ORPHAN`
     plus one `CREATE` with near-identical content in the same milestone — if you see that
     pattern, ask whether it was a rename before applying, and fix the marker instead.

4. **Summarize** the plan in prose: how many issues get created, closed, updated; which
   spec files will be written to. Then ask whether to apply.

5. **Apply** with `--apply` once agreed. Creating issues is throttled (~3s apart) to stay
   under GitHub's ~20-content-creations-per-minute secondary rate limit, so a large
   backfill takes minutes. That is expected — do not reduce `--delay` to speed it up.

6. **Show the write-back.** Run `git diff plans/` and confirm only `github:`/`issue:` and
   `status:` lines changed. **Never commit** — leave that to the user.

7. **Prove idempotency.** Re-run the dry run. It must report no changes. If it does not,
   something is wrong — investigate before declaring success.

## Flags

| Flag | Effect |
|---|---|
| `--apply` | Required for any mutation. Absent = dry run. |
| `--include-completed` | Also create-then-close issues for `completed` todos, for historical throughput on the board. Off by default because it is a large one-time burst. |
| `--prune` | Close orphaned issues as `not planned`. Off by default — orphans are only flagged. |
| `--delay <s>` | Seconds between issue creations. Default 3. Do not lower. |

## How linking works

Each todo has a stable key `<slug>/<milestone-id>/<todo-id>`, stored in two places so
either can rebuild the other:

- in the spec, as `github: { issue: N }` on the todo
- in the issue body, as a trailing `<!-- pm-sync:v1 key=... -->` comment

Lookup is by the `spec/<slug>` label plus `--state all`, **never** `gh issue list --search`
— GitHub's body-search index lags and a search-based lookup right after a create misses it,
producing duplicates on the next run.

**Authority rule:** the spec owns content (title, description, priority, area); GitHub owns
state (open/closed). So editing a todo's text updates the issue, and closing an issue
updates the spec.

## Todo ids are immutable

Renaming a todo `id` is indistinguishable from deleting one and adding another. If a rename
is genuinely needed, edit the marker comment in the issue body first, then rename in the
spec.
