"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import HeroComparison from "./HeroComparison";
import { useSectionTracking } from "../../_lib/hooks/useSectionTracking";
import { trackHeroCtaClicked } from "../../_lib/landing-analytics";

export default function HeroSection() {
  const t = useTranslations("Landing");
  const sectionRef = useSectionTracking("hero");

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="hero-pixel-grid relative overflow-hidden bg-gray-50 py-20 dark:bg-gray-900"
    >
      {/* Radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-1/2 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-grass/10 blur-3xl"
      />

      <div className="relative mx-auto flex max-w-7xl items-center gap-16 px-8">
        {/* ── Left column ── */}
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <div className="flex flex-col gap-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-grass">
              {t("heroEyebrow")}
            </span>
            <h1 className="text-5xl font-bold leading-tight tracking-tight text-gray-900 dark:text-gray-100">
              {t("heroHeadline")}{" "}
              <span className="text-grass">{t("heroHeadlineHighlight")}</span>{" "}
              {t("heroHeadlineSuffix")}
            </h1>
            <p className="text-lg leading-relaxed text-gray-600 dark:text-gray-400">
              {t.rich("heroSubheadline", {
                code: (chunks) => (
                  <code className="rounded bg-gray-200 px-1.5 py-0.5 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {chunks}
                  </code>
                ),
              })}
            </p>
          </div>

          {/* CTA */}
          <div>
            <Link
              href="/create"
              onClick={trackHeroCtaClicked}
              className="inline-flex items-center gap-2 rounded-xl bg-grass px-7 py-4 text-base font-semibold text-white shadow-lg shadow-grass/20 transition-all hover:bg-grass-hover hover:shadow-grass/30 active:scale-95"
            >
              {t("heroCtaLabel")}
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

        </div>

        {/* ── Right column: demo ── */}
        <div className="shrink-0">
          <HeroComparison />
          <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-600">
            {t("heroCompareHint")}
          </p>
        </div>
      </div>
    </section>
  );
}
