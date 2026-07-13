"use client";

import { useTranslations } from "next-intl";
import { useTheme, type ThemePreference } from "./ThemeProvider";

export default function ThemeToggle() {
  const t = useTranslations("ThemeToggle");
  const { preference, setPreference } = useTheme();

  const OPTIONS: { value: ThemePreference; label: string }[] = [
    { value: "light", label: t("light") },
    { value: "dark", label: t("dark") },
    { value: "system", label: t("system") },
  ];

  return (
    <div className="flex items-center rounded-lg border border-gray-200 dark:border-zinc-700 overflow-hidden text-xs font-medium">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => setPreference(value)}
          className={`px-2.5 py-1 transition-colors ${
            preference === value
              ? "bg-gray-200 text-gray-900 dark:bg-zinc-700 dark:text-zinc-100"
              : "text-gray-500 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          }`}
          title={t("switchTo", { label })}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
