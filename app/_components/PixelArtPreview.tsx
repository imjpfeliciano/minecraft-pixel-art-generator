"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import type { MinecraftBlock } from "../_lib/blocks";

interface Props {
  blockGrid: MinecraftBlock[][];
  isLoading?: boolean;
  showGrid: boolean;
  onShowGridChange: (v: boolean) => void;
  gridColor: string;
  onGridColorChange: (v: string) => void;
  showOriginalOverlay: boolean;
  onShowOriginalOverlayChange: (v: boolean) => void;
  originalImageUrl: string | null;
}

const MIN_CELL = 2;
const MAX_CELL = 64;

export default function PixelArtPreview({
  blockGrid,
  isLoading = false,
  showGrid,
  onShowGridChange,
  gridColor,
  onGridColorChange,
  showOriginalOverlay,
  onShowOriginalOverlayChange,
  originalImageUrl,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const overlayImgRef = useRef<HTMLImageElement | null>(null);

  const [cellSize, setCellSize] = useState(6);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; block: MinecraftBlock } | null>(null);

  // Pan state
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0 });

  const rows = blockGrid.length;
  const cols = blockGrid[0]?.length ?? 0;

  // Preload overlay image into a ref; trigger a redraw once loaded
  useEffect(() => {
    if (!originalImageUrl) {
      overlayImgRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      overlayImgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas || rows === 0 || cols === 0) return;
      drawCanvas(canvas, blockGrid, rows, cols, cellSize, showGrid, gridColor, showOriginalOverlay, img);
    };
    img.src = originalImageUrl;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalImageUrl]);

  // Fit cell size to viewport on mount / grid change; reset pan to center
  useEffect(() => {
    if (!viewportRef.current || rows === 0 || cols === 0) return;
    const { clientWidth, clientHeight } = viewportRef.current;
    const availH = Math.max(1, clientHeight);
    const fitW = Math.floor(clientWidth / cols);
    const fitH = Math.floor(availH / rows);
    const fit = Math.max(MIN_CELL, Math.min(MAX_CELL, Math.min(fitW, fitH)));
    setCellSize(fit);
    // Center the canvas
    const canvasW = cols * fit;
    const canvasH = rows * fit;
    setOffset({
      x: Math.max(0, (clientWidth - canvasW) / 2),
      y: Math.max(0, (clientHeight - canvasH) / 2),
    });
  }, [rows, cols]);

  // Redraw canvas whenever anything visual changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || rows === 0 || cols === 0) return;
    drawCanvas(
      canvas,
      blockGrid,
      rows,
      cols,
      cellSize,
      showGrid,
      gridColor,
      showOriginalOverlay,
      overlayImgRef.current,
    );
  }, [blockGrid, cellSize, rows, cols, showGrid, gridColor, showOriginalOverlay]);

  // ── Pan handlers ────────────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only pan on left-click on the viewport background (not toolbar)
    if (e.button !== 0) return;
    isDragging.current = true;
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
    e.currentTarget.style.cursor = "grabbing";
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging.current) {
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      setOffset({ x: dragStart.current.offsetX + dx, y: dragStart.current.offsetY + dy });
      setTooltip(null);
      return;
    }

    // Tooltip on canvas hover
    const canvas = canvasRef.current;
    if (!canvas || rows === 0) return;
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / cellSize);
    const row = Math.floor((e.clientY - rect.top) / cellSize);
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      setTooltip({ x: e.clientX, y: e.clientY, block: blockGrid[row][col] });
    } else {
      setTooltip(null);
    }
  }, [blockGrid, cellSize, cols, rows]);

  const stopDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging.current) {
      isDragging.current = false;
      e.currentTarget.style.cursor = "grab";
    }
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    stopDrag(e);
    setTooltip(null);
  }, [stopDrag]);

  const handleZoom = useCallback((delta: number) => {
    setCellSize((prev) => {
      const next = Math.max(MIN_CELL, Math.min(MAX_CELL, prev + delta));
      // Keep the canvas visually centered after zoom
      if (viewportRef.current) {
        const { clientWidth, clientHeight } = viewportRef.current;
        const oldW = cols * prev;
        const oldH = rows * prev;
        const newW = cols * next;
        const newH = rows * next;
        setOffset((o) => ({
          x: o.x - (newW - oldW) / 2 + (clientWidth - oldW) / 2 - (clientWidth - oldW) / 2,
          y: o.y - (newH - oldH) / 2 + (clientHeight - oldH) / 2 - (clientHeight - oldH) / 2,
        }));
      }
      return next;
    });
  }, [cols, rows]);

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="relative w-full h-full flex flex-col gap-3 overflow-hidden">
        <ToolbarSkeleton />
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

  if (rows === 0) return null;

  return (
    <div className="relative w-full h-full flex flex-col gap-3 overflow-hidden">

      {/* ── Controls row ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Zoom</span>
          <button
            onClick={() => handleZoom(-1)}
            className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300 hover:bg-zinc-700"
          >
            −
          </button>
          <span className="text-xs text-zinc-300 w-8 text-center">{cellSize}px</span>
          <button
            onClick={() => handleZoom(1)}
            className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300 hover:bg-zinc-700"
          >
            +
          </button>
          <span className="text-xs text-zinc-500 ml-1">{cols} × {rows}</span>
        </div>

        <div className="w-px h-4 bg-zinc-700 flex-shrink-0" />

        {/* Grid toggle */}
        <button
          onClick={() => { track("Grid Toggled", { enabled: !showGrid }); onShowGridChange(!showGrid); }}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
            showGrid
              ? "border-green-600 bg-green-600/15 text-green-400"
              : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
          }`}
          title="Toggle grid lines"
        >
          <GridIcon active={showGrid} />
          Grid
        </button>

        {/* Grid color — only visible when grid is on */}
        {showGrid && (
          <label className="flex items-center gap-1.5 cursor-pointer" title="Grid color">
            <span className="text-xs text-zinc-400">Color</span>
            <input
              type="color"
              value={gridColor}
              onChange={(e) => onGridColorChange(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border border-zinc-600 bg-transparent p-0"
            />
          </label>
        )}

        {/* Overlay toggle */}
        <button
          onClick={() => { track("Overlay Toggled", { enabled: !showOriginalOverlay }); onShowOriginalOverlayChange(!showOriginalOverlay); }}
          disabled={!originalImageUrl}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
            showOriginalOverlay
              ? "border-blue-500 bg-blue-500/15 text-blue-400"
              : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
          }`}
          title="Overlay original image"
        >
          <OverlayIcon active={showOriginalOverlay} />
          Overlay
        </button>
      </div>

      {/* ── Pan viewport ──────────────────────────────────────────────────── */}
      <div
        ref={viewportRef}
        className="flex-1 min-h-0 rounded-xl border border-zinc-700 overflow-hidden relative bg-zinc-900 select-none"
        style={{ cursor: "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={handleMouseLeave}
      >
        <div
          style={{
            position: "absolute",
            left: offset.x,
            top: offset.y,
            // Prevent layout shifts while dragging
            willChange: "transform",
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ imageRendering: "pixelated", display: "block" }}
          />
        </div>
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

// ── Canvas drawing helper ──────────────────────────────────────────────────────

function drawCanvas(
  canvas: HTMLCanvasElement,
  blockGrid: MinecraftBlock[][],
  rows: number,
  cols: number,
  cellSize: number,
  showGrid: boolean,
  gridColor: string,
  showOriginalOverlay: boolean,
  overlayImg: HTMLImageElement | null,
) {
  canvas.width = cols * cellSize;
  canvas.height = rows * cellSize;

  const ctx = canvas.getContext("2d")!;

  // Draw block colors
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const block = blockGrid[row][col];
      const [r, g, b] = block.rgb;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
    }
  }

  // Draw original image overlay at 40% opacity
  if (showOriginalOverlay && overlayImg) {
    ctx.globalAlpha = 0.4;
    ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }

  // Draw grid lines on top
  if (showGrid) {
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let col = 0; col <= cols; col++) {
      ctx.beginPath();
      ctx.moveTo(col * cellSize, 0);
      ctx.lineTo(col * cellSize, rows * cellSize);
      ctx.stroke();
    }
    for (let row = 0; row <= rows; row++) {
      ctx.beginPath();
      ctx.moveTo(0, row * cellSize);
      ctx.lineTo(cols * cellSize, row * cellSize);
      ctx.stroke();
    }
  }
}

// ── Icon components ────────────────────────────────────────────────────────────

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 ${active ? "text-green-400" : "text-zinc-500"}`}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="1" y="1" width="14" height="14" rx="1" />
      <line x1="1" y1="5.67" x2="15" y2="5.67" />
      <line x1="1" y1="10.33" x2="15" y2="10.33" />
      <line x1="5.67" y1="1" x2="5.67" y2="15" />
      <line x1="10.33" y1="1" x2="10.33" y2="15" />
    </svg>
  );
}

function OverlayIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 ${active ? "text-blue-400" : "text-zinc-500"}`}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="1" y="1" width="9" height="9" rx="1" />
      <rect x="6" y="6" width="9" height="9" rx="1" opacity="0.6" />
    </svg>
  );
}

function ToolbarSkeleton() {
  return (
    <div className="flex items-center gap-2 flex-shrink-0 opacity-40 pointer-events-none select-none">
      <span className="text-xs text-zinc-400">Zoom</span>
      <button className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300">−</button>
      <span className="text-xs text-zinc-300 w-8 text-center">—</span>
      <button className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300">+</button>
      <div className="w-px h-4 bg-zinc-700" />
      <div className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-500">Grid</div>
      <div className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-500">Overlay</div>
    </div>
  );
}
