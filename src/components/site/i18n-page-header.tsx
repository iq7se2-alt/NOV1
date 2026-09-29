"use client";

import Link from "next/link";
import { BookOpen, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

/**
 * Generic translated page header — so server pages can keep their data-fetching
 * while the badge/title/subtitle follow the language toggle.
 */
export function I18nPageHeader({
  badge,
  title,
  subtitle,
}: {
  badge?: string;
  title: string;
  subtitle?: string;
}) {
  const { t } = useLanguage();
  return (
    <div className="mb-10 text-center">
      {badge && (
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/25 px-4 py-1 text-xs text-gold/80">
          {t(badge)}
        </div>
      )}
      <h1 className="font-naskh text-4xl font-bold text-gold-gradient sm:text-5xl">{t(title)}</h1>
      {subtitle && <p className="mt-2 text-sm text-muted-foreground">{t(subtitle)}</p>}
    </div>
  );
}

/** Shared "back home" footer link. */
export function BackHomeLink() {
  const { t } = useLanguage();
  return (
    <div className="mt-12 text-center text-xs text-muted-foreground">
      <Link href="/" className="text-gold/60 hover:text-gold">
        {t("العودة للرئيسية")}
      </Link>
    </div>
  );
}

/** /chapters header — shows the regular + filler split. */
export function ChaptersPageHeader({ regularCount, fillerCount }: { regularCount: number; fillerCount: number }) {
  const { t, formatNumber } = useLanguage();
  return (
    <div className="mb-8 text-center">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/25 px-4 py-1 text-xs text-gold/80">
        <BookOpen className="h-3.5 w-3.5" />
        {t("فهرس الرواية")}
      </div>
      <h1 className="font-naskh text-4xl font-bold text-gold-gradient">{t("قائمة الفصول")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <span className="font-bold text-gold">{formatNumber(regularCount)}</span> {t("فصل")}
        {" · "}
        <span className="inline-flex items-center gap-1 text-gold/70">
          <Sparkles className="h-3 w-3" />
          {formatNumber(fillerCount)} {t("فلر")}
        </span>
      </p>
    </div>
  );
}
