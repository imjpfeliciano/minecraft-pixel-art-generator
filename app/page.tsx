"use client";

import { useCallback, useState } from "react";
import ImageUpload from "./_components/ImageUpload";
import ControlPanel from "./_components/ControlPanel";
import PixelArtPreview from "./_components/PixelArtPreview";
import BlockLegend from "./_components/BlockLegend";
import { BLOCK_CATEGORIES, MINECRAFT_BLOCKS, MinecraftBlock } from "./_lib/blocks";
import { mapPixelsToBlocks } from "./_lib/color-matcher";
import { loadAndResizeImage } from "./_lib/image-processor";
import { downloadLitematic, generateLitematic, Orientation } from "./_lib/litematic-generator";

export default function Home() {
  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Controls
  const [width, setWidth] = useState(128);
  const [height, setHeight] = useState(128);
  const [orientation, setOrientation] = useState<Orientation>("vertical");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(BLOCK_CATEGORIES)
  );

  // Output
  const [blockGrid, setBlockGrid] = useState<MinecraftBlock[][]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLitematic, setLastLitematic] = useState<Uint8Array | null>(null);
  const [schematicName, setSchematicName] = useState("PixelArt");

  const handleImageSelected = useCallback((file: File, url: string) => {
    setImageFile(file);
    setImagePreviewUrl(url);
    setBlockGrid([]);
    setLastLitematic(null);
    setError(null);
  }, []);

  const handleCategoryToggle = useCallback((cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        // Don't allow deselecting if it's the last one
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
    try {
      const allowedBlocks = MINECRAFT_BLOCKS.filter((b) =>
        selectedCategories.has(b.category)
      );
      if (allowedBlocks.length === 0) {
        throw new Error("No blocks available. Select at least one category.");
      }

      const { pixels } = await loadAndResizeImage(imageFile, width, height);
      const grid = mapPixelsToBlocks(pixels, width, height, allowedBlocks);
      setBlockGrid(grid);

      // Pre-build the litematic so download is instant
      const litematic = generateLitematic(grid, orientation, schematicName);
      setLastLitematic(litematic);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsProcessing(false);
    }
  }, [imageFile, width, height, orientation, selectedCategories, schematicName]);

  const handleDownload = useCallback(() => {
    if (!lastLitematic) return;
    downloadLitematic(lastLitematic, `${schematicName}.litematic`);
  }, [lastLitematic, schematicName]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3">
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
        {/* Sidebar */}
        <aside className="w-80 flex-shrink-0 border-r border-zinc-800 overflow-y-auto p-5 flex flex-col gap-6">
          {/* Image upload */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
              1. Upload Image
            </h2>
            <ImageUpload onImageSelected={handleImageSelected} />
            {imagePreviewUrl && (
              <div className="mt-3 rounded-xl overflow-hidden border border-zinc-700 aspect-video bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreviewUrl}
                  alt="Input preview"
                  className="w-full h-full object-contain"
                />
              </div>
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

          {/* Controls */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
              2. Configure
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

          {error && (
            <div className="rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden p-5 gap-5 min-w-0">
          {/* Preview */}
          <div className="flex-1 flex flex-col min-h-0">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3 flex-shrink-0">
              3. Preview
            </h2>
            <div className="flex-1 min-h-0">
              <PixelArtPreview blockGrid={blockGrid} />
            </div>
          </div>

          {/* Block legend + download */}
          {blockGrid.length > 0 && (
            <div className="flex-shrink-0 flex flex-col gap-4">
              <BlockLegend blockGrid={blockGrid} />

              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-500 active:scale-95 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download .litematic
                </button>

                <div className="text-xs text-zinc-500">
                  <p>Import via <span className="text-zinc-300 font-medium">Litematica mod</span></p>
                  <p>in Minecraft → Load Schematics</p>
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {blockGrid.length === 0 && !isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                <svg className="w-10 h-10 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="3" width="7" height="7" strokeWidth="1.5" rx="1" />
                  <rect x="14" y="3" width="7" height="7" strokeWidth="1.5" rx="1" />
                  <rect x="3" y="14" width="7" height="7" strokeWidth="1.5" rx="1" />
                  <rect x="14" y="14" width="7" height="7" strokeWidth="1.5" rx="1" />
                </svg>
              </div>
              <div>
                <p className="text-zinc-400 font-medium">No pixel art generated yet</p>
                <p className="text-zinc-600 text-sm mt-1">
                  Upload an image and click <span className="text-zinc-400">Generate Pixel Art</span>
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
