"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { LatestChaptersGrid } from "@/components/site/stat-cards";

type Chapter = {
  number: number;
  title: string;
  wordCount: number;
  views: number;
  createdAt: string;
};

/** "Latest chapters" section of the home page (client so the labels switch). */
export function HomeLatestChapters({ latest, coverUrl }: { latest: Chapter[]; coverUrl: string }) {
  const { t } = useLanguage();
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h2 className="font-naskh text-3xl font-bold text-gold-gradient sm:text-4xl">
            {t("آخر الفصول")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("أحدث ما نُشر من رواية سيد الحقيقة")}</p>
        </div>
        <Link
          href="/chapters"
          className="hidden items-center gap-1 text-sm text-gold/70 transition-colors hover:text-gold sm:flex"
        >
          {t("كل الفصول")}
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      {latest.length === 0 ? (
        <div className="gold-card rounded-lg p-12 text-center">
          <p className="font-naskh text-lg text-muted-foreground">{t("لا توجد فصول بعد.")}</p>
        </div>
      ) : (
        <LatestChaptersGrid chapters={latest} coverUrl={coverUrl} />
      )}

      <div className="mt-8 flex justify-center sm:hidden">
        <Link href="/chapters">
          <Button variant="outline" className="border-gold/40 text-gold hover:border-gold/70 hover:bg-gold/10">
            <BookOpen className="ml-2 h-4 w-4" />
            {t("كل الفصول")}
          </Button>
        </Link>
      </div>
    </section>
  );
}
