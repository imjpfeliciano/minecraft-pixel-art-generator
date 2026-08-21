import "server-only";

import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import { FieldValue } from "firebase-admin/firestore";
import { auth, currentUser, createClerkClient } from "@clerk/nextjs/server";
import { getDb } from "./firebase-admin";
import type { UserProfile } from "../creation";

// ── Helpers ───────────────────────────────────────────────────────────────────

function sha256hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function generateUserId(): string {
  return `usr_${nanoid(21)}`;
}

/**
 * The Clerk instance "environment" derived from the publishable key prefix.
 * Stored on /authLinks docs for debuggability only — has no functional role.
 */
function clerkInstance(): string {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  return key.startsWith("pk_live") ? "live" : "dev";
}

/**
 * Write the internal userId into Clerk's publicMetadata so that subsequent
 * requests can read it from the JWT claim (zero Firestore reads).
 * Fire-and-forget — failures are logged but never thrown.
 */
function cacheUserIdInClerk(clerkUserId: string, internalUserId: string): void {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  clerk.users
    .updateUserMetadata(clerkUserId, { publicMetadata: { appUserId: internalUserId } })
    .catch((err) => {
      console.warn("[identity] Failed to cache appUserId in Clerk publicMetadata:", err);
    });
}

// ── Reconciliation ────────────────────────────────────────────────────────────

/**
 * Full reconciliation flow for a Clerk identity that has no /authLinks entry.
 * Reads the Clerk user via currentUser() — only callable in server contexts.
 */
async function reconcileNewIdentity(
  clerkUserId: string,
  db: ReturnType<typeof getDb>,
): Promise<UserProfile> {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error("[identity] reconcileNewIdentity called without an active Clerk session.");
  }

  const displayName = clerkUser.fullName ?? clerkUser.username ?? "Anonymous";
  const avatarUrl = clerkUser.imageUrl ?? "";

  const primaryEmail = clerkUser.emailAddresses.find(
    (e) =>
      e.id === clerkUser.primaryEmailAddressId &&
      e.verification?.status === "verified",
  );

  let userId: string;

  if (primaryEmail) {
    const normalizedEmail = primaryEmail.emailAddress.toLowerCase().trim();
    const emailHash = sha256hex(normalizedEmail);

    // Transaction ensures exactly one internal user per verified email,
    // even under concurrent first-logins from different environments.
    userId = await db.runTransaction(async (tx) => {
      const emailIndexRef = db.collection("emailIndex").doc(emailHash);
      const emailIndexSnap = await tx.get(emailIndexRef);

      if (emailIndexSnap.exists) {
        // Another Clerk identity (e.g. the prod instance) already owns this email.
        return emailIndexSnap.data()!.userId as string;
      }

      const newUserId = generateUserId();
      const userRef = db.collection("users").doc(newUserId);
      const now = FieldValue.serverTimestamp();

      tx.set(userRef, {
        nickname: null,
        displayName,
        avatarUrl,
        email: normalizedEmail,
        emailHash,
        bio: "",
        creationCount: 0,
        publicCreationCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      tx.set(emailIndexRef, { userId: newUserId, updatedAt: now });

      return newUserId;
    });
  } else {
    // Unverified email — create a fresh user with no emailIndex entry.
    // A later user.updated webhook can link it once verification completes.
    userId = generateUserId();
    const now = FieldValue.serverTimestamp();

    await db.collection("users").doc(userId).set({
      nickname: null,
      displayName,
      avatarUrl,
      email: "",
      emailHash: "",
      bio: "",
      creationCount: 0,
      publicCreationCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Link this Clerk id → internal userId (idempotent; safe to run even if the
  // transaction above found an existing email owner).
  await db.collection("authLinks").doc(clerkUserId).set({
    userId,
    instanceId: clerkInstance(),
    linkedAt: FieldValue.serverTimestamp(),
  });

  // Cache the internal id into Clerk publicMetadata (best-effort).
  cacheUserIdInClerk(clerkUserId, userId);

  const userSnap = await db.collection("users").doc(userId).get();
  return { userId, ...(userSnap.data()!) } as UserProfile;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Maps the current Clerk session to an internal UserProfile.
 *
 * Resolution order (fastest → slowest):
 * 1. JWT claim  `sessionClaims.appUserId`  → 0 Firestore reads
 * 2. `/authLinks/{clerkId}`               → 1 read
 * 3. Full email reconciliation             → 1–3 reads + 1 transaction
 *
 * Returns `null` when there is no active session.
 *
 * ⚠️  Never expose the Clerk userId outside this module. All domain data
 * (creations, likes, etc.) must reference the internal `userId` only.
 */
export async function resolveUser(): Promise<UserProfile | null> {
  const { userId: clerkUserId, sessionClaims } = await auth();
  if (!clerkUserId) return null;

  const db = getDb();

  // ── Fast path: internal id already embedded in the JWT ───────────────────
  const claims = sessionClaims as Record<string, unknown> | null;
  const cachedUserId = typeof claims?.appUserId === "string" ? claims.appUserId : null;

  if (cachedUserId) {
    const userSnap = await db.collection("users").doc(cachedUserId).get();
    if (userSnap.exists) {
      return { userId: cachedUserId, ...(userSnap.data()!) } as UserProfile;
    }
    // Doc missing despite claim — fall through to re-reconcile.
  }

  // ── Mid path: authLinks doc exists ───────────────────────────────────────
  const authLinkSnap = await db.collection("authLinks").doc(clerkUserId).get();
  if (authLinkSnap.exists) {
    const { userId } = authLinkSnap.data()!;
    const userSnap = await db.collection("users").doc(userId).get();
    if (userSnap.exists) {
      if (!cachedUserId) cacheUserIdInClerk(clerkUserId, userId);
      return { userId, ...(userSnap.data()!) } as UserProfile;
    }
    // authLink exists but user doc is gone — re-reconcile.
  }

  // ── Slow path: first time this Clerk id is seen ──────────────────────────
  return reconcileNewIdentity(clerkUserId, db);
}
