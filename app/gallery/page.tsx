import { Suspense } from "react";
import type { Metadata } from "next";
import NavBar from "../_components/NavBar";
import Footer from "../_components/landing/Footer";
import GalleryContent from "./GalleryContent";
import { getPublicCreations } from "../_lib/server/public-creations";

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

interface GalleryPageProps {
  searchParams: Promise<{ tag?: string }>;
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const { tag } = await searchParams;
  const activeTag = tag && tag.length > 0 ? tag : null;

  const { creations, nextCursor } = await getPublicCreations(activeTag, PAGE_SIZE);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <NavBar />
      <main className="mx-auto max-w-7xl min-h-[calc(100vh-64px)] px-8 py-12">
        <Suspense>
          <GalleryContent
            key={activeTag ?? "__all__"}
            initialCreations={creations}
            initialNextCursor={nextCursor}
          />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
