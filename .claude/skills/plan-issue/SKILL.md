---
name: plan-issue
description: Research a GitHub issue and post an implementation plan as a comment for author review — including investigating libraries, tools and configuration where the issue needs a technology decision. Use when asked to plan, investigate, research, or scope an issue by number, before any code is written.
allowed-tools: Read, Glob, Grep, WebSearch, WebFetch, Agent, Bash(gh issue*), Bash(gh pr*), Bash(gh search*), Bash(git log*), Bash(git diff*), Bash(node scripts/pm/*), Bash(pnpm pm:*)
disable-model-invocation: true
user-invocable: true
arguments: "<issue-number> [--approve] [--promote]"
---

# plan-issue

Turns an issue into a reviewed, executable plan **before** anyone writes code. The plan is
posted as a comment on the issue so you review it where you already are, and `/fix-issue`
reads it back as its brief.

```
/plan-issue 24     →  research  →  plan posted, plan/proposed
   you review, comment, iterate
/plan-issue 24 --approve        →  plan/approved
/fix-issue 24                   →  agent implements against the approved plan
```

**Write nothing but the comment.** No code, no config, no dependencies, no files in the
repo. A plan that has already half-implemented itself cannot be rejected cleanly.

## 1. Understand the issue

```bash
gh issue view $ARGUMENTS --json number,title,body,labels,state,comments
```

Read every comment — constraints accumulate there. Note the `area/*` and `type/*` labels;
they tell you which part of `AGENTS.md` governs.

Then read the code the issue actually concerns. Trace the real path rather than trusting
the issue's description of it — issues routinely describe the symptom, not the cause.

## 2. Research, when there is a real decision

Not every issue needs this. A one-line fix needs a plan, not a literature review. But when
the issue turns on a technology or approach choice — a test runner, a library, a
config strategy — investigate properly and **show your work**, because the whole point is
that you review a recommendation rather than discover it in a diff.

Use `WebSearch` and `WebFetch` for current documentation. Your training data is stale on
fast-moving tooling; a version number you remember is a guess, so verify it. Check the
project's own constraints first — Next 16, React 19, Tailwind v4, ESM, pnpm, no CI — since
those eliminate options faster than any comparison table.

For a genuinely open comparison, spawn parallel research agents (one per candidate) and
synthesize. Give each the same evaluation criteria so the answers are comparable.

**What a useful recommendation contains:**
- the pick, stated plainly, in one sentence
- why it wins *for this repo* — not in general
- what it costs: setup burden, new dependencies, ongoing maintenance
- the strongest case for the runner-up, honestly put
- version numbers verified against current docs, with links
- anything that would change the answer later

Do not present three options and leave the choice to the reader. Recommend one and defend
it — the point of the review step is for you to disagree with a position, not to be handed
the decision back.

## 3. Write the plan

Post it as a comment:

```bash
gh issue comment <N> --body-file <plan.md>
gh issue edit <N> --add-label plan/proposed --remove-label plan/needed
```

Structure — adapt, don't pad. A small issue gets a short plan:

```markdown
<!-- plan:v1 -->
## Approach
One paragraph: what will be done and why this way.

## Decisions
Only when something was genuinely chosen. Pick, reasoning, cost, runner-up.

## Steps
Numbered, each independently verifiable, smallest shippable first.
Name concrete files. Say how to verify each one.

## Constraints
The AGENTS.md rules that bite here — the specific ones, not the whole file.

## Out of scope
What this deliberately does not do, and why.

## Open questions
Anything you could not resolve. Empty is fine; inventing certainty is not.
```

Keep the `<!-- plan:v1 -->` marker as the first line — `/fix-issue` uses it to find the
latest plan among the comments.

If the issue is large enough that the plan is really a design document, offer to promote it
into a `plans/*.md` spec with `--promote`, where it becomes tracked work that `pm:sync`
decomposes into its own issues.

## 4. Iterate

The author will comment. Revise by posting a **new** plan comment rather than editing the
old one — the disagreement and its resolution are worth keeping. `/fix-issue` reads the
newest marked comment.

## 5. Approve

`--approve` flips the label after you confirm the author actually approves:

```bash
gh issue edit <N> --add-label plan/approved --remove-label plan/proposed
```

Never self-approve a plan you just wrote in the same run. The review gate is the entire
point; approving your own work silently deletes it.

## Boundaries

- Recommend, don't decide, on anything with real cost — a new dependency, a schema change,
  a change to how the app is built or deployed. Put those to the author explicitly.
- If research is inconclusive, say so. "Both are viable, here's the tiebreaker I'd use" is
  a legitimate answer; false confidence is not.
- If the issue is too vague to plan, say what is missing instead of inventing scope.
