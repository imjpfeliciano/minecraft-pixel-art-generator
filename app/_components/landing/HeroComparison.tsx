"use client";

import { useState, useRef } from "react";
import ComparisonDivider from "../ComparisonDivider";
import { trackHeroComparisonDragged } from "../../_lib/landing-analytics";

const DEMO_WIDTH = 640;
const DEMO_HEIGHT = 400;

export default function HeroComparison() {
  const [split, setSplit] = useState(50);
  const isDragging = useRef(false);

  const handleSplitChange = (percent: number) => {
    if (!isDragging.current) isDragging.current = true;
    setSplit(percent);
  };

  const handleSplitCommit = (percent: number) => {
    isDragging.current = false;
    setSplit(percent);
    trackHeroComparisonDragged(percent);
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-gray-300 shadow-2xl shadow-black/20 dark:border-gray-700 dark:shadow-black/50"
      style={{ width: DEMO_WIDTH, height: DEMO_HEIGHT }}
    >
      {/* ── Pixel art layer — full size, sits underneath ────────────────────── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/demo/pixel-art.png"
        alt="Pixel art result"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />

      {/* ── Original photo layer — identical layout, clipped from the right ─── */}
      {/*
        Both images share the exact same CSS (absolute inset-0, w-full, h-full,
        object-cover) so object-cover picks the same scale and crop point for
        both, regardless of the image dimensions.
        The reveal is done with clip-path (percentage-based, GPU-accelerated)
        so swapping in real before/after pairs requires only changing src.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/demo/original.png"
        alt="Original photo"
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          clipPath: `inset(0 ${100 - split}% 0 0)`,
          transition: isDragging.current ? "none" : "clip-path 150ms ease-out",
        }}
        draggable={false}
      />

      {/* Corner labels */}
      <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-gray-200 backdrop-blur-sm">
        Original
      </div>
      <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-gray-200 backdrop-blur-sm">
        Minecraft blocks
      </div>

      {/* Divider handle */}
      <ComparisonDivider
        splitPercent={split}
        width={DEMO_WIDTH}
        height={DEMO_HEIGHT}
        onSplitChange={handleSplitChange}
        onSplitCommit={handleSplitCommit}
      />
    </div>
  );
}
