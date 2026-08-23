"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import ImageUpload from "../_components/ImageUpload";
import ControlPanel from "../_components/ControlPanel";
import PixelArtPreview from "../_components/PixelArtPreview";
import BlockLegend from "../_components/BlockLegend";
import ThemeToggle from "../_components/ThemeToggle";
import LocaleSwitcher from "../_components/LocaleSwitcher";
import UserMenu from "../_components/UserMenu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../_components/ui/dialog";
import {
  GENERATION_BLOCK_CATEGORIES,
  GENERATION_BLOCKS,
  MINECRAFT_BLOCKS,
  MinecraftBlock,
} from "../_lib/blocks";
import { mapPixelsToBlocks } from "../_lib/color-matcher";
import { loadAndResizeImage } from "../_lib/image-processor";
import { downloadLitematic, generateLitematic, Orientation } from "../_lib/litematic-generator";
import { decodeGrid } from "../_lib/creation-grid";
import {
  clearCreateDraft,
  decodeCreateDraftGrid,
  loadCreateDraft,
  saveCreateDraft,
} from "../_lib/create-draft";
import SaveCreationModal from "../_components/SaveCreationModal";
import type { CreationJson, Visibility } from "../_lib/creation";

// Loading placeholder for the 3D viewer — needs translations so it's a component
function Loading3DViewer() {
  const t = useTranslations("Page");
  return (
    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 dark:text-zinc-500">
      {t("loading3d")}
    </div>
  );
}

// Three.js viewer is browser-only — skip SSR entirely
const SchematicViewer3D = dynamic(
  () => import("../_components/SchematicViewer3D"),
  {
    ssr: false,
    loading: Loading3DViewer,
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
                  ? "bg-grass text-white"
                  : step.state === "active"
                    ? "border-2 border-green-500 text-green-400"
                    : "border-2 border-gray-300 text-gray-400 dark:border-zinc-700 dark:text-zinc-600"
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
                  step.state === "completed" ? "bg-green-700" : "bg-gray-200 dark:bg-zinc-800"
                }`}
                style={{ minHeight: 12 }}
              />
            )}
          </div>
          {/* Label */}
          <div className="pb-3 pt-0.5">
            <span
              className={`text-xs font-medium ${
                step.state === "pending" ? "text-gray-400 dark:text-zinc-600" : "text-gray-700 dark:text-zinc-300"
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

function CreatePageInner() {
  const t = useTranslations("Page");
  const { isSignedIn, isLoaded: isAuthLoaded } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();

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

  // Save modal
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [showSaveModal, setShowSaveModal] = useState(false);
  // When set, the editor was opened from the dashboard ("re-open in editor")
  const [loadedCreation, setLoadedCreation] = useState<CreationJson | null>(null);
  const [isLoadingCreation, setIsLoadingCreation] = useState(false);
  // Pending image when user tries to load a new image while in edit mode
  const [pendingImage, setPendingImage] = useState<{ file: File; url: string } | null>(null);
  const [restoredGuestDraft, setRestoredGuestDraft] = useState(false);

  const persistGuestDraft = useCallback(() => {
    if (blockGrid.length === 0) return;
    void saveCreateDraft({
      blockGrid,
      width,
      height,
      orientation,
      schematicName,
      fillBlockId,
      foundationEnabled,
      foundationBlockId,
      selectedCategories: Array.from(selectedCategories),
    });
  }, [
    blockGrid,
    width,
    height,
    orientation,
    schematicName,
    fillBlockId,
    foundationEnabled,
    foundationBlockId,
    selectedCategories,
  ]);

  // Hydrate editor from ?creation=<id>
  useEffect(() => {
    const creationId = searchParams.get("creation");
    if (!creationId) return;
    setIsLoadingCreation(true);

    Promise.all([
      fetch(`/api/creations/${creationId}`).then((r) => r.json() as Promise<CreationJson>),
      fetch(`/api/creations/${creationId}/grid`).then((r) => r.arrayBuffer()),
    ])
      .then(([creation, gridBuffer]) => {
        const grid = decodeGrid(new Uint8Array(gridBuffer));
        setLoadedCreation(creation);
        setBlockGrid(grid);
        setWidth(creation.width);
        setHeight(creation.height);
        setOrientation(creation.orientation as Orientation);
        setSchematicName(creation.schematicName);
        setFillBlockId(creation.fillBlockId ?? "");
        setFoundationEnabled(creation.foundation.enabled);
        setFoundationBlockId(creation.foundation.blockId);
        if (creation.blockCategories.length > 0) {
          setSelectedCategories(new Set(creation.blockCategories));
        }
        setVisibility(creation.visibility);
        // Regenerate the litematic from the loaded grid
        setLastLitematic(
          generateLitematic(
            grid,
            creation.orientation as Orientation,
            creation.schematicName,
            creation.foundation.enabled ? { blockId: creation.foundation.blockId } : undefined,
          ),
        );
        setUndoStack([]);
      })
      .catch(() => setError(t("loadCreationError")))
      .finally(() => setIsLoadingCreation(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Restore unsaved editor state after Clerk redirects back to /create
  useEffect(() => {
    if (searchParams.get("creation")) return;
    let cancelled = false;
    void loadCreateDraft().then((draft) => {
      if (cancelled || !draft) return;
      const grid = decodeCreateDraftGrid(draft);
      setBlockGrid(grid);
      setWidth(draft.width);
      setHeight(draft.height);
      setOrientation(draft.orientation);
      setSchematicName(draft.schematicName);
      setFillBlockId(draft.fillBlockId);
      setFoundationEnabled(draft.foundationEnabled);
      setFoundationBlockId(draft.foundationBlockId);
      if (draft.selectedCategories.length > 0) {
        setSelectedCategories(new Set(draft.selectedCategories));
      }
      setLastLitematic(
        generateLitematic(
          grid,
          draft.orientation,
          draft.schematicName,
          draft.foundationEnabled ? { blockId: draft.foundationBlockId } : undefined,
        ),
      );
      setUndoStack([]);
      setRestoredGuestDraft(draft.openSaveModal);
      void clearCreateDraft();
    });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    if (!restoredGuestDraft || !isAuthLoaded || !isSignedIn) return;
    setShowSaveModal(true);
  }, [restoredGuestDraft, isAuthLoaded, isSignedIn]);

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

  const applyNewImage = useCallback((file: File, url: string) => {
    if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
    imagePreviewUrlRef.current = url;
    setImageFile(file);
    setImagePreviewUrl(url);
    setBlockGrid([]);
    setLastLitematic(null);
    setUndoStack([]);
    setError(null);
  }, []);

  const handleImageSelected = useCallback(
    (file: File, url: string) => {
      if (loadedCreation) {
        // Intercept: ask for confirmation before discarding edit-mode state
        setPendingImage({ file, url });
        return;
      }
      applyNewImage(file, url);
    },
    [loadedCreation, applyNewImage]
  );

  const handleConfirmNewCreation = useCallback(() => {
    if (!pendingImage) return;
    setLoadedCreation(null);
    router.replace("/create", { scroll: false });
    applyNewImage(pendingImage.file, pendingImage.url);
    setPendingImage(null);
  }, [pendingImage, applyNewImage, router]);

  const handleCancelNewCreation = useCallback(() => {
    if (pendingImage) URL.revokeObjectURL(pendingImage.url);
    setPendingImage(null);
  }, [pendingImage]);

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
        throw new Error(t("errorNoBlocks"));
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
  }, [t, imageFile, width, height, orientation, selectedCategories, schematicName, fillBlockId, foundationEnabled, foundationBlockId]);

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
      label: t("step1"),
      state: imageFile ? "completed" : "active",
    },
    {
      id: 2,
      label: t("step2"),
      state: blockGrid.length > 0 || isProcessing
        ? "completed"
        : imageFile
          ? "active"
          : "pending",
    },
    {
      id: 3,
      label: t("step3"),
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
      label: t("step4"),
      state: blockGrid.length > 0 ? "active" : "pending",
    },
  ];

  return (
    <div className="h-screen overflow-hidden bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 flex flex-col">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-100 dark:border-zinc-800 px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-grass flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v10H7V7zm2 2v6h6V9H9z" />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-bold leading-none">{t("title")}</h1>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{t("tagline")}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          {isSignedIn && (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-gray-100"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                My Creations
              </Link>
              <UserMenu variant="nav" />
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Loading banner — shown while hydrating from ?creation=id */}
        {isLoadingCreation && (
          <div className="absolute inset-x-0 top-[57px] z-10 flex items-center gap-2 bg-grass px-4 py-2 text-xs font-medium text-white">
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
            </svg>
            {t("loadingCreation")}
          </div>
        )}
        {/* ── Sidebar ───────────────────────────────────────────────────────── */}
        <aside className="w-80 flex-shrink-0 border-r border-gray-100 dark:border-zinc-800 overflow-y-auto p-5 flex flex-col gap-6">
          {/* Step tracker */}
          <StepTracker steps={steps} />

          <div className="border-t border-gray-100 dark:border-zinc-800" />

          {/* 1. Upload */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400 mb-3">
              {t("sectionUpload")}
            </h2>
            <ImageUpload onImageSelected={handleImageSelected} />
            {imageFile && (
              <p className="mt-2 text-xs text-gray-400 dark:text-zinc-500 truncate">
                {imageFile.name}
              </p>
            )}
          </section>

          {/* Schematic name */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400 mb-3">
              {t("sectionSchematicName")}
            </h2>
            <input
              type="text"
              value={schematicName}
              onChange={(e) => setSchematicName(e.target.value || "PixelArt")}
              placeholder="PixelArt"
              className="w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 focus:border-green-500 focus:outline-none"
            />
          </section>

          {/* 2. Configure */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400 mb-3">
              {t("sectionConfigure")}
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
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400 mb-3">
              {t("sectionBackground")}
            </h2>
            <select
              value={fillBlockId}
              onChange={(e) => setFillBlockId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 focus:border-green-500 focus:outline-none"
            >
              <option value="">{t("backgroundNone")}</option>
              <optgroup label={t("backgroundGroupWhite")}>
                <option value="minecraft:white_concrete">{t("backgroundWhiteConcrete")}</option>
                <option value="minecraft:quartz_block">{t("backgroundQuartzBlock")}</option>
                <option value="minecraft:snow_block">{t("backgroundSnowBlock")}</option>
              </optgroup>
              <optgroup label={t("backgroundGroupBlack")}>
                <option value="minecraft:black_concrete">{t("backgroundBlackConcrete")}</option>
                <option value="minecraft:obsidian">{t("backgroundObsidian")}</option>
              </optgroup>
              <optgroup label={t("backgroundGroupGray")}>
                <option value="minecraft:gray_concrete">{t("backgroundGrayConcrete")}</option>
                <option value="minecraft:smooth_stone">{t("backgroundSmoothStone")}</option>
              </optgroup>
              <optgroup label={t("backgroundGroupOther")}>
                <option value="minecraft:stone">{t("backgroundStone")}</option>
                <option value="minecraft:oak_planks">{t("backgroundOakPlanks")}</option>
              </optgroup>
            </select>
          </section>

          {/* Foundation layer — only relevant for horizontal orientation */}
          {orientation === "horizontal" && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400 mb-3">
                {t("sectionFoundation")}
              </h2>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={foundationEnabled}
                  onChange={(e) => setFoundationEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 accent-green-500 cursor-pointer"
                />
                <span className="text-sm text-gray-700 dark:text-zinc-300">{t("foundationAddLayer")}</span>
              </label>
              {foundationEnabled && (
                <select
                  value={foundationBlockId}
                  onChange={(e) => setFoundationBlockId(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 focus:border-green-500 focus:outline-none"
                >
                  <option value="minecraft:stone">{t("foundationStone")}</option>
                  <option value="minecraft:smooth_stone">{t("foundationSmoothStone")}</option>
                  <option value="minecraft:deepslate">{t("foundationDeepslate")}</option>
                  <option value="minecraft:obsidian">{t("foundationObsidian")}</option>
                  <option value="minecraft:oak_planks">{t("foundationOakPlanks")}</option>
                </select>
              )}
            </section>
          )}

          {error && (
            <div className="rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
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
                <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 overflow-hidden min-w-0">
                  {/* Panel header */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0">
                    <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                      {t("panelPixelArt")}
                    </span>
                    {blockGrid.length > 0 && (
                      <span className="text-xs text-gray-400 dark:text-zinc-600">
                        {t("dimensions", { cols: blockGrid[0]?.length ?? 0, rows: blockGrid.length })}
                      </span>
                    )}

                    {/* 2D / 3D view toggle */}
                    {blockGrid.length > 0 && (
                      <div className="flex items-center rounded-lg border border-gray-200 dark:border-zinc-700 overflow-hidden text-xs font-medium">
                        <button
                          onClick={() => {
                            setPreviewMode("2d");
                            track("3D Viewer Closed");
                          }}
                          className={`px-2.5 py-1 transition-colors ${
                            previewMode === "2d"
                              ? "bg-gray-200 text-gray-900 dark:bg-zinc-700 dark:text-zinc-100"
                              : "text-gray-500 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                          }`}
                        >
                          {t("view2d")}
                        </button>
                        <button
                          onClick={() => {
                            setPreviewMode("3d");
                            track("3D Preview Opened", { orientation });
                          }}
                          className={`px-2.5 py-1 transition-colors ${
                            previewMode === "3d"
                              ? "bg-gray-200 text-gray-900 dark:bg-zinc-700 dark:text-zinc-100"
                              : "text-gray-500 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                          }`}
                        >
                          {t("view3d")}
                        </button>
                      </div>
                    )}

                    {undoStack.length > 0 && (
                      <button
                        onClick={handleUndo}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-zinc-400 hover:border-gray-400 dark:hover:border-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
                        title={t("undoTitle")}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M3 8h7a3 3 0 100-6H7" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M6 5L3 8l3 3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {t("undoButton")}
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
                            ? "border-gray-400 bg-gray-100 text-gray-800 dark:border-zinc-500 dark:bg-zinc-800 dark:text-zinc-200"
                            : "border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
                        }`}
                        title={showMaterialList ? t("hideMaterials") : t("showMaterials")}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <line x1="3" y1="4" x2="13" y2="4" />
                          <line x1="3" y1="8" x2="13" y2="8" />
                          <line x1="3" y1="12" x2="10" y2="12" />
                        </svg>
                        {t("materialsButton")}
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
                  <div className="w-72 flex-shrink-0 flex flex-col border-l border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
                    {/* Side panel header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0">
                      <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                        {t("materialsButton")}
                      </span>
                      <button
                        onClick={() => setShowMaterialList(false)}
                        className="text-gray-400 dark:text-zinc-600 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
                        title={t("closeButton")}
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

              {/* ── Action bar ───────────────────────────────────────────────── */}
              {blockGrid.length > 0 && (
                <div className="flex-shrink-0 border-t border-gray-100 dark:border-zinc-800 px-4 py-3 flex items-center gap-3 flex-wrap">
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 rounded-xl bg-grass px-5 py-3 text-sm font-semibold text-white hover:bg-grass-hover active:scale-95 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {t("downloadButton")}
                  </button>
                  <div className="text-xs text-gray-400 dark:text-zinc-500">
                    <p>{t("importVia")} <span className="text-gray-700 dark:text-zinc-300 font-medium">{t("importLitematicaMod")}</span></p>
                    <p>{t("importInstructions")}</p>
                  </div>

                  {isSignedIn && (
                    <>
                      {/* Separator */}
                      <div className="h-8 w-px bg-gray-200 dark:bg-zinc-700" />

                      {/* Visibility toggle — signed-in only */}
                      <div className="flex items-center rounded-lg border border-gray-200 dark:border-zinc-700 overflow-hidden text-xs font-medium">
                        <button
                          onClick={() => setVisibility("private")}
                          className={`flex items-center gap-1 px-3 py-2 transition-colors ${
                            visibility === "private"
                              ? "bg-gray-200 text-gray-900 dark:bg-zinc-700 dark:text-zinc-100"
                              : "text-gray-500 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                          }`}
                        >
                          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="7" width="10" height="7" rx="1" />
                            <path d="M5 7V5a3 3 0 016 0v2" strokeLinecap="round" />
                          </svg>
                          {t("visibilityPrivate")}
                        </button>
                        <button
                          onClick={() => setVisibility("public")}
                          className={`flex items-center gap-1 px-3 py-2 transition-colors ${
                            visibility === "public"
                              ? "bg-grass text-white"
                              : "text-gray-500 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                          }`}
                        >
                          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="8" cy="8" r="6" />
                            <path d="M8 2a10.5 10.5 0 000 12M8 2a10.5 10.5 0 010 12M2 8h12" strokeLinecap="round" />
                          </svg>
                          {t("visibilityPublic")}
                        </button>
                      </div>
                    </>
                  )}

                  {/* Save button */}
                  <button
                    onClick={() => {
                      if (!isSignedIn && !loadedCreation) {
                        void persistGuestDraft();
                      }
                      setShowSaveModal(true);
                    }}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-zinc-700 px-5 py-3 text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:border-grass hover:text-grass dark:hover:border-grass dark:hover:text-grass transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    {t("saveButton")}
                  </button>
                </div>
              )}
            </>
          ) : (
            /* ── Pre-generation view: two panels ───────────────────────────── */
            <div className="flex flex-1 overflow-hidden gap-px bg-gray-100 dark:bg-zinc-800 min-h-0">

              {/* Original image panel — full width before generation */}
              <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 overflow-hidden min-w-0">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0">
                  <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                    {t("panelOriginal")}
                  </span>
                  {imageFile && (
                    <span className="text-xs text-gray-400 dark:text-zinc-600 truncate">
                      {imageFile.name}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-hidden flex items-center justify-center p-4 min-h-0">
                  {imagePreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagePreviewUrl}
                      alt={t("originalImageAlt")}
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-700 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3.75 3h16.5M12 3v.01" />
                        </svg>
                      </div>
                      <p className="text-gray-400 dark:text-zinc-600 text-sm">{t("uploadToBegin")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Save creation modal ───────────────────────────────────────── */}
      {blockGrid.length > 0 && (
        <SaveCreationModal
          open={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          blockGrid={blockGrid}
          initialVisibility={visibility}
          config={{
            orientation,
            width,
            height,
            schematicName,
            fillBlockId,
            foundationEnabled,
            foundationBlockId,
            selectedCategories,
          }}
          existingCreation={loadedCreation ?? undefined}
          onBeforeSignIn={persistGuestDraft}
        />
      )}

      {/* ── New-creation confirmation dialog ──────────────────────────── */}
      <Dialog
        open={pendingImage !== null}
        onOpenChange={(open) => { if (!open) handleCancelNewCreation(); }}
      >
        <DialogContent className="max-w-sm bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle>{t("newCreationConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            {loadedCreation
              ? t("newCreationConfirmBodyEdit", { title: loadedCreation.title })
              : t("newCreationConfirmBody")}
          </p>
          <DialogFooter className="gap-2">
            <button
              onClick={handleCancelNewCreation}
              className="px-4 py-2 text-sm rounded-md border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              {t("newCreationConfirmCancel")}
            </button>
            <button
              onClick={handleConfirmNewCreation}
              className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              {t("newCreationConfirmContinue")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense>
      <CreatePageInner />
    </Suspense>
  );
}
