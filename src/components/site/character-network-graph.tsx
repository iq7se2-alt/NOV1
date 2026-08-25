"use client";

import { useState, useMemo, useCallback, useRef, useId, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize2, Search, X, Users, GitFork } from "lucide-react";
import { toArabicDigits } from "@/lib/format";

type CharNode = {
  id: number;
  name: string;
  imageUrl: string | null;
  description: string | null;
  isMain: boolean;
  color: string | null;
  appearanceCount: number;
  mentionCount?: number;
  chapters: number[];
};

type RelationEdge = {
  id: number;
  fromId: number;
  toId: number;
  type: string;
  description: string | null;
};

type Props = {
  characters: CharNode[];
  relations: RelationEdge[];
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
  زوجة: { color: "#ec4899", label: "زوجة" },
  أخ: { color: "#06b6d4", label: "أخ" },
  أخت: { color: "#06b6d4", label: "أخت" },
  ابن: { color: "#f59e0b", label: "ابن" },
  ابنة: { color: "#f59e0b", label: "ابنة" },
  تابع: { color: "#8b5cf6", label: "تابع" },
  سيده: { color: "#dc2626", label: "سيده" },
};

// Rich faction palette (gold-themed story → warm jewel tones)
const FACTION_COLORS = [
  "#d4b05e", "#e3c878", "#c96f4a", "#8b5cf6", "#22c55e", "#38bdf8",
  "#f472b6", "#a3e635", "#fb7185", "#34d399", "#a78bfa", "#fbbf24",
  "#2dd4bf", "#60a5fa", "#f97316", "#4ade80", "#e879f9", "#facc15",
  "#7dd3fc", "#fdba74", "#c084fc", "#86efac", "#fda4af", "#94a3b8",
  "#fcd34d", "#5eead4",
];

function getRelStyle(type: string) {
  return REL_STYLES[type] || { color: "#888", label: type };
}

type Layout = {
  pos: Map<number, { x: number; y: number }>;
  factionOf: Map<number, number>; // charId → faction leader id
  protagonist: CharNode | null;
};

/**
 * Solar-system layout:
 *  - Protagonist (most appearances) sits at the golden core.
 *  - The other main characters form a ring around the core.
 *  - Every other character is placed in the angular sector of the main it
 *    co-appears with the most → tidy "royal houses".
 *  - Sectors are drawn as concentric "nightingale" rings so everything fits
 *    inside the canvas regardless of how skewed the house sizes are.
 *  - Characters with no co-occurrence land on an outer "drifter" ring.
 */
function computeLayout(chars: CharNode[]): Layout {
  const pos = new Map<number, { x: number; y: number }>();
  const factionOf = new Map<number, number>();
  const cx = 50, cy = 50;

  const mains = chars.filter((c) => c.isMain).sort((a, b) => b.appearanceCount - a.appearanceCount);
  const others = chars.filter((c) => !c.isMain);
  const protagonist = mains[0] || null;
  const ringMains = protagonist ? mains.slice(1) : mains;

  // Core + main ring
  if (protagonist) pos.set(protagonist.id, { x: cx, y: cy });
  const R_MAIN = 20.5;
  ringMains.forEach((m, i) => {
    const angle = -Math.PI / 2 + (i / Math.max(ringMains.length, 1)) * 2 * Math.PI;
    pos.set(m.id, { x: cx + R_MAIN * Math.cos(angle), y: cy + R_MAIN * Math.sin(angle) });
  });

  // Faction assignment: closest main by co-occurrence
  const mainChapters = new Map<number, Set<number>>();
  for (const m of mains) mainChapters.set(m.id, new Set(m.chapters));
  const groups = new Map<number | null, CharNode[]>();
  for (const o of others) {
    let best: number | null = null;
    let bestScore = 0;
    for (const m of mains) {
      if (m.id === o.id) continue;
      const set = mainChapters.get(m.id);
      let score = 0;
      for (const ch of o.chapters) if (set?.has(ch)) score++;
      if (score > bestScore) { bestScore = score; best = m.id; }
    }
    const key = bestScore > 0 ? best : null;
    if (key !== null) factionOf.set(o.id, key);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(o);
  }

  const MIN_GAP = 3.0;
  const R_IN = 25.0;
  const R_OUT = 47.5;
  const drifters = groups.get(null) || [];
  const factions: { leaderId: number; list: CharNode[] }[] = [...groups.entries()]
    .filter(([k]) => k !== null)
    .map(([leaderId, list]) => ({ leaderId: leaderId as number, list: [...list].sort((a, b) => b.appearanceCount - a.appearanceCount) }));

  const leaderAngle = (id: number) => {
    if (protagonist && id === protagonist.id) return -Math.PI / 2;
    const p = pos.get(id);
    return p ? Math.atan2(p.y - cy, p.x - cx) : 0;
  };

  // Order factions by leader angle → contiguous arcs around the circle
  const ordered = [...factions].sort((a, b) => leaderAngle(a.leaderId) - leaderAngle(b.leaderId));
  const queues = new Map<number, CharNode[]>(ordered.map((f) => [f.leaderId, [...f.list]]));
  const remaining = ordered.map((f) => f.list.length);

  const allocateSlots = (weights: number[], total: number, C: number) => {
    const slots = weights.map((w) => Math.floor((w / total) * C));
    for (let i = 0; i < weights.length; i++) if (weights[i] > 0 && slots[i] === 0) slots[i] = 1;
    let used = slots.reduce((a, b) => a + b, 0);
    const rem = C - used;
    if (rem > 0) {
      const idx = weights
        .map((w, i) => ({ i, r: (w / total) * C - Math.floor((w / total) * C) }))
        .sort((a, b) => b.r - a.r);
      for (let k = 0; k < rem && k < idx.length; k++) slots[idx[k].i]++;
    } else if (rem < 0) {
      let rr = -rem;
      const idx = weights.map((w, i) => ({ i, w })).filter((x, i) => weights[i] > 0).sort((a, b) => a.w - b.w);
      for (const { i } of idx) { if (rr <= 0) break; if (slots[i] > 0) { slots[i]--; rr--; } }
    }
    return slots;
  };

  let r = R_IN;
  while (true) {
    const total = remaining.reduce((a, b) => a + b, 0);
    if (total <= 0) break;
    const C = Math.max(ordered.length, Math.floor((2 * Math.PI * r) / MIN_GAP));
    const slots = allocateSlots(remaining, total, C);
    let cum = -Math.PI / 2;
    for (let i = 0; i < ordered.length; i++) {
      const f = ordered[i];
      const queue = queues.get(f.leaderId)!;
      const cnt = Math.min(slots[i], queue.length);
      const arc = (slots[i] / C) * 2 * Math.PI;
      for (let k = 0; k < cnt; k++) {
        const a = cum + ((k + 1) * arc) / (cnt + 1);
        pos.set(queue.shift()!.id, { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
      }
      remaining[i] -= cnt;
      cum += arc;
    }
    r += MIN_GAP;
    if (r > R_OUT + 2) break;
  }

  // Drifters — outermost ring
  if (drifters.length > 0) {
    const R = 47;
    drifters.forEach((f, i) => {
      const angle = (i / drifters.length) * 2 * Math.PI - Math.PI / 2;
      pos.set(f.id, { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) });
    });
  }

  return { pos, factionOf, protagonist };
}

export function CharacterNetworkGraph({ characters, relations }: Props) {
  const uid = useId();
  const glowId = `glow-${uid}`;
  const coreId = `coreGrad-${uid}`;
  const ringGradId = `ringGrad-${uid}`;

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeFaction, setActiveFaction] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [hoveredRel, setHoveredRel] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string; sub?: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const { pos, factionOf, protagonist } = useMemo(() => computeLayout(characters), [characters]);

  // faction leader id → its followers (for legend + click highlight)
  const factionLeaders = useMemo(() => {
    const mains = characters.filter((c) => c.isMain);
    const map = new Map<number, CharNode[]>();
    for (const c of characters) {
      const leader = factionOf.get(c.id);
      if (leader === undefined) continue;
      if (!map.has(leader)) map.set(leader, []);
      map.get(leader)!.push(c);
    }
    return { mains, map };
  }, [characters, factionOf]);

  const factionIndex = useMemo(() => {
    const idx = new Map<number, number>();
    factionLeaders.mains.forEach((m, i) => idx.set(m.id, i));
    return idx;
  }, [factionLeaders.mains]);

  const q = query.trim().toLowerCase();
  const matchesQuery = useCallback(
    (name: string) => {
      if (!q) return null;
      return name.toLowerCase().includes(q);
    },
    [q]
  );

  // Filtered nodes + edges
  const visibleRelations = useMemo(() => {
    if (!q) return relations;
    const wanted = new Set<number>();
    for (const c of characters) if (matchesQuery(c.name)) wanted.add(c.id);
    return relations.filter((r) => wanted.has(r.fromId) || wanted.has(r.toId));
  }, [relations, characters, matchesQuery, q]);

  const activeIds = useMemo(() => {
    if (selectedId != null) return new Set<number>([selectedId]);
    if (activeFaction != null) {
      const s = new Set<number>([activeFaction]);
      for (const f of factionLeaders.map.get(activeFaction) || []) s.add(f.id);
      return s;
    }
    if (hoveredId != null) return new Set<number>([hoveredId]);
    if (q) {
      const s = new Set<number>();
      for (const c of characters) if (matchesQuery(c.name)) s.add(c.id);
      return s;
    }
    return null;
  }, [selectedId, activeFaction, hoveredId, q, characters, matchesQuery, factionLeaders]);

  const activeRelIds = useMemo(() => {
    if (activeIds === null) return null;
    return new Set(
      visibleRelations.filter((r) => activeIds.has(r.fromId) || activeIds.has(r.toId)).map((r) => r.id)
    );
  }, [activeIds, visibleRelations]);

  const hasFilter = activeIds !== null;

  const reset = () => {
    setSelectedId(null);
    setActiveFaction(null);
    setHoveredId(null);
    setQuery("");
  };

  const toSvg = (x: number, y: number) => ({ x, y }); // already in 0-100 space

  const curvePath = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const offset = Math.min(dist * 0.12, 8);
    const cxp = mx + (dy / dist) * offset;
    const cyp = my - (dx / dist) * offset;
    const p1 = toSvg(x1, y1), pc = toSvg(cxp, cyp), p2 = toSvg(x2, y2);
    return `M${p1.x},${p1.y} Q${pc.x},${pc.y} ${p2.x},${p2.y}`;
  }, []);

  const showTooltip = (e: React.MouseEvent, text: string, sub?: string) =>
    setTooltip({ x: e.clientX, y: e.clientY, text, sub });

  const hideTooltip = () => setTooltip(null);

  const relHover = (rel: RelationEdge, e: React.MouseEvent, entering: boolean) => {
    if (entering) {
      setHoveredRel(rel.id);
      const from = characters.find((c) => c.id === rel.fromId);
      const to = characters.find((c) => c.id === rel.toId);
      const style = getRelStyle(rel.type);
      showTooltip(e, `${from?.name || "?"} ← ${style.label} → ${to?.name || "?"}`, rel.description || undefined);
    } else {
      setHoveredRel(null);
      hideTooltip();
    }
  };

  const selected = selectedId != null ? characters.find((c) => c.id === selectedId) : null;
  const selectedRels = selected
    ? relations.filter((r) => r.fromId === selected.id || r.toId === selected.id)
    : [];

  // count of characters per faction for the info bar
  const factionCounts = useMemo(() => {
    const m = new Map<number, number>();
    for (const [leader, list] of factionLeaders.map) m.set(leader, list.length);
    return m;
  }, [factionLeaders]);

  return (
    <div ref={containerRef} className="gold-card relative overflow-hidden rounded-xl cosmic-bg">
      <div className="starfield absolute inset-0" />

      {/* ═══ TOP BAR: search + stats ═══ */}
      <div className="relative z-20 flex flex-col gap-2 border-b border-gold/10 bg-black/40 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-xs text-gold/70">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1">
            <Users className="h-3 w-3" />
            {toArabicDigits(characters.length)} شخصية
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1">
            <GitFork className="h-3 w-3" />
            {toArabicDigits(factionLeaders.mains.length)} عائلة
          </span>
          <span className="hidden items-center gap-1.5 rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 sm:inline-flex">
            {toArabicDigits(relations.length)} علاقة
          </span>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gold/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن شخصية…"
            className="w-full rounded-lg border border-gold/20 bg-black/60 py-1.5 pr-8 pl-8 text-xs text-gold placeholder:text-gold/30 focus:border-gold/50 focus:outline-none sm:w-52"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-gold/50 hover:text-gold">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ═══ ZOOM CONTROLS ═══ */}
      <div className="absolute top-16 left-3 z-20 flex flex-col gap-1">
        <button onClick={() => setZoom((z) => Math.min(z + 0.2, 2.5))} className="flex h-8 w-8 items-center justify-center rounded-md border border-gold/30 bg-black/60 text-gold/80 backdrop-blur-sm transition-colors hover:bg-gold/20 hover:text-gold" title="تكبير">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))} className="flex h-8 w-8 items-center justify-center rounded-md border border-gold/30 bg-black/60 text-gold/80 backdrop-blur-sm transition-colors hover:bg-gold/20 hover:text-gold" title="تصغير">
          <ZoomOut className="h-4 w-4" />
        </button>
        <button onClick={() => setZoom(1)} className="flex h-8 w-8 items-center justify-center rounded-md border border-gold/30 bg-black/60 text-gold/80 backdrop-blur-sm transition-colors hover:bg-gold/20 hover:text-gold" title="إعادة ضبط">
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* ═══ LEGEND ═══ */}
      <div className="absolute right-3 bottom-3 z-20 max-w-[240px] rounded-lg border border-gold/15 bg-black/70 p-2.5 backdrop-blur-sm">
        <p className="mb-1.5 text-[10px] font-bold text-gold/70">عائلات الرواية</p>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {factionLeaders.mains.slice(0, 12).map((m, i) => (
            <button
              key={m.id}
              onClick={() => setActiveFaction(activeFaction === m.id ? null : m.id)}
              className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[9px] text-gold/60 transition-colors hover:bg-gold/10 hover:text-gold"
              style={{ borderRight: `2px solid ${FACTION_COLORS[i % FACTION_COLORS.length]}${activeFaction === m.id ? "" : ""}` }}
            >
              <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: FACTION_COLORS[i % FACTION_COLORS.length] }} />
              <span className="truncate">{m.name}</span>
              <span className="mr-auto text-gold/40">{toArabicDigits(factionCounts.get(m.id) || 0)}</span>
            </button>
          ))}
        </div>
        <div className="mt-1.5 border-t border-gold/10 pt-1.5">
          {Object.entries(REL_STYLES)
            .filter(([key]) => relations.some((r) => r.type === key))
            .map(([key, val]) => (
              <span key={key} className="mr-1.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px]" style={{ backgroundColor: `${val.color}20`, color: val.color }}>
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: val.color }} />
                {val.label}
              </span>
            ))}
        </div>
      </div>

      {/* ═══ RESET ═══ */}
      {hasFilter && (
        <button onClick={reset} className="absolute left-3 bottom-3 z-20 rounded-md border border-gold/30 bg-black/70 px-3 py-1.5 text-xs text-gold backdrop-blur-sm transition-colors hover:bg-gold/20">
          إلغاء التحديد ✕
        </button>
      )}

      {/* ═══ SELECTED / FACTION INFO ═══ */}
      {selected && (
        <div className="absolute top-16 right-3 z-20 max-w-[260px] rounded-lg border border-gold/25 bg-black/85 p-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gradient-to-br from-gold/30 to-transparent">
              <span className="font-naskh text-lg font-bold text-gold">{selected.name.charAt(0)}</span>
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-naskh text-sm font-bold text-gold">{selected.name}</h3>
              <p className="text-[10px] text-gold/60">
                {toArabicDigits(selected.mentionCount || selected.appearanceCount)} ذكر · {toArabicDigits(selectedRels.length)} علاقة
              </p>
            </div>
          </div>
          {selected.description && (
            <p className="mt-2 text-[11px] leading-relaxed text-gold/70">
              {selected.description.length > 120 ? selected.description.slice(0, 120) + "…" : selected.description}
            </p>
          )}
          {selectedRels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedRels.map((r) => {
                const otherId = r.fromId === selected.id ? r.toId : r.fromId;
                const other = characters.find((c) => c.id === otherId);
                const style = getRelStyle(r.type);
                return (
                  <span key={r.id} className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px]" style={{ backgroundColor: `${style.color}20`, color: style.color }}>
                    {r.fromId === selected.id ? "→" : "←"} {style.label}: {other?.name ?? "?"}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeFaction && !selected && (
        <div className="absolute top-16 right-3 z-20 max-w-[240px] rounded-lg border border-gold/25 bg-black/85 p-3 backdrop-blur-sm">
          {(() => {
            const leader = characters.find((c) => c.id === activeFaction);
            if (!leader) return null;
            const list = factionLeaders.map.get(activeFaction) || [];
            return (
              <>
                <h3 className="font-naskh text-sm font-bold text-gold">
                  عائلة {leader.name}
                </h3>
                <p className="mt-0.5 text-[10px] text-gold/60">{toArabicDigits(list.length + 1)} شخصية</p>
                <div className="mt-2 flex max-h-40 flex-wrap gap-1 overflow-y-auto">
                  {[leader, ...list].slice(0, 60).map((c) => (
                    <span key={c.id} className="rounded-full border border-gold/15 bg-gold/5 px-1.5 py-0.5 text-[9px] text-gold/80">
                      {c.name}
                    </span>
                  ))}
                  {list.length > 59 && (
                    <span className="px-1 py-0.5 text-[9px] text-gold/40">+ {toArabicDigits(list.length - 59)} أخرى</span>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ═══ SVG GRAPH ═══ */}
      <div
        className="relative z-10 overflow-hidden rounded-b-xl"
        style={{ transform: mounted ? `scale(${zoom})` : "scale(0.96)", transformOrigin: "center center", transition: "transform 0.3s ease" }}
      >
        {!mounted ? (
          <div className="flex aspect-square w-full flex-col items-center justify-center gap-3" style={{ minHeight: "520px", maxHeight: "72vh" }}>
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-gold/10 border-t-gold" style={{ animationDuration: "1.4s" }} />
              <div className="absolute inset-3 animate-spin rounded-full border border-gold/20 border-b-gold/60" style={{ animationDirection: "reverse", animationDuration: "2s" }} />
            </div>
            <p className="font-naskh text-sm text-gold/50">جارٍ رسم مجرة الشخصيات…</p>
          </div>
        ) : (
        <svg viewBox="0 0 100 100" className="aspect-square w-full" style={{ minHeight: "520px", maxHeight: "72vh" }}>
          <defs>
            <radialGradient id={coreId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffd76e" stopOpacity="0.55" />
              <stop offset="35%" stopColor="#d4a843" stopOpacity="0.28" />
              <stop offset="70%" stopColor="#d4a843" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#d4a843" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={ringGradId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e3c878" stopOpacity="0.35" />
              <stop offset="45%" stopColor="#c9a84c" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
            </radialGradient>
            <filter id={glowId}>
              <feGaussianBlur stdDeviation="0.45" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Core halo */}
          <circle cx="50" cy="50" r="30" fill={`url(#${coreId})`} />

          {/* Faction wedges — mandala sectors behind each main */}
          {factionLeaders.mains.map((m, i) => {
            const p = pos.get(m.id);
            if (!p) return null;
            const angle = Math.atan2(p.y - 50, p.x - 50);
            const leaderIdx = factionIndex.get(m.id) ?? 0;
            const color = FACTION_COLORS[leaderIdx % FACTION_COLORS.length];
            const isActive = activeFaction === m.id;
            const half = (Math.PI / Math.max(factionLeaders.mains.length, 1)) * 0.85;
            return (
              <g key={m.id} style={{ cursor: "pointer" }} onClick={() => setActiveFaction(isActive ? null : m.id)}
                onMouseEnter={(e) => showTooltip(e, `عائلة ${m.name}`, `${toArabicDigits(factionCounts.get(m.id) || 0)} شخصية تتبعها`)}
                onMouseMove={(e) => tooltip && setTooltip({ ...tooltip, x: e.clientX, y: e.clientY })}
                onMouseLeave={hideTooltip}>
                <path
                  d={`M50,50 L${50 + 49 * Math.cos(angle - half)},${50 + 49 * Math.sin(angle - half)} A49,49 0 0,0 ${50 + 49 * Math.cos(angle + half)},${50 + 49 * Math.sin(angle + half)} Z`}
                  fill={color}
                  opacity={isActive ? 0.14 : 0.04}
                  style={{ transition: "opacity 0.3s ease" }}
                />
              </g>
            );
          })}

          {/* Orbit guide circles */}
          <circle cx="50" cy="50" r={20.5} fill="none" stroke="rgba(212,168,67,0.18)" strokeWidth="0.12" strokeDasharray="0.6 1.4" />
          <circle cx="50" cy="50" r={24} fill={`url(#${ringGradId})`} />
          <circle cx="50" cy="50" r={47} fill="none" stroke="rgba(212,168,67,0.10)" strokeWidth="0.1" strokeDasharray="0.4 2" />

          {/* RELATION LINES */}
          {visibleRelations.map((rel) => {
            const fromPos = pos.get(rel.fromId);
            const toPos = pos.get(rel.toId);
            if (!fromPos || !toPos) return null;
            const style = getRelStyle(rel.type);
            const isActive = activeRelIds?.has(rel.id) ?? false;
            const isHovered = hoveredRel === rel.id;
            const dimmed = hasFilter && !isActive;
            return (
              <g key={rel.id}>
                <path d={curvePath(fromPos.x, fromPos.y, toPos.x, toPos.y)} fill="none" stroke="transparent" strokeWidth="1.6" style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => relHover(rel, e, true)}
                  onMouseMove={(e) => tooltip && setTooltip({ ...tooltip, x: e.clientX, y: e.clientY })}
                  onMouseLeave={(e) => relHover(rel, e, false)} />
                <path d={curvePath(fromPos.x, fromPos.y, toPos.x, toPos.y)} fill="none" stroke={style.color}
                  strokeWidth={isHovered ? "0.28" : isActive ? "0.2" : "0.12"}
                  opacity={dimmed ? 0.04 : isHovered ? 1 : isActive ? 0.85 : 0.4}
                  strokeDasharray={style.color === "#ef4444" ? "0.5,0.3" : "none"}
                  filter={isHovered || isActive ? `url(#${glowId})` : undefined}
                  style={{ transition: "all 0.3s ease" }} />
                {(isHovered || (isActive && hasFilter)) && (
                  <text x={(fromPos.x + toPos.x) / 2} y={(fromPos.y + toPos.y) / 2}
                    fill={style.color} fontSize="1.6" textAnchor="middle" dy="-0.6"
                    className="pointer-events-none font-naskh font-bold" style={{ filter: "drop-shadow(0 0 2px black)" }}>
                    {style.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* CHARACTER NODES */}
          {characters.map((ch) => {
            const p = pos.get(ch.id);
            if (!p) return null;
            const isProtag = protagonist?.id === ch.id;
            const leaderIdx = ch.isMain ? (factionIndex.get(ch.id) ?? 0) : (factionOf.has(ch.id) ? factionIndex.get(factionOf.get(ch.id)!) ?? 0 : 0);
            const factionColor = FACTION_COLORS[leaderIdx % FACTION_COLORS.length];
            const nodeColor = ch.color || (ch.isMain ? "#d4a843" : factionColor);
            const isSelected = selectedId === ch.id;
            const isActiveNode = hasFilter ? (activeIds as Set<number>).has(ch.id) : true;
            const dimmed = hasFilter && !isActiveNode && !isSelected;

            // size
            const rMain = 2.6, rProtag = 4.2, rOther = 1.35;
            const r = isProtag ? rProtag : ch.isMain ? rMain : rOther;

            return (
              <g key={ch.id} style={{ cursor: "pointer", transition: "opacity 0.3s ease" }}
                onClick={() => {
                  setSelectedId(isSelected ? null : ch.id);
                  setActiveFaction(null);
                }}
                onMouseEnter={(e) => {
                  if (!selectedId) setHoveredId(ch.id);
                  showTooltip(e, ch.name, `${toArabicDigits(ch.appearanceCount)} ظهور` + (ch.isMain && !isProtag ? ` · قائد عائلة` : "") + (isProtag ? " · البطل" : ""));
                }}
                onMouseMove={(e) => tooltip && setTooltip({ ...tooltip, x: e.clientX, y: e.clientY })}
                onMouseLeave={() => { if (!selectedId) setHoveredId(null); hideTooltip(); }}
                opacity={dimmed ? 0.12 : 1}>
                {/* Protagonist aura */}
                {isProtag && (
                  <circle cx={p.x} cy={p.y} r={6.2} fill="none" stroke="#ffd76e" strokeWidth="0.12" opacity="0.5">
                    <animate attributeName="r" values="5.6;6.6;5.6" dur="3s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0.25;0.5" dur="3s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Hover / selected glow */}
                {(isSelected || hoveredId === ch.id) && (
                  <circle cx={p.x} cy={p.y} r={r + 1.4} fill="none" stroke="#ffd76e" strokeWidth="0.12" opacity="0.5">
                    <animate attributeName="r" values={`${r + 1.2};${r + 2};${r + 1.2}`} dur="1.6s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Node disc */}
                <circle cx={p.x} cy={p.y} r={r}
                  fill={isProtag ? "#241604" : ch.isMain ? "#1c1206" : `${nodeColor}26`}
                  stroke={isSelected ? "#ffd700" : isProtag ? "#ffd76e" : ch.isMain ? "#d4a843" : nodeColor}
                  strokeWidth={isSelected ? "0.28" : isProtag ? "0.22" : ch.isMain ? "0.2" : "0.12"}
                  filter={isSelected ? `url(#${glowId})` : undefined}
                  style={{ transition: "all 0.25s ease" }} />

                {/* Faction-colored rim for main ring */}
                {ch.isMain && !isProtag && (
                  <circle cx={p.x} cy={p.y} r={r * 0.55} fill="none" stroke={nodeColor} strokeWidth="0.08" opacity="0.7" />
                )}

                {/* Letter */}
                <text x={p.x} y={p.y}
                  fill={isProtag ? "#ffd76e" : nodeColor}
                  fontSize={isProtag ? 3.4 : ch.isMain ? 2.3 : 1.25}
                  textAnchor="middle" dominantBaseline="central"
                  className="pointer-events-none font-naskh font-bold">
                  {ch.name.charAt(0)}
                </text>

                {/* Labels — mains + protagonist always, others only when interacting */}
                {(ch.isMain || isSelected || hoveredId === ch.id) && (
                  <g className="pointer-events-none" style={{ transition: "opacity 0.2s" }}>
                    <rect x={p.x - 5} y={p.y + r + 0.3} width="10" height={isProtag ? 2.4 : 2.1} rx="1.1" fill="rgba(0,0,0,0.66)" />
                    <text x={p.x} y={p.y + r + 1.7}
                      fill={isSelected ? "#ffd700" : isProtag ? "#ffd76e" : ch.isMain ? "#d4a843" : "#c9a84c"}
                      fontSize={isProtag ? 2.1 : ch.isMain ? 1.6 : 1.3}
                      textAnchor="middle"
                      className="font-naskh font-bold"
                      style={{ filter: "drop-shadow(0 0 1.5px black)" }}>
                      {ch.name.length > 16 ? ch.name.slice(0, 16) + "…" : ch.name}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
        )}
      </div>

      {/* ═══ TOOLTIP ═══ */}
      {tooltip && tooltip.x > 0 && (
        <div className="pointer-events-none fixed z-50 rounded-lg border border-gold/30 bg-black/90 px-3 py-2 shadow-xl backdrop-blur-sm"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}>
          <p className="font-naskh text-sm font-bold text-gold">{tooltip.text}</p>
          {tooltip.sub && <p className="mt-0.5 text-[10px] text-gold/60">{tooltip.sub}</p>}
        </div>
      )}
    </div>
  );
}
