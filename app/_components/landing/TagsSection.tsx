"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { AVAILABLE_TAGS } from "../../_lib/tags";
import TagRequestModal from "./TagRequestModal";
import { useSectionTracking } from "../../_lib/hooks/useSectionTracking";
import { trackTagRequestOpened } from "../../_lib/landing-analytics";

export default function TagsSection() {
  const t = useTranslations("Landing");
  const sectionRef = useSectionTracking("tags");
  const [modalOpen, setModalOpen] = useState(false);

  const handleRequestOpen = () => {
    trackTagRequestOpened();
    setModalOpen(true);
  };

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="border-t border-gray-200 bg-white py-20 dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="mx-auto max-w-7xl px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            {t("tagsSectionLabel")}
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {t("tagsHeading")}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">{t("tagsSubheading")}</p>
        </div>

        {/* Tag grid */}
        <div className="flex flex-wrap gap-3">
          {AVAILABLE_TAGS.map((tag) => (
            <Badge
              key={tag.slug}
              variant="outline"
              className="cursor-default border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:border-grass/50 hover:text-grass dark:border-gray-700 dark:text-gray-300"
              title={tag.description}
            >
              {tag.label}
            </Badge>
          ))}
        </div>

        {/* Request CTA */}
        <div className="mt-8 flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRequestOpen}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
          >
            {t("tagsRequestCta")}
          </Button>
        </div>
      </div>

      <TagRequestModal open={modalOpen} onOpenChange={setModalOpen} />
    </section>
  );
}
