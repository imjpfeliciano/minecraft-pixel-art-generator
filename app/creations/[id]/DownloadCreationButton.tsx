"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { decodeGrid } from "../../_lib/creation-grid";
import { downloadLitematic, generateLitematic } from "../../_lib/litematic-generator";
import type { CreationJson } from "../../_lib/creation";
import {
  trackCreationDownloaded,
  trackCreationDownloadFailed,
} from "../../_lib/social-analytics";

interface DownloadCreationButtonProps {
  creation: CreationJson;
}

export default function DownloadCreationButton({ creation }: DownloadCreationButtonProps) {
  const t = useTranslations("CreationDetail");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setError(null);

    try {
      // Fetch the gzipped grid from the API
      const res = await fetch(`/api/creations/${creation.id}/grid`);
      if (!res.ok) throw new Error("Failed to fetch grid");
      const gridBuffer = await res.arrayBuffer();

      // Decode the grid and regenerate the litematic client-side
      const blockGrid = decodeGrid(new Uint8Array(gridBuffer));
      const litematic = generateLitematic(
        blockGrid,
        creation.orientation,
        creation.schematicName,
        creation.foundation.enabled
          ? { blockId: creation.foundation.blockId }
          : undefined,
      );

      const filename = creation.schematicName.endsWith(".litematic")
        ? creation.schematicName
        : `${creation.schematicName}.litematic`;
      downloadLitematic(litematic, filename);

      trackCreationDownloaded({
        width: creation.width,
        height: creation.height,
        orientation: creation.orientation,
      });

      // Fire-and-forget download count increment
      fetch(`/api/creations/${creation.id}/download`, { method: "POST" }).catch(() => {});
    } catch {
      trackCreationDownloadFailed();
      setError(t("downloadError"));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleDownload}
        disabled={isGenerating}
        className="inline-flex items-center gap-2 rounded-lg bg-grass px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-grass-hover disabled:opacity-60"
      >
        {isGenerating ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {t("downloading")}
          </>
        ) : (
          <>
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 2v8M5 7l3 3 3-3M3 12h10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("downloadButton")}
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
