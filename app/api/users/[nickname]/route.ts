import { getDb } from "@/app/_lib/server/firebase-admin";
import { withApi, ApiError } from "@/app/_lib/server/auth";
import type { PublicProfile } from "@/app/_lib/creation";

// GET /api/users/[nickname] — public profile lookup (no auth required).
export const GET = withApi(async (req) => {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const nickname = segments[segments.length - 1]?.toLowerCase();

  if (!nickname) {
    throw new ApiError(400, "missing_param", "Nickname is required.");
  }

  const db = getDb();

  // /nicknames/{nickname} → { userId }
  const nicknameSnap = await db.collection("nicknames").doc(nickname).get();
  if (!nicknameSnap.exists) {
    throw new ApiError(404, "not_found", `User @${nickname} not found.`);
  }

  const { userId } = nicknameSnap.data()!;
  const userSnap = await db.collection("users").doc(userId).get();

  if (!userSnap.exists) {
    throw new ApiError(404, "not_found", `User @${nickname} not found.`);
  }

  const data = userSnap.data()!;
  const profile: PublicProfile = {
    userId,
    nickname: data.nickname as string,
    displayName: data.displayName as string,
    avatarUrl: data.avatarUrl as string,
    bio: data.bio as string,
    publicCreationCount: data.publicCreationCount as number,
  };

  return Response.json(profile);
});
