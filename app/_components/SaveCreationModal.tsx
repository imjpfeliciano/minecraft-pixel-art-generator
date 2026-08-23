"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/_components/ui/dialog";
import { encodeGrid } from "@/app/_lib/creation-grid";
import { generateThumbnail } from "@/app/_lib/thumbnail";
import {
  trackCreationSaveOpened,
  trackCreationSaved,
  trackCreationSaveFailed,
  trackCreationPublishBlocked,
  trackCreationSignInPrompted,
} from "@/app/_lib/social-analytics";
import type { MinecraftBlock } from "@/app/_lib/blocks";
import type { CreationJson, Orientation, Visibility } from "@/app/_lib/creation";
import { AVAILABLE_TAGS } from "@/app/_lib/tags";

export interface SaveConfig {
  orientation: Orientation;
  width: number;
  height: number;
  schematicName: string;
  fillBlockId: string;
  foundationEnabled: boolean;
  foundationBlockId: string;
  selectedCategories: Set<string>;
}

interface SaveCreationModalProps {
  open: boolean;
  onClose: () => void;
  /** Present when opened from the editor (create or re-save). */
  blockGrid?: MinecraftBlock[][];
  initialVisibility?: Visibility;
  config?: SaveConfig;
  /**
   * When set the modal is in **edit mode**:
   *  - form is pre-populated from this creation
   *  - submit sends PATCH /api/creations/{id}
   *  - if blockGrid is also present → multipart (re-encode grid + thumbnail)
   *  - if blockGrid is absent → JSON-only (metadata update from dashboard)
   */
  existingCreation?: Pick<CreationJson, "id" | "title" | "description" | "tags" | "visibility" | "orientation" | "width" | "height">;
  /** Called with the saved/updated creation id on success. */
  onSaved?: (id: string) => void;
  /** Persist editor state before Clerk navigates away from the create page. */
  onBeforeSignIn?: () => void;
}

export default function SaveCreationModal({
  open,
  onClose,
  blockGrid,
  initialVisibility = "private",
  config,
  existingCreation,
  onSaved,
  onBeforeSignIn,
}: SaveCreationModalProps) {
  const t = useTranslations("SaveModal");
  const router = useRouter();
  const { isSignedIn } = useUser();

  const isEditMode = !!existingCreation;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [needsNickname, setNeedsNickname] = useState(false);

  useEffect(() => {
    if (open && isSignedIn === false) trackCreationSignInPrompted();
  }, [open, isSignedIn]);

  // Re-initialise form whenever the modal opens
  useEffect(() => {
    if (!open) return;
    trackCreationSaveOpened(isEditMode ? "edit" : "create");
    if (existingCreation) {
      setTitle(existingCreation.title);
      setDescription(existingCreation.description ?? "");
      setSelectedTags(existingCreation.tags ?? []);
      setVisibility(existingCreation.visibility);
    } else {
      setTitle(config?.schematicName ?? "PixelArt");
      setDescription("");
      setSelectedTags([]);
      setVisibility(initialVisibility);
    }
    setError(null);
    setSavedId(null);
    setNeedsNickname(false);
    setIsSubmitting(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleTag(slug: string) {
    setSelectedTags((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= 3) return prev;
      return [...prev, slug];
    });
  }

  async function handleSave() {
    if (!title.trim()) {
      setError(t("titleRequired"));
      trackCreationSaveFailed(isEditMode ? "edit" : "create", "validation");
      return;
    }
    setError(null);
    setNeedsNickname(false);
    setIsSubmitting(true);

    try {
      const url = isEditMode
        ? `/api/creations/${existingCreation!.id}`
        : "/api/creations";
      const method = isEditMode ? "PATCH" : "POST";

      let res: Response;

      if (blockGrid && config) {
        // Full multipart — create or re-save from editor
        const [gridBytes, previewBlob] = await Promise.all([
          Promise.resolve(encodeGrid(blockGrid)),
          generateThumbnail(blockGrid),
        ]);

        const metadata = JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          tags: selectedTags,
          visibility,
          orientation: config.orientation,
          width: config.width,
          height: config.height,
          schematicName: config.schematicName,
          fillBlockId: config.fillBlockId || null,
          foundation: {
            enabled: config.foundationEnabled,
            blockId: config.foundationBlockId,
          },
          blockCategories: Array.from(config.selectedCategories),
        });

        const formData = new FormData();
        formData.append("metadata", metadata);
        formData.append("preview", new Blob([previewBlob], { type: "image/png" }), "preview.png");
        formData.append("grid", new Blob([gridBytes.buffer as ArrayBuffer], { type: "application/gzip" }), "grid.json.gz");

        res = await fetch(url, { method, body: formData });
      } else {
        // Metadata-only JSON update from dashboard
        res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            tags: selectedTags,
            visibility,
          }),
        });
      }

      const data = await res.json();

      if (res.status === 409 && data?.error?.code === "nickname_required") {
        setNeedsNickname(true);
        trackCreationPublishBlocked();
        return;
      }
      if (!res.ok) {
        setError(data?.error?.message ?? t("errorGeneric"));
        trackCreationSaveFailed(isEditMode ? "edit" : "create", "server");
        return;
      }

      const savedCreationId = isEditMode ? existingCreation!.id : (data.id as string);
      trackCreationSaved({
        mode: isEditMode ? "edit" : "create",
        visibility,
        tagsCount: selectedTags.length,
        width: config?.width ?? existingCreation?.width ?? 0,
        height: config?.height ?? existingCreation?.height ?? 0,
        orientation: config?.orientation ?? existingCreation?.orientation ?? "",
        hasDescription: description.trim().length > 0,
      });
      setSavedId(savedCreationId);
      onSaved?.(savedCreationId);
    } catch {
      setError(t("errorGeneric"));
      trackCreationSaveFailed(isEditMode ? "edit" : "create", "network");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    if (savedId && !isEditMode) router.push("/dashboard");
    onClose();
  }

  const dialogTitle = isEditMode ? t("editTitle") : t("title");
  const saveLabel = isEditMode ? t("update") : t("save");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        {/* ── Success ──────────────────────────────────────────────────── */}
        {savedId ? (
          <>
            <DialogHeader>
              <DialogTitle>{isEditMode ? t("updateSuccessTitle") : t("successTitle")}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <svg className="h-7 w-7 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-600 dark:text-zinc-400">
                {isEditMode ? t("updateSuccessBody") : t("successBody")}
              </p>
            </div>
            <DialogFooter>
              {isEditMode ? (
                <button
                  onClick={handleClose}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  {t("close")}
                </button>
              ) : (
                <Link href="/dashboard" className="inline-flex items-center justify-center rounded-lg bg-grass px-4 py-2 text-sm font-semibold text-white hover:bg-grass-hover transition-colors">
                  {t("viewDashboard")}
                </Link>
              )}
            </DialogFooter>
          </>
        ) : !isSignedIn ? (
          /* ── Not signed in ─────────────────────────────────────────── */
          <>
            <DialogHeader><DialogTitle>{t("title")}</DialogTitle></DialogHeader>
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <svg className="h-10 w-10 text-gray-300 dark:text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="text-sm text-gray-600 dark:text-zinc-400">{t("signInPrompt")}</p>
              <SignInButton
                mode="modal"
                forceRedirectUrl="/create"
                signUpForceRedirectUrl="/create"
              >
                <button
                  className="rounded-lg bg-grass px-5 py-2 text-sm font-semibold text-white hover:bg-grass-hover transition-colors"
                  onClick={() => onBeforeSignIn?.()}
                >
                  {t("signInButton")}
                </button>
              </SignInButton>
            </div>
          </>
        ) : (
          /* ── Form ──────────────────────────────────────────────────── */
          <>
            <DialogHeader><DialogTitle>{dialogTitle}</DialogTitle></DialogHeader>

            <div className="flex flex-col gap-4">
              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-zinc-300">
                  {t("titleLabel")}<span className="ml-1 text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("titlePlaceholder")}
                  maxLength={80}
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 focus:border-green-500 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-zinc-300">{t("descriptionLabel")}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                  maxLength={500}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 focus:border-green-500 focus:outline-none"
                />
              </div>

              {/* Tags */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-700 dark:text-zinc-300">{t("tagsLabel")}</label>
                  <span className="text-xs text-gray-400 dark:text-zinc-500">{selectedTags.length}/3</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_TAGS.map((tag) => {
                    const active = selectedTags.includes(tag.slug);
                    const disabled = !active && selectedTags.length >= 3;
                    return (
                      <button
                        key={tag.slug}
                        type="button"
                        onClick={() => !disabled && toggleTag(tag.slug)}
                        disabled={disabled}
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                          active
                            ? "border-green-500 bg-green-50 text-green-700 dark:border-green-400 dark:bg-green-900/30 dark:text-green-300"
                            : disabled
                              ? "cursor-not-allowed border-gray-200 text-gray-300 dark:border-zinc-700 dark:text-zinc-600"
                              : "border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
                        }`}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visibility */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-zinc-300">{t("visibilityLabel")}</label>
                <div className="flex items-center rounded-lg border border-gray-200 dark:border-zinc-700 overflow-hidden text-xs font-medium w-fit">
                  <button
                    type="button"
                    onClick={() => { setVisibility("private"); setNeedsNickname(false); }}
                    className={`px-3 py-1.5 transition-colors ${visibility === "private" ? "bg-gray-200 text-gray-900 dark:bg-zinc-700 dark:text-zinc-100" : "text-gray-500 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300"}`}
                  >
                    🔒 {t("visibilityPrivate")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility("public")}
                    className={`px-3 py-1.5 transition-colors ${visibility === "public" ? "bg-grass text-white" : "text-gray-500 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300"}`}
                  >
                    🌍 {t("visibilityPublic")}
                  </button>
                </div>
                <p className="text-xs text-gray-400 dark:text-zinc-500">
                  {visibility === "private" ? t("visibilityPrivateHint") : t("visibilityPublicHint")}
                </p>
              </div>

              {needsNickname && (
                <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  {t("nicknameRequiredHint")}{" "}
                  <Link href="/onboarding" className="underline font-medium">{t("nicknameSetLink")}</Link>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting || !title.trim()}
                className="rounded-lg bg-grass px-4 py-2 text-sm font-semibold text-white hover:bg-grass-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t("saving") : saveLabel}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
