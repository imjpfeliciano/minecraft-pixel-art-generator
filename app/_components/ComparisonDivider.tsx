"use client";

import { useRef } from "react";

interface Props {
  splitPercent: number;
  width: number;
  height: number;
  onSplitChange: (percent: number) => void;
  onSplitCommit?: (percent: number, method: "drag" | "keyboard") => void;
}

export default function ComparisonDivider({
  splitPercent,
  width,
  height,
  onSplitChange,
  onSplitCommit,
}: Props) {
  const isDragging = useRef(false);
  const x = (splitPercent / 100) * width;

  const updateFromPointer = (clientX: number, parent: HTMLElement) => {
    const rect = parent.getBoundingClientRect();
    const relX = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (relX / width) * 100));
    onSplitChange(percent);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    isDragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX, e.currentTarget.parentElement!);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    e.stopPropagation();
    updateFromPointer(e.clientX, e.currentTarget.parentElement!);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const parent = e.currentTarget.parentElement!;
    const rect = parent.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (relX / width) * 100));
    onSplitCommit?.(percent, "drag");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const next = Math.max(0, splitPercent - 5);
      onSplitChange(next);
      onSplitCommit?.(next, "keyboard");
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = Math.min(100, splitPercent + 5);
      onSplitChange(next);
      onSplitCommit?.(next, "keyboard");
    }
  };

  return (
    <div
      className="absolute top-0 left-0 pointer-events-none"
      style={{ width, height }}
    >
      <div
        role="slider"
        aria-label="Compare original and result"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(splitPercent)}
        tabIndex={0}
        className="absolute top-0 bottom-0 pointer-events-auto cursor-ew-resize flex items-center justify-center"
        style={{ left: x - 12, width: 24 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-white shadow-[0_0_4px_rgba(0,0,0,0.8)]" />
        <div className="relative z-10 w-6 h-6 rounded-full border-2 border-white bg-zinc-800 shadow-lg flex items-center justify-center">
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 6h2M9 6h2M5 4L3 6l2 2M7 4l2 2-2 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}
