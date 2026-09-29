"use client";

import { useLanguage } from "@/lib/i18n";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Smart Recap — shows a brief summary of the PREVIOUS chapter.
 * The recap text is manually entered by the admin (no AI).
 * If no recap exists, this component renders nothing.
 */
export function SmartRecap({
  prevChapterNumber,
  prevChapterTitle,
  recap,
}: {
  prevChapterNumber: number | null;
  prevChapterTitle: string | null;
  recap: string | null;
}) {
  const { t, formatNumber } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!recap || dismissed || !prevChapterNumber) return null;

  return (
    <div className="mx-auto mb-6 max-w-3xl px-4 sm:px-6">
      <div
        className="gold-card rounded-lg p-4"
        style={{ animation: "float-in 0.5s ease forwards" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-gold" />
            <h3 className="font-naskh text-sm font-bold text-gold">
              {t("📖 آخر ما حدث في الفصل")} {formatNumber(prevChapterNumber)}:
            </h3>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t("تخطّي ✕")}
          </button>
        </div>

        <p
          className={cn(
            "font-naskh text-sm leading-relaxed text-foreground/80",
            !expanded && "line-clamp-2"
          )}
        >
          {recap}
        </p>

        <div className="mt-3 flex items-center gap-3">
          {recap.length > 150 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-gold/70 hover:text-gold"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  {t("عرض أقل")}
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  {t("عرض المزيد")}
                </>
              )}
            </button>
          )}
          <Link href={`/chapters/${prevChapterNumber}`}>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-gold/70 hover:text-gold"
            >
              {t("اقرأ الفصل السابق كامل ←")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
