import { notFound } from "next/navigation";
import { getDb } from "@/app/_lib/server/firebase-admin";
import { hydrateCreations } from "@/app/_lib/server/author-nicknames";
import { type Creation } from "@/app/_lib/creation";
import {
  renderShareCard,
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
} from "@/app/_lib/share-card";

export const alt = "Minecraft pixel art";
export const size = { width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT };
export const contentType = "image/png";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OgImageProps {
  params: Promise<{ id: string }>;
}

export default async function Image({ params }: OgImageProps) {
  const { id } = await params;
  const doc = await getDb().collection("creations").doc(id).get();
  if (!doc.exists) notFound();

  const data = doc.data();
  if (!data || data.visibility !== "public") notFound();

  const [creation] = await hydrateCreations([
    { id: doc.id, ...data } as Creation,
  ]);
  if (!creation.previewImageUrl) notFound();

  const previewRes = await fetch(creation.previewImageUrl, { cache: "no-store" });
  if (!previewRes.ok) notFound();

  const png = await renderShareCard({
    preview: Buffer.from(await previewRes.arrayBuffer()),
    title: creation.title,
    nickname: creation.authorNickname,
  });

  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
}
