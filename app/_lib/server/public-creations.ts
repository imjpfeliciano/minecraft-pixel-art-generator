import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import { getDb } from "./firebase-admin";
import { hydrateCreations } from "./author-nicknames";
import type { Creation, CreationJson } from "../creation";

/**
 * Cache tag for every public-creation listing. Write paths that can change
 * what appears in the gallery call `revalidateTag(PUBLIC_CREATIONS_TAG)`.
 *
 * Exported so no route hardcodes the string — a typo would fail silently,
 * leaving the listing stale until the TTL below expires.
 */
export const PUBLIC_CREATIONS_TAG = "creations:public";

/**
 * Backstop only. Correctness comes from `revalidateTag` on write; this bounds
 * staleness at five minutes if an invalidation is ever missed.
 */
const REVALIDATE_SECONDS = 300;

export interface PublicCreationsPage {
  creations: CreationJson[];
  nextCursor: string | null;
}

/**
 * The uncached query. Throws on failure rather than degrading, so that a
 * failure is never what gets stored — see `getPublicCreations`.
 *
 * Returns `CreationJson`, never `Creation`: the value crosses a cache boundary
 * and must be serializable, and `Creation` carries Firestore `Timestamp` class
 * instances, which are not.
 */
async function queryPublicCreations(
  tag: string | null,
  limit: number,
): Promise<PublicCreationsPage> {
  const db = getDb();

  let q = db
    .collection("creations")
    .where("visibility", "==", "public") as FirebaseFirestore.Query;

  if (tag) {
    q = q.where("tags", "array-contains", tag);
  }

  // One extra doc tells us whether a next page exists.
  q = q.orderBy("publishedAt", "desc").limit(limit + 1);

  const snap = await q.get();
  const hasMore = snap.docs.length > limit;
  const resultDocs = hasMore ? snap.docs.slice(0, limit) : snap.docs;

  const creations = await hydrateCreations(
    resultDocs.map((d) => ({ id: d.id, ...d.data() }) as Creation),
  );
  const nextCursor = hasMore ? creations[creations.length - 1].publishedAt : null;

  return { creations, nextCursor };
}

// `tag` and `limit` are arguments, so each filter and page size gets its own
// cache entry rather than sharing one.
const cachedQuery = unstable_cache(queryPublicCreations, ["public-creations"], {
  tags: [PUBLIC_CREATIONS_TAG],
  revalidate: REVALIDATE_SECONDS,
});

/**
 * Public creations, newest first, served from the Next data cache.
 *
 * The `FAILED_PRECONDITION` guard lives out here, outside the cached function,
 * on purpose: a rejection is not cached, so a missing composite index degrades
 * to an empty list on each request and recovers as soon as the index exists.
 * Catching inside would store the empty result for the full TTL.
 */
export async function getPublicCreations(
  tag: string | null,
  limit: number,
): Promise<PublicCreationsPage> {
  try {
    // `await` is load-bearing: returning the promise unawaited would let a
    // rejection escape the catch below.
    return await cachedQuery(tag, limit);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("index") || msg.includes("FAILED_PRECONDITION")) {
      console.warn("[public-creations] Missing Firestore composite index:", msg);
    } else {
      console.error("[public-creations] query failed:", err);
    }
    return { creations: [], nextCursor: null };
  }
}

/**
 * Drops the cached public listings after a write that changes them.
 *
 * `{ expire: 0 }` expires immediately rather than serving stale content once
 * more. Next's `updateTag` would be the read-your-own-writes tool, but it is
 * Server-Actions-only and every write path here is a Route Handler, so this is
 * the documented substitute.
 *
 * Note the second argument is required by the 16.2.9 types even though the
 * prose docs still show the one-argument form.
 */
export function revalidatePublicCreations(): void {
  revalidateTag(PUBLIC_CREATIONS_TAG, { expire: 0 });
}
