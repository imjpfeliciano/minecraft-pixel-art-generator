"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import CreationCard from "@/app/_components/CreationCard";
import SaveCreationModal from "@/app/_components/SaveCreationModal";
import {
  trackCreationVisibilityToggled,
  trackCreationDeleted,
} from "@/app/_lib/social-analytics";
import type { CreationJson } from "@/app/_lib/creation";

interface DashboardGridProps {
  initialCreations: CreationJson[];
}

export default function DashboardGrid({ initialCreations }: DashboardGridProps) {
  const t = useTranslations("Dashboard");
  const [creations, setCreations] = useState<CreationJson[]>(initialCreations);
  const [editingCreation, setEditingCreation] = useState<CreationJson | null>(null);

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    const res = await fetch(`/api/creations/${id}`, { method: "DELETE" });
    if (res.ok) {
      trackCreationDeleted();
      setCreations((prev) => prev.filter((c) => c.id !== id));
    }
  }

  // ── Publish / unpublish ─────────────────────────────────────────────────────

  async function handleToggleVisibility(creation: CreationJson) {
    const newVisibility = creation.visibility === "public" ? "private" : "public";

    // Optimistic update
    setCreations((prev) =>
      prev.map((c) => (c.id === creation.id ? { ...c, visibility: newVisibility } : c)),
    );

    const res = await fetch(`/api/creations/${creation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: newVisibility }),
    });

    if (res.ok) {
      trackCreationVisibilityToggled(newVisibility);
    } else {
      // Revert on error
      setCreations((prev) =>
        prev.map((c) => (c.id === creation.id ? { ...c, visibility: creation.visibility } : c)),
      );
    }
  }

  // ── Edit (metadata saved) ───────────────────────────────────────────────────

  function handleSaved(updatedId: string) {
    // Re-fetch the updated creation and patch it into the list
    fetch(`/api/creations/${updatedId}`)
      .then((r) => r.json())
      .then((updated: CreationJson) => {
        setCreations((prev) =>
          prev.map((c) => (c.id === updatedId ? updated : c)),
        );
      })
      .catch(() => {});
    setEditingCreation(null);
  }

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (creations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-700">
          <svg className="h-8 w-8 text-gray-300 dark:text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v10H7V7zm2 2v6h6V9H9z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-gray-700 dark:text-zinc-300">{t("emptyHeading")}</p>
          <p className="mt-1 text-sm text-gray-400 dark:text-zinc-500">{t("emptyBody")}</p>
        </div>
        <Link
          href="/create"
          className="rounded-xl bg-grass px-5 py-2.5 text-sm font-semibold text-white hover:bg-grass-hover transition-colors"
        >
          {t("emptyCta")}
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <p className="text-sm text-gray-400 dark:text-zinc-500">
          {t("creationCount", { count: creations.length })}
        </p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {creations.map((creation) => (
            <CreationCard
              key={creation.id}
              creation={creation}
              variant="owner"
              onEdit={setEditingCreation}
              onDelete={handleDelete}
              onToggleVisibility={handleToggleVisibility}
            />
          ))}
        </div>
      </div>

      {/* Edit modal */}
      <SaveCreationModal
        open={editingCreation !== null}
        onClose={() => setEditingCreation(null)}
        existingCreation={editingCreation ?? undefined}
        onSaved={handleSaved}
      />
    </>
  );
}
