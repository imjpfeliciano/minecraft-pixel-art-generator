"use client";

import { useTranslations } from "next-intl";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { useSectionTracking } from "../../_lib/hooks/useSectionTracking";

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800/50">
      <div className="h-48 bg-gray-200 dark:bg-gray-700/50" />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="flex gap-2">
          <div className="h-3 w-12 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-12 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    </div>
  );
}

const FILTER_CHIPS = ["Animals", "Landscapes", "Portraits", "Gaming", "Anime"];

export default function CatalogueSection() {
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

        {/* Filter bar (disabled — coming soon) */}
        <div
          className="mb-8 flex items-center gap-3 opacity-50"
          title={t("catalogueFilterTooltip")}
        >
          <Input
            placeholder={t("catalogueSearchPlaceholder")}
            disabled
            className="max-w-sm cursor-not-allowed border-gray-300 bg-gray-100 text-gray-500 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:placeholder:text-gray-600"
          />
          <div className="flex items-center gap-2">
            {FILTER_CHIPS.map((chip) => (
              <Badge
                key={chip}
                variant="outline"
                className="cursor-not-allowed border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-500"
              >
                {chip}
              </Badge>
            ))}
          </div>
          <select
            disabled
            className="ml-auto cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500"
          >
            <option>{t("catalogueSortMostLiked")}</option>
            <option>{t("catalogueSortNewest")}</option>
            <option>{t("catalogueSortMostForked")}</option>
          </select>
        </div>

        {/* Skeleton grid with coming-soon overlay */}
        <div className="relative">
          <div className="grid grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>

          {/* Frosted overlay */}
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-sm dark:bg-gray-900/70">
            <div className="flex flex-col items-center gap-3 text-center">
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                {t("catalogueComingSoonBadge")}
              </Badge>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("catalogueComingSoonText")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
