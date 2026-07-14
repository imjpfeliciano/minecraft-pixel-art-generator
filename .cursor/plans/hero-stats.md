# Hero Stats — Tracking & Display Plan

## Goal

Restore the hero stats bar once real data is available. The section was removed in the initial launch because the numbers were fabricated; we want to show live, verifiable metrics instead.

```
┌──────────────────────────────────────────────────────┐
│  12,400+  schematics created  ·  94 M  blocks placed  ·  100%  free  │
└──────────────────────────────────────────────────────┘
```

---

## Metrics to track

| Stat | Description | Source |
|---|---|---|
| Schematics created | Total `.litematic` files generated and downloaded | Server-side event on download |
| Blocks placed | Sum of blocks across all generated schematics | Computed at generation time, stored alongside schematic count |
| Free | Static — always 100% | Hardcoded |

---

## Implementation plan

### 1 · Instrument generation events (backend)

When a user downloads a schematic, fire a server-side event that records:
- `schematic_created`: increment a global counter
- `blocks_placed`: add the block count of this schematic to a running total

These can be written to **Firestore** (when the socialization/auth work lands) or a lightweight **Vercel KV** store as a stopgap.

Suggested Firestore document: `stats/global`
```json
{
  "schematicsCreated": 14201,
  "blocksPlaced": 98432110,
  "updatedAt": "2026-07-14T17:00:00Z"
}
```

### 2 · Expose a read API

Create a Next.js Route Handler that reads the aggregated stats and returns them:

```
GET /api/stats
→ { schematicsCreated: 14201, blocksPlaced: 98432110 }
```

Cache aggressively — these numbers don't need to be real-time:
- `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`

### 3 · Restore the UI in HeroSection

Re-add the stats bar to `app/_components/landing/HeroSection.tsx`. Fetch from `/api/stats` at build time (or via ISR) so the landing page stays a static shell:

```tsx
// In app/page.tsx (server component) — fetch and pass down as prop
const stats = await fetch("/api/stats").then(r => r.json());
```

Format large numbers with `Intl.NumberFormat` for locale-aware display (`94,000,000` → `94 M`).

Re-add translation keys to both `messages/en.json` and `messages/es.json`:

```json
"heroStatSchematic": "schematics created",
"heroStatBlocks": "blocks placed",
"heroStatFree": "free"
```

---

## Rollout checklist

- [ ] Decide on storage: Vercel KV (fast, no auth dependency) vs Firestore (consistent with socialization work)
- [ ] Instrument `app/create/page.tsx` download handler to write the event
- [ ] Create `app/api/stats/route.ts` with proper caching headers
- [ ] Restore stats bar in `HeroSection.tsx` (see removed code in git history)
- [ ] Add ISR revalidation (`revalidate = 3600`) to `app/page.tsx`
- [ ] QA: verify counts are reasonable before enabling on production

---

## Notes

- Until real data is available, **do not show placeholder numbers**. Fabricated social-proof metrics erode trust if users notice them.
- The "100% free" stat can be re-added immediately as a static badge since it is factually true regardless of usage data.
- Consider a soft launch threshold: only show the stats bar once `schematicsCreated >= 100` to avoid displaying near-zero counts.
