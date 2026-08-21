"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import Image from "next/image";

/** Client-side slug: mirrors the server-side suggestNickname logic. */
function clientSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
}

type AvailabilityState = "idle" | "checking" | "available" | "taken" | "invalid";

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const t = useTranslations("Onboarding");

  const [nickname, setNickname] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [availability, setAvailability] = useState<AvailabilityState>("idle");
  const [availabilityReason, setAvailabilityReason] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seed initial values from the API + Clerk.
  useEffect(() => {
    if (!isLoaded || !user) return;

    setDisplayName(user.fullName ?? user.username ?? "");

    // If already has nickname, redirect away.
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        if (!me) return;
        if (me.nickname) {
          router.replace("/dashboard");
          return;
        }
        const suggested = clientSlug(
          user.fullName ?? user.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "",
        );
        if (suggested.length >= 3) setNickname(suggested);
      })
      .catch(() => {});
  }, [isLoaded, user, router]);

  // Debounced availability check whenever nickname changes.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = nickname.trim();
    if (trimmed.length < 3) {
      setAvailability("idle");
      setAvailabilityReason(null);
      return;
    }

    setAvailability("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/me/nickname-available?value=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (!data.available && data.reason) {
          setAvailability("invalid");
          setAvailabilityReason(data.reason);
        } else if (data.available) {
          setAvailability("available");
          setAvailabilityReason(null);
        } else {
          setAvailability("taken");
          setAvailabilityReason(null);
        }
      } catch {
        setAvailability("idle");
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [nickname]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (availability !== "available" || saving) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          displayName: displayName.trim() || undefined,
          bio: bio.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error?.message ?? "Something went wrong. Please try again.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = availability === "available" && !saving;

  const availabilityLabel =
    availability === "checking"
      ? t("checking")
      : availability === "available"
        ? t("available")
        : availability === "taken"
          ? t("taken")
          : availability === "invalid"
            ? (availabilityReason ?? t("taken"))
            : null;

  const availabilityColor =
    availability === "available"
      ? "text-green-600 dark:text-green-400"
      : availability === "taken" || availability === "invalid"
        ? "text-red-500 dark:text-red-400"
        : "text-gray-400";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Avatar */}
        {isLoaded && user?.imageUrl && (
          <div className="mb-6 flex justify-center">
            <Image
              src={user.imageUrl}
              alt={user.fullName ?? "Avatar"}
              width={64}
              height={64}
              className="rounded-full ring-4 ring-grass/20"
            />
          </div>
        )}

        <h1 className="mb-1 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t("title")}
        </h1>
        <p className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nickname */}
          <div>
            <label
              htmlFor="nickname"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t("nicknameLabel")}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                @
              </span>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.toLowerCase())}
                placeholder={t("nicknamePlaceholder")}
                maxLength={30}
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pr-3 pl-7 text-sm text-gray-900 placeholder:text-gray-400 focus:border-grass focus:outline-none focus:ring-2 focus:ring-grass/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            {availabilityLabel && (
              <p className={`mt-1.5 text-xs ${availabilityColor}`}>{availabilityLabel}</p>
            )}
            {!availabilityLabel && (
              <p className="mt-1.5 text-xs text-gray-400">{t("nicknameHint")}</p>
            )}
          </div>

          {/* Display name */}
          <div>
            <label
              htmlFor="displayName"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t("displayNameLabel")}
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={60}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-grass focus:outline-none focus:ring-2 focus:ring-grass/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          {/* Bio */}
          <div>
            <label
              htmlFor="bio"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t("bioLabel")}
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("bioPlaceholder")}
              maxLength={300}
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-grass focus:outline-none focus:ring-2 focus:ring-grass/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-lg bg-grass px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-grass-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? t("saving") : t("save")}
          </button>
        </form>
      </div>
    </div>
  );
}
