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

SEO is a first-class concern. Consult [`.cursor/plans/seo.md`](.cursor/plans/seo.md) for the full strategy. Every change should respect these rules:

- Every page **must** export a `metadata` object (Next.js Metadata API) with a meaningful `title` and `description`.
- The root layout must always define `metadataBase`, `openGraph`, and `twitter` fields.
- Never remove or weaken existing `robots`, `sitemap`, or JSON-LD structured data.
- New public-facing routes must be added to `app/sitemap.ts`.
- Images used as hero or OG assets must include descriptive `alt` text and the `priority` prop when above the fold.
- Do not introduce `noindex` on pages that should rank (landing page, any future gallery/creation detail pages).
- `metadata` must be exported from a **server component**. If a page's root component is `"use client"`, wrap it: keep a thin server component as `page.tsx` and render the client component as a child.
