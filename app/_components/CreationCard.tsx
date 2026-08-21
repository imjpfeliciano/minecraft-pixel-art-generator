"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { CreationJson } from "@/app/_lib/creation";
import { AVAILABLE_TAGS } from "@/app/_lib/tags";

interface CreationCardProps {
  creation: CreationJson;
  variant: "owner" | "public";
  onDelete?: (id: string) => void;
}

export default function CreationCard({
  creation,
  variant,
  onDelete,
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
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-200 group-hover:scale-105"
          unoptimized
        />

        {/* Visibility badge — owner only */}
        {variant === "owner" && (
          <span
            className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              creation.visibility === "public"
                ? "bg-green-500 text-white"
                : "bg-gray-800/70 text-gray-200"
            }`}
          >
            {creation.visibility === "public"
              ? t("visibilityPublic")
              : t("visibilityPrivate")}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-1.5 p-2">
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

        {/* Public author credit */}
        {variant === "public" && creation.authorNickname && (
          <Link
            href={`/u/${creation.authorNickname}`}
            className="mt-auto text-[10px] text-grass hover:underline"
          >
            @{creation.authorNickname}
          </Link>
        )}

        {/* Owner actions */}
        {variant === "owner" && onDelete && (
          <div className="mt-auto flex items-center justify-end">
            <button
              onClick={() => onDelete(creation.id)}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
            >
              {t("deleteButton")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
