import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "./firebase-admin";

// ── Constants ─────────────────────────────────────────────────────────────────

const NICKNAME_RE = /^[a-z0-9_-]{3,30}$/;

const RESERVED = new Set([
  "admin",
  "api",
  "create",
  "creations",
  "dashboard",
  "explore",
  "gallery",
  "me",
  "onboarding",
  "settings",
  "sign-in",
  "sign-up",
  "u",
  "users",
  "verify",
  "minecraft",
]);

// ── Validation ────────────────────────────────────────────────────────────────

export interface NicknameValidationResult {
  ok: boolean;
  reason?: string;
}

/**
 * Pure format check — no database lookups.
 * Allowed: lowercase letters, digits, underscore, hyphen; 3–30 chars.
 */
export function validateNickname(value: string): NicknameValidationResult {
  const normalized = value.toLowerCase().trim();

  if (!NICKNAME_RE.test(normalized)) {
    return {
      ok: false,
      reason:
        "Nickname must be 3–30 characters and contain only lowercase letters, digits, underscores, or hyphens.",
    };
  }

  if (RESERVED.has(normalized)) {
    return { ok: false, reason: "That nickname is reserved." };
  }

  return { ok: true };
}

// ── Suggestions ───────────────────────────────────────────────────────────────

/**
 * Derive a candidate nickname from an email local part or display name.
 * The result passes the regex but may still be taken — callers should check.
 */
export function suggestNickname(source: string): string {
  const slug = source
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-") // non-allowed chars → hyphen
    .replace(/-+/g, "-")            // collapse runs
    .replace(/^-+|-+$/g, "")       // trim edges
    .slice(0, 20);

  if (slug.length < 3) {
    return slug.padEnd(3, "0");
  }

  return slug;
}

// ── Availability ──────────────────────────────────────────────────────────────

/**
 * Returns `true` if the nickname is syntactically valid, not reserved,
 * and not already taken in the database.
 */
export async function isNicknameAvailable(value: string): Promise<boolean> {
  const check = validateNickname(value);
  if (!check.ok) return false;

  const db = getDb();
  const snap = await db.collection("nicknames").doc(value.toLowerCase()).get();
  return !snap.exists;
}

// ── Transactional claim ───────────────────────────────────────────────────────

export class NicknameTakenError extends Error {
  constructor(nickname: string) {
    super(`Nickname "${nickname}" is already taken.`);
    this.name = "NicknameTakenError";
  }
}

/**
 * Atomically claims `nickname` for `userId`.
 *
 * - Validates format + reserved-word list.
 * - Runs a Firestore transaction to enforce uniqueness.
 * - Releases the user's current nickname inside the same transaction.
 * - Updates `/users/{userId}.nickname`.
 *
 * Throws `NicknameTakenError` if the nickname is already owned by someone else.
 * Throws `Error` with a human-readable message on format failures.
 */
export async function claimNickname(
  userId: string,
  desiredNickname: string,
): Promise<void> {
  const normalized = desiredNickname.toLowerCase().trim();
  const check = validateNickname(normalized);
  if (!check.ok) throw new Error(check.reason);

  const db = getDb();
  const nicknameRef = db.collection("nicknames").doc(normalized);
  const userRef = db.collection("users").doc(userId);

  await db.runTransaction(async (tx) => {
    const [nicknameSnap, userSnap] = await Promise.all([tx.get(nicknameRef), tx.get(userRef)]);

    if (nicknameSnap.exists && nicknameSnap.data()!.userId !== userId) {
      throw new NicknameTakenError(normalized);
    }

    const currentNickname: string | null = userSnap.data()?.nickname ?? null;

    // Release the old nickname doc if it differs.
    if (currentNickname && currentNickname !== normalized) {
      tx.delete(db.collection("nicknames").doc(currentNickname));
    }

    tx.set(nicknameRef, { userId });
    tx.update(userRef, { nickname: normalized, updatedAt: FieldValue.serverTimestamp() });
  });
}

/**
 * Releases a nickname owned by `userId` (used when a user deletes their account
 * or an admin forcibly removes a nickname).
 */
export async function releaseNickname(userId: string, nickname: string): Promise<void> {
  const db = getDb();
  const nicknameRef = db.collection("nicknames").doc(nickname.toLowerCase());
  const userRef = db.collection("users").doc(userId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(nicknameRef);
    if (snap.exists && snap.data()!.userId === userId) {
      tx.delete(nicknameRef);
    }
    tx.update(userRef, { nickname: null, updatedAt: FieldValue.serverTimestamp() });
  });
}
