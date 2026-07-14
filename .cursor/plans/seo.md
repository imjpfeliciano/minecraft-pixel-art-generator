# SEO Improvement Plan for mc-pixel

## Current State Audit

The project has the bare minimum:
- `title` + `description` only in [`app/layout.tsx`](../../app/layout.tsx)
- No Open Graph / Twitter cards → links shared on Discord/Reddit/Twitter render blank
- No `robots.txt` → crawlers have no guidance
- No `sitemap.xml` → pages may take longer to be indexed
- No structured data (JSON-LD) → no rich results in Google
- `lang` hardcoded to `"en"` even for Spanish speakers
- No canonical URL → risk of duplicate-content penalties
- `/create` has no metadata → blank title in search results

---

## Target Keywords

Primary (high intent, moderate competition):
- `minecraft pixel art generator`
- `image to minecraft blocks`
- `litematica schematic generator`
- `minecraft schematic from image`

Secondary (long-tail, lower competition):
- `convert photo to minecraft pixel art`
- `minecraft pixel art maker online free`
- `minecraft block art creator`
- `litematica pixel art tool`

Community / social discovery:
- Minecraft subreddits: r/Minecraft, r/DetailCraft, r/Minecraftbuilds
- YouTube tutorials referencing the tool
- Discord Minecraft servers (Hermitcraft, technical MC communities)

---

## Phase 1 — Technical Foundation (Highest Priority)

These are code changes with no content dependencies. Each has a direct ranking impact.

### 1.1 Expand Root Metadata in `app/layout.tsx`
- Set a keyword-rich `title` with a template: `mc-pixel | Minecraft Pixel Art Generator`
- Expand `description` to ~155 chars with primary keywords
- Add `metadataBase` (production URL, e.g. `https://mc-pixel.app`) — required for all absolute OG URLs
- Add `canonical` via `alternates.canonical`
- Add `keywords` array (minor signal but free)
- Keep `lang="en"` until URL-based i18n is implemented

### 1.2 Open Graph + Twitter Cards
Add to the root metadata export in `app/layout.tsx`:
```ts
openGraph: {
  title: "...",
  description: "...",
  url: "https://mc-pixel.app",
  siteName: "mc-pixel",
  images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  type: "website",
},
twitter: {
  card: "summary_large_image",
  title: "...",
  description: "...",
  images: ["/og-image.png"],
},
```
The OG image should be a 1200×630 image showing the before/after comparison (the hero's strongest visual hook). Options:
- **Static** `public/og-image.png` (fastest, always works) — recommended first step
- **Dynamic** `app/opengraph-image.tsx` using `ImageResponse` (same pattern as `app/icon.tsx`)

### 1.3 Add Metadata to `/create` page
[`app/create/page.tsx`](../../app/create/page.tsx) currently has no metadata export. Add:
```ts
export const metadata: Metadata = {
  title: "Create Pixel Art | mc-pixel",
  description: "Upload any image and convert it to a Minecraft schematic in seconds.",
  robots: { index: false }, // optional: keep editor out of index
};
```

### 1.4 `app/robots.ts`
Create a Next.js App Router `robots.ts` file:
```ts
export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: "https://mc-pixel.app/sitemap.xml",
  };
}
```

### 1.5 `app/sitemap.ts`
Two routes to list — `/` (landing) and optionally `/create`:
```ts
export default function sitemap() {
  return [
    { url: "https://mc-pixel.app", lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
  ];
}
```
Extend with gallery/creation URLs when the socialization platform from [`socialization-platform.md`](socialization-platform.md) ships.

### 1.6 JSON-LD Structured Data (`SoftwareApplication`)
Add a `<script type="application/ld+json">` to `app/layout.tsx` or `app/page.tsx`:
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "mc-pixel",
  "applicationCategory": "DesignApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "description": "Convert any image into a Minecraft block schematic downloadable as a Litematica file.",
  "url": "https://mc-pixel.app"
}
```
This qualifies for a rich result in Google's "Apps" carousel.

---

## Phase 2 — Content SEO (Medium Priority)

### 2.1 Heading Hierarchy Audit
- Ensure the landing page has exactly **one `<h1>`** (the hero headline) and logical `<h2>`/`<h3>` structure in HowItWorks + Catalogue sections
- Scan [`app/_components/landing/`](../../app/_components/landing/) for heading tags

### 2.2 Alt Text for Images
- `HeroComparison` loads `/demo/original.png` and `/demo/pixel-art.png` — verify meaningful `alt` attributes
- Block textures in the catalogue should have descriptive alts: `alt="Oak Log Minecraft block"`

### 2.3 Internal Linking
- NavBar CTA ("Create Now") uses an `<a href="/create">` — confirm it is a real `<Link>` (good)
- Add a text CTA inside HowItWorks: "Ready? Try it free →" linking to `/create`

### 2.4 Page Speed / Core Web Vitals
Core Web Vitals are a confirmed Google ranking signal. Quick wins:
- Add `priority` prop to the hero images in `HeroComparison` (LCP fix)
- Audit `public/demo/` image sizes; convert to WebP if not already
- The `min-w-[1280px]` on the landing page body makes mobile CLS worse — consider responsive layout as a future task

---

## Phase 3 — Social & Community Discovery

### 3.1 Share-Ready OG Image
A compelling 1200×630 OG image showing the pixel-art conversion (before → after) is the single highest-leverage thing for Reddit/Discord sharing. When someone posts a link on r/Minecraft, this image is the first impression.

### 3.2 Reddit / Community Launch Strategy
- Post to: r/Minecraft, r/DetailCraft, r/Minecraftbuilds, r/feedthebeast (for modded/Litematica users)
- Share a GIF/video demo — Reddit posts with media get far more upvotes than link-only
- The TagsSection already anticipates community-requested block tags — lean into that as a "roadmap transparency" angle

### 3.3 GitHub README SEO
The repo README is indexed by Google. Add:
- Clear title/description with keywords
- A live demo link badge
- Screenshots

---

## Phase 4 — i18n SEO (Long-term)

Currently locale is client-side only (no URL routing), so Google only sees the English version. True multilingual SEO requires:
- Migrating to URL-based routing: `/en/...` and `/es/...`
- Adding `hreflang` alternates to metadata
- Setting `lang` attribute dynamically on `<html>`

This is a **significant refactor** and should be planned separately. See [`i18n.md`](i18n.md). Defer until the socialization platform and gallery are stable.

---

## Implementation Order

1. `app/layout.tsx` — metadata expansion + OG + Twitter + JSON-LD
2. `public/og-image.png` — static 1200×630 social preview image
3. `app/robots.ts` — crawler rules
4. `app/sitemap.ts` — sitemap
5. `app/create/page.tsx` — add metadata
6. Content audit: headings, alt text, LCP image `priority`
7. Community/Reddit launch post
8. i18n URL routing (future)

---

## Monitoring

Once live, track with:
- **Google Search Console** — index coverage, keyword impressions, Core Web Vitals
- **Vercel Analytics** (already installed) — real-user page views and referrers
- Set up a GSC property at `https://mc-pixel.app` and submit the sitemap URL
