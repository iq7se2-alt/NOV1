"use client";

import Link from "next/link";
import { Compass, MapPin, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

export function WorldMapHeader({ locationCount }: { locationCount: number }) {
  const { t, formatNumber } = useLanguage();
  return (
    <div className="mb-10 text-center">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/25 px-4 py-1 text-xs text-gold/80">
        <Compass className="h-3.5 w-3.5" />
        {t("عالم الرواية")}
      </div>
      <h1 className="font-naskh text-4xl font-bold text-gold-gradient sm:text-5xl">
        {t("خريطة العالم")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {locationCount > 0 ? `${formatNumber(locationCount)} ${t("مكان")}` : t("لم تُضف أماكن بعد")}
      </p>
    </div>
  );
}

export function WorldMapEmpty() {
  const { t } = useLanguage();
  return (
    <div className="gold-card animate-float-in rounded-lg p-12 text-center">
      <MapPin className="mx-auto mb-4 h-12 w-12 text-gold/30" />
      <p className="font-naskh text-lg text-muted-foreground">{t("لا توجد أماكن بعد.")}</p>
      <p className="mt-2 text-sm text-muted-foreground/70">{t("يمكن إضافة الأماكن من لوحة الإدارة.")}</p>
      <Link href="/admin" className="mt-6 inline-block">
        <Button className="bg-gold text-[#1a0a00] hover:bg-gold-soft">
          {t("الذهاب للإدارة")}
          <ArrowLeft className="mr-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
