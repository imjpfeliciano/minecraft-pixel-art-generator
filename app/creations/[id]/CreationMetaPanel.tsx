"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import DownloadCreationButton from "./DownloadCreationButton";
import { AVAILABLE_TAGS } from "../../_lib/tags";
import type { CreationJson } from "../../_lib/creation";

interface CreationMetaPanelProps {
  creation: CreationJson;
  tagLabels: string[];
  publishedDate: string | null;
}

export default function CreationMetaPanel({
  creation,
  tagLabels,
  publishedDate,
}: CreationMetaPanelProps) {
  const t = useTranslations("CreationDetail");

  return (
    <div className="flex flex-col gap-6">
      {/* Title + author */}
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

      {/* Description */}
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
          <p className="text-xs text-gray-500 dark:text-zinc-500">{t("sizeLabel")}</p>
          <p className="font-semibold">{t("sizeValue", { w: creation.width, h: creation.height })}</p>
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-zinc-800 px-4 py-3">
          <p className="text-xs text-gray-500 dark:text-zinc-500">{t("orientationLabel")}</p>
          <p className="font-semibold capitalize">{creation.orientation}</p>
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-zinc-800 px-4 py-3">
          <p className="text-xs text-gray-500 dark:text-zinc-500">{t("downloadsLabel")}</p>
          <p className="font-semibold">{creation.downloadCount}</p>
        </div>
        {publishedDate && (
          <div className="rounded-xl bg-gray-50 dark:bg-zinc-800 px-4 py-3">
            <p className="text-xs text-gray-500 dark:text-zinc-500">{t("publishedAt")}</p>
            <p className="font-semibold">{publishedDate}</p>
          </div>
        )}
      </div>

      <DownloadCreationButton creation={creation} />

      <Link
        href="/create"
        className="text-center rounded-lg border border-gray-200 dark:border-zinc-700 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
      >
        {t("createYourOwn")}
      </Link>
    </div>
  );
}
