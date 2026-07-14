import { track } from "@vercel/analytics";

// ─── Section visibility ────────────────────────────────────────────────────────
// Fired once per section per page load when the section reaches 30% viewport coverage.
export type LandingSection = "hero" | "how-it-works" | "catalogue" | "tags";

export function trackSectionVisible(section: LandingSection) {
  track("Landing Section Visible", { section });
}

// ─── NavBar ────────────────────────────────────────────────────────────────────
export function trackNavCreateClicked() {
  track("Landing Nav Create Clicked");
}

export function trackNavCtaClicked() {
  track("Landing Nav CTA Clicked");
}

// ─── Hero ──────────────────────────────────────────────────────────────────────
export function trackHeroCtaClicked() {
  track("Landing Hero CTA Clicked");
}

export function trackHeroComparisonDragged(finalPercent: number) {
  track("Landing Hero Comparison Dragged", {
    final_percent: Math.round(finalPercent),
  });
}

// ─── Tags ──────────────────────────────────────────────────────────────────────
export function trackTagRequestOpened() {
  track("Landing Tag Request Opened");
}

export function trackTagRequestSubmitted(tagName: string) {
  track("Landing Tag Request Submitted", { tag_name: tagName });
}

// ─── Footer ────────────────────────────────────────────────────────────────────
export function trackFooterGithubClicked() {
  track("Landing Footer GitHub Clicked");
}
