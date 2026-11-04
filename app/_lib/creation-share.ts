import { trackCreationLinkCopied, type ShareSurface } from "./social-analytics";

/** Absolute URL of a creation's public page, using the current origin. */
export function creationShareUrl(id: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/creations/${id}`;
}

/** Copy the public page URL and record the share. Throws if the clipboard is unavailable. */
export async function copyCreationLink(id: string, surface: ShareSurface): Promise<void> {
  await navigator.clipboard.writeText(creationShareUrl(id));
  trackCreationLinkCopied(surface);
}

/**
 * Open the platform share sheet (mobile Discord, iMessage, WhatsApp).
 * Throws AbortError when the user dismisses the sheet — callers should ignore that.
 * Records the share only after the sheet succeeds.
 */
export async function shareCreationNative(
  id: string,
  title: string,
  surface: ShareSurface,
): Promise<void> {
  await navigator.share({ title, url: creationShareUrl(id) });
  trackCreationLinkCopied(surface);
}
