import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

/**
 * E2E config for the create flow.
 *
 * Runs against a production build, not `next dev`. Next 16's App Router enables
 * React Strict Mode in development, which double-invokes effects — useful signal
 * while refactoring, but it makes the `?creation=` hydration test (which races two
 * fetches) flakier than it needs to be. Test the artifact that ships.
 *
 * Chromium only: none of the assertions here are cross-browser claims, and there
 * is no CI yet to amortise the extra browser downloads.
 *
 * Requires a populated `.env.local` — `proxy.ts` runs `clerkMiddleware()` and the
 * root layout mounts `<ClerkProvider>`, so the app will not boot without Clerk
 * keys even though `/create` itself is public.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm build && pnpm start",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
