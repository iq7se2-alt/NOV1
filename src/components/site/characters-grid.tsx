"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Users,
  BookOpen,
  Star,
  X,
  Flame,
  User,
  Shield,
  Swords,
  Ghost,
  Crown,
  MapPin,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toArabicDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

type Character = {
  id: number;
  name: string;
  nameEn: string | null;
  description: string | null;
  imageUrl: string | null;
  color: string | null;
  isMain: boolean;
  kind?: string;
  mentionCount?: number;
  chapterCount?: number;
  firstChapter?: number | null;
  appearanceCount: number;
  chapters: number[];
  chapterParas?: Record<number, number>;
};

type Relation = {
  id: number;
  fromId: number;
  toId: number;
  type: string;
  description: string | null;
  fromName: string;
  toName: string;
};

const REL_STYLES: Record<string, { color: string; label: string }> = {
  أب: { color: "#d4b05e", label: "أب" },
  أم: { color: "#e3c878", label: "أم" },
  صديق: { color: "#22c55e", label: "صديق" },
  عدو: { color: "#ef4444", label: "عدو" },
  معلم: { color: "#3b82f6", label: "معلم" },
  تلميذ: { color: "#60a5fa", label: "تلميذ" },
  عائلة: { color: "#fbbf24", label: "عائلة" },
  حليف: { color: "#a78bfa", label: "حليف" },
  زوج: { color: "#ec4899", label: "زوج" },
  أخ: { color: "#06b6d4", label: "أخ" },
  ابن: { color: "#f59e0b", label: "ابن" },
  تابع: { color: "#8b5cf6", label: "تابع" },
  قائد: { color: "#f97316", label: "قائد" },
  عضو: { color: "#14b8a6", label: "عضو" },
};

const KIND_META: Record<
  string,
  { label: string; icon: typeof User; hue: string }
> = {
  person: { label: "شخصية", icon: User, hue: "216 92% 60%" },
  faction: { label: "طائفة/عائلة", icon: Shield, hue: "38 92% 50%" },
  group: { label: "فرقة", icon: Users, hue: "160 84% 39%" },
  army: { label: "جيش", icon: Swords, hue: "0 72% 51%" },
  creature: { label: "مخلوق", icon: Ghost, hue: "280 65% 60%" },
};

const RANK_STYLES: Record<number, string> = {
  1: "from-amber-200 via-yellow-400 to-amber-600 shadow-[0_0_18px_rgba(251,191,36,0.55)]",
  2: "from-slate-100 via-slate-300 to-slate-500 shadow-[0_0_14px_rgba(203,213,225,0.45)]",
  3: "from-orange-200 via-orange-400 to-orange-700 shadow-[0_0_14px_rgba(234,124,58,0.45)]",
};

/**
 * Characters grid v2 — sorted by real mention count (عدد الذكر),
 * kind filtering (شخص/فرقة/جيش/مخلوق), luxurious gold cards,
 * deep links to first appearance with name flash.
 */
export function CharactersGrid({
  characters,
  relations,
}: {
  characters: Character[];
  relations: Relation[];
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [sort, setSort] = useState<"mentions" | "chapters" | "name">("mentions");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let result = characters;
    const query = q.trim();
    if (query) {
      result = result.filter(
        (c) =>
          c.name.includes(query) ||
          (c.nameEn || "").toLowerCase().includes(query.toLowerCase())
      );
    }
    if (filter === "main") result = result.filter((c) => c.isMain);
    else if (filter === "withRelations") {
      const charsWithRels = new Set<number>();
      relations.forEach((r) => {
        charsWithRels.add(r.fromId);
        charsWithRels.add(r.toId);
      });
      result = result.filter((c) => charsWithRels.has(c.id));
    } else if (KIND_META[filter]) {
      result = result.filter((c) => (c.kind || "person") === filter);
    }
    const sorted = [...result];
    if (sort === "mentions")
      sorted.sort(
        (a, b) => (b.mentionCount || 0) - (a.mentionCount || 0) || (b.appearanceCount - a.appearanceCount)
      );
    else if (sort === "chapters")
      sorted.sort((a, b) => (b.chapterCount || b.chapters.length) - (a.chapterCount || a.chapters.length));
    else if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name, "ar"));
    return sorted;
  }, [characters, q, filter, sort, relations]);

  const selected = selectedId
    ? characters.find((c) => c.id === selectedId)
    : null;
  const selectedRelations = selectedId
    ? relations.filter((r) => r.fromId === selectedId || r.toId === selectedId)
    : [];

  // ═══ PROGRESSIVE CARDS ═══
  // 788 cards at once is heavy DOM; render a screenful, then extend.
  // (No reset-on-filter: a narrower result simply fits under the limit.)
  const [cardLimit, setCardLimit] = useState(60);

  const shown = useMemo(
    () => filtered.slice(0, cardLimit),
    [filtered, cardLimit]
  );
  const remaining = filtered.length - shown.length;

  // Appearances load on demand from the API when a card opens
  const [appearances, setAppearances] = useState<
    { number: number; para: number }[] | null
  >(null);
  useEffect(() => {
    setAppearances(null);
    if (!selectedId) return;
    let alive = true;
    fetch(`/api/characters/${selectedId}/appearances`)
      .then((r) => (r.ok ? r.json() : { chapters: [] }))
      .then((d) => {
        if (alive) setAppearances(d.chapters || []);
      })
      .catch(() => {
        if (alive) setAppearances([]);
      });
    return () => {
      alive = false;
    };
  }, [selectedId]);

  // global rank by mentions (position among ALL characters)
  const rankOf = useMemo(() => {
    const m = new Map<number, number>();
    [...characters]
      .sort((a, b) => (b.mentionCount || 0) - (a.mentionCount || 0))
      .forEach((c, i) => m.set(c.id, i + 1));
    return m;
  }, [characters]);

  const kindLabel = (k?: string) =>
    KIND_META[k || "person"]?.label || "شخصية";
  const KindIcon = (k?: string) => KIND_META[k || "person"]?.icon || User;

  return (
    <>
      {/* ═══ FILTER BAR ═══ */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/50" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن شخصية أو فرقة أو جيش..."
              className="border-gold/25 bg-muted pr-10 font-naskh"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gold"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-lg border border-gold/25 bg-muted px-3 py-2 text-xs text-gold outline-none"
          >
            <option value="mentions">الترتيب: عدد الذكر</option>
            <option value="chapters">الترتيب: عدد الفصول</option>
            <option value="name">الترتيب: الاسم</option>
          </select>
          <span className="text-xs text-muted-foreground">
            {toArabicDigits(filtered.length)} كيان
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {[
            { id: "all", label: "الكل" },
            { id: "main", label: "★ رئيسية" },
            { id: "person", label: "شخصيات" },
            { id: "faction", label: "طوائف وعائلات" },
            { id: "group", label: "فرق" },
            { id: "army", label: "جيوش" },
            { id: "creature", label: "مخلوقات" },
            { id: "withRelations", label: "بها علاقات" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs transition-colors",
                filter === f.id
                  ? "border-gold/60 bg-gold/15 text-gold"
                  : "border-gold/20 text-gold/60 hover:border-gold/40"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ GRID ═══ */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {shown.map((char) => {
          const charRels = relations.filter(
            (r) => r.fromId === char.id || r.toId === char.id
          );
          const rank = rankOf.get(char.id) ?? 999;
          const rankStyle = RANK_STYLES[rank];
          const KIcon = KindIcon(char.kind);
          const kindHue = KIND_META[char.kind || "person"]?.hue || "216 92% 60%";
          return (
            <button
              key={char.id}
              onClick={() => setSelectedId(char.id)}
              className={cn(
                "group relative flex flex-col items-center overflow-visible rounded-2xl border bg-muted/20 p-4 pt-5 text-center transition-all hover:scale-[1.03] hover:border-gold/50 hover:shadow-xl hover:shadow-gold/10",
                char.isMain
                  ? "border-gold/40 ring-1 ring-gold/20"
                  : "border-gold/15"
              )}
            >
              {/* Rank medal — top 3 by mentions */}
              {rank <= 3 && (
                <span
                  className={cn(
                    "absolute -top-2 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-black text-[#1a0a00]",
                    rankStyle || ""
                  )}
                >
                  {toArabicDigits(rank)}
                </span>
              )}

              {/* Circular avatar with gradient ring tinted by kind */}
              <div className="relative mb-3 h-28 w-28 sm:h-32 sm:w-32">
                <div
                  className="absolute inset-0 rounded-full opacity-50 blur-sm transition-opacity group-hover:opacity-90"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, hsl(${kindHue} / 0.55), rgba(212,176,94,0.35) 60%, transparent)`,
                  }}
                />
                <div className="absolute inset-[3px] overflow-hidden rounded-full border-2 border-gold/30 bg-muted">
                  {char.imageUrl ? (
                    <img
                      src={char.imageUrl}
                      alt={char.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, hsl(${kindHue} / 0.12), rgba(0,0,0,0))`,
                      }}
                    >
                      <span className="font-naskh text-4xl font-bold text-gold/40">
                        {char.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Mention badge — عدد الذكر */}
                {(char.mentionCount || 0) > 0 && (
                  <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-gold/40 bg-background/95 px-2 py-0.5 text-[10px] font-bold text-gold shadow-lg backdrop-blur-sm">
                    <Flame className="h-3 w-3 fill-orange-500/70 text-orange-500" />
                    {toArabicDigits(char.mentionCount || 0)} ذكر
                  </span>
                )}
                {char.isMain && (
                  <span className="absolute -top-1 left-2 rounded-full bg-gold p-1 shadow-lg">
                    <Crown className="h-3 w-3 fill-[#1a0a00] text-[#1a0a00]" />
                  </span>
                )}
                {char.color && (
                  <span
                    className="absolute right-1 top-1 h-3.5 w-3.5 rounded-full border-2 border-background shadow-md"
                    style={{ backgroundColor: char.color }}
                  />
                )}
              </div>

              <h3 className="mt-1 font-naskh text-sm font-bold text-foreground line-clamp-1 group-hover:text-gold transition-colors">
                {char.name}
              </h3>
              {char.nameEn && (
                <p className="text-[9px] text-muted-foreground/70 line-clamp-1">
                  {char.nameEn}
                </p>
              )}

              {/* Kind chip */}
              <span
                className="mt-1.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px]"
                style={{
                  backgroundColor: `hsl(${kindHue} / 0.12)`,
                  color: `hsl(${kindHue})`,
                }}
              >
                <KIcon className="h-2.5 w-2.5" />
                {kindLabel(char.kind)}
              </span>

              <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-2.5 w-2.5" />
                  {toArabicDigits(char.chapterCount || char.chapters.length)}
                </span>
                {charRels.length > 0 && (
                  <span className="flex items-center gap-1 text-gold/60">
                    <Users className="h-2.5 w-2.5" />
                    {toArabicDigits(charRels.length)}
                  </span>
                )}
              </div>

              {/* First appearance quick link */}
              {char.firstChapter != null && (
                <Link
                  href={`/chapters/${char.firstChapter}?char=${char.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2 inline-flex items-center gap-1 rounded-md border border-gold/20 bg-gold/5 px-2 py-0.5 text-[9px] text-gold/70 transition-all hover:border-gold/50 hover:bg-gold/15 hover:text-gold"
                  title="اذهب إلى أول ظهور وسيُظلل الاسم"
                >
                  <MapPin className="h-2.5 w-2.5" />
                  أول ظهور: الفصل {toArabicDigits(char.firstChapter)}
                </Link>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ DETAIL MODAL ═══ */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gold/30 bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with image — FULL image, not cropped */}
            <div className="relative overflow-hidden rounded-t-2xl bg-muted">
              {selected.imageUrl ? (
                <img
                  src={selected.imageUrl}
                  alt={selected.name}
                  className="max-h-[40vh] w-full object-contain"
                />
              ) : (
                <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                  <span className="font-naskh text-7xl font-bold text-gold/30">
                    {selected.name.charAt(0)}
                  </span>
                </div>
              )}
              <button
                onClick={() => setSelectedId(null)}
                className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground hover:bg-background hover:text-gold"
              >
                <X className="h-4 w-4" />
              </button>
              {(selected.mentionCount || 0) > 0 && (
                <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-gold/40 bg-background/90 px-3 py-1 text-xs font-bold text-gold shadow-lg">
                  <Flame className="h-3.5 w-3.5 fill-orange-500/70 text-orange-500" />
                  {toArabicDigits(selected.mentionCount || 0)} ذكر في الرواية
                </span>
              )}
            </div>

            {/* Body */}
            <div className="p-5">
              {/* Name + badges */}
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h2 className="font-naskh text-2xl font-bold text-gold">
                  {selected.name}
                </h2>
                {selected.isMain && (
                  <span className="flex items-center gap-1 rounded-full bg-gold/90 px-2 py-0.5 text-[10px] font-bold text-[#1a0a00]">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    رئيسي
                  </span>
                )}
                <span
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: `hsl(${kindHue(selected.kind)} / 0.12)`,
                    color: `hsl(${kindHue(selected.kind)})`,
                  }}
                >
                  {kindLabel(selected.kind)}
                </span>
                {rankOf.get(selected.id)! <= 3 && (
                  <span className="rounded-full bg-gradient-to-br from-amber-300 to-amber-600 px-2 py-0.5 text-[10px] font-black text-[#1a0a00]">
                    المرتبة {toArabicDigits(rankOf.get(selected.id)!)} بالذكر
                  </span>
                )}
              </div>
              {selected.nameEn && (
                <p className="mb-3 text-xs text-gold/60">{selected.nameEn}</p>
              )}

              {/* Description */}
              {selected.description && (
                <p className="mb-4 text-sm leading-loose text-foreground/80">
                  {selected.description}
                </p>
              )}

              {/* Stats */}
              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-gold/20 bg-muted/50 p-3 text-center">
                  <div className="font-bold text-gold">
                    {toArabicDigits(selected.mentionCount || 0)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">ذكر</div>
                </div>
                <div className="rounded-lg border border-gold/20 bg-muted/50 p-3 text-center">
                  <div className="font-bold text-gold">
                    {toArabicDigits(appearances?.length ?? selected.chapterCount ?? 0)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">فصل</div>
                </div>
                <div className="rounded-lg border border-gold/20 bg-muted/50 p-3 text-center">
                  <div className="font-bold text-gold">
                    {toArabicDigits(selectedRelations.length)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">علاقة</div>
                </div>
              </div>

              {/* First appearance hero link */}
              {selected.firstChapter != null && (
                <Link
                  href={`/chapters/${selected.firstChapter}?char=${selected.id}`}
                  className="mb-4 flex items-center justify-between rounded-xl border border-gold/30 bg-gradient-to-l from-gold/15 via-gold/5 to-transparent p-3 transition-all hover:border-gold/60 hover:from-gold/25"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gold" />
                    <div>
                      <div className="text-sm font-bold text-gold">
                        أول ظهور: الفصل{" "}
                        {toArabicDigits(selected.firstChapter)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        اضغط للانتقال إلى الفقرة وتظليل الاسم ٣ ثواني
                      </div>
                    </div>
                  </div>
                  <BookOpen className="h-4 w-4 text-gold/60" />
                </Link>
              )}

              {/* Chapter appearances — clickable, links to chapter with flash */}
              {(appearances === null || appearances.length > 0) && (
                <div className="mb-4">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gold/80">
                    <BookOpen className="h-4 w-4" />
                    {appearances
                      ? `ظهر في ${toArabicDigits(appearances.length)} فصل`
                      : "جلب الفصول..."}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                    {(appearances || []).slice(0, 100).map(({ number: chNum, para }) => (
                      <Link
                        key={chNum}
                        href={`/chapters/${chNum}?char=${selected.id}#para-${para}`}
                        className="group flex flex-col items-center justify-center rounded-md border border-gold/20 bg-gold/5 px-2 py-1 text-[11px] text-gold/80 transition-all hover:border-gold/50 hover:bg-gold/15 hover:text-gold"
                        title={`الفصل ${chNum} — اضغط للذهاب إلى أول ظهور (فقرة ${toArabicDigits(para + 1)}) وتظليل اسم الشخصية`}
                      >
                        <span className="font-bold leading-tight">
                          {toArabicDigits(chNum)}
                        </span>
                        <span className="text-[8px] leading-tight text-gold/50 group-hover:text-gold/80">
                          {toArabicDigits(para + 1)} فقرة
                        </span>
                      </Link>
                    ))}
                    {appearances && appearances.length > 100 && (
                      <span className="text-[10px] text-muted-foreground p-1">
                        +{toArabicDigits(appearances.length - 100)} أخرى
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Relations — compact list */}
              {selectedRelations.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gold/80">
                    <Users className="h-4 w-4" />
                    العلاقات
                  </h3>
                  <div className="space-y-1.5">
                    {selectedRelations.map((rel) => {
                      const isFrom = rel.fromId === selected.id;
                      const otherName = isFrom ? rel.toName : rel.fromName;
                      const style = REL_STYLES[rel.type] || {
                        color: "#888",
                        label: rel.type,
                      };
                      return (
                        <div
                          key={rel.id}
                          className="flex items-center gap-2 rounded-lg border border-gold/15 bg-muted/30 p-2"
                        >
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{
                              backgroundColor: `${style.color}20`,
                              color: style.color,
                            }}
                          >
                            {style.label}
                          </span>
                          <span className="text-sm text-foreground/80">
                            {isFrom ? "→" : "←"} {otherName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ LOAD MORE CARDS ═══ */}
      {remaining > 0 && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            onClick={() => setCardLimit((n) => n + 60)}
            className="rounded-full border border-gold/30 bg-gold/10 px-6 py-2 text-sm text-gold transition-colors hover:bg-gold/20"
          >
            عرض {toArabicDigits(Math.min(remaining, 60))} كرتاً آخر
          </button>
          <p className="text-[10px] text-muted-foreground">
            معروض {toArabicDigits(shown.length)} من {toArabicDigits(filtered.length)}
          </p>
        </div>
      )}
    </>
  );
}

function kindHue(k?: string): string {
  return (
    {
      person: "216 92% 60%",
      faction: "38 92% 50%",
      group: "160 84% 39%",
      army: "0 72% 51%",
      creature: "280 65% 60%",
    }[k || "person"] || "216 92% 60%"
  );
}
