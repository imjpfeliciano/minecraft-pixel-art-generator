/**
 * Assembles the authorId → nickname lookup from already-fetched user records.
 *
 * Pure, and deliberately kept out of `_lib/server` so it is testable: that
 * module imports `server-only`, which throws outside a Server Component and
 * therefore cannot be loaded by the node-environment unit suite.
 *
 * A missing user record and an unclaimed nickname both collapse to `null` —
 * callers render nothing rather than a `/u/` link that would 404.
 */
export function buildNicknameMap(
  entries: Array<{ userId: string; nickname: string | null }>,
): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const { userId, nickname } of entries) {
    map.set(userId, nickname ?? null);
  }
  return map;
}
