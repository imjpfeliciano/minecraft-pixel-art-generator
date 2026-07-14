# Analytics Event Reference

## Overview

All events are sent via **Vercel Analytics** using the `track()` function from `@vercel/analytics`.

Event names follow a `<Page> <Subject> <Action>` pattern (e.g. `Landing Hero CTA Clicked`).
Property names use `snake_case`.

The central module for landing page events lives at:

```
app/_lib/landing-analytics.ts
```

Each event is a thin typed wrapper around `track()`. **Always add new events there** — never call `track()` directly from a component on the landing page. This keeps the event catalog in one place and makes renaming/refactoring safe.

For the editor (`/create`), events are tracked inline in `app/create/page.tsx` with direct `track()` calls (legacy pattern — can be migrated to a separate `create-analytics.ts` module later).

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

## How to add a new event

1. **Define it in `app/_lib/landing-analytics.ts`** (or create a `<page>-analytics.ts` for a new page):

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
| Page prefix | PascalCase page name | `Landing`, `Create`, `Explore` |
| Subject | PascalCase component or feature | `Hero`, `Nav`, `Tag Request`, `Footer` |
| Action | Past-tense verb | `Clicked`, `Submitted`, `Dragged`, `Visible` |
| Property keys | `snake_case` | `final_percent`, `tag_name` |
| Property values | raw primitives | `number`, `string`, `boolean` |

Avoid generic names like `Button Clicked` — include enough context that the event is self-describing in the Vercel Analytics dashboard without needing to cross-reference source code.
