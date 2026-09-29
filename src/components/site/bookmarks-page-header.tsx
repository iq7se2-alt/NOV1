"use client";

import { BookmarkX } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export function BookmarksPageHeader({ chapterCount }: { chapterCount: number }) {
  const { t, formatNumber } = useLanguage();
  return (
    <div className="mb-10 text-center">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/25 px-4 py-1 text-xs text-gold/80">
        <BookmarkX className="h-3.5 w-3.5" />
        {t("فصولك المميزة")}
      </div>
      <h1 className="font-naskh text-4xl font-bold text-gold-gradient sm:text-5xl">
        {t("المفضلة")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {formatNumber(chapterCount)} {t("فصل متاح للإضافة للمفضلة")}
      </p>
    </div>
  );
}
