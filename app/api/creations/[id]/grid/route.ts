import "server-only";

import { getDb, getBucket } from "@/app/_lib/server/firebase-admin";
import { ApiError } from "@/app/_lib/server/auth";
import { resolveUser } from "@/app/_lib/server/identity";
import type { Creation } from "@/app/_lib/creation";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await resolveUser();
    const db = getDb();

    const doc = await db.collection("creations").doc(id).get();
    if (!doc.exists) throw new ApiError(404, "not_found", "Creation not found.");

    const creation = { id: doc.id, ...doc.data() } as Creation;

    if (creation.visibility === "private" && creation.authorId !== user?.userId) {
      throw new ApiError(403, "forbidden", "This creation is private.");
    }

    const bucket = getBucket();
    const [gridContents] = await bucket.file(creation.gridPath).download();

    return new Response(new Blob([gridContents as unknown as BlobPart]), {
      headers: {
        "Content-Type": "application/gzip",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    if (err instanceof ApiError) return err.toResponse();
    console.error("[api/creations/[id]/grid]", err);
    return new ApiError(500, "internal", "An unexpected error occurred.").toResponse();
  }
}
