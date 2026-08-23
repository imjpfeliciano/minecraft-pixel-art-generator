"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Show, SignInButton } from "@clerk/nextjs";
import UserMenu from "./UserMenu";
import ThemeToggle from "./ThemeToggle";
import LocaleSwitcher from "./LocaleSwitcher";
import { trackNavCreateClicked, trackNavCtaClicked } from "../_lib/landing-analytics";
import NewBadge from "./NewBadge";

export default function NavBar() {
  const t = useTranslations("Landing");

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-grass text-white transition-colors group-hover:bg-grass-hover">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v10H7V7zm2 2v6h6V9H9z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            mc-pixel app
          </span>
        </Link>

        {/* Center nav */}
        <div className="flex items-center gap-1">
          <Link
            href="/create"
            onClick={trackNavCreateClicked}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            {t("navCreate")}
          </Link>
          <Link
            href="/gallery"
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            {t("navGallery")}
            <NewBadge />
          </Link>
          <Link
            href="/changelog"
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            {t("navChangelog")}
          </Link>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          <Show when="signed-out">
            <LocaleSwitcher />
            <ThemeToggle />
            <SignInButton mode="modal">
              <button className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100">
                {t("signIn")}
                <NewBadge />
              </button>
            </SignInButton>
            <Link
              href="/create"
              onClick={trackNavCtaClicked}
              className="rounded-lg bg-grass px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-grass-hover"
            >
              {t("navCta")}
            </Link>
          </Show>
          <Show when="signed-in">
            <UserMenu variant="nav" />
          </Show>
        </div>
      </div>
    </nav>
  );
}
