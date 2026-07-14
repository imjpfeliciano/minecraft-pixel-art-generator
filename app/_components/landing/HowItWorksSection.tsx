"use client";

import { Upload, Settings2, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { Separator } from "../ui/separator";
import { useSectionTracking } from "../../_lib/hooks/useSectionTracking";

export default function HowItWorksSection() {
  const t = useTranslations("Landing");
  const sectionRef = useSectionTracking("how-it-works");

  const STEPS = [
    {
      icon: Upload,
      step: "01",
      label: t("howStep1Label"),
      description: t("howStep1Desc"),
    },
    {
      icon: Settings2,
      step: "02",
      label: t("howStep2Label"),
      description: t("howStep2Desc"),
    },
    {
      icon: Download,
      step: "03",
      label: t("howStep3Label"),
      description: t("howStep3Desc"),
    },
  ];

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50"
    >
      <div className="mx-auto max-w-7xl px-8 py-12">
        <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-gray-500">
          {t("howTitle")}
        </p>
        <div className="flex items-stretch gap-0">
          {STEPS.map((step, i) => (
            <div key={step.step} className="flex flex-1 items-start gap-0">
              <div className="flex flex-1 flex-col items-center gap-4 px-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-grass/30 bg-grass/10">
                  <step.icon className="h-5 w-5 text-grass" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-mono text-xs text-gray-400 dark:text-gray-600">{step.step}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{step.label}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{step.description}</p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <Separator orientation="vertical" className="h-auto self-stretch bg-gray-200 dark:bg-gray-700" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
