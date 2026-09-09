<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Node & Package Manager

- Always use the Node version specified in `.nvmrc` (currently `v24.16.0`). Run `nvm use` before executing any Node commands.
- Use **pnpm** to install dependencies. Never use `npm install` or `yarn`.

## Stack Overview

| Concern | Library / Service | Notes |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) | `proxy.ts` replaces `middleware.ts` |
| Auth | Clerk v7 (`@clerk/nextjs`) | `<ClerkProvider afterSignOutUrl="/">` in root layout |
| Database | Firebase Firestore (Admin SDK only) | `app/_lib/server/firebase-admin.ts` — `getDb()` / `getBucket()` |
| Storage | Firebase Storage (Admin SDK only) | same singleton as above |
| UI components | shadcn/ui (base-ui primitives) | components live in `app/_components/ui/` |
| Styling | Tailwind CSS v4 | config is `app/globals.css` — no `tailwind.config.*` file |
| i18n | next-intl **client-only** | see section below |
| Theming | Custom `ThemeProvider` (client) | preference stored in `localStorage` + cookie |
| State | React Context (local) / Zustand (cross-component) | |

---

## i18n — client-only setup (critical)

`next-intl` is configured **without a server config file**. Translations are loaded entirely on the client through `I18nProvider` (`app/_components/I18nProvider.tsx`), which wraps the tree in `<NextIntlClientProvider>`.

**Rules that follow from this:**

- ✅ `useTranslations("Namespace")` — works in any `"use client"` component.
- ❌ `getTranslations("Namespace")` from `next-intl/server` — **always fails** at runtime ("Couldn't find next-intl config file"). Never use it.
- ❌ `getLocale()`, `setRequestLocale()`, or any other `next-intl/server` import — same failure.

**Every user-facing string must be translated (critical):**

Never hardcode a user-visible string in JSX. Every label, button, heading, placeholder, tooltip, error message, and empty state must have a key in **both** `messages/en.json` and `messages/es.json` and be rendered via `t("key")`.

```tsx
// ❌ Hardcoded — breaks Spanish locale
<button>Sign in</button>
<p>Browse pixel art schematics — download as .litematic files.</p>

// ✅ Translated
<button>{t("signIn")}</button>
<p>{t("subheading")}</p>
```

Adding a key checklist:
1. Add the key to `messages/en.json` under the relevant namespace.
2. Add the translated key to `messages/es.json` under the same namespace. Never copy the English value as a placeholder — write the actual Spanish translation.
3. Use `t("key")` in the component. If the component is a server component, extract the JSX into a `"use client"` child (see pattern below).

**Pattern for server pages that need translated UI:**

Server components handle auth, data-fetching, and redirects. Translated content lives in a separate `"use client"` child:

```
app/(authenticated)/dashboard/
├── page.tsx            ← server component: resolveUser() + redirects only
└── DashboardEmptyState.tsx  ← "use client": useTranslations("Dashboard") + JSX
```

```tsx
// page.tsx (server)
import DashboardContent from "./DashboardContent";
export default async function Page() {
  const user = await resolveUser();
  if (!user) redirect("/sign-in");
  return <DashboardContent />;
}

// DashboardContent.tsx (client)
"use client";
import { useTranslations } from "next-intl";
export default function DashboardContent() {
  const t = useTranslations("Dashboard");
  return <h1>{t("title")}</h1>;
}
```

---

## Theming

- The theme preference (`light` | `dark` | `system`) is persisted in **localStorage** and in a **cookie** (`theme-preference`) so the server can apply the `dark` class to `<html>` before paint.
- `ThemeProvider` (`app/_components/ThemeProvider.tsx`) is `"use client"` and writes both on every preference change.
- The root layout (`app/layout.tsx`) reads the cookie server-side to set `className` on `<html>`, eliminating flash of unstyled content.
- **Never** add an inline `<script>` anti-flash hack — the cookie approach handles it.

---

## Firebase — server-only

All Firestore and Storage access goes through **server-side Route Handlers** using the Admin SDK. The browser never talks to Firebase directly.

- Singleton: `app/_lib/server/firebase-admin.ts` exports `getDb()` and `getBucket()`.
- Both are lazy-initialized and cached on `globalThis` to survive Next.js HMR restarts in dev.
- Always import from this file; never call `initializeApp` elsewhere.
- Marked `server-only` — importing in a client component is a build error.

---

## Clerk — key conventions

- `proxy.ts` (not `middleware.ts`) runs `clerkMiddleware()`. Next.js 16 renamed the file.
- `createRouteMatcher` is **deprecated** in Clerk v7. Do not use it. Protect routes by calling `auth()` directly inside the page or layout:
  ```ts
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  ```
- `afterSignOutUrl` belongs on `<ClerkProvider>`, not on `<UserButton>`.
- Clerk user IDs are **not portable** between dev and prod instances. All domain data uses an internal `userId` (`usr_…` nanoid). See `app/_lib/server/identity.ts`.
- `currentUser()` and `createClerkClient({ secretKey })` work server-side. `useUser()` and `useClerk()` work client-side.

---

## shadcn/ui — base-ui primitives (not Radix)

Components in `app/_components/ui/` are built on **`@base-ui/react`**, not Radix UI. The APIs differ in two important ways:

- **No `asChild` prop.** Use the `render` prop instead to replace the default element:
  ```tsx
  // ❌ Radix pattern — does not work
  <DropdownMenuTrigger asChild><button /></DropdownMenuTrigger>

  // ✅ base-ui pattern
  <DropdownMenuTrigger render={<button className="..." />}>...</DropdownMenuTrigger>
  ```
- **Hover states use `hover:` utilities**, not `focus:` — base-ui does not forward `:focus` to item elements in the same way Radix does. Always add `hover:bg-*` classes alongside `focus:bg-*` on interactive items.
- `img.clerk.com` and Firebase Storage hosts must be listed in `next.config.ts` `images.remotePatterns` before `next/image` will serve them.

### Floating elements must have explicit background colors (critical)

Tailwind CSS v4 semantic tokens (`bg-popover`, `bg-background`, `bg-muted`, `text-popover-foreground`, etc.) are **not reliably resolved** in floating/portal-rendered elements (dropdowns, dialogs, tooltips, popovers, sheets). These components render outside the normal component tree and may not inherit the CSS variable scope correctly.

**Rule: always use concrete Tailwind utilities on every floating element:**

```tsx
// ❌ Semantic tokens — renders transparent in portal context
className="bg-popover text-popover-foreground ring-1 ring-foreground/10"

// ✅ Explicit colors — always opaque and theme-aware
className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 shadow-xl ring-1 ring-gray-200 dark:ring-zinc-700"
```

This applies to **all** components in `app/_components/ui/` that use a portal or fixed positioning:
- `DropdownMenuContent` → `bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-gray-200 dark:ring-zinc-700`
- `DialogContent` (`DialogPrimitive.Popup`) → same pattern
- Any future `TooltipContent`, `PopoverContent`, `SheetContent`, `SelectContent`, etc.

The footer/secondary surfaces inside floating elements (`DialogFooter`, section dividers) must also avoid `bg-muted` — use `bg-gray-50 dark:bg-zinc-800/60` or similar.

---

## State Management

- For **local or short-lived state**, use the React Context API.
- For **state shared across multiple unrelated components**, prefer **Zustand**.

---

## Styling

- Use **Tailwind CSS v4** for all component styling. Do not introduce other CSS-in-JS solutions or plain CSS files unless absolutely necessary.
- Design tokens (colors, radii) live in `app/globals.css` under `@theme inline` and `:root` / `.dark`.
- `--color-accent` and `--color-accent-foreground` are defined and required for shadcn hover states.

---

## Component Design

- Focus on **separation of concerns**: keep components small, focused, and reusable.
- When a component has different behaviors or appearances, implement them as **variants** rather than branching logic inside a single component.
- Always check for an existing **shadcn/ui** component before building a new one from scratch. Prefer shadcn/ui components whenever they cover the use case.

---

## SEO

SEO is a first-class concern. Consult [`plans/seo.md`](plans/seo.md) for the full strategy. Every change should respect these rules:

- Every page **must** export a `metadata` object (Next.js Metadata API) with a meaningful `title` and `description`.
- The root layout must always define `metadataBase`, `openGraph`, and `twitter` fields.
- Never remove or weaken existing `robots`, `sitemap`, or JSON-LD structured data.
- New public-facing routes must be added to `app/sitemap.ts`.
- Images used as hero or OG assets must include descriptive `alt` text and the `priority` prop when above the fold.
- Do not introduce `noindex` on pages that should rank (landing page, any future gallery/creation detail pages).
- `metadata` must be exported from a **server component**. If a page's root component is `"use client"`, wrap it: keep a thin server component as `page.tsx` and render the client component as a child.

---

## Project management

Planned work lives in `plans/*.md` and is synced to GitHub Issues. The pipeline:

```
plans/<slug>.md  →  GitHub Issues  →  Projects v2 board  →  dashboard Artifact
```

**Authority rule:** the spec owns *content* (title, description, priority, area); GitHub owns *state* (open/closed). Editing a todo updates its issue; closing an issue updates the spec.

### Spec files

Each file carries YAML frontmatter with a `kind:`:

- `kind: plan` — trackable work. Todos sync to issues.
- `kind: reference` — architecture and reference docs (`analytics.md`, `i18n.md`). Never synced.

A spec uses either `milestones:` (each with nested `todos:`) or a flat top-level `todos:` list. Both shapes are permanently supported; a flat list is treated as one implicit milestone named `main`. See `/plan-spec` for the full schema.

Every todo needs a stable kebab-case `id`. **Ids are immutable** — sync cannot distinguish a rename from a delete-plus-create.

### Skills

| Skill | Use |
|---|---|
| `/plan-bootstrap` | One-time: gh auth, labels, Projects board. |
| `/plan-spec` | Write a new spec or normalize an existing one. |
| `/plan-sync` | Reconcile specs ↔ Issues. Dry run by default. |
| `/plan-status` | Read-only terminal status report. |
| `/plan-groom` | Backlog triage — stale, blocked, untriaged, drift. |
| `/plan-dashboard` | Publish the shareable dashboard Artifact. |
| `/plan-issue <n>` | Research an issue and post an implementation plan for your review. |
| `/fix-issue <n>` | Implement an issue in an isolated worktree and open a PR. |

Underlying scripts (`scripts/pm/`) do the deterministic work and can be run directly:

```bash
pnpm pm:spec validate      # structural check of every spec
pnpm pm:spec summary       # todo counts per spec
pnpm pm:sync               # dry run — writes nothing
pnpm pm:sync --apply       # execute
pnpm pm:project --apply    # put issues on the board, set Area/Priority/Spec from labels
pnpm pm:snapshot           # JSON view of project state
```

### Verification gates

Every change — human or agent — must pass all four before commit:

```bash
pnpm typecheck             # tsc --noEmit — must be zero
pnpm test                  # vitest run — unit tests for the pure libraries
pnpm check:i18n            # en/es key parity + untranslated-placeholder detection
pnpm check:lint            # eslint — zero errors, zero warnings (alias for `pnpm lint`)
```

`check:i18n` enforces the translation rules above mechanically. Values legitimately identical in both locales are allowlisted in `scripts/pm/check-i18n.mjs` — add to that list with a justification rather than letting the warning become background noise.

These same four gates also run in CI — `.github/workflows/test.yml`, on every pull request (drafts included) and on every push to `main`. The job is named **`gates`** and is a required status check on `main`, so a red run blocks the merge button. That name is a public contract: renaming the job leaves branch protection waiting on a check that never reports, which blocks every PR until the ruleset is updated to match. Each gate step runs even if an earlier one failed, so one run reports all four verdicts rather than only the first. `pnpm test:e2e` is deliberately **not** in the workflow — it needs Clerk keys as repo secrets and a browser download, which is #29's job, not this one's.

`check:lint` is now just an alias for `pnpm lint` (`eslint --max-warnings 0`). It used to be a per-file ratchet against `.claude/pm/lint-baseline.json`, because `main` carried 17 pre-existing eslint errors and a zero-error gate would have blocked every change. That backlog was cleared in #23, so the ratchet, its baseline and `scripts/pm/check-lint.mjs` are gone — a green tree needs a plain gate, not a high-water mark. **Warnings fail the gate too**, deliberately: the backlog started as warnings nobody had to look at.

### Tests

| Command | Scope |
|---|---|
| `pnpm test` | Vitest, run-once. Unit tests for the pure libraries. Part of the gate list above. |
| `pnpm test:watch` | Same suite in watch mode, for while you work. |
| `pnpm test:e2e` | Playwright. The create flow in a real browser. **Not** in the gate list — see below. |
| `pnpm test:e2e:ui` | The same specs in Playwright's UI mode, for debugging one of them. |

Unit tests are **co-located** with the module they cover (`app/_lib/nbt.test.ts` next to
`app/_lib/nbt.ts`) and picked up by `app/**/*.test.ts`. `_lib` is a private App Router
folder, so nothing there is routable.

Vitest runs in the **node** environment with no plugins — no jsdom, no React Testing
Library, no `@vitejs/plugin-react`. That is deliberate: the unit scope is pure functions
only. Anything that needs a real canvas, `OffscreenCanvas`, three.js, or a blob download
belongs in an E2E test against a real browser, because mocking that surface in jsdom means
testing the mocks.

`globals` is off — import `{ describe, it, expect }` from `vitest` explicitly. This keeps
`tsconfig.json` untouched, which matters because its `include` is repo-wide.

What is covered today:

- **`creation-grid.ts`** — `encodeGrid`/`decodeGrid` round-trip, palette dedup, row-major
  indexing, unknown-block fallback.
- **`color-matcher.ts`** — sRGB→CIELAB conversion, nearest-block matching, and that a
  restricted palette is actually respected rather than falling back to the global best.
- **`nbt.ts`** — byte-level encoder contract: big-endian integers, UTF-8 string length
  prefixes, `TAG_End` as the element type of an empty list, compound nesting.
- **`litematic-generator.ts`** — the shipped file format. Output is parsed back with
  **`prismarine-nbt`**, an independent NBT implementation, rather than a hand-rolled
  decoder that would share `nbt.ts`'s assumptions and pass on a malformed file. Covers
  both orientations, the vertical Y-inversion, foundation layers, and the spanning
  `LitematicaBitArray` packing against hand-computed values.

Two things to know before adding to these:

- **`generateLitematic` is not byte-deterministic** — it stamps `Date.now()` into
  `Metadata.TimeCreated`/`TimeModified`. Never snapshot the gzip output; assert
  structurally, or pin the clock with `vi.setSystemTime()`.
- **Do not verify an encoder with a decoder that mirrors it.** A reader written from the
  same mental model as the writer agrees with the writer's bugs. Either hand-compute the
  expected bytes or parse with a third-party implementation.

#### E2E (`e2e/`)

`pnpm test:e2e` covers the create flow end to end: upload → configure → generate →
undo → download, plus `?creation=` hydration, the 3D viewer mount, and light/dark
layout at 1280px. First run needs the browser binary:

```bash
pnpm exec playwright install chromium
```

**`pnpm test:e2e` requires a populated `.env.local`, so it is deliberately *not* in
the gate list.** `proxy.ts` runs `clerkMiddleware()` and the root layout mounts
`<ClerkProvider>`, so the app will not boot without Clerk keys even though `/create`
is public. `pnpm test` does run from a clean checkout; `pnpm test:e2e` does not. When
CI arrives it will need the Clerk keys as repo secrets.

Tests run against `pnpm build && pnpm start`, not `next dev`. Dev-mode React Strict
Mode double-invokes effects, which makes the hydration test (it races two fetches)
flakier than it needs to be. Chromium only — none of the assertions are
cross-browser claims.

Conventions:

- **Selectors:** accessible roles and labels wherever the markup offers them;
  `data-testid` only for containers with no semantic identity (`pixel-art-canvas`,
  `preview-panel`, `materials-panel`, `action-bar`, `viewer-3d`). If a control has no
  accessible name, the fix is an `aria-label` — that is a real defect, not a test
  inconvenience — which also means a translated key in **both** locales.
- **English copy is deterministic.** `DEFAULT_LOCALE` is `"en"` and the locale is read
  only from `localStorage`, so a fresh browser context is always English.
- **Nothing touches Firebase.** The `?creation=` endpoints read Firestore and Storage
  server-side, so both are stubbed with `page.route()` against committed fixtures.
- **Fixtures are committed, not generated at run time.** `scripts/make-e2e-fixtures.mjs`
  regenerates `e2e/fixtures/`; the suite must not depend on the very code it tests.
  `quadrants.png` is 16×16 with four solid quadrants, so generating at 2×2 produces a
  known set of blocks rather than an approximate one.
- **Undo is driven through the materials panel's Replace flow**, not by painting on the
  canvas. Both push the same undo stack, but canvas painting needs synthesised
  coordinates that a refactor of `PixelArtPreview` would invalidate.
- **No screenshot baselines.** Pixel baselines are OS- and font-renderer-specific, so
  ones generated on macOS would fail the moment CI runs on Linux. The theme test asserts
  the `dark` class, panel visibility, and that the body does not overflow horizontally.
  Real visual regression deserves its own issue and a decision about where baselines
  are generated.

Two behaviours worth knowing before writing more:

- **There is no redo.** Only `handleUndo`, and its `Ctrl+Z` listener explicitly excludes
  `Shift`. Do not write a redo test expecting it to pass.
- **`Page.errorNoBlocks` is unreachable from the UI.** `handleCategoryToggle` returns
  early rather than emptying the category set, so "No blocks available" never fires.
  The spec asserts that guard instead.

### Plan → review → implement

Issues that turn on a real decision — which library, which approach, how to configure something — get a researched plan **before** any code is written, and you approve it:

```
/plan-issue 24                 # research (incl. web), post plan as a comment → plan/proposed
   ← you review in GitHub, comment, iterate
/plan-issue 24 --approve       # → plan/approved
/fix-issue 24                  # agent implements against the approved plan
```

The plan lives as an issue comment marked `<!-- plan:v1 -->`, so review happens where the issue already is and `/fix-issue` reads it back as the agent's brief. Iterating posts a **new** comment rather than editing the old one — the disagreement and its resolution are worth keeping. A plan big enough to be a design document can be promoted into a `plans/*.md` spec with `--promote`.

`/plan-issue` writes nothing but the comment: no code, no config, no dependencies.

| Label | Meaning |
|---|---|
| `plan/needed` | Needs a plan before any code. `/fix-issue` refuses. |
| `plan/proposed` | Plan posted, awaiting your review. `/fix-issue` refuses. |
| `plan/approved` | Approved — `/fix-issue` follows it as written. |

Skip the plan step for genuinely self-contained issues; a one-line fix needs a plan, not a literature review.

### Agent dispatch

`/fix-issue <n>` implements an issue in an isolated git worktree (your checkout is untouched), runs the gates, and opens a PR with `Closes #N` — ready for review, not a draft. The contract lives in `.claude/agents/issue-implementer.md`.

| Label | Meaning |
|---|---|
| `agent/needs-human` | Do not dispatch. `/fix-issue` refuses these. |
| `agent/in-flight` | A run is working it now — the lock, set and cleared by `/fix-issue`. |
| `agent/ready` | Reviewed as self-contained enough to hand over unattended. |

An agent never merges, never pushes to `main`, and never marks a todo complete in `plans/` — that happens through `pnpm pm:sync` after the PR merges. If it finds mid-run that an approved plan is wrong, it stops and reports rather than substituting its own approach.

Run `pm:project` after `pm:sync`. Board field values are derived from issue labels, so labels stay the source of truth and the board is a projection — never a second place to edit status.

### Rules

- **Never hand-edit a `github:` block in spec frontmatter.** Use `pnpm pm:spec patch`. The frontmatter in `socialization-platform.md` is 190+ lines and the round-trip is formatting-sensitive.
- **Never flip a todo to `completed` without checking the code does the thing.** Two specs drifted that way for months.
- Issue lookup goes through the `spec/<slug>` label, never `gh issue list --search` — GitHub's body-search index lags and causes duplicate issues.
- `pnpm pm:sync` is idempotent. A second run on unchanged inputs must report no changes; if it doesn't, something is wrong.
- PRs should reference the issue they close (`Closes #42`), per the PR template.
