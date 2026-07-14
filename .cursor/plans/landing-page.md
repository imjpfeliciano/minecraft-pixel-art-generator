---
name: Landing Page
overview: >
  Split the socialization plan in two (landing page vs. social features), then build a
  high-conversion, desktop-only landing page at `/` with a hero + how-it-works strip,
  catalogue placeholder, and tags section — moving the current editor to `/create`.
todos:
  - id: split-plans
    content: >
      Trim socialization-platform.md: remove routing-reshuffle and landing-page todos
      (now owned by this plan)
    status: pending
  - id: shadcn-init
    content: "Initialize shadcn/ui and add required components: button, badge, card, dialog, input, label, textarea, separator"
    status: pending
  - id: routing-reshuffle
    content: "Copy app/page.tsx → app/create/page.tsx (verbatim); replace app/page.tsx with new landing page shell"
    status: pending
  - id: demo-assets
    content: "Add public/demo/original.jpg and public/demo/pixel-art.png for the hero before/after showcase"
    status: pending
  - id: tags-lib
    content: Create app/_lib/tags.ts with AVAILABLE_TAGS static array and Tag type
    status: pending
  - id: navbar
    content: "Create app/_components/NavBar.tsx (logo, /create link, theme + locale toggles); wire into app/layout.tsx"
    status: pending
  - id: hero-section
    content: "Build app/_components/landing/HeroSection.tsx: headline, subheadline, single CTA, static before/after demo (ComparisonDivider), inline stats strip"
    status: pending
  - id: how-it-works
    content: "Build app/_components/landing/HowItWorksSection.tsx: 3-step row (Upload → Configure → Download)"
    status: pending
  - id: catalogue-section
    content: "Build app/_components/landing/CatalogueSection.tsx: disabled filter bar + sort + search, 6 shimmer CreationCard skeletons, coming-soon overlay"
    status: pending
  - id: tags-section
    content: "Build app/_components/landing/TagsSection.tsx: Badge grid from AVAILABLE_TAGS + TagRequestModal (dialog form)"
    status: pending
  - id: api-tags-stub
    content: Create app/api/tags/request/route.ts stub returning 202 Accepted
    status: pending
  - id: assemble-landing
    content: "Assemble app/page.tsx (server component): NavBar + HeroSection + HowItWorksSection + CatalogueSection + TagsSection + Footer"
    status: pending
---

# Landing Page

## What changes

The existing `socialization-platform.md` plan is split into two files:

- `.cursor/plans/landing-page.md` — **this plan**, landing page work only
- `.cursor/plans/socialization-platform.md` — trimmed to social/auth features only (`routing-reshuffle` and `landing-page` todos removed from there)

---

## Page Scroll Map

```
┌─────────────────────────────────────────────┐
│  NavBar  (sticky)                           │
├─────────────────────────────────────────────┤
│  1. Hero                                    │
│     Headline + subheadline                  │
│     [ Start Creating → ]  (single CTA)      │
│     Static before/after demo                │
│     Inline stats strip                      │
├─────────────────────────────────────────────┤
│  2. How It Works                            │
│     Upload → Configure → Download           │
├─────────────────────────────────────────────┤
│  3. Catalogue  (structural placeholder)     │
│     Filter bar skeleton (disabled)          │
│     6 shimmer CreationCard slots            │
│     "Coming soon" overlay                   │
├─────────────────────────────────────────────┤
│  4. Tags                                    │
│     Badge grid from AVAILABLE_TAGS          │
│     "Request a tag" → modal                 │
├─────────────────────────────────────────────┤
│  Footer  (GitHub · license)                 │
└─────────────────────────────────────────────┘
```

Conversion logic:
- Visitors who immediately "get it" click the hero CTA — converted in under 3 s.
- Visitors who need convincing scroll through How It Works and click there.
- Visitors who are exploring browse Catalogue and Tags — primed for return visits once social features launch.

---

## Routing Reshuffle

- `app/page.tsx` (editor, ~730 lines) → copied verbatim to `app/create/page.tsx`
- `app/page.tsx` → replaced with the new landing page (server component)
- Internal references to update inside the moved file: `track()` call site, any header self-links pointing to `/`

---

## Setup: shadcn/ui

Per `AGENTS.md`, shadcn/ui is preferred and not yet initialized.

1. `npx shadcn@latest init` (App Router, Tailwind v4 CSS vars mode, no `src/`)
2. Add components:
   - `button`, `badge`, `card`, `dialog`, `input`, `label`, `textarea`, `separator`

---

## Tags Data

`app/_lib/tags.ts` — static array, replaced by DB-backed list once the socialization backend lands:

```ts
export type Tag = { slug: string; label: string; description?: string };
export const AVAILABLE_TAGS: Tag[] = [
  { slug: "animals",    label: "Animals" },
  { slug: "landscapes", label: "Landscapes" },
  { slug: "portraits",  label: "Portraits" },
  { slug: "gaming",     label: "Gaming" },
  { slug: "anime",      label: "Anime" },
  { slug: "buildings",  label: "Buildings" },
  // …
];
```

Tag requests POST to `/api/tags/request` — a stub that returns `202 Accepted`. Admin approval workflow is out of scope for this phase.

---

## New Files

| File | Purpose |
|------|---------|
| `app/create/page.tsx` | Editor — moved verbatim from `app/page.tsx` |
| `app/page.tsx` | Landing page — server component, composes all sections |
| `app/_components/NavBar.tsx` | Sticky nav: logo, `/create` link, theme + locale toggles |
| `app/_components/landing/HeroSection.tsx` | Headline, CTA, static demo, stats strip |
| `app/_components/landing/HowItWorksSection.tsx` | 3-step strip below the hero fold |
| `app/_components/landing/CatalogueSection.tsx` | Structural placeholder with filter slots + shimmer cards |
| `app/_components/landing/TagsSection.tsx` | Tag badge grid + request button |
| `app/_components/landing/TagRequestModal.tsx` | Dialog form: tag name + description + submit |
| `app/_lib/tags.ts` | Static `AVAILABLE_TAGS` definition |
| `app/api/tags/request/route.ts` | Stub POST handler — 202 Accepted |
| `public/demo/original.jpg` | Source image for hero before/after demo |
| `public/demo/pixel-art.png` | Pre-generated pixel art result for hero demo |

---

## Design Constraints

- **Desktop-only** — minimum supported viewport is `1280px`. No responsive/mobile breakpoints. The product targets desktop Minecraft players and is not usable on mobile anyway.
- No `sm:` / `md:` Tailwind prefixes needed; layout is fixed-width with `max-w-7xl mx-auto` containers.

---

## Section Details

### 1 — Hero

- Full-viewport, dark Minecraft-themed background (CSS pixel-grid pattern added to `globals.css`)
- **Headline**: "Turn any image into a Minecraft masterpiece"
- **Subheadline**: "Generate block-accurate pixel art schematics in seconds. Free. No account needed."
- **Single CTA**: `<Button size="lg">` → `/create` ("Start Creating") — grass green, no competing CTA above the fold
- **Before/after demo**: static `ComparisonDivider` (existing component, read-only) using `public/demo/original.jpg` and `public/demo/pixel-art.png`
- **Stats strip**: hardcoded counters — e.g. "12,400 schematics created · 94 M blocks placed" — replaced by `/api/stats` when socialization backend lands

### 2 — How It Works

- 3-column row (always horizontal, desktop-only)
- Each column: icon (Lucide) + step label + one-sentence description
  - **Upload** — "Drop any image — JPG, PNG, or WebP"
  - **Configure** — "Choose block palette, dimensions, and orientation"
  - **Download** — "Export a `.litematic` ready for Litematica mod"

### 3 — Catalogue (structural placeholder)

- Section heading: "Community Gallery" + short teaser copy
- Filter bar: tag chips (disabled), sort dropdown (disabled), search input (disabled) — `opacity-50`, `cursor-not-allowed`, tooltip "Coming soon"
- 6 shimmer skeleton `CreationCard` slots in a responsive grid
- Semi-transparent "Gallery launching soon" banner overlay
- DOM + component structure is real; making it live later = swap skeletons for live data + remove disabled state

### 4 — Tags

- Section heading: "Browse by Tag"
- `flex-wrap` grid of `<Badge variant="secondary">` — one per `AVAILABLE_TAGS` entry
- Badges are non-interactive for now; `/explore?tag=slug` links added once catalogue ships
- `TagRequestModal`:
  - Trigger: "Don't see your tag? Request one →" link-button
  - Dialog fields: tag name (required, max 32 chars) + description (optional, max 140 chars)
  - On submit: POST `/api/tags/request` → show "Request submitted — our admins will review it shortly"

---

## Modified Files

- [`app/layout.tsx`](../app/layout.tsx) — add `<NavBar />` as first child inside `<body>`; `ThemeProvider` + `I18nProvider` wrapping stays intact
- [`app/page.tsx`](../app/page.tsx) — replaced with landing page (all editor logic moves to `/create`)
- [`app/globals.css`](../app/globals.css) — pixel-grid CSS background pattern for the hero section

---

## Socialization Plan (what stays there)

`socialization-platform.md` retains all todos **except** `routing-reshuffle` and `landing-page` (now owned here). Remaining scope: Clerk auth, Firebase setup, API routes, explore page, creation detail, dashboard, user profiles, save modal, download gate, Firestore security rules.
