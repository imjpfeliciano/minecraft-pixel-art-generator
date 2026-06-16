"use client";

import { useEffect, useRef, useState } from "react";
import type { MinecraftBlock } from "../_lib/blocks";

interface Props {
  blockGrid: MinecraftBlock[][];
  /** When true, renders a pulsing skeleton overlay instead of the canvas. */
  isLoading?: boolean;
}

const MIN_CELL = 2;
const MAX_CELL = 32;

export default function PixelArtPreview({ blockGrid, isLoading = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(6);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; block: MinecraftBlock } | null>(null);

  const rows = blockGrid.length;
  const cols = blockGrid[0]?.length ?? 0;

  // Fit cell size to container on mount / grid change
  useEffect(() => {
    if (!containerRef.current || rows === 0 || cols === 0) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const fitW = Math.floor(clientWidth / cols);
    const fitH = Math.floor(clientHeight / rows);
    const fit = Math.max(MIN_CELL, Math.min(MAX_CELL, Math.min(fitW, fitH)));
    setCellSize(fit);
  }, [rows, cols]);

  // Draw to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || rows === 0 || cols === 0) return;
    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;

    const ctx = canvas.getContext("2d")!;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const block = blockGrid[row][col];
        const [r, g, b] = block.rgb;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }
  }, [blockGrid, cellSize, rows, cols]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / cellSize);
    const row = Math.floor((e.clientY - rect.top) / cellSize);
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      setTooltip({ x: e.clientX, y: e.clientY, block: blockGrid[row][col] });
    } else {
      setTooltip(null);
    }
  };

  const handleMouseLeave = () => setTooltip(null);

  // Loading skeleton — shown while the generation pipeline is running
  if (isLoading) {
    return (
      <div ref={containerRef} className="relative w-full h-full flex flex-col gap-3 overflow-hidden">
        {/* Zoom controls — disabled while loading */}
        <div className="flex items-center gap-2 flex-shrink-0 opacity-40 pointer-events-none select-none">
          <span className="text-xs text-zinc-400">Zoom</span>
          <button className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300">−</button>
          <span className="text-xs text-zinc-300 w-8 text-center">—</span>
          <button className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300">+</button>
        </div>
        {/* Skeleton */}
        <div className="flex-1 min-h-0 rounded-xl border border-zinc-700 overflow-hidden relative bg-zinc-900">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-800" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-600">
            <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-sm">Generating pixel art…</span>
          </div>
        </div>
      </div>
    );
  }

  // Empty — parent panel handles the empty-state message; return null here
  if (rows === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col gap-3 overflow-hidden">
      {/* Zoom controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-zinc-400">Zoom</span>
        <button
          onClick={() => setCellSize((s) => Math.max(MIN_CELL, s - 1))}
          className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300 hover:bg-zinc-700"
        >
          −
        </button>
        <span className="text-xs text-zinc-300 w-8 text-center">{cellSize}px</span>
        <button
          onClick={() => setCellSize((s) => Math.min(MAX_CELL, s + 1))}
          className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300 hover:bg-zinc-700"
        >
          +
        </button>
        <span className="text-xs text-zinc-500 ml-2">
          {cols} × {rows} blocks
        </span>
      </div>

      {/* Canvas scroll container */}
      <div className="overflow-auto rounded-xl border border-zinc-700 flex-1 bg-zinc-950 min-h-0">
        <canvas
          ref={canvasRef}
          className="block cursor-crosshair"
          style={{ imageRendering: "pixelated" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-xs shadow-xl"
          style={{ left: tooltip.x + 12, top: tooltip.y - 12 }}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-sm flex-shrink-0 border border-zinc-600"
              style={{ backgroundColor: `rgb(${tooltip.block.rgb[0]},${tooltip.block.rgb[1]},${tooltip.block.rgb[2]})` }}
            />
            <span className="text-zinc-100 font-medium">{tooltip.block.name}</span>
          </div>
          <p className="text-zinc-500 mt-0.5">{tooltip.block.id}</p>
        </div>
      )}
    </div>
  );
}
