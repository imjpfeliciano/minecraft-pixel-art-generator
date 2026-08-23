"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { trackFooterGithubClicked } from "../../_lib/landing-analytics";

export default function Footer() {
  const t = useTranslations("Landing");

  return (
    <footer className="border-t border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-grass text-white">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v10H7V7zm2 2v6h6V9H9z" />
            </svg>
          </div>
          <span className="text-sm text-gray-500">
            {t("footerCopyright", { year: new Date().getFullYear() })}
          </span>
        </div>

        <div className="flex items-center gap-6">
          <Link
            href="/changelog"
            className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-600 dark:hover:text-gray-300"
          >
            {t("footerChangelog")}
          </Link>
          <Link
            href="https://github.com/imjpfeliciano/minecraft-pixel-art-generator"
            target="_blank"
            rel="noopener noreferrer"
            onClick={trackFooterGithubClicked}
            className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            {t("footerGithub")}
          </Link>
          <span className="text-sm text-gray-500 dark:text-gray-600">{t("footerLicense")}</span>
          <Link
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-600 dark:hover:text-gray-300"
          >
            {t("footerDeployedOn")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
