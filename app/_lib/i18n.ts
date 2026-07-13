export type Locale = "en" | "es";

export const DEFAULT_LOCALE: Locale = "en";

export const SUPPORTED_LOCALES: Locale[] = ["en", "es"];

export function isValidLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}
