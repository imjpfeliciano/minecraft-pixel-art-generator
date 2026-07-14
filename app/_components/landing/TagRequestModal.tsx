"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { trackTagRequestSubmitted } from "../../_lib/landing-analytics";

interface TagRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TagRequestModal({ open, onOpenChange }: TagRequestModalProps) {
  const t = useTranslations("Landing");
  const [tagName, setTagName] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/tags/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tagName.trim(), description: description.trim() }),
      });
      trackTagRequestSubmitted(tagName.trim());
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTagName("");
      setDescription("");
      setSubmitted(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">{t("modalTitle")}</DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400">
            {t("modalDescription")}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-6 text-center">
            <div className="mb-3 text-3xl">✅</div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{t("modalSuccessTitle")}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("modalSuccessMessage")}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tag-name" className="text-gray-700 dark:text-gray-300">
                {t("modalNameLabel")}{" "}
                <span className="text-gray-400 dark:text-gray-600">{t("modalNameRequired")}</span>
              </Label>
              <Input
                id="tag-name"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                maxLength={32}
                placeholder={t("modalNamePlaceholder")}
                required
                className="border-gray-300 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus-visible:border-grass focus-visible:ring-grass/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-600"
              />
              <span className="text-right text-xs text-gray-400 dark:text-gray-600">
                {tagName.length}/32
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="tag-description" className="text-gray-700 dark:text-gray-300">
                {t("modalDescLabel")}{" "}
                <span className="text-gray-400 dark:text-gray-600">{t("modalDescOptional")}</span>
              </Label>
              <Textarea
                id="tag-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={140}
                placeholder={t("modalDescPlaceholder")}
                rows={3}
                className="resize-none border-gray-300 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus-visible:border-grass focus-visible:ring-grass/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-600"
              />
              <span className="text-right text-xs text-gray-400 dark:text-gray-600">
                {description.length}/140
              </span>
            </div>

            <DialogFooter className="border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                {t("modalCancel")}
              </Button>
              <Button
                type="submit"
                disabled={loading || !tagName.trim()}
                className="bg-grass text-white hover:bg-grass-hover disabled:opacity-50"
              >
                {loading ? t("modalSubmitting") : t("modalSubmit")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
