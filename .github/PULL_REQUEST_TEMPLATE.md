## What changed

<!-- One or two sentences describing the change. What does this PR do? -->

## Why

<!-- Context or motivation. Link a relevant issue, plan doc, or user story if one exists.
     e.g. Closes #42 · Relates to .cursor/plans/hero-stats.md -->

## Type of change

- [ ] Bug fix
- [ ] New feature / enhancement
- [ ] Refactor (no behaviour change)
- [ ] Copy / translation update
- [ ] Analytics / tracking
- [ ] Dependency update
- [ ] Documentation / plan

---

## How to review

<!-- Walk the reviewer through the key files to look at and in what order.
     Call out any tricky areas, trade-offs, or decisions you'd like feedback on. -->

**Key files:**

1. <!-- e.g. app/_components/landing/HeroSection.tsx — main UI change -->
2.
3.

**Steps to test locally:**

```bash
nvm use          # ensure Node v24.16.0
pnpm install     # only if deps changed
pnpm dev
```

<!-- Describe what to click/verify in the browser. Include the route(s) affected. -->

---

## Checklist

### General

- [ ] `pnpm tsc --noEmit` passes with no new errors
- [ ] No `console.log` or debug code left in

### UI / Components

- [ ] Light **and** dark mode look correct
- [ ] Landing page renders correctly at ≥ 1280 px width (desktop-only target)
- [ ] Used an existing **shadcn/ui** component where applicable (no bespoke replacements)
- [ ] Tailwind v4 classes only — no plain CSS files added unless strictly necessary

### Internationalisation

- [ ] All user-facing strings use `useTranslations()` — no hardcoded English text
- [ ] `messages/en.json` updated
- [ ] `messages/es.json` updated (and translation is accurate, not machine-translated filler)
- [ ] New translation keys follow the existing namespace convention (`"Landing.*"`, `"Page.*"`, …)

### Analytics

- [ ] New CTA clicks are tracked via `landing-analytics.ts`
- [ ] New landing sections fire `trackSectionVisible` via `useSectionTracking`
- [ ] Event names follow the `snake_case` convention documented in `.cursor/plans/analytics.md`

### Accessibility & semantics

- [ ] Interactive elements are keyboard-reachable
- [ ] Images have meaningful `alt` text (or `alt=""` if purely decorative)
- [ ] Heading hierarchy is preserved (`h1` → `h2` → `h3`)
