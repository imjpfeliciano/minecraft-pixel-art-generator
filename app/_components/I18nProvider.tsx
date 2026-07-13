"use client";

import { useEffect } from "react";
import { NextIntlClientProvider } from "next-intl";
import { create } from "zustand";
import { DEFAULT_LOCALE, isValidLocale, type Locale } from "../_lib/i18n";
import en from "../../messages/en.json";
import es from "../../messages/es.json";

const LOCALE_KEY = "locale-preference";
const MESSAGES = { en, es } as const;

interface LocaleStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleStore>((set) => ({
  locale: DEFAULT_LOCALE,
  setLocale: (locale) => {
    localStorage.setItem(LOCALE_KEY, locale);
    document.documentElement.lang = locale;
    set({ locale });
  },
}));

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const { locale, setLocale } = useLocaleStore();

  useEffect(() => {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved && isValidLocale(saved)) {
      setLocale(saved);
    }
  }, [setLocale]);

  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}
