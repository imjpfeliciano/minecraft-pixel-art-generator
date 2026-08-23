import { Suspense } from "react";
import type { Metadata } from "next";
import { Timestamp } from "firebase-admin/firestore";
import NavBar from "../_components/NavBar";
import Footer from "../_components/landing/Footer";
import GalleryContent from "./GalleryContent";
import { getDb } from "../_lib/server/firebase-admin";
import { toCreationJson, type Creation } from "../_lib/creation";
import type { CreationJson } from "../_lib/creation";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mc-pixel.app";
const PAGE_SIZE = 24;

export const metadata: Metadata = {
  title: "Community Gallery | mc-pixel",
  description: "Browse Minecraft pixel art schematics created by the community. Download free .litematic files for Litematica.",
  openGraph: {
    title: "Community Gallery | mc-pixel",
    description: "Browse Minecraft pixel art schematics created by the community.",
    url: `${SITE_URL}/gallery`,
  },
  twitter: {
    title: "Community Gallery | mc-pixel",
    description: "Browse Minecraft pixel art schematics created by the community.",
  },
};

async function fetchPublicCreations(
  tag: string | null,
): Promise<{ creations: CreationJson[]; nextCursor: string | null }> {
  const db = getDb();

  try {
    let q = db
      .collection("creations")
      .where("visibility", "==", "public") as FirebaseFirestore.Query;

    if (tag) {
      q = q.where("tags", "array-contains", tag);
    }

    q = q.orderBy("publishedAt", "desc").limit(PAGE_SIZE + 1);

    const snap = await q.get();
    const hasMore = snap.docs.length > PAGE_SIZE;
    const resultDocs = hasMore ? snap.docs.slice(0, PAGE_SIZE) : snap.docs;
    const creations = resultDocs.map((d) =>
      toCreationJson({ id: d.id, ...d.data() } as Creation),
    );
    const nextCursor = hasMore ? creations[creations.length - 1].publishedAt : null;
    return { creations, nextCursor };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("index") || msg.includes("FAILED_PRECONDITION")) {
      console.warn("[gallery] Missing Firestore composite index:", msg);
    } else {
      console.error("[gallery] fetchPublicCreations error:", err);
    }
    return { creations: [], nextCursor: null };
  }
}

interface GalleryPageProps {
  searchParams: Promise<{ tag?: string }>;
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const { tag } = await searchParams;
  const activeTag = tag && tag.length > 0 ? tag : null;

  const { creations, nextCursor } = await fetchPublicCreations(activeTag);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <NavBar />
      <main className="mx-auto max-w-7xl min-h-[calc(100vh-64px)] px-8 py-12">
        {/* Header */}
        <div className="mb-10">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Community
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Community Gallery</h1>
          <p className="mt-2 text-gray-500 dark:text-zinc-400">
            Browse pixel art schematics — download as .litematic files.
          </p>
        </div>

        <Suspense>
          <GalleryContent
            key={activeTag ?? "__all__"}
            initialCreations={creations}
            initialNextCursor={nextCursor}
            initialTag={activeTag}
          />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
