import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import NavBar from "../../_components/NavBar";
import Footer from "../../_components/landing/Footer";
import DownloadCreationButton from "./DownloadCreationButton";
import CreationPreviewPanel from "./CreationPreviewPanel";
import { getDb } from "../../_lib/server/firebase-admin";
import { resolveUser } from "../../_lib/server/identity";
import { toCreationJson, type Creation } from "../../_lib/creation";
import { AVAILABLE_TAGS } from "../../_lib/tags";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mc-pixel.app";

interface CreationDetailProps {
  params: Promise<{ id: string }>;
}

async function getCreation(id: string) {
  const db = getDb();
  const doc = await db.collection("creations").doc(id).get();
  if (!doc.exists) return null;
  return toCreationJson({ id: doc.id, ...doc.data() } as Creation);
}

export async function generateMetadata({ params }: CreationDetailProps): Promise<Metadata> {
  const { id } = await params;
  const creation = await getCreation(id);

  if (!creation || creation.visibility === "private") {
    // Private creation — still return a noindex metadata (page.tsx handles 404 for non-owners)
    return {
      title: "Creation | mc-pixel",
      robots: { index: false, follow: false },
    };
  }

  const title = `${creation.title} | mc-pixel`;
  const description = creation.description
    ? creation.description.slice(0, 160)
    : `Minecraft pixel art: ${creation.title} — ${creation.width}×${creation.height} blocks. Download the .litematic schematic.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/creations/${id}`,
      images: [
        {
          url: creation.previewImageUrl,
          width: creation.width * 4,
          height: creation.height * 4,
          alt: `Minecraft pixel art: ${creation.title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [creation.previewImageUrl],
    },
  };
}

export default async function CreationDetailPage({ params }: CreationDetailProps) {
  const { id } = await params;
  const creation = await getCreation(id);

  if (!creation) notFound();

  // Private creations — check ownership
  if (creation.visibility === "private") {
    // We only do the heavy identity resolve when necessary
    const { sessionClaims } = await auth();
    const claims = sessionClaims as Record<string, unknown> | null;
    const cachedUserId = typeof claims?.appUserId === "string" ? claims.appUserId : null;

    const isOwner =
      cachedUserId === creation.authorId ||
      // Fall back to full resolve only if no cached claim
      (!cachedUserId && (await resolveUser())?.userId === creation.authorId);

    if (!isOwner) notFound();
  }

  const tagLabels = creation.tags
    .map((slug) => AVAILABLE_TAGS.find((t) => t.slug === slug)?.label)
    .filter(Boolean) as string[];

  const publishedDate = creation.publishedAt
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
        new Date(creation.publishedAt),
      )
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: creation.title,
    description: creation.description || undefined,
    image: creation.previewImageUrl,
    url: `${SITE_URL}/creations/${id}`,
    creator: creation.authorNickname
      ? {
          "@type": "Person",
          name: creation.authorNickname,
          url: `${SITE_URL}/u/${creation.authorNickname}`,
        }
      : undefined,
    datePublished: creation.publishedAt ?? undefined,
    keywords: tagLabels.join(", ") || undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <NavBar />
        <main className="mx-auto max-w-7xl px-8 py-12">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[2fr_1fr]">
            {/* Preview panel — Image / 2D / 3D tabs */}
            <CreationPreviewPanel creation={creation} />

            {/* Meta panel */}
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{creation.title}</h1>
                {creation.authorNickname && (
                  <Link
                    href={`/u/${creation.authorNickname}`}
                    className="mt-1 text-sm text-grass hover:underline"
                  >
                    @{creation.authorNickname}
                  </Link>
                )}
              </div>

              {creation.description && (
                <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed">
                  {creation.description}
                </p>
              )}

              {/* Tags */}
              {tagLabels.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tagLabels.map((label) => (
                    <Link
                      key={label}
                      href={`/gallery?tag=${AVAILABLE_TAGS.find((t) => t.label === label)?.slug}`}
                      className="rounded-full bg-gray-100 dark:bg-zinc-800 px-3 py-1 text-xs font-medium text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-gray-50 dark:bg-zinc-800 px-4 py-3">
                  <p className="text-xs text-gray-500 dark:text-zinc-500">Size</p>
                  <p className="font-semibold">
                    {creation.width} × {creation.height} blocks
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-zinc-800 px-4 py-3">
                  <p className="text-xs text-gray-500 dark:text-zinc-500">Orientation</p>
                  <p className="font-semibold capitalize">{creation.orientation}</p>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-zinc-800 px-4 py-3">
                  <p className="text-xs text-gray-500 dark:text-zinc-500">Downloads</p>
                  <p className="font-semibold">{creation.downloadCount}</p>
                </div>
                {publishedDate && (
                  <div className="rounded-xl bg-gray-50 dark:bg-zinc-800 px-4 py-3">
                    <p className="text-xs text-gray-500 dark:text-zinc-500">Published</p>
                    <p className="font-semibold">{publishedDate}</p>
                  </div>
                )}
              </div>

              <DownloadCreationButton creation={creation} />

              <Link
                href="/create"
                className="text-center rounded-lg border border-gray-200 dark:border-zinc-700 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Create your own →
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
