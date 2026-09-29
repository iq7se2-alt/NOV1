"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MapPin, User } from "lucide-react";
import { toArabicDigits } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

type Bucket = { chapter: number; chars: number; newLocs: number; words: number };
type Filter = "all" | "character" | "location";

type Milestone = {
  chapter: number;
  kind: "character" | "location";
  name: string;
  imageUrl: string | null;
  /** Raw mention count (number as string) or "" — the unit is rendered client-side. */
  meta: string;
};

/** Page header (client so the count + group size follow the language toggle). */
export function TimelinePageHeader({ eventCount, bucket }: { eventCount: number; bucket: number }) {
  const { t, formatNumber } = useLanguage();
  return (
    <div className="mb-8 text-center">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/25 px-4 py-1 text-xs text-gold/80">
        {t("خط زمني")}
      </div>
      <h1 className="font-naskh text-4xl font-bold text-gold-gradient sm:text-5xl">
        {t("الخط الزمني للرواية")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {formatNumber(eventCount)} {t("حدث")} · {t("كل مجموعة")} {formatNumber(bucket)}{" "}
        {t("فصلاً")}
      </p>
    </div>
  );
}

const GOLD = "#d4a843";
const GOLD_SOFT = "#e3c878";
const PINK = "#f472b6";

/** Character density + new locations per 50-chapter bucket. */
export function MilestoneTimeline({
  data,
  filter = "all",
}: {
  data: Bucket[];
  filter?: Filter;
}) {
  const [metric, setMetric] = useState<"chars" | "newLocs" | "words">("chars");
  const { t, formatNumber } = useLanguage();
  const n = (v: number | string) => formatNumber(v);

  // The page-wide filter narrows which series the chart shows.
  const metrics: Array<["chars" | "newLocs" | "words", string]> =
    filter === "character"
      ? [["chars", t("شخصيات")]]
      : filter === "location"
        ? [["newLocs", t("أماكن جديدة")]]
        : [
            ["chars", t("شخصيات")],
            ["newLocs", t("أماكن جديدة")],
            ["words", t("كلمات")],
          ];
  const visibleMetric = metrics.some(([k]) => k === metric) ? metric : metrics[0][0];

  return (
    <div className="gold-card rounded-xl p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-naskh text-base font-bold text-gold">{t("كثافة الأحداث عبر الرواية")}</h2>
        <div className="inline-flex rounded-lg border border-gold/20 bg-muted/40 p-0.5">
          {metrics.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMetric(key)}
              className={
                "rounded-md px-3 py-1 text-xs transition-colors " +
                (visibleMetric === key ? "bg-gold/20 text-gold" : "text-gold/50 hover:text-gold/80")
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: "100%", height: 280 }} dir="ltr">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="tlChars" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD_SOFT} stopOpacity={0.7} />
                <stop offset="100%" stopColor={GOLD} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="tlLocs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PINK} stopOpacity={0.5} />
                <stop offset="100%" stopColor={PINK} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,168,67,0.12)" vertical={false} />
            <XAxis
              dataKey="chapter"
              tick={{ fill: "rgba(212,168,67,0.6)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => n(v)}
            />
            <YAxis
              tick={{ fill: "rgba(212,168,67,0.45)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={38}
              tickFormatter={(v: number) => n(v)}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(0,0,0,0.92)",
                border: "1px solid rgba(212,168,67,0.35)",
                borderRadius: 8,
                color: "#e3c878",
                fontSize: 12,
              }}
              labelFormatter={(v) => `${t("من الفصل")} ${n(Number(v))}`}
              formatter={(value: number, name) => [
                n(value),
                t(name === "chars" ? "شخصية" : name === "newLocs" ? "مكان جديد" : "كلمة"),
              ]}
            />
            <Legend
              formatter={(v) =>
                t(v === "chars" ? "شخصيات" : v === "newLocs" ? "أماكن جديدة" : "كلمات")
              }
              wrapperStyle={{ fontSize: 11, color: "rgba(212,168,67,0.7)" }}
            />
            {visibleMetric === "words" ? (
              <Bar dataKey="words" fill={GOLD} fillOpacity={0.6} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            ) : (
              <>
                <Area
                  type="monotone"
                  dataKey="chars"
                  stroke={GOLD_SOFT}
                  strokeWidth={2}
                  fill="url(#tlChars)"
                  isAnimationActive={false}
                  hide={visibleMetric !== "chars"}
                />
                <Area
                  type="monotone"
                  dataKey="newLocs"
                  stroke={PINK}
                  strokeWidth={2}
                  fill="url(#tlLocs)"
                  isAnimationActive={false}
                  hide={visibleMetric !== "newLocs"}
                />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        {t("المحور الأفقي = رقم بداية كل مجموعة من ٥٠ فصلاً").replace("٥٠", n(50))}
      </p>
    </div>
  );
}

/** Shared filter bar: "الكل / الشخصيات / الأماكن" — drives chart AND list. */
export function TimelineFilter({
  value,
  onChange,
  counts,
}: {
  value: "all" | "character" | "location";
  onChange: (v: "all" | "character" | "location") => void;
  counts?: { all?: number; character?: number; location?: number };
}) {
  const { t, formatNumber } = useLanguage();
  const opts: Array<[typeof value, string]> = [
    ["all", t("الكل")],
    ["character", t("الشخصيات فقط")],
    ["location", t("الأماكن فقط")],
  ];
  return (
    <div className="mb-6 flex flex-wrap justify-center gap-2">
      {opts.map(([key, label]) => {
        const n = counts?.[key];
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={
              "flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-colors " +
              (value === key
                ? "border-gold/60 bg-gold/20 text-gold shadow-sm"
                : "border-gold/20 bg-muted/30 text-gold/60 hover:border-gold/40 hover:text-gold")
            }
          >
            {key === "character" && <User className="h-3.5 w-3.5" />}
            {key === "location" && <MapPin className="h-3.5 w-3.5" />}
            {label}
            {n != null && <span className="text-[10px] text-gold/50">({formatNumber(n)})</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Milestone list — first appearance of every main character and every place. */
export function MilestoneList({
  milestones,
  filter,
}: {
  milestones: Milestone[];
  filter: "all" | "character" | "location";
}) {
  const [limit, setLimit] = useState(60);
  const { t, formatNumber } = useLanguage();

  const rows = milestones.filter((m) => filter === "all" || m.kind === filter);
  const shown = rows.slice(0, limit);

  return (
    <div>
      {rows.length === 0 && (
        <div className="rounded-lg border border-gold/20 bg-muted/20 py-10 text-center font-naskh text-sm text-muted-foreground">
          {t("لا أحداث في هذا التصنيف")}
        </div>
      )}

      <ol className="relative space-y-2 border-r border-gold/15 pr-4">
        {shown.map((m, i) => (
          <li key={`${m.kind}-${m.chapter}-${m.name}-${i}`} className="relative">
            <span
              className={
                "absolute -right-[21px] top-3 flex h-2.5 w-2.5 items-center justify-center rounded-full border " +
                (m.kind === "character" ? "border-gold/60 bg-gold/60" : "border-pink/60 bg-pink/60")
              }
            />
            <Link
              href={`/chapters/${m.chapter}`}
              className="gold-card group flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:border-gold/40"
            >
              {m.imageUrl ? (
                <img
                  src={m.imageUrl}
                  alt={m.name}
                  className="h-9 w-9 shrink-0 rounded-full border border-gold/25 object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-muted/40">
                  {m.kind === "character" ? (
                    <User className="h-4 w-4 text-gold/60" />
                  ) : (
                    <MapPin className="h-4 w-4 text-pink/70" />
                  )}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-naskh text-sm text-foreground group-hover:text-gold">
                  {m.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {t("الفصل")} {formatNumber(m.chapter)}
                  {m.meta ? ` · ${formatNumber(m.meta)} ${t("ذكر")}` : ""}
                </span>
              </span>
              <span
                className={
                  "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold " +
                  (m.kind === "character"
                    ? "border-gold/30 bg-gold/10 text-gold/80"
                    : "border-pink/30 bg-pink/10 text-pink/80")
                }
              >
                {t(m.kind === "character" ? "شخصية" : "مكان")}
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {rows.length > shown.length && (
        <button
          onClick={() => setLimit((l) => l + 60)}
          className="mt-4 w-full rounded-lg border border-gold/25 bg-gold/10 py-2 text-xs text-gold transition-colors hover:bg-gold/20"
        >
          {t("عرض")} {formatNumber(Math.min(60, rows.length - shown.length))} {t("حدثاً آخر")}
        </button>
      )}
    </div>
  );
}

/**
 * Client shell — owns the page-wide filter so the chart and the milestone list
 * stay in sync (الكل / الشخصيات فقط / الأماكن فقط).
 */
export function MilestoneClient({
  data,
  milestones,
}: {
  data: Bucket[];
  milestones: Milestone[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const { t } = useLanguage();
  const counts = {
    all: milestones.length,
    character: milestones.filter((m) => m.kind === "character").length,
    location: milestones.filter((m) => m.kind === "location").length,
  };

  return (
    <div>
      <TimelineFilter value={filter} onChange={setFilter} counts={counts} />
      <MilestoneTimeline data={data} filter={filter} />
      <section className="mt-10">
        <h2 className="mb-4 text-center font-naskh text-lg font-bold text-gold">
          {t(
            filter === "character"
              ? "أول ظهور لكل شخصية"
              : filter === "location"
                ? "أول ظهور لكل مكان"
                : "أول ظهور لكل شخصية ومكان",
          )}
        </h2>
        <MilestoneList milestones={milestones} filter={filter} />
      </section>
    </div>
  );
}
