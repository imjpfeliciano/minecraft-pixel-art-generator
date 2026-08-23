"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { CreationJson } from "@/app/_lib/creation";
import { AVAILABLE_TAGS } from "@/app/_lib/tags";
import {
  trackCreationOpenedInEditor,
  trackCreationAuthorClicked,
} from "@/app/_lib/social-analytics";

interface CreationCardProps {
  creation: CreationJson;
  variant: "owner" | "public";
  onEdit?: (creation: CreationJson) => void;
  onDelete?: (id: string) => void;
  onToggleVisibility?: (creation: CreationJson) => void;
}

export default function CreationCard({
  creation,
  variant,
  onEdit,
  onDelete,
  onToggleVisibility,
}: CreationCardProps) {
  const t = useTranslations("CreationCard");

  const tagLabels = creation.tags
    .map((slug) => AVAILABLE_TAGS.find((t) => t.slug === slug)?.label)
    .filter(Boolean) as string[];

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-shadow hover:shadow-md">
      {/* Thumbnail */}
      <div className="relative aspect-square w-full overflow-hidden bg-gray-50 dark:bg-zinc-800">
        <Image
          src={creation.previewImageUrl}
          alt={creation.title}
          fill
          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
          className="object-cover transition-transform duration-200 group-hover:scale-105"
          unoptimized
        />

        {/* Visibility badge — owner only */}
        {variant === "owner" && (
          <span
            className={`absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
              creation.visibility === "public"
                ? "bg-green-500 text-white"
                : "bg-gray-800/70 text-gray-200"
            }`}
          >
            {creation.visibility === "public" ? t("visibilityPublic") : t("visibilityPrivate")}
          </span>
        )}

        {/* Owner action overlay — appears on hover */}
        {variant === "owner" && (
          <div className="absolute inset-0 flex flex-col items-end justify-end gap-1 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/50 to-transparent">
            {/* Open in editor */}
            <Link
              href={`/create?creation=${creation.id}`}
              title={t("openInEditor")}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-gray-700 hover:bg-white transition-colors"
              onClick={(e) => { e.stopPropagation(); trackCreationOpenedInEditor("dashboard"); }}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 3h3v3M13 3l-6 6M6 4H3v9h9v-3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            {/* Edit metadata */}
            {onEdit && (
              <button
                title={t("editButton")}
                onClick={() => onEdit(creation)}
                className="flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-gray-700 hover:bg-white transition-colors"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M11 2.5a1.5 1.5 0 012.12 2.12L5 13H3v-2L11 2.5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            {/* Publish / unpublish */}
            {onToggleVisibility && (
              <button
                title={creation.visibility === "public" ? t("unpublishButton") : t("publishButton")}
                onClick={() => onToggleVisibility(creation)}
                className="flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-gray-700 hover:bg-white transition-colors"
              >
                {creation.visibility === "public" ? (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" strokeLinecap="round" />
                    <circle cx="8" cy="8" r="1.5" />
                    <path d="M2 2l12 12" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" strokeLinecap="round" />
                    <circle cx="8" cy="8" r="1.5" />
                  </svg>
                )}
              </button>
            )}
            {/* Delete */}
            {onDelete && (
              <button
                title={t("deleteButton")}
                onClick={() => onDelete(creation.id)}
                className="flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-red-500 hover:bg-red-50 transition-colors"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 4h10M6 4V2h4v2M5 4v8a1 1 0 001 1h4a1 1 0 001-1V4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-1 p-2">
        <h3 className="line-clamp-1 text-xs font-semibold text-gray-900 dark:text-zinc-100">
          {creation.title}
        </h3>
        <p className="text-[10px] text-gray-400 dark:text-zinc-500">
          {t("dimensions", { w: creation.width, h: creation.height })}
        </p>
        {tagLabels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tagLabels.map((label) => (
              <span
                key={label}
                className="rounded-full bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] font-medium text-gray-600 dark:text-zinc-400"
              >
                {label}
              </span>
            ))}
          </div>
        )}
        {variant === "public" && creation.authorNickname && (
          <Link
            href={`/u/${creation.authorNickname}`}
            className="text-[10px] text-grass hover:underline"
            onClick={trackCreationAuthorClicked}
          >
            @{creation.authorNickname}
          </Link>
        )}
      </div>
    </div>
  );
}
