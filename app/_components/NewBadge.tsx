"use client";

import { useTranslations } from "next-intl";
import { cn } from "../_lib/utils";

export default function NewBadge({ className }: { className?: string }) {
  const t = useTranslations("Common");

  return (
    <span
      className={cn(
        "inline-flex h-4 shrink-0 items-center rounded-full bg-grass px-1.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-white",
        className,
      )}
    >
      {t("new")}
    </span>
  );
}
