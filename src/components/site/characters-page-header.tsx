"use client";

import { Users } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

/** Page header (client so the counts follow the language toggle). */
export function CharactersPageHeader({
  characterCount,
  relationCount,
}: {
  characterCount: number;
  relationCount: number;
}) {
  const { t, formatNumber } = useLanguage();
  return (
    <div className="mb-10 text-center">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/25 px-4 py-1 text-xs text-gold/80">
        <Users className="h-3.5 w-3.5" />
        {t("شخصيات وعلاقات الرواية")}
      </div>
      <h1 className="font-naskh text-4xl font-bold text-gold-gradient sm:text-5xl">
        {t("لوحة الشخصيات")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {characterCount > 0 ? (
          <>
            <span className="font-bold text-gold">{formatNumber(characterCount)}</span> {t("كيان")} ·{" "}
            <span className="font-bold text-gold">{formatNumber(relationCount)}</span> {t("علاقة")} ·{" "}
            {t("مرتّبة بعدد الذكر")}
          </>
        ) : (
          t("لم تُضف شخصيات بعد")
        )}
      </p>
    </div>
  );
}

export function CharactersEmptyState() {
  const { t } = useLanguage();
  return (
    <div className="gold-card rounded-lg p-12 text-center">
      <Users className="mx-auto mb-4 h-12 w-12 text-gold/30" />
      <p className="font-naskh text-lg text-muted-foreground">{t("لا توجد شخصيات بعد.")}</p>
    </div>
  );
}
