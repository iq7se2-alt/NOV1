import { db } from "@/lib/db";
import Link from "next/link";
import {
  BookOpen,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReadingStatsWidget } from "@/components/site/reading-stats";
import { PushNotificationManager } from "@/components/site/push-notifications";
import { HomeHero } from "@/components/site/home-hero";
import { ContinueReading } from "@/components/site/continue-reading";
import { TreeOfWisdomSection } from "@/components/site/tree-of-wisdom-section";
import { StatCards } from "@/components/site/stat-cards";
import { HomeLatestChapters } from "@/components/site/home-latest-chapters";

export const dynamic = "force-dynamic";

async function getHomeData() {
  const [settings, chapterCount, wordsAgg, latest] = await Promise.all([
    db.siteSettings.findUnique({ where: { id: 1 } }),
    db.chapter.count(),
    db.chapter.aggregate({ _sum: { wordCount: true } }),
    db.chapter.findMany({
      orderBy: { number: "desc" },
      take: 3,
      select: {
        id: true,
        number: true,
        title: true,
        wordCount: true,
        views: true,
        createdAt: true,
      },
    }),
  ]);

  // Count fillers (numbers with decimals)
  const allNums = await db.chapter.findMany({ select: { number: true }, orderBy: { number: "asc" } });
  const fillers = allNums.filter((c) => c.number !== Math.floor(c.number)).length;
  const regular = chapterCount - fillers;
  // Actual first chapter (smallest number in the novel)
  const firstChapter = allNums.length > 0 ? allNums[0].number : 1;

  return {
    settings,
    chapterCount,
    regularCount: regular,
    fillerCount: fillers,
    totalWords: wordsAgg._sum.wordCount ?? 0,
    latest,
    firstChapter,
  };
}

export default async function HomePage() {
  const { settings, chapterCount, regularCount, fillerCount, totalWords, latest, firstChapter } = await getHomeData();

  const coverUrl = settings?.coverImageUrl || "/cover.jpg";
  const titleAr = settings?.novelTitle || "سيد الحقيقة";
  const titleEn = settings?.novelTitleEn || "Lord of the Truth";
  const description =
    settings?.novelDescription ||
    "روبين بورتون، شاب وُلد فوجد نفسه لديه الموهبة والعائلة القوية والذكاء — ما عدا شيء واحد.. الرغبة في استعمال كل هذا!";

  const firstChapterNumber = firstChapter;

  return (
    <div className="flex flex-col">
      {/* ===================== HERO ===================== */}
      <HomeHero
        titleAr={titleAr}
        titleEn={titleEn}
        description={description}
        coverUrl={coverUrl}
        firstChapterNumber={firstChapterNumber}
      />

      {/* ===================== STATS ===================== */}
      <section className="border-y border-gold/15 bg-muted">
        <StatCards
          regularCount={regularCount}
          fillerCount={fillerCount}
          totalWords={totalWords}
          latestChapterNumber={latest[0]?.number ?? null}
        />
      </section>

      {/* ===================== READING STATS (personal) ===================== */}
      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {/* "Where did I stop?" — continue reading widget (client-side, localStorage) */}
        <ContinueReading />

        <div className="mb-4 flex justify-center">
          <PushNotificationManager />
        </div>
        <ReadingStatsWidget totalChapters={chapterCount} />
      </section>

      {/* ===================== LATEST CHAPTERS ===================== */}
      <HomeLatestChapters
        latest={latest.map((ch) => ({
          number: ch.number,
          title: ch.title,
          wordCount: ch.wordCount ?? 0,
          views: ch.views,
          createdAt: ch.createdAt.toISOString(),
        }))}
        coverUrl={coverUrl}
      />

      {/* ===================== TREE OF WISDOM ===================== */}
      <TreeOfWisdomSection />

      {/* ===================== ABOUT / CTA ===================== */}
      <section className="border-t border-gold/15 bg-background">
        <div className="mx-auto w-full max-w-4xl px-4 py-20 text-center sm:px-6">
          <Sparkles className="mx-auto mb-4 h-8 w-8 text-gold/60" />
          <h2 className="font-naskh text-3xl font-bold text-gold-gradient sm:text-4xl">
            اغرق في عالم سيد الحقيقة
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-naskh text-lg leading-loose text-foreground/80">
            تابع رحلة روبين بورتون — الشاب العبقري الذي يملك كل شيء إلا الرغبة في
            استعماله. فصل تلو الآخر، اكتشف كيف يتشكّل مصيره وسط صراعات العائلات
            والطاقة والسلطة.
          </p>
          <Link href={`/chapters/${firstChapterNumber}`}>
            <Button
              size="lg"
              className="mt-8 bg-gold text-[#1a0a00] hover:bg-gold-soft"
            >
              ابدأ من الفصل الأول
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
