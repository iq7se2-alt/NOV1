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

type Bucket = { chapter: number; chars: number; newLocs: number; words: number };

type Milestone = {
  chapter: number;
  kind: "character" | "location";
  name: string;
  imageUrl: string | null;
  meta: string;
};

const GOLD = "#d4a843";
const GOLD_SOFT = "#e3c878";
const PINK = "#f472b6";

/** Character density + new locations per 50-chapter bucket. */
export function MilestoneTimeline({ data }: { data: Bucket[] }) {
  const [metric, setMetric] = useState<"chars" | "newLocs" | "words">("chars");

  return (
    <div className="gold-card rounded-xl p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-naskh text-base font-bold text-gold">كثافة الأحداث عبر الرواية</h2>
        <div className="inline-flex rounded-lg border border-gold/20 bg-muted/40 p-0.5">
          {(
            [
              ["chars", "شخصيات"],
              ["newLocs", "أماكن جديدة"],
              ["words", "كلمات"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMetric(key)}
              className={
                "rounded-md px-3 py-1 text-xs transition-colors " +
                (metric === key ? "bg-gold/20 text-gold" : "text-gold/50 hover:text-gold/80")
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
              tickFormatter={(v: number) => toArabicDigits(v)}
            />
            <YAxis
              tick={{ fill: "rgba(212,168,67,0.45)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={38}
              tickFormatter={(v: number) => toArabicDigits(v)}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(0,0,0,0.92)",
                border: "1px solid rgba(212,168,67,0.35)",
                borderRadius: 8,
                color: "#e3c878",
                fontSize: 12,
              }}
              labelFormatter={(v) => `من الفصل ${toArabicDigits(Number(v))}`}
              formatter={(value: number, name) => [
                toArabicDigits(value),
                name === "chars" ? "شخصية" : name === "newLocs" ? "مكان جديد" : "كلمة",
              ]}
            />
            <Legend
              formatter={(v) => (v === "chars" ? "شخصيات" : v === "newLocs" ? "أماكن جديدة" : "كلمات")}
              wrapperStyle={{ fontSize: 11, color: "rgba(212,168,67,0.7)" }}
            />
            {metric === "words" ? (
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
                  hide={metric !== "chars"}
                />
                <Area
                  type="monotone"
                  dataKey="newLocs"
                  stroke={PINK}
                  strokeWidth={2}
                  fill="url(#tlLocs)"
                  isAnimationActive={false}
                  hide={metric !== "newLocs"}
                />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        المحور الأفقي = رقم بداية كل مجموعة من {toArabicDigits(50)} فصلاً
      </p>
    </div>
  );
}

/** Milestone list — first appearance of every main character and every place. */
export function MilestoneList({ milestones }: { milestones: Milestone[] }) {
  const [filter, setFilter] = useState<"all" | "character" | "location">("all");
  const [limit, setLimit] = useState(60);

  const rows = milestones.filter((m) => filter === "all" || m.kind === filter);
  const shown = rows.slice(0, limit);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(
          [
            ["all", "الكل"],
            ["character", "الشخصيات"],
            ["location", "الأماكن"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setFilter(key);
              setLimit(60);
            }}
            className={
              "rounded-full border px-3 py-1 text-xs transition-colors " +
              (filter === key
                ? "border-gold/50 bg-gold/20 text-gold"
                : "border-gold/20 text-gold/60 hover:text-gold")
            }
          >
            {label}
          </button>
        ))}
      </div>

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
                  الفصل {toArabicDigits(m.chapter)}
                  {m.meta ? ` · ${m.meta}` : ""}
                </span>
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
          عرض {toArabicDigits(Math.min(60, rows.length - shown.length))} حدثاً آخر
        </button>
      )}
    </div>
  );
}
