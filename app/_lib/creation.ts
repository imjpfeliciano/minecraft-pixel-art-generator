import type { Timestamp } from "firebase-admin/firestore";
import { AVAILABLE_TAGS } from "./tags";

// ── User ──────────────────────────────────────────────────────────────────────

/**
 * Internal user record stored in Firestore /users/{userId}.
 * userId is a platform-generated nanoid — never a Clerk id.
 */
export interface UserProfile {
  userId: string;
  nickname: string | null;
  displayName: string;
  avatarUrl: string;
  email: string;
  emailHash: string;
  bio: string;
  creationCount: number;
  publicCreationCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Subset exposed on public-facing pages (/u/[nickname]). */
export interface PublicProfile {
  userId: string;
  nickname: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  publicCreationCount: number;
}

/** Shape returned by GET /api/me — Timestamps serialised to ISO strings. */
export interface UserProfileJson {
  userId: string;
  nickname: string | null;
  displayName: string;
  avatarUrl: string;
  bio: string;
  creationCount: number;
  publicCreationCount: number;
  createdAt: string;
  updatedAt: string;
}

export function toUserProfileJson(u: UserProfile): UserProfileJson {
  return {
    userId: u.userId,
    nickname: u.nickname,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    creationCount: u.creationCount,
    publicCreationCount: u.publicCreationCount,
    createdAt: u.createdAt.toDate().toISOString(),
    updatedAt: u.updatedAt.toDate().toISOString(),
  };
}

// ── Creation ──────────────────────────────────────────────────────────────────

export type Visibility = "public" | "private";
export type Orientation = "horizontal" | "vertical";

export interface CreationFoundation {
  enabled: boolean;
  blockId: string;
}

export interface CreationConfig {
  orientation: Orientation;
  width: number;
  height: number;
  schematicName: string;
  fillBlockId: string | null;
  foundation: CreationFoundation;
}

export interface Creation {
  id: string;
  authorId: string;
  authorNickname: string | null;
  title: string;
  titleLowercase: string;
  description: string;
  tags: string[];
  visibility: Visibility;
  previewImageUrl: string;
  previewImagePath: string;
  gridPath: string;
  width: number;
  height: number;
  blockCount: number;
  orientation: Orientation;
  blockCategories: string[];
  fillBlockId: string | null;
  foundation: CreationFoundation;
  schematicName: string;
  downloadCount: number;
  publishedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── Validators ────────────────────────────────────────────────────────────────

const AVAILABLE_TAG_SLUGS = new Set(AVAILABLE_TAGS.map((t) => t.slug));

export function validateTitle(v: unknown): string {
  if (typeof v !== "string" || v.trim().length === 0) throw new Error("Title is required.");
  if (v.trim().length > 80) throw new Error("Title must be 80 characters or fewer.");
  return v.trim();
}

export function validateDescription(v: unknown): string {
  if (v === undefined || v === null || v === "") return "";
  if (typeof v !== "string") throw new Error("Description must be a string.");
  if (v.length > 500) throw new Error("Description must be 500 characters or fewer.");
  return v.trim();
}

export function validateTags(v: unknown): string[] {
  if (!Array.isArray(v)) throw new Error("Tags must be an array.");
  if (v.length > 3) throw new Error("Maximum 3 tags allowed.");
  const invalid = v.filter((t) => !AVAILABLE_TAG_SLUGS.has(t));
  if (invalid.length > 0) throw new Error(`Unknown tag(s): ${invalid.join(", ")}`);
  return v as string[];
}

export function validateVisibility(v: unknown): Visibility {
  if (v !== "public" && v !== "private") throw new Error("Visibility must be 'public' or 'private'.");
  return v;
}

export function validateBio(v: unknown): string {
  if (v === undefined || v === null || v === "") return "";
  if (typeof v !== "string") throw new Error("Bio must be a string.");
  if (v.length > 300) throw new Error("Bio must be 300 characters or fewer.");
  return v.trim();
}

export function validateDisplayName(v: unknown): string {
  if (typeof v !== "string" || v.trim().length === 0) throw new Error("Display name is required.");
  if (v.trim().length > 60) throw new Error("Display name must be 60 characters or fewer.");
  return v.trim();
}
