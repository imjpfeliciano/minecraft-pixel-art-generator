"use client";

import { useLocaleStore } from "./I18nProvider";
import type { Locale } from "../_lib/i18n";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
];

export default function LocaleSwitcher() {
  const { locale, setLocale } = useLocaleStore();

  return (
    <div className="flex items-center rounded-lg border border-gray-200 dark:border-zinc-700 overflow-hidden text-xs font-medium">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => setLocale(value)}
          className={`px-2.5 py-1 transition-colors ${
            locale === value
              ? "bg-gray-200 text-gray-900 dark:bg-zinc-700 dark:text-zinc-100"
              : "text-gray-500 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          }`}
          aria-pressed={locale === value}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
