import { db } from "@/lib/db";
import { toArabicDigits } from "@/lib/format";
import { TopPageView } from "@/components/site/top-page-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "الأكثر تفاعلاً | سيد الحقيقة",
  description: "أكثر فصول الرواية قراءةً وتعليقاً",
};

type Row = {
  number: number;
  title: string;
  views: number;
  comments: number;
  wordCount: number;
};

export default async function TopChaptersPage() {
  const [byViews, byComments, totals] = await Promise.all([
    db.chapter.findMany({
      orderBy: { views: "desc" },
      take: 15,
      select: { number: true, title: true, views: true, wordCount: true, _count: { select: { comments: true } } },
    }),
    db.chapter.findMany({
      orderBy: { comments: { _count: "desc" } },
      take: 15,
      select: { number: true, title: true, views: true, wordCount: true, _count: { select: { comments: true } } },
    }),
    db.chapter.aggregate({ _sum: { views: true }, _count: true }),
  ]);

  const toRow = (c: (typeof byViews)[number]): Row => ({
    number: c.number,
    title: c.title || `الفصل ${c.number}`,
    views: c.views ?? 0,
    comments: c._count.comments,
    wordCount: c.wordCount ?? 0,
  });

  return (
    <TopPageView
      byViews={byViews.map(toRow)}
      byComments={byComments.map(toRow)}
      totalViews={totals._sum.views ?? 0}
      chapterCount={totals._count}
    />
  );
}
