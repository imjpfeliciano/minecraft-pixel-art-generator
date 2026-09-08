"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: "light",
  setPreference: () => {},
  resolvedTheme: "light",
});

export function useTheme() {
  return useContext(ThemeContext);
}

const STORAGE_KEY = "theme-preference";

function isPreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * The preference and the OS colour scheme are both **external stores**, not React
 * state, so they are read with `useSyncExternalStore` rather than copied into
 * `useState` by a mount effect.
 *
 * That matters here beyond tidiness. The server renders `<html class>` from the
 * `theme-preference` cookie, so the first client render must match it — a lazy
 * `useState` initializer reading `localStorage` would produce a hydration
 * mismatch. `useSyncExternalStore` takes an explicit server snapshot and
 * re-renders after hydration instead.
 */

// `storage` only fires in *other* tabs, so same-tab writes notify explicitly.
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribePreference(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isPreference(stored) ? stored : "light";
}

function subscribeSystemTheme(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Both stores fall back to light on the server; the cookie drives the pre-paint class. */
const serverPreference = (): ThemePreference => "light";
const serverSystemTheme = (): "light" | "dark" => "light";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useSyncExternalStore(
    subscribePreference,
    getPreference,
    serverPreference,
  );
  const systemTheme = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemTheme,
    serverSystemTheme,
  );

  // Derived during render — no second state to keep in sync.
  const resolvedTheme = preference === "system" ? systemTheme : preference;

  // Mirror the preference into a cookie so the server can set the `dark` class
  // on <html> before paint. Writing it is a side effect, so it stays in an effect.
  useEffect(() => {
    document.cookie = `${STORAGE_KEY}=${preference};path=/;max-age=31536000;SameSite=Lax`;
  }, [preference]);

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setPreference = useCallback((pref: ThemePreference) => {
    localStorage.setItem(STORAGE_KEY, pref);
    emit();
  }, []);

  const value = useMemo(
    () => ({ preference, setPreference, resolvedTheme }),
    [preference, setPreference, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}
