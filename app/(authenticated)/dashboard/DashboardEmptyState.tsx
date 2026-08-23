"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function DashboardEmptyState() {
  const t = useTranslations("Dashboard");

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-gray-100">
        {t("title")}
      </h1>

      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-24 text-center dark:border-gray-800">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-grass/10 dark:bg-grass/20">
          <svg
            className="h-8 w-8 text-grass"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v10H7V7zm2 2v6h6V9H9z" />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t("emptyHeading")}
        </h2>
        <p className="mb-6 max-w-xs text-sm text-gray-500 dark:text-gray-400">
          {t("emptyBody")}
        </p>
        <Link
          href="/create"
          className="rounded-lg bg-grass px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-grass-hover"
        >
          {t("emptyCta")} →
        </Link>
      </div>
    </div>
  );
}
