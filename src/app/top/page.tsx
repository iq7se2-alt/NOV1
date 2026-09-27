import Link from "next/link";
import { db } from "@/lib/db";
import { Flame, MessageCircle, Eye, ArrowLeft, TrendingUp } from "lucide-react";
import { toArabicDigits } from "@/lib/format";
import { TopChaptersChart } from "@/components/site/top-chapters-chart";

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

  const viewsRows = byViews.map(toRow);
  const commentsRows = byComments.map(toRow);
  const totalViews = totals._sum.views ?? 0;
  const maxViews = Math.max(1, ...viewsRows.map((r) => r.views));
  const maxComments = Math.max(1, ...commentsRows.map((r) => r.comments));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-10 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/25 px-4 py-1 text-xs text-gold/80">
          <TrendingUp className="h-3.5 w-3.5" />
          إحصائيات القراءة
        </div>
        <h1 className="font-naskh text-4xl font-bold text-gold-gradient sm:text-5xl">الأكثر تفاعلاً</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {toArabicDigits(totals._count)} فصل · {toArabicDigits(totalViews)} مشاهدة
        </p>
      </div>

      <TopChaptersChart data={viewsRows.map((r) => ({ number: r.number, views: r.views, comments: r.comments }))} />

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        {/* ═══ MOST VIEWED ═══ */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-naskh text-lg font-bold text-gold">
            <Eye className="h-4 w-4" />
            الأكثر مشاهدة
          </h2>
          <ol className="space-y-2">
            {viewsRows.map((r, i) => (
              <li key={r.number}>
                <Link
                  href={`/chapters/${r.number}`}
                  className="gold-card group flex items-center gap-3 rounded-lg p-3 transition-colors hover:border-gold/40"
                >
                  <span
                    className={
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-naskh text-xs font-bold " +
                      (i < 3 ? "bg-gradient-to-br from-gold/50 to-gold/20 text-gold" : "bg-muted text-muted-foreground")
                    }
                  >
                    {toArabicDigits(i + 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-naskh text-sm text-foreground group-hover:text-gold">
                      {r.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      الفصل {toArabicDigits(r.number)} · {toArabicDigits(r.wordCount)} كلمة
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-bold text-gold/80">
                    {toArabicDigits(r.views)}
                    <span className="mr-1 text-[9px] text-muted-foreground">مشاهدة</span>
                  </span>
                  <span
                    className="hidden h-1.5 rounded-full bg-gold/40 sm:block"
                    style={{ width: `${Math.max(4, (r.views / maxViews) * 90)}px` }}
                  />
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {/* ═══ MOST DISCUSSED ═══ */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-naskh text-lg font-bold text-gold">
            <MessageCircle className="h-4 w-4" />
            الأكثر نقاشاً
          </h2>
          <ol className="space-y-2">
            {commentsRows.map((r, i) => (
              <li key={r.number}>
                <Link
                  href={`/chapters/${r.number}`}
                  className="gold-card group flex items-center gap-3 rounded-lg p-3 transition-colors hover:border-gold/40"
                >
                  <span
                    className={
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-naskh text-xs font-bold " +
                      (i < 3 ? "bg-gradient-to-br from-gold/50 to-gold/20 text-gold" : "bg-muted text-muted-foreground")
                    }
                  >
                    {toArabicDigits(i + 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-naskh text-sm text-foreground group-hover:text-gold">
                      {r.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      الفصل {toArabicDigits(r.number)} · {toArabicDigits(r.views)} مشاهدة
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-bold text-gold/80">
                    {toArabicDigits(r.comments)}
                    <span className="mr-1 text-[9px] text-muted-foreground">تعليق</span>
                  </span>
                  <span
                    className="hidden h-1.5 rounded-full bg-gold/40 sm:block"
                    style={{ width: `${Math.max(4, (r.comments / maxComments) * 90)}px` }}
                  />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/chapters"
          className="inline-flex items-center gap-1.5 text-sm text-gold/70 transition-colors hover:text-gold"
        >
          <ArrowLeft className="h-4 w-4" />
          كل الفصول
        </Link>
      </div>
    </div>
  );
}
