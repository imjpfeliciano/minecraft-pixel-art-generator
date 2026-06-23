"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { track } from "@vercel/analytics";
import ImageUpload from "./_components/ImageUpload";
import ControlPanel from "./_components/ControlPanel";
import PixelArtPreview from "./_components/PixelArtPreview";
import BlockLegend from "./_components/BlockLegend";
import {
  GENERATION_BLOCK_CATEGORIES,
  GENERATION_BLOCKS,
  MINECRAFT_BLOCKS,
  MinecraftBlock,
} from "./_lib/blocks";
import { mapPixelsToBlocks } from "./_lib/color-matcher";
import { loadAndResizeImage } from "./_lib/image-processor";
import { downloadLitematic, generateLitematic, Orientation } from "./_lib/litematic-generator";

// Three.js viewer is browser-only — skip SSR entirely
const SchematicViewer3D = dynamic(
  () => import("./_components/SchematicViewer3D"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
        Loading 3D viewer…
      </div>
    ),
  },
);

// ─── Step tracker ─────────────────────────────────────────────────────────────

type StepState = "completed" | "active" | "pending";

interface Step {
  id: number;
  label: string;
  state: StepState;
}

function StepTracker({ steps }: { steps: Step[] }) {
  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-stretch gap-3">
          {/* Badge + connector column */}
          <div className="flex flex-col items-center">
            <div
              className={`
                w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors
                ${step.state === "completed"
                  ? "bg-green-600 text-white"
                  : step.state === "active"
                    ? "border-2 border-green-500 text-green-400"
                    : "border-2 border-zinc-700 text-zinc-600"
                }
              `}
            >
              {step.state === "completed" ? (
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                step.id
              )}
            </div>
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className={`w-px flex-1 my-1 ${
                  step.state === "completed" ? "bg-green-700" : "bg-zinc-800"
                }`}
                style={{ minHeight: 12 }}
              />
            )}
          </div>
          {/* Label */}
          <div className="pb-3 pt-0.5">
            <span
              className={`text-xs font-medium ${
                step.state === "pending" ? "text-zinc-600" : "text-zinc-300"
              }`}
            >
              {step.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  // Ref tracks the current blob URL so we can revoke it safely without
  // triggering the React strict-mode double-invoke bug on useEffect cleanup.
  const imagePreviewUrlRef = useRef<string | null>(null);

  // Controls
  const [width, setWidth] = useState(128);
  const [height, setHeight] = useState(128);
  const [orientation, setOrientation] = useState<Orientation>("vertical");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(GENERATION_BLOCK_CATEGORIES)
  );

  // Output
  const [blockGrid, setBlockGrid] = useState<MinecraftBlock[][]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLitematic, setLastLitematic] = useState<Uint8Array | null>(null);
  const [schematicName, setSchematicName] = useState("PixelArt");

  // Background fill
  const [fillBlockId, setFillBlockId] = useState("");

  // Foundation layer
  const [foundationEnabled, setFoundationEnabled] = useState(false);
  const [foundationBlockId, setFoundationBlockId] = useState("minecraft:stone");

  // Result view tools
  const [showGrid, setShowGrid] = useState(false);
  const [gridColor, setGridColor] = useState("#ffffff");
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [showMaterialList, setShowMaterialList] = useState(false);

  // Preview mode: 2D canvas or 3D schematic viewer
  const [previewMode, setPreviewMode] = useState<"2d" | "3d">("2d");

  // Undo stack for block edits
  const [undoStack, setUndoStack] = useState<
    Array<{ grid: MinecraftBlock[][]; litematic: Uint8Array | null }>
  >([]);
  const MAX_UNDO = 20;

  // Revoke the final blob URL when the page unmounts (empty deps = runs once).
  useEffect(() => {
    return () => {
      if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
    };
  }, []);

  const handleImageSelected = useCallback((file: File, url: string) => {
    // Revoke the previous blob URL before replacing it
    if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
    imagePreviewUrlRef.current = url;
    setImageFile(file);
    setImagePreviewUrl(url);
    setBlockGrid([]);
    setLastLitematic(null);
    setUndoStack([]);
    setError(null);
  }, []);

  const pushUndo = useCallback(
    (currentGrid: MinecraftBlock[][], currentLitematic: Uint8Array | null) => {
      setUndoStack((prev) => {
        const snapshot = {
          grid: currentGrid.map((row) => row.map((cell) => ({ ...cell }))),
          litematic: currentLitematic ? new Uint8Array(currentLitematic) : null,
        };
        const next = [...prev, snapshot];
        if (next.length > MAX_UNDO) next.shift();
        return next;
      });
    },
    [],
  );

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const snapshot = prev[prev.length - 1];
      setBlockGrid(snapshot.grid);
      setLastLitematic(snapshot.litematic);
      return prev.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleUndo]);

  const regenerateLitematic = useCallback(
    (grid: MinecraftBlock[][]) => {
      const effectiveFoundation = orientation === "horizontal" && foundationEnabled;
      return generateLitematic(
        grid,
        orientation,
        schematicName,
        effectiveFoundation ? { blockId: foundationBlockId } : undefined,
      );
    },
    [orientation, foundationEnabled, foundationBlockId, schematicName],
  );

  const handleRegionReplace = useCallback(
    (r1: number, c1: number, r2: number, c2: number, block: MinecraftBlock) => {
      pushUndo(blockGrid, lastLitematic);
      setBlockGrid((prev) => {
        const next = prev.map((row) => [...row]);
        for (let r = r1; r <= r2; r++) {
          for (let c = c1; c <= c2; c++) {
            next[r][c] = block;
          }
        }
        setLastLitematic(regenerateLitematic(next));
        return next;
      });
    },
    [blockGrid, lastLitematic, pushUndo, regenerateLitematic],
  );

  const handleBlockPainted = useCallback(
    (row: number, col: number, block: MinecraftBlock) => {
      pushUndo(blockGrid, lastLitematic);
      setBlockGrid((prev) => {
        const next = prev.map((r) => [...r]);
        next[row][col] = block;
        setLastLitematic(regenerateLitematic(next));
        return next;
      });
    },
    [blockGrid, lastLitematic, pushUndo, regenerateLitematic],
  );

  const handleReplaceBlock = useCallback(
    (fromId: string, toBlock: MinecraftBlock) => {
      pushUndo(blockGrid, lastLitematic);
      setBlockGrid((prev) => {
        const next = prev.map((row) =>
          row.map((cell) => (cell.id === fromId ? toBlock : cell)),
        );
        setLastLitematic(regenerateLitematic(next));
        return next;
      });
    },
    [blockGrid, lastLitematic, pushUndo, regenerateLitematic],
  );

  const handleCategoryToggle = useCallback((cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size === 1) return prev;
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!imageFile) return;
    setIsProcessing(true);
    setError(null);
    setPreviewMode("2d");
    try {
      const allowedBlocks = GENERATION_BLOCKS.filter((b) =>
        selectedCategories.has(b.category)
      );
      if (allowedBlocks.length === 0) {
        throw new Error("No blocks available. Select at least one category.");
      }

      const { pixels } = await loadAndResizeImage(imageFile, width, height);
      const fillBlock = fillBlockId
        ? MINECRAFT_BLOCKS.find((b) => b.id === fillBlockId)
        : undefined;
      const grid = mapPixelsToBlocks(pixels, width, height, allowedBlocks, fillBlock);
      setBlockGrid(grid);
      setUndoStack([]);

      const effectiveFoundation = orientation === "horizontal" && foundationEnabled;
      const litematic = generateLitematic(
        grid,
        orientation,
        schematicName,
        effectiveFoundation ? { blockId: foundationBlockId } : undefined
      );
      setLastLitematic(litematic);

      track("Pixel Art Generated", {
        width,
        height,
        orientation,
        categories_count: selectedCategories.size,
        has_fill_block: !!fillBlockId,
        foundation_enabled: foundationEnabled,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      track("Generation Failed", { error_message: message });
    } finally {
      setIsProcessing(false);
    }
  }, [imageFile, width, height, orientation, selectedCategories, schematicName, fillBlockId, foundationEnabled, foundationBlockId]);

  const handleDownload = useCallback(() => {
    if (!lastLitematic) return;
    downloadLitematic(lastLitematic, `${schematicName}.litematic`);
    track("Litematic Downloaded", {
      width,
      height,
      orientation,
    });
  }, [lastLitematic, schematicName, width, height, orientation]);

  // ── Step tracker state ──────────────────────────────────────────────────────
  const steps: Step[] = [
    {
      id: 1,
      label: "Upload image",
      state: imageFile ? "completed" : "active",
    },
    {
      id: 2,
      label: "Configure",
      state: blockGrid.length > 0 || isProcessing
        ? "completed"
        : imageFile
          ? "active"
          : "pending",
    },
    {
      id: 3,
      label: "Generate",
      state: blockGrid.length > 0
        ? "completed"
        : isProcessing
          ? "active"
          : imageFile
            ? "active"
            : "pending",
    },
    {
      id: 4,
      label: "Download",
      state: blockGrid.length > 0 ? "active" : "pending",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v10H7V7zm2 2v6h6V9H9z" />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-bold leading-none">Minecraft Pixel Art Generator</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Image → Litematica schematic</p>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ───────────────────────────────────────────────────────── */}
        <aside className="w-80 flex-shrink-0 border-r border-zinc-800 overflow-y-auto p-5 flex flex-col gap-6">
          {/* Step tracker */}
          <StepTracker steps={steps} />

          <div className="border-t border-zinc-800" />

          {/* 1. Upload */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
              Upload Image
            </h2>
            <ImageUpload onImageSelected={handleImageSelected} />
            {imageFile && (
              <p className="mt-2 text-xs text-zinc-500 truncate">
                {imageFile.name}
              </p>
            )}
          </section>

          {/* Schematic name */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
              Schematic Name
            </h2>
            <input
              type="text"
              value={schematicName}
              onChange={(e) => setSchematicName(e.target.value || "PixelArt")}
              placeholder="PixelArt"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-green-500 focus:outline-none"
            />
          </section>

          {/* 2. Configure */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
              Configure
            </h2>
            <ControlPanel
              width={width}
              height={height}
              orientation={orientation}
              selectedCategories={selectedCategories}
              onWidthChange={setWidth}
              onHeightChange={setHeight}
              onOrientationChange={setOrientation}
              onCategoryToggle={handleCategoryToggle}
              onGenerate={handleGenerate}
              isProcessing={isProcessing}
              hasImage={!!imageFile}
            />
          </section>

          {/* Background fill */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
              Background Fill
            </h2>
            <select
              value={fillBlockId}
              onChange={(e) => setFillBlockId(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-green-500 focus:outline-none"
            >
              <option value="">(none / air)</option>
              <optgroup label="White">
                <option value="minecraft:white_concrete">White Concrete</option>
                <option value="minecraft:quartz_block">Quartz Block</option>
                <option value="minecraft:snow_block">Snow Block</option>
              </optgroup>
              <optgroup label="Black">
                <option value="minecraft:black_concrete">Black Concrete</option>
                <option value="minecraft:obsidian">Obsidian</option>
              </optgroup>
              <optgroup label="Gray">
                <option value="minecraft:gray_concrete">Gray Concrete</option>
                <option value="minecraft:smooth_stone">Smooth Stone</option>
              </optgroup>
              <optgroup label="Other">
                <option value="minecraft:stone">Stone</option>
                <option value="minecraft:oak_planks">Oak Planks</option>
              </optgroup>
            </select>
          </section>

          {/* Foundation layer — only relevant for horizontal orientation */}
          {orientation === "horizontal" && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
                Foundation Layer
              </h2>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={foundationEnabled}
                  onChange={(e) => setFoundationEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-green-500 cursor-pointer"
                />
                <span className="text-sm text-zinc-300">Add foundation layer</span>
              </label>
              {foundationEnabled && (
                <select
                  value={foundationBlockId}
                  onChange={(e) => setFoundationBlockId(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-green-500 focus:outline-none"
                >
                  <option value="minecraft:stone">Stone</option>
                  <option value="minecraft:smooth_stone">Smooth Stone</option>
                  <option value="minecraft:deepslate">Deepslate</option>
                  <option value="minecraft:obsidian">Obsidian</option>
                  <option value="minecraft:oak_planks">Oak Planks</option>
                </select>
              )}
            </section>
          )}

          {error && (
            <div className="rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
        </aside>

        {/* ── Main ──────────────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">

          {isProcessing || blockGrid.length > 0 ? (
            /* ── Result view ────────────────────────────────────────────────── */
            <>
              <div className="flex flex-1 overflow-hidden min-h-0">

                {/* Preview panel */}
                <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden min-w-0">
                  {/* Panel header */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 flex-shrink-0">
                    <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                      Pixel Art
                    </span>
                    {blockGrid.length > 0 && (
                      <span className="text-xs text-zinc-600">
                        {blockGrid[0]?.length ?? 0} × {blockGrid.length} blocks
                      </span>
                    )}

                    {/* 2D / 3D view toggle */}
                    {blockGrid.length > 0 && (
                      <div className="flex items-center rounded-lg border border-zinc-700 overflow-hidden text-xs font-medium">
                        <button
                          onClick={() => {
                            setPreviewMode("2d");
                            track("3D Viewer Closed");
                          }}
                          className={`px-2.5 py-1 transition-colors ${
                            previewMode === "2d"
                              ? "bg-zinc-700 text-zinc-100"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          2D
                        </button>
                        <button
                          onClick={() => {
                            setPreviewMode("3d");
                            track("3D Preview Opened", { orientation });
                          }}
                          className={`px-2.5 py-1 transition-colors ${
                            previewMode === "3d"
                              ? "bg-zinc-700 text-zinc-100"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          3D
                        </button>
                      </div>
                    )}

                    {undoStack.length > 0 && (
                      <button
                        onClick={handleUndo}
                        className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
                        title="Undo (Ctrl+Z)"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M3 8h7a3 3 0 100-6H7" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M6 5L3 8l3 3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Undo
                      </button>
                    )}

                    {/* Material list toggle — pushed to the right */}
                    {blockGrid.length > 0 && (
                      <button
                        onClick={() => setShowMaterialList((v) => {
                          if (!v) track("Materials Panel Opened");
                          return !v;
                        })}
                        className={`ml-auto flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                          showMaterialList
                            ? "border-zinc-500 bg-zinc-800 text-zinc-200"
                            : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
                        }`}
                        title={showMaterialList ? "Hide material list" : "Show material list"}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <line x1="3" y1="4" x2="13" y2="4" />
                          <line x1="3" y1="8" x2="13" y2="8" />
                          <line x1="3" y1="12" x2="10" y2="12" />
                        </svg>
                        Materials
                        <svg
                          className={`w-3 h-3 transition-transform ${showMaterialList ? "rotate-180" : ""}`}
                          viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
                        >
                          <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Panel body */}
                  <div className="flex-1 overflow-hidden p-4 min-h-0">
                    {previewMode === "3d" && blockGrid.length > 0 ? (
                      <SchematicViewer3D
                        blockGrid={blockGrid}
                        orientation={orientation}
                        foundationEnabled={orientation === "horizontal" && foundationEnabled}
                        foundationBlockId={foundationBlockId}
                      />
                    ) : (
                      <PixelArtPreview
                        blockGrid={blockGrid}
                        isLoading={isProcessing}
                        showGrid={showGrid}
                        onShowGridChange={setShowGrid}
                        gridColor={gridColor}
                        onGridColorChange={setGridColor}
                        compareEnabled={compareEnabled}
                        onCompareEnabledChange={setCompareEnabled}
                        originalImageUrl={imagePreviewUrl}
                        onBlocksReplaced={handleRegionReplace}
                        onBlockPainted={handleBlockPainted}
                      />
                    )}
                  </div>
                </div>

                {/* Material list side panel */}
                {showMaterialList && blockGrid.length > 0 && (
                  <div className="w-72 flex-shrink-0 flex flex-col border-l border-zinc-800 bg-zinc-950 overflow-hidden">
                    {/* Side panel header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
                      <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                        Materials
                      </span>
                      <button
                        onClick={() => setShowMaterialList(false)}
                        className="text-zinc-600 hover:text-zinc-300 transition-colors"
                        title="Close"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>

                    {/* Scrollable list */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                      <BlockLegend
                        blockGrid={blockGrid}
                        onReplaceBlock={handleReplaceBlock}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── Download bar ─────────────────────────────────────────────── */}
              {blockGrid.length > 0 && (
                <div className="flex-shrink-0 border-t border-zinc-800 px-4 py-3 flex items-center gap-3">
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-500 active:scale-95 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download .litematic
                  </button>
                  <div className="text-xs text-zinc-500">
                    <p>Import via <span className="text-zinc-300 font-medium">Litematica mod</span></p>
                    <p>in Minecraft → Load Schematics</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ── Pre-generation view: two panels ───────────────────────────── */
            <div className="flex flex-1 overflow-hidden gap-px bg-zinc-800 min-h-0">

              {/* Original image panel — full width before generation */}
              <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden min-w-0">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 flex-shrink-0">
                  <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                    Original
                  </span>
                  {imageFile && (
                    <span className="text-xs text-zinc-600 truncate">
                      {imageFile.name}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-hidden flex items-center justify-center p-4 min-h-0">
                  {imagePreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagePreviewUrl}
                      alt="Original image"
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-zinc-700 flex items-center justify-center">
                        <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3.75 3h16.5M12 3v.01" />
                        </svg>
                      </div>
                      <p className="text-zinc-600 text-sm">Upload an image to begin</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
