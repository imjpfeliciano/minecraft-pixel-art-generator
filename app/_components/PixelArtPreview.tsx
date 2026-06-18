"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import type { MinecraftBlock } from "../_lib/blocks";
import BlockPickerModal, { BlockIcon } from "./BlockPickerModal";

type EditorMode = "pan" | "select" | "pick";

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
  onBlocksReplaced?: (
    r1: number,
    c1: number,
    r2: number,
    c2: number,
    block: MinecraftBlock,
  ) => void;
  onBlockPicked?: (block: MinecraftBlock) => void;
  onBlockPainted?: (row: number, col: number, block: MinecraftBlock) => void;
}

const MIN_CELL = 2;
const MAX_CELL = 64;

function getCellFromEvent(
  e: React.MouseEvent,
  canvas: HTMLCanvasElement,
  cellSize: number,
  rows: number,
  cols: number,
): { row: number; col: number } | null {
  const rect = canvas.getBoundingClientRect();
  const col = Math.floor((e.clientX - rect.left) / cellSize);
  const row = Math.floor((e.clientY - rect.top) / cellSize);
  if (row >= 0 && row < rows && col >= 0 && col < cols) return { row, col };
  return null;
}

function normalizeSelection(
  start: { row: number; col: number },
  end: { row: number; col: number },
) {
  return {
    r1: Math.min(start.row, end.row),
    c1: Math.min(start.col, end.col),
    r2: Math.max(start.row, end.row),
    c2: Math.max(start.col, end.col),
  };
}

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
  onBlocksReplaced,
  onBlockPicked,
  onBlockPainted,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const overlayImgRef = useRef<HTMLImageElement | null>(null);
  const textureCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const [cellSize, setCellSize] = useState(6);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; block: MinecraftBlock } | null>(null);
  const [texturesVersion, setTexturesVersion] = useState(0);

  const [editorMode, setEditorMode] = useState<EditorMode>("pan");
  const [selStart, setSelStart] = useState<{ row: number; col: number } | null>(null);
  const [selEnd, setSelEnd] = useState<{ row: number; col: number } | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pendingSel, setPendingSel] = useState<{
    r1: number;
    c1: number;
    r2: number;
    c2: number;
  } | null>(null);
  const [activeBrush, setActiveBrush] = useState<MinecraftBlock | null>(null);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const isSelDragging = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0 });

  const cellSizeRef = useRef(cellSize);
  const offsetRef = useRef(offset);
  cellSizeRef.current = cellSize;
  offsetRef.current = offset;

  const wheelHandlerRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelHandlerRef.current = (e: WheelEvent) => {
    e.preventDefault();
    const vp = viewportRef.current;
    if (!vp) return;
    const delta = e.deltaY < 0 ? 1 : -1;
    const rect = vp.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const prev = cellSizeRef.current;
    const next = Math.max(MIN_CELL, Math.min(MAX_CELL, prev + delta));
    if (next === prev) return;
    const scale = next / prev;
    const o = offsetRef.current;
    setCellSize(next);
    setOffset({
      x: mx - (mx - o.x) * scale,
      y: my - (my - o.y) * scale,
    });
  };

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const proxy = (e: WheelEvent) => wheelHandlerRef.current(e);
    vp.addEventListener("wheel", proxy, { passive: false });
    return () => vp.removeEventListener("wheel", proxy);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = blockGrid.length;
  const cols = blockGrid[0]?.length ?? 0;

  const clearSelection = useCallback(() => {
    setSelStart(null);
    setSelEnd(null);
    setPendingSel(null);
    isSelDragging.current = false;
  }, []);

  const finalizeSelection = useCallback(
    (start: { row: number; col: number }, end: { row: number; col: number }) => {
      const sel = normalizeSelection(start, end);
      if (activeBrush && onBlocksReplaced) {
        onBlocksReplaced(sel.r1, sel.c1, sel.r2, sel.c2, activeBrush);
        clearSelection();
        return;
      }
      setPendingSel(sel);
      setShowPicker(true);
    },
    [activeBrush, onBlocksReplaced, clearSelection],
  );

  useEffect(() => {
    if (!blockGrid.length) return;

    const needed: string[] = [];
    for (const row of blockGrid) {
      for (const block of row) {
        if (block.texture && !textureCacheRef.current.has(block.texture)) {
          needed.push(block.texture);
        }
      }
    }

    const unique = [...new Set(needed)];
    if (unique.length === 0) {
      setTexturesVersion((v) => v + 1);
      return;
    }

    let loaded = 0;
    for (const tex of unique) {
      const img = new Image();
      img.onload = () => {
        textureCacheRef.current.set(tex, img);
        loaded++;
        if (loaded === unique.length) setTexturesVersion((v) => v + 1);
      };
      img.onerror = () => {
        loaded++;
        if (loaded === unique.length) setTexturesVersion((v) => v + 1);
      };
      img.src = `/blocks/${tex}.png`;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockGrid]);

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
      drawCanvas(canvas, blockGrid, rows, cols, cellSize, showGrid, gridColor, showOriginalOverlay, img, textureCacheRef.current);
    };
    img.src = originalImageUrl;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalImageUrl]);

  useEffect(() => {
    if (!viewportRef.current || rows === 0 || cols === 0) return;
    const { clientWidth, clientHeight } = viewportRef.current;
    const availH = Math.max(1, clientHeight);
    const fitW = Math.floor(clientWidth / cols);
    const fitH = Math.floor(availH / rows);
    const fit = Math.max(MIN_CELL, Math.min(MAX_CELL, Math.min(fitW, fitH)));
    setCellSize(fit);
    const canvasW = cols * fit;
    const canvasH = rows * fit;
    setOffset({
      x: Math.max(0, (clientWidth - canvasW) / 2),
      y: Math.max(0, (clientHeight - canvasH) / 2),
    });
    clearSelection();
    setActiveBrush(null);
  }, [rows, cols, clearSelection]);

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
      textureCacheRef.current,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockGrid, cellSize, rows, cols, showGrid, gridColor, showOriginalOverlay, texturesVersion]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (editorMode === "pick") {
        const cell = getCellFromEvent(e, canvas, cellSize, rows, cols);
        if (!cell) return;
        if (activeBrush && onBlockPainted) {
          onBlockPainted(cell.row, cell.col, activeBrush);
        } else {
          const block = blockGrid[cell.row][cell.col];
          setActiveBrush(block);
          onBlockPicked?.(block);
        }
        return;
      }

      if (editorMode === "select") {
        const cell = getCellFromEvent(e, canvas, cellSize, rows, cols);
        if (!cell) return;
        isSelDragging.current = true;
        setSelStart(cell);
        setSelEnd(cell);
        setTooltip(null);
        return;
      }

      isDragging.current = true;
      dragStart.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        offsetX: offset.x,
        offsetY: offset.y,
      };
      e.currentTarget.style.cursor = "grabbing";
    },
    [editorMode, cellSize, rows, cols, activeBrush, onBlockPainted, blockGrid, onBlockPicked, offset],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const canvas = canvasRef.current;

      if (editorMode === "select" && isSelDragging.current && canvas) {
        const cell = getCellFromEvent(e, canvas, cellSize, rows, cols);
        if (cell) setSelEnd(cell);
        return;
      }

      if (isDragging.current) {
        const dx = e.clientX - dragStart.current.mouseX;
        const dy = e.clientY - dragStart.current.mouseY;
        setOffset({ x: dragStart.current.offsetX + dx, y: dragStart.current.offsetY + dy });
        setTooltip(null);
        return;
      }

      if (editorMode !== "pan" || !canvas || rows === 0) return;
      const cell = getCellFromEvent(e, canvas, cellSize, rows, cols);
      if (cell) {
        setTooltip({ x: e.clientX, y: e.clientY, block: blockGrid[cell.row][cell.col] });
      } else {
        setTooltip(null);
      }
    },
    [blockGrid, cellSize, cols, rows, editorMode],
  );

  const stopDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (editorMode === "select" && isSelDragging.current && selStart && selEnd) {
        isSelDragging.current = false;
        finalizeSelection(selStart, selEnd);
        return;
      }

      if (isDragging.current) {
        isDragging.current = false;
        e.currentTarget.style.cursor = editorMode === "pan" ? "grab" : "crosshair";
      }
    },
    [editorMode, selStart, selEnd, finalizeSelection],
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (editorMode === "select" && isSelDragging.current && selStart && selEnd) {
        isSelDragging.current = false;
        finalizeSelection(selStart, selEnd);
      }
      if (isDragging.current) {
        isDragging.current = false;
        e.currentTarget.style.cursor = editorMode === "pan" ? "grab" : "crosshair";
      }
      setTooltip(null);
    },
    [editorMode, selStart, selEnd, finalizeSelection],
  );

  const handleZoom = useCallback((delta: number) => {
    const prev = cellSizeRef.current;
    const next = Math.max(MIN_CELL, Math.min(MAX_CELL, prev + delta));
    if (next === prev) return;
    const scale = next / prev;
    const o = offsetRef.current;
    const vp = viewportRef.current;
    const cx = vp ? vp.clientWidth / 2 : 0;
    const cy = vp ? vp.clientHeight / 2 : 0;
    setCellSize(next);
    setOffset({
      x: cx - (cx - o.x) * scale,
      y: cy - (cy - o.y) * scale,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const viewportCursor =
    editorMode === "pan" ? "grab" : editorMode === "pick" ? "crosshair" : "crosshair";

  const selectionRect =
    selStart && selEnd
      ? normalizeSelection(selStart, selEnd)
      : null;

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

      <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
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

        <div className="flex items-center rounded-lg border border-zinc-700 overflow-hidden text-xs font-medium">
          {(["pan", "select", "pick"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setEditorMode(mode);
                clearSelection();
              }}
              className={`px-2.5 py-1 transition-colors capitalize ${
                editorMode === mode
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              title={
                mode === "pan"
                  ? "Pan and zoom"
                  : mode === "select"
                    ? "Select region to replace or fill"
                    : "Pick block as brush"
              }
            >
              {mode === "pick" ? "Pick" : mode === "select" ? "Select" : "Pan"}
            </button>
          ))}
        </div>

        {activeBrush && (
          <div className="flex items-center gap-1.5 rounded-lg border border-green-600/40 bg-green-600/10 px-2 py-1">
            <BlockIcon block={activeBrush} size={16} />
            <span className="text-xs text-green-400 max-w-24 truncate">{activeBrush.name}</span>
            <button
              onClick={() => setActiveBrush(null)}
              className="text-green-500/70 hover:text-green-300 transition-colors"
              title="Clear brush"
            >
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 2l8 8M10 2L2 10" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        <div className="w-px h-4 bg-zinc-700 flex-shrink-0" />

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

      <div
        ref={viewportRef}
        className="flex-1 min-h-0 rounded-xl border border-zinc-700 overflow-hidden relative bg-zinc-900 select-none"
        style={{ cursor: viewportCursor }}
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
            willChange: "transform",
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ imageRendering: "pixelated", display: "block" }}
          />
        </div>

        {selectionRect && (
          <div
            className="absolute border-2 border-green-500 bg-green-500/20 pointer-events-none z-10"
            style={{
              left: offset.x + selectionRect.c1 * cellSize,
              top: offset.y + selectionRect.r1 * cellSize,
              width: (selectionRect.c2 - selectionRect.c1 + 1) * cellSize,
              height: (selectionRect.r2 - selectionRect.r1 + 1) * cellSize,
            }}
          />
        )}
      </div>

      {tooltip && editorMode === "pan" && (
        <div
          className="fixed z-50 pointer-events-none rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-xs shadow-xl"
          style={{ left: tooltip.x + 12, top: tooltip.y - 12 }}
        >
          <div className="flex items-center gap-2">
            <BlockIcon block={tooltip.block} size={12} />
            <span className="text-zinc-100 font-medium">{tooltip.block.name}</span>
          </div>
          <p className="text-zinc-500 mt-0.5">{tooltip.block.id}</p>
        </div>
      )}

      {showPicker && pendingSel && (
        <BlockPickerModal
          title="Replace selection"
          onSelect={(block) => {
            onBlocksReplaced?.(pendingSel.r1, pendingSel.c1, pendingSel.r2, pendingSel.c2, block);
            setShowPicker(false);
            clearSelection();
          }}
          onClose={() => {
            setShowPicker(false);
            clearSelection();
          }}
        />
      )}
    </div>
  );
}

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
  textureCache: Map<string, HTMLImageElement>,
) {
  canvas.width = cols * cellSize;
  canvas.height = rows * cellSize;

  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const block = blockGrid[row][col];
      const x = col * cellSize;
      const y = row * cellSize;
      const texImg = block.texture ? textureCache.get(block.texture) : undefined;
      if (texImg) {
        ctx.drawImage(texImg, x, y, cellSize, cellSize);
      } else {
        const [r, g, b] = block.rgb;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }
  }

  if (showOriginalOverlay && overlayImg) {
    ctx.globalAlpha = 0.4;
    ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }

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
