---
name: Light/Dark Mode Support
overview: Add light/dark/system theme support with localStorage persistence. The app currently uses hardcoded dark Tailwind classes throughout; this plan replaces them with semantic tokens driven by a custom ThemeProvider that writes a `dark` class to `<html>`.
todos:
  - id: css-tokens
    content: Expand globals.css with semantic CSS variables for :root (light) and .dark, remove hardcoded body background
    status: pending
  - id: theme-provider
    content: Create app/_components/ThemeProvider.tsx with context, localStorage read/write, OS media query listener, and dark class toggle on <html>
    status: pending
  - id: theme-toggle
    content: Create app/_components/ThemeToggle.tsx with light/dark/system selector UI
    status: pending
  - id: layout-wiring
    content: "Update layout.tsx: add suppressHydrationWarning, anti-flash inline script in <head>, and wrap children with ThemeProvider"
    status: pending
  - id: refactor-components
    content: "Replace hardcoded dark Tailwind classes in page.tsx and all 7 _components/ with light/dark paired classes using dark: prefix"
    status: pending
---

# Light/Dark Mode Support

## Current State

- [`app/globals.css`](app/globals.css): Has `--background`/`--foreground` CSS vars but `body` overrides them with a hardcoded `#09090b` (zinc-950). The `@media prefers-color-scheme` block is effectively dead.
- [`app/layout.tsx`](app/layout.tsx): Bare layout, no theme wiring.
- All 7 components in [`app/_components/`](app/_components/): Use hardcoded dark Tailwind classes (`bg-zinc-950`, `bg-zinc-900`, `border-zinc-700`, `text-zinc-100`, etc.) with no `dark:` prefix — light mode will be white/neutral.

## Theming Mechanism

Use **Tailwind's `dark` class strategy**: when the resolved theme is `dark`, add `class="dark"` to `<html>`. This enables Tailwind's `dark:` variant on all utility classes.

- Preference values: `"light" | "dark" | "system"` — stored in `localStorage` under key `"theme-preference"`
- Default: `"light"` (no prior localStorage entry → light mode)
- `"system"` resolves via `window.matchMedia('(prefers-color-scheme: dark)')` and listens for OS changes
- On initial render: a small inline `<script>` in `<head>` applies the class before paint to avoid flash

```
localStorage["theme-preference"] → resolvedTheme → class="dark" on <html>
```

## Files to Create

**`app/_components/ThemeProvider.tsx`**
- React context exposing `{ preference, setPreference, resolvedTheme }`
- Reads localStorage on mount, falls back to `"light"`
- Applies/removes `dark` class on `document.documentElement`
- Listens to OS media query when preference is `"system"`

**`app/_components/ThemeToggle.tsx`**
- `<select>` or segmented button with three options: Light / Dark / System
- Calls `setPreference` from context
- Placed in the app header in [`app/page.tsx`](app/page.tsx)

## Files to Change

**[`app/globals.css`](app/globals.css)**
- Add `@custom-variant dark (&:where(.dark, .dark *));` immediately after `@import "tailwindcss"` — this is the **required Tailwind v4 replacement** for the old `darkMode: 'class'` config key. Without it, `dark:` utilities only follow `prefers-color-scheme` and the class toggle has no effect.
- Expand CSS variable set to cover all semantic colors used across the app (surface, border, accent, text, muted, etc.)
- Define `:root` (light values) and `.dark` (dark values — current zinc palette)
- Remove the hardcoded `body { background: #09090b }` override

**[`app/layout.tsx`](app/layout.tsx)**
- Add an inline `<script>` in `<head>` to apply `dark` class before first paint (avoids flash)
- Wrap `{children}` with `<ThemeProvider>`
- Add `suppressHydrationWarning` to `<html>` (needed because the inline script mutates the class before hydration)

**[`app/page.tsx`](app/page.tsx) + all 7 `_components/`**
- Replace hardcoded `bg-zinc-*`, `border-zinc-*`, `text-zinc-*`, `bg-green-*` etc. with light/dark paired classes using the `dark:` prefix
- Color mapping (dark → light counterpart):

| Current (dark) | Light equivalent |
|---|---|
| `bg-zinc-950` | `bg-white dark:bg-zinc-950` |
| `bg-zinc-900` | `bg-gray-50 dark:bg-zinc-900` |
| `bg-zinc-800` | `bg-gray-100 dark:bg-zinc-800` |
| `border-zinc-700` | `border-gray-200 dark:border-zinc-700` |
| `text-zinc-100` | `text-gray-900 dark:text-zinc-100` |
| `text-zinc-400` | `text-gray-500 dark:text-zinc-400` |
| `bg-green-500` | `bg-green-600 dark:bg-green-500` |

## Anti-Flash Script (inline, in `<head>`)

```js
(function() {
  var pref = localStorage.getItem('theme-preference') || 'light';
  var dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) document.documentElement.classList.add('dark');
})();
```

## Implementation Order

1. CSS variables in [`globals.css`](app/globals.css) — establish semantic tokens
2. `ThemeProvider` + `ThemeToggle` components
3. Update [`layout.tsx`](app/layout.tsx)
4. Refactor `page.tsx` and all `_components/` to use `dark:` paired classes
