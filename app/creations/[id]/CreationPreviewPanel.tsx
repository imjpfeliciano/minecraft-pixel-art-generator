"use client";

import { useState, lazy, Suspense } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useTranslations } from "next-intl";
import PixelArtPreview from "../../_components/PixelArtPreview";
import { decodeGrid } from "../../_lib/creation-grid";
import type { CreationJson } from "../../_lib/creation";
import type { MinecraftBlock } from "../../_lib/blocks";
import { trackCreationPreviewTabChanged } from "../../_lib/social-analytics";

const SchematicViewer3D = dynamic(
  () => import("../../_components/SchematicViewer3D"),
  { ssr: false, loading: () => <ViewerLoading /> },
);

function ViewerLoading() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-gray-400 dark:text-zinc-500">
      Loading viewer…
    </div>
  );
}

type PreviewTab = "image" | "2d" | "3d";

interface CreationPreviewPanelProps {
  creation: CreationJson;
}

export default function CreationPreviewPanel({ creation }: CreationPreviewPanelProps) {
  const t = useTranslations("Page");
  const [tab, setTab] = useState<PreviewTab>("image");
  const [blockGrid, setBlockGrid] = useState<MinecraftBlock[][] | null>(null);
  const [isLoadingGrid, setIsLoadingGrid] = useState(false);
  const [gridError, setGridError] = useState(false);

  const ensureGrid = async () => {
    if (blockGrid || isLoadingGrid) return;
    setIsLoadingGrid(true);
    setGridError(false);
    try {
      const res = await fetch(`/api/creations/${creation.id}/grid`);
      if (!res.ok) throw new Error("fetch failed");
      const buf = await res.arrayBuffer();
      setBlockGrid(decodeGrid(new Uint8Array(buf)));
    } catch {
      setGridError(true);
    } finally {
      setIsLoadingGrid(false);
    }
  };

  const handleTabChange = async (next: PreviewTab) => {
    if (next !== "image") await ensureGrid();
    trackCreationPreviewTabChanged(next);
    setTab(next);
  };

  const TABS: { id: PreviewTab; label: string }[] = [
    { id: "image", label: "Image" },
    { id: "2d", label: t("view2d") },
    { id: "3d", label: t("view3d") },
  ];

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 dark:border-zinc-800">
      {/* Tab bar */}
      <div className="flex border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/60">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => handleTabChange(id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              tab === id
                ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 shadow-sm"
                : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Viewer area */}
      <div className="relative aspect-square w-full bg-gray-50 dark:bg-zinc-800 overflow-hidden">
        {tab === "image" && (
          <Image
            src={creation.previewImageUrl}
            alt={`Minecraft pixel art: ${creation.title}`}
            fill
            sizes="(max-width: 768px) 100vw, 55vw"
            className="object-contain"
            priority
            unoptimized
          />
        )}

        {tab !== "image" && (isLoadingGrid || !blockGrid) && (
          <div className="flex h-full items-center justify-center text-xs text-gray-400 dark:text-zinc-500">
            {gridError ? "Failed to load preview." : "Loading…"}
          </div>
        )}

        {tab === "2d" && blockGrid && (
          <PixelArtPreview
            blockGrid={blockGrid}
            isLoading={false}
            showGrid={false}
            onShowGridChange={() => {}}
            gridColor="#ffffff"
            onGridColorChange={() => {}}
            compareEnabled={false}
            onCompareEnabledChange={() => {}}
            originalImageUrl={null}
            toolbarMode="zoom-only"
          />
        )}

        {tab === "3d" && blockGrid && (
          <SchematicViewer3D
            blockGrid={blockGrid}
            orientation={creation.orientation}
            foundationEnabled={
              creation.orientation === "horizontal" && creation.foundation.enabled
            }
            foundationBlockId={creation.foundation.blockId}
          />
        )}
      </div>
    </div>
  );
}
