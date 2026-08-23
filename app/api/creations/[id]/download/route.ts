import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/app/_lib/server/firebase-admin";
import { ApiError } from "@/app/_lib/server/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = getDb();

    const doc = await db.collection("creations").doc(id).get();
    if (!doc.exists) throw new ApiError(404, "not_found", "Creation not found.");

    await db.collection("creations").doc(id).update({
      downloadCount: FieldValue.increment(1),
    });

    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof ApiError) return err.toResponse();
    console.error("[api/creations/[id]/download]", err);
    return new ApiError(500, "internal", "An unexpected error occurred.").toResponse();
  }
}
