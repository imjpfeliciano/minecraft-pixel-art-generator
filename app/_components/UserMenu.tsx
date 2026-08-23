"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useTheme, type ThemePreference } from "./ThemeProvider";
import { useLocaleStore } from "./I18nProvider";
import type { Locale } from "../_lib/i18n";

interface Props {
  variant: "nav" | "sidebar";
}

interface MeData {
  nickname: string | null;
  displayName: string;
}

export default function UserMenu({ variant }: Props) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const t = useTranslations("UserMenu");
  const [me, setMe] = useState<MeData | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: MeData | null) => { if (data) setMe(data); })
      .catch(() => {});
  }, [user]);

  const { preference, setPreference } = useTheme();
  const { locale, setLocale } = useLocaleStore();

  if (!isLoaded || !user) return null;

  const displayName = user.fullName ?? user.username ?? me?.displayName ?? "Anonymous";
  const nickname = me?.nickname ?? null;
  const avatarUrl = user.imageUrl;
  const avatarSize = variant === "nav" ? 32 : 36;

  const dropdownSide = variant === "sidebar" ? "top" : "bottom";
  const dropdownAlign = variant === "sidebar" ? "start" : "end";

  return (
    <DropdownMenu>
      {variant === "nav" ? (
        <DropdownMenuTrigger
          render={
            <button
              aria-label={displayName}
              className="rounded-full ring-2 ring-transparent transition-all hover:ring-grass focus-visible:outline-none focus-visible:ring-grass"
            />
          }
        >
          <Image
            src={avatarUrl}
            alt={displayName}
            width={avatarSize}
            height={avatarSize}
            className="rounded-full object-cover"
          />
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger
          render={
            <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800" />
          }
        >
          <Image
            src={avatarUrl}
            alt={displayName}
            width={avatarSize}
            height={avatarSize}
            className="shrink-0 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
              {displayName}
            </p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {nickname ? `@${nickname}` : "–"}
            </p>
          </div>
          <svg
            className="h-4 w-4 shrink-0 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
          </svg>
        </DropdownMenuTrigger>
      )}

      <DropdownMenuContent
        side={dropdownSide}
        align={dropdownAlign}
        className="w-56 bg-white shadow-xl ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700"
      >
        {/* Identity header */}
        <div className="flex items-center gap-3 px-2 py-2">
          <Image
            src={avatarUrl}
            alt={displayName}
            width={40}
            height={40}
            className="shrink-0 rounded-full object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
              {displayName}
            </p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {nickname ? `@${nickname}` : "–"}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator />

        {nickname && (
          <DropdownMenuItem
            className="cursor-pointer text-gray-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-gray-800"
            onClick={() => router.push(`/u/${nickname}`)}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            {t("myProfile")}
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          className="cursor-pointer text-gray-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-gray-800"
          onClick={() => router.push("/dashboard")}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          {t("myCreations")}
        </DropdownMenuItem>

        {!nickname && (
          <DropdownMenuItem
            className="cursor-pointer text-grass hover:bg-grass/10 dark:text-grass dark:hover:bg-grass/20"
            onClick={() => router.push("/onboarding")}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
            {t("setNickname")} →
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Preferences */}
        <div className="px-2 py-2 flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500">
            Preferences
          </p>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 dark:text-zinc-400">Theme</span>
            <div className="flex w-full overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-600 text-xs font-medium">
              {(["light", "dark", "system"] as ThemePreference[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setPreference(v)}
                  className={`flex-1 py-1.5 capitalize transition-colors ${
                    preference === v
                      ? "bg-gray-200 text-gray-900 dark:bg-zinc-600 dark:text-zinc-100"
                      : "text-gray-500 hover:text-gray-700 dark:text-zinc-300 dark:hover:text-zinc-100"
                  }`}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500 dark:text-zinc-400">Language</span>
            <div className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-600 text-xs font-medium">
              {(["en", "es"] as Locale[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setLocale(v)}
                  className={`px-3 py-1.5 uppercase transition-colors ${
                    locale === v
                      ? "bg-gray-200 text-gray-900 dark:bg-zinc-600 dark:text-zinc-100"
                      : "text-gray-500 hover:text-gray-700 dark:text-zinc-300 dark:hover:text-zinc-100"
                  }`}
                  aria-pressed={locale === v}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
          onClick={() => signOut()}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
