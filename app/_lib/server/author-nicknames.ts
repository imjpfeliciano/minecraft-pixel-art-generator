import "server-only";

import { getDb } from "./firebase-admin";
import { buildNicknameMap } from "../author-nicknames";
import { toCreationJson, type Creation, type CreationJson } from "../creation";

/**
 * Resolves each author's *current* nickname from `/users/{authorId}`.
 *
 * The handle is deliberately not denormalized onto the creation document: a
 * copy stamped at write time goes stale the moment a nickname is claimed or
 * changed, which is the bug this replaces. Resolving here means the displayed
 * handle and the `/u/{nickname}` link are always the live value.
 *
 * Ids are deduped, so a page of creations by a single author costs one read,
 * and the whole lookup is a single `getAll()` round-trip with a field mask.
 */
export async function resolveAuthorNicknames(
  authorIds: string[],
): Promise<Map<string, string | null>> {
  const unique = [...new Set(authorIds.filter(Boolean))];

  // Firestore.getAll() rejects a call with zero document references.
  if (unique.length === 0) return new Map();

  const db = getDb();
  const snaps = await db.getAll(
    ...unique.map((id) => db.collection("users").doc(id)),
    { fieldMask: ["nickname"] },
  );

  return buildNicknameMap(
    snaps.map((snap) => ({
      userId: snap.id,
      nickname: (snap.data()?.nickname as string | null | undefined) ?? null,
    })),
  );
}

/**
 * Serialises creations with their authors' current nicknames resolved.
 *
 * One batched lookup covers the whole list, so this is the intended entry
 * point for any read path that returns creations — reaching for
 * `toCreationJson` directly means resolving the handle yourself.
 */
export async function hydrateCreations(
  creations: Creation[],
): Promise<CreationJson[]> {
  const nicknames = await resolveAuthorNicknames(creations.map((c) => c.authorId));
  return creations.map((c) => toCreationJson(c, nicknames.get(c.authorId) ?? null));
}
