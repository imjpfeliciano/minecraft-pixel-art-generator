import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb, getBucket } from "@/app/_lib/server/firebase-admin";
import { requireUser, ApiError } from "@/app/_lib/server/auth";
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
import { nanoid } from "nanoid";

// ── Shared error wrapper ───────────────────────────────────────────────────────

async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) return err.toResponse();
    console.error("[api/creations/[id]]", err);
    return new ApiError(500, "internal", "An unexpected error occurred.").toResponse();
  }
}

// ── GET /api/creations/[id] ───────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const { id } = await params;
    const user = await resolveUser();
    const db = getDb();

    const doc = await db.collection("creations").doc(id).get();
    if (!doc.exists) throw new ApiError(404, "not_found", "Creation not found.");

    const creation = { id: doc.id, ...doc.data() } as Creation;

    if (creation.visibility === "private" && creation.authorId !== user?.userId) {
      throw new ApiError(403, "forbidden", "This creation is private.");
    }

    return Response.json(toCreationJson(creation));
  });
}

// ── PATCH /api/creations/[id] ─────────────────────────────────────────────────
// Accepts either:
//   • multipart/form-data  with fields: metadata (JSON), preview (File), grid (File)
//   • application/json     with fields: title, description, tags, visibility

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const { id } = await params;
    const user = await requireUser();
    const db = getDb();

    const doc = await db.collection("creations").doc(id).get();
    if (!doc.exists) throw new ApiError(404, "not_found", "Creation not found.");

    const existing = { id: doc.id, ...doc.data() } as Creation;
    if (existing.authorId !== user.userId) {
      throw new ApiError(403, "forbidden", "You don't own this creation.");
    }

    const contentType = req.headers.get("content-type") ?? "";
    const isMultipart = contentType.includes("multipart/form-data");

    let meta: Record<string, unknown>;
    let previewEntry: Blob | null = null;
    let gridEntry: Blob | null = null;

    if (isMultipart) {
      let formData: FormData;
      try {
        formData = await req.formData();
      } catch {
        throw new ApiError(400, "bad_request", "Expected multipart/form-data.");
      }
      const metaStr = formData.get("metadata");
      if (typeof metaStr !== "string")
        throw new ApiError(400, "bad_request", "Missing metadata field.");
      try {
        meta = JSON.parse(metaStr);
      } catch {
        throw new ApiError(400, "bad_request", "metadata must be valid JSON.");
      }
      const pe = formData.get("preview");
      const ge = formData.get("grid");
      if (pe && typeof pe !== "string") previewEntry = pe;
      if (ge && typeof ge !== "string") gridEntry = ge;
    } else {
      try {
        meta = (await req.json()) as Record<string, unknown>;
      } catch {
        throw new ApiError(400, "bad_request", "Request body must be valid JSON.");
      }
    }

    const updates: Partial<Creation> & Record<string, unknown> = {};

    if (meta.title !== undefined) {
      const title = validateTitle(meta.title);
      updates.title = title;
      updates.titleLowercase = title.toLowerCase();
    }
    if (meta.description !== undefined) {
      updates.description = validateDescription(meta.description);
    }
    if (meta.tags !== undefined) {
      updates.tags = validateTags(meta.tags);
    }
    if (meta.visibility !== undefined) {
      const newVis = validateVisibility(meta.visibility);
      if (newVis === "public" && !user.nickname) {
        throw new ApiError(409, "nickname_required", "Set a nickname before publishing publicly.");
      }
      updates.visibility = newVis;
      if (newVis === "public" && !existing.publishedAt) {
        updates.publishedAt = Timestamp.now();
      }
    }

    // Re-upload assets when full multipart form is sent
    if (isMultipart && (meta.orientation || meta.width || meta.height)) {
      if (meta.orientation) updates.orientation = meta.orientation as Orientation;
      if (typeof meta.width === "number") updates.width = meta.width;
      if (typeof meta.height === "number") updates.height = meta.height;
      if (typeof meta.width === "number" && typeof meta.height === "number")
        updates.blockCount = (meta.width as number) * (meta.height as number);
      if (typeof meta.schematicName === "string") updates.schematicName = meta.schematicName;
      updates.fillBlockId = typeof meta.fillBlockId === "string" && meta.fillBlockId !== "" ? meta.fillBlockId : null;
      if (meta.foundation) updates.foundation = meta.foundation as CreationFoundation;
      if (Array.isArray(meta.blockCategories)) updates.blockCategories = meta.blockCategories as string[];

      const bucket = getBucket();
      if (previewEntry) {
        const previewBuffer = Buffer.from(await previewEntry.arrayBuffer());
        await bucket.file(existing.previewImagePath).save(previewBuffer, {
          metadata: { contentType: "image/png" },
          public: true,
        });
      }
      if (gridEntry) {
        const gridBuffer = Buffer.from(await gridEntry.arrayBuffer());
        await bucket.file(existing.gridPath).save(gridBuffer, {
          metadata: { contentType: "application/gzip" },
        });
      }
    }

    updates.updatedAt = Timestamp.now();

    // Sync publicCreationCount when visibility changes
    const wasPublic = existing.visibility === "public";
    const isNowPublic = updates.visibility === "public";
    const wasNowPrivate = updates.visibility === "private";

    const counterUpdates: Record<string, FieldValue> = {};
    if (wasPublic && wasNowPrivate) counterUpdates.publicCreationCount = FieldValue.increment(-1);
    else if (!wasPublic && isNowPublic) counterUpdates.publicCreationCount = FieldValue.increment(1);

    await Promise.all([
      db.collection("creations").doc(id).update(updates),
      Object.keys(counterUpdates).length > 0
        ? db.collection("users").doc(user.userId).update(counterUpdates)
        : Promise.resolve(),
    ]);

    return Response.json({ ok: true });
  });
}

// ── DELETE /api/creations/[id] ────────────────────────────────────────────────

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const { id } = await params;
    const user = await requireUser();
    const db = getDb();
    const bucket = getBucket();

    const doc = await db.collection("creations").doc(id).get();
    if (!doc.exists) throw new ApiError(404, "not_found", "Creation not found.");

    const creation = { id: doc.id, ...doc.data() } as Creation;
    if (creation.authorId !== user.userId) {
      throw new ApiError(403, "forbidden", "You don't own this creation.");
    }

    await Promise.all([
      bucket.file(creation.previewImagePath).delete().catch(() => {}),
      bucket.file(creation.gridPath).delete().catch(() => {}),
      db.collection("creations").doc(id).delete(),
    ]);

    const counterUpdates: Record<string, FieldValue> = {
      creationCount: FieldValue.increment(-1),
    };
    if (creation.visibility === "public") {
      counterUpdates.publicCreationCount = FieldValue.increment(-1);
    }
    await db.collection("users").doc(user.userId).update(counterUpdates);

    return Response.json({ ok: true });
  });
}
