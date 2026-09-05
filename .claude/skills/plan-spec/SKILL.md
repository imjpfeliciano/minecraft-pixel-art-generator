---
name: plan-spec
description: Write a new feature spec in plans/, or normalize an existing one to the canonical frontmatter schema. Use when the user describes a feature to build, asks for a plan or spec document, asks to add todos to an existing plan, or when a spec fails validation. Does not touch GitHub.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(pnpm pm:spec*), Bash(node scripts/pm/*), Bash(git log*), Bash(git diff*)
user-invocable: true
arguments: "[slug] [--normalize]"
---

# plan-spec

Authors and repairs the spec files in `plans/`. Writes only to `plans/`. Never calls `gh` —
turning a spec into issues is `/plan-sync`'s job.

## The schema

```yaml
---
name: Socialization Platform      # human title
slug: socialization-platform      # MUST equal the filename without .md
kind: plan                        # plan | reference
status: active                    # draft | active | shipped | archived
area: social                      # default area for todos; see label list below
priority: p1                      # default priority for todos
overview: "One paragraph: what this delivers and why."
milestones:                       # optional — omit for a flat todo list
  - id: m6
    name: "M6 · Hardening"
    status: pending               # pending | in_progress | blocked | completed | cancelled
    deliverable: "What is true when this milestone is done."
    todos:
      - id: clerk-webhooks        # stable, kebab-case, IMMUTABLE
        content: "Imperative. Names at least one concrete path or route."
        status: pending
        type: feat                # feat | fix | chore | docs | refactor | perf | test
        priority: p1              # p0 | p1 | p2 | p3
        github: { issue: 42 }     # written by pm:sync — never by hand
        agent: unassigned         # phase-2 seam; nothing reads it yet
---
```

A spec may instead use a flat top-level `todos:` list with no `milestones:` — that is
treated as a single implicit milestone with id `main`. Both shapes are supported
permanently; don't convert one to the other.

`kind: reference` marks a document as architecture/reference material rather than backlog.
`pm:sync` skips it entirely. `plans/analytics.md` and `plans/i18n.md` are the examples.

Valid areas: `editor landing gallery social auth api data ui theme i18n seo analytics 3d
infra docs`.

## Writing good todos

Match the granularity already used in `plans/socialization-platform.md` — that file is the
style exemplar. Read it before writing a new spec.

- One todo ≈ one file or one coherent change.
- Phrase imperatively and **name at least one concrete path or route**. "Create
  `app/_lib/server/identity.ts` — resolveUser() email-reconciliation flow" is right;
  "handle identity" is not.
- Ids are immutable. `pm:sync` cannot distinguish a rename from a delete-plus-create, so
  before inventing an id check it has never been used: `git log -S"id: <candidate>" -- plans/<slug>.md`.

Per `AGENTS.md`, append the cross-cutting todos when a milestone warrants them — this
pattern already exists in the socialization spec and should be carried forward:

- adds or changes UI → an `i18n-<milestone>` todo covering **both** `messages/en.json` and
  `messages/es.json`
- adds a public route → an SEO todo covering the `metadata` export and `app/sitemap.ts`

## Procedure

1. Resolve the target. `--normalize` loads an existing file; otherwise create
   `plans/<slug>.md` with `slug` matching the filename.
2. Read `AGENTS.md` first, so generated todos respect the project's real constraints
   (next-intl is client-only, Firebase is server-only, base-ui has no `asChild`, floating
   elements need explicit background colors, every page needs `metadata`).
3. Draft the frontmatter, then the prose body. The body carries the design; the frontmatter
   carries the trackable work.
4. Validate: `pnpm pm:spec validate plans/<slug>.md`. Fix everything it reports.
5. Show `git diff` and stop. Do not sync, do not commit.

## Normalizing an existing spec

When repairing a file that already has `github:` issue links, the round-trip must not
disturb anything else. Prefer `pnpm pm:spec patch` for field changes. If you must edit by
hand, re-run `pnpm pm:spec validate` afterwards and check `git diff` shows only the lines
you meant to touch — the frontmatter in `socialization-platform.md` is 190+ lines and a
careless rewrite is unreviewable.

**Do not flip a todo's `status` to `completed` without checking the code actually does the
thing.** Two specs in this repo drifted that way for months.
