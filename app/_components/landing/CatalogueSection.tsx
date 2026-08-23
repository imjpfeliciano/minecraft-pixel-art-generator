"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useSectionTracking } from "../../_lib/hooks/useSectionTracking";
import type { CreationJson } from "../../_lib/creation";
import { AVAILABLE_TAGS } from "../../_lib/tags";

interface CatalogueSectionProps {
  creations: CreationJson[];
}

function CreationPreviewCard({ creation }: { creation: CreationJson }) {
  const tagLabels = creation.tags
    .map((slug) => AVAILABLE_TAGS.find((t) => t.slug === slug)?.label)
    .filter(Boolean) as string[];

  return (
    <Link
      href={`/creations/${creation.id}`}
      className="group overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
        <Image
          src={creation.previewImageUrl}
          alt={`Minecraft pixel art: ${creation.title}`}
          fill
          sizes="(max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          unoptimized
        />
      </div>
      <div className="flex flex-col gap-2 p-4">
        <h3 className="line-clamp-1 font-semibold text-gray-900 dark:text-gray-100">
          {creation.title}
        </h3>
        {creation.authorNickname && (
          <p className="text-sm text-grass">@{creation.authorNickname}</p>
        )}
        {tagLabels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tagLabels.map((label) => (
              <span
                key={label}
                className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400"
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function CatalogueSection({ creations }: CatalogueSectionProps) {
  const t = useTranslations("Landing");
  const sectionRef = useSectionTracking("catalogue");

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="bg-white py-20 dark:bg-gray-900"
    >
      <div className="mx-auto max-w-7xl px-8">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            {t("catalogueSectionLabel")}
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {t("catalogueHeading")}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">{t("catalogueSubheading")}</p>
        </div>

        {creations.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">
              No creations published yet — be the first!
            </p>
            <Link
              href="/create"
              className="rounded-lg bg-grass px-5 py-2.5 text-sm font-semibold text-white hover:bg-grass-hover transition-colors"
            >
              {t("navCta")}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-6">
              {creations.map((creation) => (
                <CreationPreviewCard key={creation.id} creation={creation} />
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <Link
                href="/gallery"
                className="rounded-lg border border-gray-200 dark:border-gray-700 px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {t("catalogueViewAll")}
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
