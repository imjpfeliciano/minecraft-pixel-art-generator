---
name: fix-issue
description: Take a GitHub issue number, implement the fix in an isolated worktree, and open a PR. Use when asked to work on, fix, or implement an issue by number.
allowed-tools: Read, Glob, Grep, Agent(issue-implementer), Bash(gh issue*), Bash(gh pr*), Bash(gh project*), Bash(git status*), Bash(git log*), Bash(git fetch*), Bash(git branch*)
disable-model-invocation: true
user-invocable: true
arguments: "<issue-number>"
---

# fix-issue

Entry point for agent-assisted implementation. Your job is preconditions, dispatch, and
reporting — the `issue-implementer` agent does the actual work in an isolated worktree, so
the user's checkout is never disturbed.

## 1. Validate the issue

```bash
gh issue view $ARGUMENTS --json number,title,body,state,labels,assignees,comments
```

Refuse to proceed, and say why, if:

- **The issue is closed.** Ask whether they meant a different number.
- **It carries `agent/needs-human`.** That label exists specifically to say "do not dispatch
  this." Do not override it because the change looks easy.
- **It carries `agent/in-flight`.** Another run may be working it right now. Check for an
  open PR referencing the issue before assuming the label is stale; if it is stale, say so
  and confirm before clearing it.
- **It is too vague to implement.** No reproduction, no acceptance criteria, and no
  identifiable code path means the first useful step is grooming, not coding. Say what is
  missing rather than guessing at intent.

**Surface an unresolved design decision before dispatching.** Some issues deliberately
present two approaches without picking one — implementing the wrong half wastes the run.
If the body reads "pick one" or lays out a trade-off with no verdict, put the choice to the
user with `AskUserQuestion` and pass their answer to the agent. Do not let the agent choose.

## 1b. Pick up an approved plan

Check the labels for the plan lifecycle:

| Label | What to do |
|---|---|
| `plan/approved` | Find the newest comment starting `<!-- plan:v1 -->` and pass it to the agent **verbatim** as the brief. It is the decided approach — the agent follows it, it does not re-litigate it. |
| `plan/proposed` | A plan exists but has **not** been approved. Stop. Tell the user it is awaiting their review and point them at `/plan-issue <N> --approve`. |
| `plan/needed` | Stop. Run `/plan-issue <N>` first. |
| none of these | Proceed only if the issue is genuinely self-contained. If it turns on a technology or design choice, recommend `/plan-issue <N>` instead of guessing. |

If the plan has **Open questions** that are still unanswered, resolve them with the user
before dispatching rather than letting the agent improvise.

If the agent finds mid-run that the plan is wrong, it should stop and report — not
improvise a different approach. A plan that turned out to be wrong is useful information
and belongs back in review.

## 2. Check the base is clean

```bash
git status --porcelain     # must be empty
git fetch origin && git log --oneline main..origin/main   # must be empty
```

Uncommitted work means the worktree branches from a dirty base and the PR will carry
unrelated changes. Stop and ask the user to commit or stash. If `main` is behind, offer to
pull first.

## 3. Dispatch

Spawn the `issue-implementer` agent with `subagent_type: "issue-implementer"`. It is
configured with `isolation: worktree`, so it gets its own checkout automatically.

Give it: the issue number, the full issue body and comments you already fetched, the
resolved design decision if there was one, and the branch name to use. Do not re-summarize
the issue in your own words — pass it through, so nothing is lost in paraphrase.

Mark the lock before dispatching, and clear it when the run ends either way:
```bash
gh issue edit <N> --add-label agent/in-flight
```

Run it in the background unless the user is waiting on the result to do something else.

## 4. Report

When the agent returns, give the user:

- the PR link and branch name
- what changed, in a sentence or two
- the verification results (`typecheck`, `lint`, `check:i18n`) — quote failures verbatim
- **anything the agent flagged as uncertain**, prominently

Then clean up:
```bash
gh issue edit <N> --remove-label agent/in-flight
gh issue edit <N> --add-label status/in-progress
```
Leave the issue **open** — the PR closes it on merge via `Closes #N`.

If the run failed or came back partial, say exactly where it stopped. Do not re-dispatch
automatically; the same prompt will usually fail the same way.

## Boundaries

- **Never merge the PR.** It opens ready for review, not as a draft — but "ready for
  review" means ready for a human to review it, never a licence to merge it.
- **Never push to `main`.**
- **Never mark the issue completed in `plans/`.** That happens through `pnpm pm:sync` after
  the PR merges and the issue actually closes.
- If the issue turns out to belong to a spec, mention that the fix may warrant a todo
  update — but let `/plan-sync` handle the reconciliation.
