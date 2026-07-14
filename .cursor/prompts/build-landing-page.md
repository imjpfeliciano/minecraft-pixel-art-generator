# Build Landing Page

Implement the landing page as defined in @.cursor/plans/landing-page.md.

## Codebase context

- Next.js App Router, no `src/` directory — all code lives under `app/`
- Components go in `app/_components/`, business logic in `app/_lib/`
- Tailwind CSS v4 (CSS-first config in `app/globals.css`). Existing brand tokens: `--color-grass: #79C05A`, `--color-grass-hover: #6AAE4D`
- shadcn/ui is **not yet initialized** — run `npx shadcn@latest init` before adding components
- Path alias `@/*` maps to the project root
- i18n via `next-intl`; locale toggles and theme toggle components already exist at `app/_components/LocaleSwitcher.tsx` and `app/_components/ThemeToggle.tsx`
- The existing `ComparisonDivider` component (`app/_components/ComparisonDivider.tsx`) must be reused for the hero before/after demo
- `pnpm` is the package manager — never use `npm install`

## Design spec

- **Desktop-only** — minimum viewport 1280px. No responsive breakpoints, no `sm:`/`md:` Tailwind prefixes. Use `min-w-[1280px]` on the root layout if needed.
- **Color palette**: background `#111827` (gray-900), surface cards `#1f2937` (gray-800), primary CTA `bg-grass hover:bg-grass-hover`, text `gray-100` / `gray-400` for muted
- **Typography**: headlines `font-bold tracking-tight`, subheadlines `text-gray-400`, section labels `text-xs font-semibold uppercase tracking-widest text-gray-500`
- **Hero background**: subtle pixel-grid CSS pattern (2px dots or grid lines at low opacity) added to `globals.css`

## Page structure

Build `app/page.tsx` as a server component composing these sections in order:

### NavBar (`app/_components/NavBar.tsx`)
- Sticky, `bg-gray-900/80 backdrop-blur border-b border-gray-800`
- Left: block emoji + "Pixel Art Generator" wordmark
- Center: "Create" link (`/create`), "Gallery" link (muted, `text-gray-500 cursor-not-allowed`, no href yet)
- Right: `<LocaleSwitcher />`, `<ThemeToggle />`, grass-green "Start Creating →" `<Button>` → `/create`

### HeroSection (`app/_components/landing/HeroSection.tsx`)
- Full viewport height, centered content, two-column layout (text left, demo right)
- Left col: headline, subheadline, single `<Button size="lg">` CTA → `/create`, three stat badges below
  - Stats: "12,400 schematics created", "94 M blocks placed", "100% free" — hardcoded, wrapped in `<Badge variant="secondary">`
- Right col: `<ComparisonDivider>` in read-only display mode using `public/demo/original.jpg` (before) and `public/demo/pixel-art.png` (after)
  - Pick a visually striking source image (a recognizable landmark or portrait) and pre-generate its pixel art version using the existing tool; save both to `public/demo/`

### HowItWorksSection (`app/_components/landing/HowItWorksSection.tsx`)
- Full-width dark card strip (`bg-gray-800`)
- 3 equal columns, always horizontal, separated by `<Separator orientation="vertical">`
- Each column: Lucide icon + bold step label + one sentence
  - `Upload` icon — "Drop any image, JPG, PNG, or WebP"
  - `Settings2` icon — "Choose block palette, dimensions, and orientation"
  - `Download` icon — "Export a `.litematic` ready for the Litematica mod"

### CatalogueSection (`app/_components/landing/CatalogueSection.tsx`)
- Section heading "Community Gallery" + teaser copy
- Filter row: `<Input placeholder="Search…" disabled />`, tag chips `<Badge>` (disabled), sort `<select disabled>` — all `opacity-50 cursor-not-allowed`, with `title="Coming soon"` tooltip
- 3-column grid of 6 skeleton `CreationCard` placeholders (shimmer via `animate-pulse`)
- Frosted-glass overlay: `absolute inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center` with a "Gallery launching soon — stay tuned" badge

### TagsSection (`app/_components/landing/TagsSection.tsx`) + TagRequestModal
- Section heading "Browse by Tag"
- `flex flex-wrap gap-2` of `<Badge variant="outline">` for each entry in `AVAILABLE_TAGS` (from `app/_lib/tags.ts`)
- Below the grid: `<Button variant="ghost" size="sm">Don't see your tag? Request one →</Button>` that opens `<TagRequestModal />`
- `TagRequestModal`: shadcn `<Dialog>` with tag name `<Input>` (required, maxLength 32) + description `<Textarea>` (optional, maxLength 140) + submit `<Button>`; on success replace form with "Request submitted — our admins will review it shortly"
- On submit, POST to `/api/tags/request` (stub route returning 202)

### Footer
- Single dark bar `bg-gray-950 border-t border-gray-800`
- Left: logo + "© 2025 Minecraft Pixel Art Generator"
- Right: GitHub icon link, "MIT License", Vercel badge

## API stub

`app/api/tags/request/route.ts`:
```ts
export async function POST() {
  return new Response(null, { status: 202 });
}
```

## Execution order

1. Run `npx shadcn@latest init` and add `button badge card dialog input label textarea separator`
2. Create `app/create/page.tsx` by copying `app/page.tsx` verbatim
3. Add demo assets to `public/demo/`
4. Create `app/_lib/tags.ts`
5. Build components in `app/_components/landing/` and `app/_components/NavBar.tsx`
6. Create `app/api/tags/request/route.ts`
7. Assemble `app/page.tsx`
8. Update `app/layout.tsx` to include `<NavBar />`
9. Trim `socialization-platform.md`: remove `routing-reshuffle` and `landing-page` todos
