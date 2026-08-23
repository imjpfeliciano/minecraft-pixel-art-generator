"use client";

import { useTranslations } from "next-intl";

const VERSIONS = [
  {
    id: "v2",
    features: ["accounts", "save", "gallery", "profiles"] as const,
  },
  {
    id: "v1",
    features: ["converter", "export", "preview", "configure"] as const,
  },
] as const;

export default function ChangelogContent() {
  const t = useTranslations("Changelog");

  return (
    <main className="mx-auto max-w-3xl px-8 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
        {t("eyebrow")}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {t("title")}
      </h1>
      <p className="mt-3 text-gray-600 dark:text-gray-400">{t("subtitle")}</p>

      <div className="mt-12 space-y-14">
        {VERSIONS.map((version) => (
          <section key={version.id}>
            <div className="mb-6 flex items-baseline gap-3 border-b border-gray-200 pb-3 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {t(`${version.id}.label`)}
              </h2>
              <span className="text-sm text-gray-500">{t(`${version.id}.date`)}</span>
            </div>
            <ul className="space-y-5">
              {version.features.map((feature) => (
                <li key={feature}>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {t(`${version.id}.${feature}.title`)}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {t(`${version.id}.${feature}.summary`)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
