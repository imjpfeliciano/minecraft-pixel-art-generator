"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import CreationCard from "../_components/CreationCard";
import { AVAILABLE_TAGS } from "../_lib/tags";
import type { CreationJson } from "../_lib/creation";
import {
  trackGalleryTagFiltered,
  trackGalleryLoadMoreClicked,
  trackGalleryCreationOpened,
} from "../_lib/social-analytics";

interface GalleryContentProps {
  initialCreations: CreationJson[];
  initialNextCursor: string | null;
  initialTag: string | null;
}

export default function GalleryContent({
  initialCreations,
  initialNextCursor,
  initialTag,
}: GalleryContentProps) {
  const t = useTranslations("Gallery");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [creations, setCreations] = useState<CreationJson[]>(initialCreations);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isLoading, setIsLoading] = useState(false);
  const activeTag = searchParams.get("tag") ?? null;

  const handleTagClick = (slug: string | null) => {
    trackGalleryTagFiltered(slug ?? "all");
    const params = new URLSearchParams();
    if (slug) params.set("tag", slug);
    router.push(`/gallery${slug ? `?${params.toString()}` : ""}`);
  };

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || isLoading) return;
    trackGalleryLoadMoreClicked(creations.length);
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        scope: "public",
        cursor: nextCursor,
        limit: "24",
      });
      if (activeTag) params.set("tag", activeTag);
      const res = await fetch(`/api/creations?${params.toString()}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as { creations: CreationJson[]; nextCursor: string | null };
      setCreations((prev) => [...prev, ...data.creations]);
      setNextCursor(data.nextCursor);
    } catch {
      // silently ignore — user can retry
    } finally {
      setIsLoading(false);
    }
  }, [nextCursor, isLoading, activeTag, creations.length]);

  // Reset state when the tag param changes (server re-renders with new initialCreations)
  // Using initialTag prop change detection via a key on the parent handles this.

  return (
    <>
      {/* Header */}
      <div className="mb-10">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-500">
          {t("eyebrow")}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-gray-500 dark:text-zinc-400">{t("subheading")}</p>
      </div>

      {/* Tag filter chips */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <button
          onClick={() => handleTagClick(null)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            !activeTag
              ? "bg-grass text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          }`}
        >
          {t("filterAll")}
        </button>
        {AVAILABLE_TAGS.map((tag) => (
          <button
            key={tag.slug}
            onClick={() => handleTagClick(tag.slug)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTag === tag.slug
                ? "bg-grass text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            {tag.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {creations.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="text-gray-500 dark:text-zinc-400">
            {activeTag ? t("emptyFiltered") : t("empty")}
          </p>
          <Link
            href="/create"
            className="rounded-lg bg-grass px-5 py-2.5 text-sm font-semibold text-white hover:bg-grass-hover transition-colors"
          >
            {t("startCreating")}
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {creations.map((creation, index) => (
              <Link
                key={creation.id}
                href={`/creations/${creation.id}`}
                className="block"
                onClick={() => trackGalleryCreationOpened(index)}
              >
                <CreationCard creation={creation} variant="public" />
              </Link>
            ))}
          </div>

          {nextCursor && (
            <div className="mt-10 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="rounded-lg border border-gray-200 dark:border-zinc-700 px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                {isLoading ? t("loading") : t("loadMore")}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
