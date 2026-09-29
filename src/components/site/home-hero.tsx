"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { HeroCover } from "@/components/site/hero-cover";

/**
 * Hero section of the home page (client so the CTAs follow the language toggle).
 * The novel title and description stay Arabic — they are content, not chrome.
 */
export function HomeHero({
  titleAr,
  titleEn,
  description,
  coverUrl,
  firstChapterNumber,
}: {
  titleAr: string;
  titleEn: string | null;
  description: string;
  coverUrl: string;
  firstChapterNumber: number;
}) {
  const { t } = useLanguage();
  return (
    <section className="cosmic-bg relative overflow-hidden">
      <div className="starfield absolute inset-0" />
      {/* radial glow behind cover */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute right-1/4 top-1/2 h-[40rem] w-[40rem] -translate-y-1/2 rounded-full bg-purple/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
        <HeroCover coverUrl={coverUrl} alt={`${titleAr}${titleEn ? ` — ${titleEn}` : ""}`} />

        <div className="order-2 text-center md:text-right">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-muted px-4 py-1.5 text-xs text-gold/80">
            <Sparkles className="h-3.5 w-3.5" />
            {t("رواية ويب عربية · فانتازيا")}
          </div>

          <h1 className="font-naskh text-6xl font-bold leading-tight text-gold-gradient sm:text-7xl md:text-8xl">
            {titleAr}
          </h1>
          <p className="mt-3 text-sm uppercase tracking-[0.35em] text-gold/50 sm:text-base">{titleEn}</p>

          <div className="gold-divider mx-auto my-8 md:mx-0 md:mr-0" />

          <p className="mx-auto max-w-xl font-naskh text-lg leading-loose text-foreground/90 md:mx-0">
            {description}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <Link href={`/chapters/${firstChapterNumber}`}>
              <Button size="lg" className="bg-gold text-[#1a0a00] hover:bg-gold-soft">
                {t("ابدأ القراءة")}
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/chapters">
              <Button
                size="lg"
                variant="outline"
                className="border-gold/40 text-gold hover:border-gold/70 hover:bg-gold/10"
              >
                <BookOpen className="ml-2 h-4 w-4" />
                {t("تصفّح الفصول")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}