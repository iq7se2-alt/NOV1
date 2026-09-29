"use client";

import Link from "next/link";
import { Eye, MessageCircle, ArrowLeft, TrendingUp } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { TopChaptersChart } from "@/components/site/top-chapters-chart";

type Row = {
  number: number;
  title: string;
  views: number;
  comments: number;
  wordCount: number;
};

function List({
  title,
  icon: Icon,
  rows,
  metric,
  max,
}: {
  title: string;
  icon: typeof Eye;
  rows: Row[];
  metric: "views" | "comments";
  max: number;
}) {
  const { t, formatNumber } = useLanguage();
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 font-naskh text-lg font-bold text-gold">
        <Icon className="h-4 w-4" />
        {title}
      </h2>
      <ol className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.number}>
            <Link
              href={`/chapters/${r.number}`}
              className="gold-card group flex items-center gap-3 rounded-lg p-3 transition-colors hover:border-gold/40"
            >
              <span
                className={
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-naskh text-xs font-bold " +
                  (i < 3
                    ? "bg-gradient-to-br from-gold/50 to-gold/20 text-gold"
                    : "bg-muted text-muted-foreground")
                }
              >
                {formatNumber(i + 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-naskh text-sm text-foreground group-hover:text-gold">
                  {r.title}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {t("فصل")} {formatNumber(r.number)} · {formatNumber(r.wordCount)}{" "}
                  {t("كلمة")}
                </span>
              </span>
              <span className="shrink-0 text-xs font-bold text-gold/80">
                {formatNumber(r[metric])}
                <span className="mr-1 text-[9px] text-muted-foreground">
                  {t(metric === "views" ? "مشاهدة" : "تعليق")}
                </span>
              </span>
              <span
                className="hidden h-1.5 rounded-full bg-gold/40 sm:block"
                style={{ width: `${Math.max(4, (r[metric] / max) * 90)}px` }}
              />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TopPageView({
  byViews,
  byComments,
  totalViews,
  chapterCount,
}: {
  byViews: Row[];
  byComments: Row[];
  totalViews: number;
  chapterCount: number;
}) {
  const { t, formatNumber } = useLanguage();
  const maxViews = Math.max(1, ...byViews.map((r) => r.views));
  const maxComments = Math.max(1, ...byComments.map((r) => r.comments));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-10 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/25 px-4 py-1 text-xs text-gold/80">
          <TrendingUp className="h-3.5 w-3.5" />
          {t("إحصائيات القراءة")}
        </div>
        <h1 className="font-naskh text-4xl font-bold text-gold-gradient sm:text-5xl">
          {t("الأكثر تفاعلاً")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {formatNumber(chapterCount)} {t("فصل")} · {formatNumber(totalViews)}{" "}
          {t("مشاهدة")}
        </p>
      </div>

      <TopChaptersChart data={byViews.map((r) => ({ number: r.number, views: r.views, comments: r.comments }))} />

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <List title={t("الأكثر مشاهدة")} icon={Eye} rows={byViews} metric="views" max={maxViews} />
        <List title={t("الأكثر نقاشاً")} icon={MessageCircle} rows={byComments} metric="comments" max={maxComments} />
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/chapters"
          className="inline-flex items-center gap-1.5 text-sm text-gold/70 transition-colors hover:text-gold"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("كل الفصول")}
        </Link>
      </div>
    </div>
  );
}
