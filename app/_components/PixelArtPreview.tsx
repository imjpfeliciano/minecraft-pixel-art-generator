"use client";

import { useEffect, useRef, useState } from "react";
import type { MinecraftBlock } from "../_lib/blocks";

interface Props {
  blockGrid: MinecraftBlock[][];
}

const MIN_CELL = 2;
const MAX_CELL = 32;

export default function PixelArtPreview({ blockGrid }: Props) {
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

  if (rows === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        No preview yet — generate a pixel art first.
      </div>
    );
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
