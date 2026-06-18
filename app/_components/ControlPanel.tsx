"use client";

import { GENERATION_BLOCK_CATEGORIES, GENERATION_BLOCKS } from "../_lib/blocks";
import type { Orientation } from "../_lib/litematic-generator";

interface Props {
  width: number;
  height: number;
  orientation: Orientation;
  selectedCategories: Set<string>;
  onWidthChange: (v: number) => void;
  onHeightChange: (v: number) => void;
  onOrientationChange: (v: Orientation) => void;
  onCategoryToggle: (cat: string) => void;
  onGenerate: () => void;
  isProcessing: boolean;
  hasImage: boolean;
}

export default function ControlPanel({
  width,
  height,
  orientation,
  selectedCategories,
  onWidthChange,
  onHeightChange,
  onOrientationChange,
  onCategoryToggle,
  onGenerate,
  isProcessing,
  hasImage,
}: Props) {
  const categoryCounts = GENERATION_BLOCK_CATEGORIES.map((cat) => ({
    cat,
    count: GENERATION_BLOCKS.filter((b) => b.category === cat).length,
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Dimensions */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
          Dimensions (blocks)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Width</span>
            <input
              type="number"
              min={1}
              max={512}
              value={width}
              onChange={(e) => onWidthChange(Math.max(1, Math.min(512, Number(e.target.value))))}
              className="
                rounded-lg border border-zinc-700 bg-zinc-800
                px-3 py-2 text-sm text-zinc-100
                focus:border-green-500 focus:outline-none
              "
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Height</span>
            <input
              type="number"
              min={1}
              max={512}
              value={height}
              onChange={(e) => onHeightChange(Math.max(1, Math.min(512, Number(e.target.value))))}
              className="
                rounded-lg border border-zinc-700 bg-zinc-800
                px-3 py-2 text-sm text-zinc-100
                focus:border-green-500 focus:outline-none
              "
            />
          </label>
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          Total: {(width * height).toLocaleString()} blocks
        </p>
      </section>

      {/* Orientation */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
          Orientation
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {(["horizontal", "vertical"] as Orientation[]).map((o) => (
            <button
              key={o}
              onClick={() => onOrientationChange(o)}
              className={`
                flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-medium transition-colors
                ${orientation === o
                  ? "border-green-500 bg-green-950/50 text-green-400"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500"
                }
              `}
            >
              {o === "horizontal" ? (
                <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
                  <rect x="2" y="18" width="28" height="6" rx="1" fill="currentColor" opacity="0.4" />
                  <rect x="6" y="20" width="20" height="4" rx="0.5" fill="currentColor" />
                  <text x="16" y="14" textAnchor="middle" fontSize="7" fill="currentColor" fontFamily="monospace">XZ</text>
                </svg>
              ) : (
                <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
                  <rect x="13" y="2" width="6" height="28" rx="1" fill="currentColor" opacity="0.4" />
                  <rect x="14" y="6" width="4" height="20" rx="0.5" fill="currentColor" />
                  <text x="16" y="20" textAnchor="middle" fontSize="7" fill="currentColor" fontFamily="monospace">XY</text>
                </svg>
              )}
              <span className="capitalize">{o}</span>
              <span className="text-zinc-500 font-normal">
                {o === "horizontal" ? "Floor art" : "Wall art"}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Block categories */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
          Block Categories
        </h3>
        <div className="flex flex-wrap gap-2">
          {categoryCounts.map(({ cat, count }) => {
            const active = selectedCategories.has(cat);
            return (
              <button
                key={cat}
                onClick={() => onCategoryToggle(cat)}
                className={`
                  rounded-full border px-3 py-1 text-xs font-medium transition-colors
                  ${active
                    ? "border-green-500 bg-green-950/50 text-green-300"
                    : "border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
                  }
                `}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          {GENERATION_BLOCKS.filter((b) => selectedCategories.has(b.category)).length} blocks available
        </p>
      </section>

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={!hasImage || isProcessing}
        className={`
          w-full rounded-xl px-4 py-3 font-semibold text-sm transition-all
          ${hasImage && !isProcessing
            ? "bg-green-600 text-white hover:bg-green-500 active:scale-95 cursor-pointer"
            : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
          }
        `}
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Processing…
          </span>
        ) : (
          "Generate Pixel Art"
        )}
      </button>
    </div>
  );
}
