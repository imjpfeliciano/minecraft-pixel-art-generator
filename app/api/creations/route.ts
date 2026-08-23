import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { nanoid } from "nanoid";
import { getDb, getBucket } from "@/app/_lib/server/firebase-admin";
import { requireUser, withApi, ApiError } from "@/app/_lib/server/auth";
import { resolveUser } from "@/app/_lib/server/identity";
import {
  validateTitle,
  validateDescription,
  validateTags,
  validateVisibility,
  toCreationJson,
  type Creation,
  type Orientation,
  type CreationFoundation,
} from "@/app/_lib/creation";

// ── GET /api/creations ────────────────────────────────────────────────────────
// Supports:
//   scope=public (default) | mine
//   tag=<slug>             (only for public scope)
//   cursor=<ISO string>    (publishedAt of last seen doc, for load-more)
//   limit=<n>              (default 24, max 48)
//
// Requires composite Firestore indexes:
//   (visibility ASC, publishedAt DESC)
//   (visibility ASC, tags ARRAY, publishedAt DESC)

export const GET = withApi(async (req: Request) => {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "public";
  const tag = url.searchParams.get("tag") ?? null;
  const cursor = url.searchParams.get("cursor") ?? null;
  const rawLimit = parseInt(url.searchParams.get("limit") ?? "24", 10);
  const limit = isNaN(rawLimit) ? 24 : Math.min(Math.max(rawLimit, 1), 48);

  const db = getDb();

  if (scope === "mine") {
    const user = await requireUser();
    const snap = await db
      .collection("creations")
      .where("authorId", "==", user.userId)
      .get();

    // Sort client-side to avoid requiring a composite index
    const creations = snap.docs
      .map((d) => toCreationJson({ id: d.id, ...d.data() } as Creation))
      .sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

    return Response.json({ creations, nextCursor: null });
  }

  // ── Public scope ─────────────────────────────────────────────────────────
  let q = db
    .collection("creations")
    .where("visibility", "==", "public") as FirebaseFirestore.Query;

  if (tag) {
    q = q.where("tags", "array-contains", tag);
  }

  q = q.orderBy("publishedAt", "desc");

  if (cursor) {
    const cursorDate = new Date(cursor);
    if (!isNaN(cursorDate.getTime())) {
      q = q.startAfter(Timestamp.fromDate(cursorDate));
    }
  }

  // Fetch one extra doc to determine if there is a next page
  q = q.limit(limit + 1);

  let snap;
  try {
    snap = await q.get();
  } catch (err: unknown) {
    // Firestore returns FAILED_PRECONDITION when the required composite index
    // doesn't exist yet. Return an empty list rather than crashing.
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("index") || msg.includes("FAILED_PRECONDITION")) {
      console.warn("[api/creations] Missing Firestore composite index:", msg);
      return Response.json({ creations: [], nextCursor: null });
    }
    throw err;
  }

  const hasMore = snap.docs.length > limit;
  const resultDocs = hasMore ? snap.docs.slice(0, limit) : snap.docs;
  const creations = resultDocs.map((d) =>
    toCreationJson({ id: d.id, ...d.data() } as Creation),
  );
  const nextCursor = hasMore ? creations[creations.length - 1].publishedAt : null;

  return Response.json({ creations, nextCursor });
});

export const POST = withApi(async (req: Request) => {
  const user = await requireUser();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    throw new ApiError(400, "bad_request", "Expected multipart/form-data.");
  }

  const metadataEntry = formData.get("metadata");
  const previewEntry = formData.get("preview");
  const gridEntry = formData.get("grid");

  if (typeof metadataEntry !== "string")
    throw new ApiError(400, "bad_request", "Missing metadata field.");
  if (!previewEntry || typeof previewEntry === "string")
    throw new ApiError(400, "bad_request", "Missing preview file.");
  if (!gridEntry || typeof gridEntry === "string")
    throw new ApiError(400, "bad_request", "Missing grid file.");

  let meta: Record<string, unknown>;
  try {
    meta = JSON.parse(metadataEntry);
  } catch {
    throw new ApiError(400, "bad_request", "metadata must be valid JSON.");
  }

  const title = validateTitle(meta.title);
  const description = validateDescription(meta.description);
  const tags = validateTags(meta.tags ?? []);
  const visibility = validateVisibility(meta.visibility);
  const orientation = (meta.orientation as Orientation) ?? "vertical";
  const width = typeof meta.width === "number" ? meta.width : 128;
  const height = typeof meta.height === "number" ? meta.height : 128;
  const schematicName =
    typeof meta.schematicName === "string" ? meta.schematicName : "PixelArt";
  const fillBlockId =
    typeof meta.fillBlockId === "string" && meta.fillBlockId !== ""
      ? meta.fillBlockId
      : null;
  const foundation = (meta.foundation as CreationFoundation) ?? {
    enabled: false,
    blockId: "minecraft:stone",
  };
  const blockCategories = Array.isArray(meta.blockCategories)
    ? (meta.blockCategories as string[])
    : [];

  if (visibility === "public" && !user.nickname) {
    throw new ApiError(
      409,
      "nickname_required",
      "Set a nickname before publishing publicly.",
    );
  }

  const creationId = nanoid();
  const bucket = getBucket();
  const db = getDb();

  const previewPath = `creations/${user.userId}/${creationId}/preview.png`;
  const gridPath = `creations/${user.userId}/${creationId}/grid.json.gz`;

  const [previewBuffer, gridBuffer] = await Promise.all([
    previewEntry.arrayBuffer().then(Buffer.from),
    gridEntry.arrayBuffer().then(Buffer.from),
  ]);

  const previewRef = bucket.file(previewPath);
  const gridRef = bucket.file(gridPath);

  await Promise.all([
    previewRef.save(previewBuffer, {
      metadata: { contentType: "image/png" },
      public: true,
    }),
    gridRef.save(gridBuffer, {
      metadata: { contentType: "application/gzip" },
    }),
  ]);

  const previewImageUrl = previewRef.publicUrl();
  const now = Timestamp.now();

  const creation: Creation = {
    id: creationId,
    authorId: user.userId,
    authorNickname: user.nickname,
    title,
    titleLowercase: title.toLowerCase(),
    description,
    tags,
    visibility,
    previewImageUrl,
    previewImagePath: previewPath,
    gridPath,
    width,
    height,
    blockCount: width * height,
    orientation,
    blockCategories,
    fillBlockId,
    foundation,
    schematicName,
    downloadCount: 0,
    publishedAt: visibility === "public" ? now : null,
    createdAt: now,
    updatedAt: now,
  };

  const userCountUpdate: Record<string, FieldValue> = {
    creationCount: FieldValue.increment(1),
  };
  if (visibility === "public") {
    userCountUpdate.publicCreationCount = FieldValue.increment(1);
  }

  await Promise.all([
    db.collection("creations").doc(creationId).set(creation),
    db.collection("users").doc(user.userId).update(userCountUpdate),
  ]);

  return Response.json({ id: creationId }, { status: 201 });
});
