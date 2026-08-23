import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/app/_lib/server/firebase-admin";
import { requireUser, withApi, parseJsonBody, ApiError } from "@/app/_lib/server/auth";
import { claimNickname, NicknameTakenError } from "@/app/_lib/server/nicknames";
import {
  validateBio,
  validateDisplayName,
  toUserProfileJson,
} from "@/app/_lib/creation";

// GET /api/me — return the caller's internal UserProfile.
export const GET = withApi(async () => {
  const user = await requireUser();
  return Response.json(toUserProfileJson(user));
});

// PATCH /api/me — update bio, displayName, and/or claim a new nickname.
export const PATCH = withApi(async (req) => {
  const user = await requireUser();
  const body = await parseJsonBody(req);

  if (typeof body !== "object" || body === null) {
    throw new ApiError(400, "invalid_body", "Request body must be a JSON object.");
  }

  const patch = body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if ("displayName" in patch) {
    updates.displayName = validateDisplayName(patch.displayName);
  }

  if ("bio" in patch) {
    updates.bio = validateBio(patch.bio);
  }

  if ("nickname" in patch) {
    const desired = patch.nickname;
    if (typeof desired !== "string") {
      throw new ApiError(400, "validation_error", "Nickname must be a string.");
    }

    try {
      await claimNickname(user.userId, desired);
      // claimNickname already updates /users/{userId}.nickname in a transaction,
      // so we don't add it to `updates` — just flush the rest of the fields.
    } catch (err) {
      if (err instanceof NicknameTakenError) {
        throw new ApiError(409, "nickname_taken", err.message);
      }
      throw err;
    }
  }

  if (Object.keys(updates).length > 0) {
    const db = getDb();
    await db
      .collection("users")
      .doc(user.userId)
      .update({ ...updates, updatedAt: FieldValue.serverTimestamp() });
  }

  // Re-fetch the updated doc so the response reflects the final state.
  const db = getDb();
  const snap = await db.collection("users").doc(user.userId).get();
  const updated = { userId: user.userId, ...(snap.data()!) };

  return Response.json(toUserProfileJson(updated as Parameters<typeof toUserProfileJson>[0]));
});
