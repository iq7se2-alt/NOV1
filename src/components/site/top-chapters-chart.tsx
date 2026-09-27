"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toArabicDigits } from "@/lib/format";

type Point = { number: number; views: number; comments: number };

const GOLD = "#d4a843";
const GOLD_SOFT = "#e3c878";

/** Bar chart of the most-viewed chapters; click a bar to open it. */
export function TopChaptersChart({ data }: { data: Point[] }) {
  const [metric, setMetric] = useState<"views" | "comments">("views");
  const router = useRouter();

  const rows = [...data].sort((a, b) => b[metric] - a[metric]);
  const max = Math.max(1, ...rows.map((r) => r[metric]));

  return (
    <div className="gold-card rounded-xl p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-naskh text-base font-bold text-gold">رسم بياني</h2>
        <div className="inline-flex rounded-lg border border-gold/20 bg-muted/40 p-0.5">
          <button
            onClick={() => setMetric("views")}
            className={
              "rounded-md px-3 py-1 text-xs transition-colors " +
              (metric === "views" ? "bg-gold/20 text-gold" : "text-gold/50 hover:text-gold/80")
            }
          >
            المشاهدات
          </button>
          <button
            onClick={() => setMetric("comments")}
            className={
              "rounded-md px-3 py-1 text-xs transition-colors " +
              (metric === "comments" ? "bg-gold/20 text-gold" : "text-gold/50 hover:text-gold/80")
            }
          >
            التعليقات
          </button>
        </div>
      </div>

      <div style={{ width: "100%", height: 260 }} dir="ltr">
        <ResponsiveContainer>
          <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD_SOFT} stopOpacity={0.95} />
                <stop offset="100%" stopColor={GOLD} stopOpacity={0.35} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,168,67,0.12)" vertical={false} />
            <XAxis
              dataKey="number"
              tick={{ fill: "rgba(212,168,67,0.65)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => toArabicDigits(v)}
            />
            <YAxis
              tick={{ fill: "rgba(212,168,67,0.5)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={38}
              tickFormatter={(v: number) => toArabicDigits(v)}
            />
            <Tooltip
              cursor={{ fill: "rgba(212,168,67,0.08)" }}
              contentStyle={{
                background: "rgba(0,0,0,0.92)",
                border: "1px solid rgba(212,168,67,0.35)",
                borderRadius: 8,
                color: "#e3c878",
                fontSize: 12,
              }}
              labelFormatter={(v) => `الفصل ${toArabicDigits(Number(v))}`}
              formatter={(value: number, name) => [
                toArabicDigits(value),
                name === "views" ? "مشاهدة" : "تعليق",
              ]}
            />
            <Bar
              dataKey={metric}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
              label={{
                position: "top",
                fill: "rgba(212,168,67,0.8)",
                fontSize: 10,
                formatter: (v: number) => toArabicDigits(v),
              }}
            >
              {rows.map((r, i) => (
                <Cell
                  key={r.number}
                  fill="url(#barGold)"
                  fillOpacity={i < 3 ? 1 : 0.55}
                  className="cursor-pointer"
                  onClick={() => router.push(`/chapters/${r.number}`)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        اضغط على أي عمود لفتح الفصل
      </p>
    </div>
  );
}
