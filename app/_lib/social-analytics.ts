import { track } from "@vercel/analytics";

// ─── Shared types ─────────────────────────────────────────────────────────────

export type SaveMode = "create" | "edit";
export type Visibility = "private" | "public";
export type PreviewTab = "image" | "2d" | "3d";
export type SaveFailReason = "validation" | "server" | "network";

// ─── Creation lifecycle (SaveCreationModal) ───────────────────────────────────

export function trackCreationSaveOpened(mode: SaveMode) {
  track("Creation Save Opened", { mode });
}

export function trackCreationSaved(p: {
  mode: SaveMode;
  visibility: Visibility;
  tagsCount: number;
  width: number;
  height: number;
  orientation: string;
  hasDescription: boolean;
}) {
  track("Creation Saved", {
    mode: p.mode,
    visibility: p.visibility,
    tags_count: p.tagsCount,
    width: p.width,
    height: p.height,
    orientation: p.orientation,
    has_description: p.hasDescription,
  });
}

export function trackCreationSaveFailed(mode: SaveMode, reason: SaveFailReason) {
  track("Creation Save Failed", { mode, reason });
}

export function trackCreationPublishBlocked() {
  track("Creation Publish Blocked");
}

export function trackCreationSignInPrompted() {
  track("Creation Sign In Prompted");
}

// ─── Dashboard (DashboardGrid) ────────────────────────────────────────────────

export function trackCreationVisibilityToggled(to: Visibility) {
  track("Creation Visibility Toggled", { to });
}

export function trackCreationDeleted() {
  track("Creation Deleted");
}

// ─── Cards (CreationCard) ─────────────────────────────────────────────────────

export function trackCreationOpenedInEditor(source: "dashboard") {
  track("Creation Opened In Editor", { source });
}

export function trackCreationAuthorClicked() {
  track("Creation Author Clicked");
}

// ─── Gallery (GalleryContent) ─────────────────────────────────────────────────

export function trackGalleryTagFiltered(tag: string) {
  track("Gallery Tag Filtered", { tag });
}

export function trackGalleryLoadMoreClicked(loadedCount: number) {
  track("Gallery Load More Clicked", { loaded_count: loadedCount });
}

export function trackGalleryCreationOpened(position: number) {
  track("Gallery Creation Opened", { position });
}

// ─── Creation detail (DownloadCreationButton, CreationPreviewPanel) ───────────

export function trackCreationDownloaded(p: {
  width: number;
  height: number;
  orientation: string;
}) {
  track("Creation Downloaded", {
    width: p.width,
    height: p.height,
    orientation: p.orientation,
  });
}

export function trackCreationDownloadFailed() {
  track("Creation Download Failed");
}

export function trackCreationPreviewTabChanged(tab: PreviewTab) {
  track("Creation Preview Tab Changed", { tab });
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export function trackOnboardingNicknameClaimed(p: {
  hasDisplayName: boolean;
  hasBio: boolean;
}) {
  track("Onboarding Nickname Claimed", {
    has_display_name: p.hasDisplayName,
    has_bio: p.hasBio,
  });
}

export function trackOnboardingNicknameClaimFailed() {
  track("Onboarding Nickname Claim Failed");
}
