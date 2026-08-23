# Analytics Event Reference

## Overview

All events are sent via **Vercel Analytics** using the `track()` function from `@vercel/analytics`.

Event names follow a `<Page> <Subject> <Action>` pattern (e.g. `Landing Hero CTA Clicked`).
Property names use `snake_case`.

### Analytics modules

| Module | Path | Surfaces covered |
|---|---|---|
| Landing | `app/_lib/landing-analytics.ts` | Landing page (navbar, hero, catalogue, tags, footer) |
| Social | `app/_lib/social-analytics.ts` | Save modal, dashboard, gallery, creation detail, onboarding |

**Always add new events to the relevant module** — never call `track()` directly from a component. This keeps the event catalog in one place and makes renaming/refactoring safe.

For the editor (`/create`), events are tracked inline in `app/create/page.tsx` with direct `track()` calls (legacy pattern — can be migrated to a `create-analytics.ts` module later). All other surfaces use the module pattern.

---

## How section visibility is tracked

```
app/_lib/hooks/useSectionTracking.ts
```

Uses `IntersectionObserver` with a **30% threshold**. Fires exactly once per section per page load, then disconnects the observer. The hook returns a `ref` that must be attached to the section's root element.

```tsx
// Usage in any landing section component
const sectionRef = useSectionTracking("hero");
return <section ref={sectionRef as React.RefObject<HTMLElement>}>…</section>;
```

Valid section names are typed as `LandingSection` in `landing-analytics.ts`:

```ts
export type LandingSection = "hero" | "how-it-works" | "catalogue" | "tags";
```

When adding a new section, extend this union and attach the hook to the new section's root element.

---

## Event catalog

### Landing page — section visibility

| Event name | Properties | Source component | Trigger |
|---|---|---|---|
| `Landing Section Visible` | `section: LandingSection` | All landing sections | 30% of section enters viewport (once per page load) |

**Current section values**: `"hero"`, `"how-it-works"`, `"catalogue"`, `"tags"`

---

### Landing page — NavBar

| Event name | Properties | Source component | Trigger |
|---|---|---|---|
| `Landing Nav Create Clicked` | — | `NavBar.tsx` | "Create" link clicked |
| `Landing Nav CTA Clicked` | — | `NavBar.tsx` | "Start Creating →" pill button clicked |

---

### Landing page — Hero section

| Event name | Properties | Source component | Trigger |
|---|---|---|---|
| `Landing Hero CTA Clicked` | — | `HeroSection.tsx` | "Start Creating" button clicked |
| `Landing Hero Comparison Dragged` | `final_percent: number` | `HeroComparison.tsx` | Before/after divider released; value is 0–100 (integer) |

---

### Landing page — Tags section

| Event name | Properties | Source component | Trigger |
|---|---|---|---|
| `Landing Tag Request Opened` | — | `TagsSection.tsx` | "Request a tag" button clicked (modal opens) |
| `Landing Tag Request Submitted` | `tag_name: string` | `TagRequestModal.tsx` | Tag request form submitted successfully (after API 202) |

---

### Landing page — Catalogue section

| Event name | Properties | Source component | Trigger |
|---|---|---|---|
| `Landing Catalogue Creation Clicked` | `position: number` | `CatalogueSection.tsx` | Community creation card clicked; `position` is 0-based index in the grid |
| `Landing Catalogue View All Clicked` | — | `CatalogueSection.tsx` | "View all in gallery →" link clicked |

---

### Landing page — Footer

| Event name | Properties | Source component | Trigger |
|---|---|---|---|
| `Landing Footer GitHub Clicked` | — | `Footer.tsx` | GitHub link clicked |

---

### Editor (`/create`) — inline tracked events

These are tracked directly with `track()` inside `app/create/page.tsx`.

| Event name | Properties | Trigger |
|---|---|---|
| `Pixel Art Generated` | `width`, `height`, `orientation`, `categories_count`, `has_fill_block`, `foundation_enabled` | Generate button clicked and succeeds |
| `Generation Failed` | `error_message: string` | Generate throws an error |
| `Litematic Downloaded` | `width`, `height`, `orientation` | Download button clicked |
| `3D Preview Opened` | `orientation` | 3D view tab selected |
| `3D Viewer Closed` | — | 2D view tab selected |
| `Materials Panel Opened` | — | Materials panel toggled on |

---

### Creation lifecycle — `SaveCreationModal.tsx`

Module: `app/_lib/social-analytics.ts`

| Event name | Properties | Trigger |
|---|---|---|
| `Creation Save Opened` | `mode: "create" \| "edit"` | Save modal opens; fired once per open |
| `Creation Saved` | `mode`, `visibility`, `tags_count`, `width`, `height`, `orientation`, `has_description` | Save/update succeeds; fired before `setSavedId` |
| `Creation Save Failed` | `mode`, `reason: "validation" \| "server" \| "network"` | Validation error, non-OK API response, or uncaught exception |
| `Creation Publish Blocked` | — | API returns 409 `nickname_required`; key funnel drop-off signal |
| `Creation Sign In Prompted` | — | Modal opens while user is not signed in |

---

### Dashboard — `DashboardGrid.tsx`

Module: `app/_lib/social-analytics.ts`

| Event name | Properties | Trigger |
|---|---|---|
| `Creation Visibility Toggled` | `to: "public" \| "private"` | Publish/unpublish succeeds (`res.ok`); optimistic reverts are not counted |
| `Creation Deleted` | — | Delete API call succeeds (`res.ok`) |

---

### Gallery — `GalleryContent.tsx`

Module: `app/_lib/social-analytics.ts`

| Event name | Properties | Trigger |
|---|---|---|
| `Gallery Tag Filtered` | `tag: string` | Tag chip clicked; value is `"all"` for the All chip, otherwise the tag slug |
| `Gallery Load More Clicked` | `loaded_count: number` | "Load more" button clicked; value is current count before the new page is appended |
| `Gallery Creation Opened` | `position: number` | Creation card link clicked; 0-based index in the visible grid |

---

### Creation detail — `DownloadCreationButton.tsx`, `CreationPreviewPanel.tsx`

Module: `app/_lib/social-analytics.ts`

| Event name | Properties | Source component | Trigger |
|---|---|---|---|
| `Creation Downloaded` | `width`, `height`, `orientation` | `DownloadCreationButton.tsx` | `.litematic` file generated and downloaded successfully |
| `Creation Download Failed` | — | `DownloadCreationButton.tsx` | Any error during grid fetch, decode, or generation |
| `Creation Preview Tab Changed` | `tab: "image" \| "2d" \| "3d"` | `CreationPreviewPanel.tsx` | Tab button clicked; fires even if the grid is still loading |

These events are distinct from the editor's `Litematic Downloaded` / `3D Preview Opened` events, which fire inside `/create`. The distinct names allow Vercel Analytics to separate editor downloads from gallery-page downloads.

---

### Onboarding — `app/(authenticated)/onboarding/page.tsx`

Module: `app/_lib/social-analytics.ts`

| Event name | Properties | Trigger |
|---|---|---|
| `Onboarding Nickname Claimed` | `has_display_name: boolean`, `has_bio: boolean` | Nickname claimed successfully; fires before `router.push("/dashboard")` |
| `Onboarding Nickname Claim Failed` | — | API returns non-OK, or an uncaught exception occurs |

---

## How to add a new event

1. **Define it in the appropriate module** (`app/_lib/landing-analytics.ts` for landing, `app/_lib/social-analytics.ts` for social/creation surfaces, or create a `<page>-analytics.ts` for a new page):

```ts
export function trackMyNewEvent(param: string) {
  track("Landing My New Event", { param });
}
```

2. **Import and call it in the component**:

```tsx
import { trackMyNewEvent } from "../../_lib/landing-analytics";

<button onClick={() => trackMyNewEvent(value)}>…</button>
```

3. **Update this document** — add a row to the relevant table above.

---

## Naming conventions

| Segment | Rule | Example |
|---|---|---|
| Page prefix | PascalCase page or feature name | `Landing`, `Creation`, `Gallery`, `Onboarding` |
| Subject | PascalCase component or feature | `Hero`, `Nav`, `Tag Request`, `Footer`, `Save`, `Preview` |
| Action | Past-tense verb | `Clicked`, `Submitted`, `Dragged`, `Visible`, `Saved`, `Toggled` |
| Property keys | `snake_case` | `final_percent`, `tag_name`, `has_description` |
| Property values | raw primitives | `number`, `string`, `boolean` |

Avoid generic names like `Button Clicked` — include enough context that the event is self-describing in the Vercel Analytics dashboard without needing to cross-reference source code.
