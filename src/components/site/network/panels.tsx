"use client";

import { X, Users, GitFork, Search, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { toArabicDigits } from "@/lib/format";
import { FACTION_COLORS, REL_STYLES, getRelStyle } from "./constants";
import type { CharNode, RelationEdge } from "./types";

/** Top bar: counts + relation toggle + search */
export function NetworkTopBar({
  characterCount,
  familyCount,
  relationCount,
  showRelations,
  onToggleRelations,
  query,
  onQueryChange,
}: {
  characterCount: number;
  familyCount: number;
  relationCount: number;
  showRelations: boolean;
  onToggleRelations: () => void;
  query: string;
  onQueryChange: (v: string) => void;
}) {
  return (
    <div className="relative z-20 flex flex-col gap-2 border-b border-gold/10 bg-black/40 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-xs text-gold/70">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1">
          <Users className="h-3 w-3" />
          {toArabicDigits(characterCount)} شخصية
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1">
          <GitFork className="h-3 w-3" />
          {toArabicDigits(familyCount)} عائلة
        </span>
        <span className="hidden items-center gap-1.5 rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 sm:inline-flex">
          {toArabicDigits(relationCount)} علاقة
        </span>
        <button
          onClick={onToggleRelations}
          className={"rounded-full border px-2.5 py-1 text-xs transition-colors " + (showRelations ? "border-gold/60 bg-gold/20 text-gold" : "border-gold/20 bg-gold/10 text-gold/60 hover:text-gold")}
          title="إظهار/إخفاء خطوط العلاقات — الإخفاء أسرع وأوضح"
        >
          {showRelations ? "إخفاء العلاقات" : "إظهار العلاقات"}
        </button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gold/50" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="ابحث عن شخصية…"
          className="w-full rounded-lg border border-gold/20 bg-black/60 py-1.5 pr-8 pl-8 text-xs text-gold placeholder:text-gold/30 focus:border-gold/50 focus:outline-none sm:w-52"
        />
        {query && (
          <button onClick={() => onQueryChange("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-gold/50 hover:text-gold">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Zoom in / out / reset */
export function NetworkZoomControls({
  zoom,
  onZoom,
  onReset,
}: {
  zoom: number;
  onZoom: (v: number) => void;
  onReset: () => void;
}) {
  const btn =
    "flex h-8 w-8 items-center justify-center rounded-md border border-gold/30 bg-black/60 text-gold/80 backdrop-blur-sm transition-colors hover:bg-gold/20 hover:text-gold";
  return (
    <div className="absolute top-16 left-3 z-20 flex flex-col gap-1">
      <button onClick={() => onZoom(Math.min(zoom + 0.2, 2.5))} className={btn} title="تكبير">
        <ZoomIn className="h-4 w-4" />
      </button>
      <button onClick={() => onZoom(Math.max(zoom - 0.2, 0.5))} className={btn} title="تصغير">
        <ZoomOut className="h-4 w-4" />
      </button>
      <button onClick={onReset} className={btn} title="إعادة ضبط">
        <Maximize2 className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Faction legend + relation-type key */
export function NetworkLegend({
  mains,
  factionCounts,
  activeFaction,
  onToggleFaction,
  presentRelTypes,
}: {
  mains: CharNode[];
  factionCounts: Map<number, number>;
  activeFaction: number | null;
  onToggleFaction: (id: number) => void;
  presentRelTypes: string[];
}) {
  return (
    <div className="absolute right-3 bottom-3 z-20 max-w-[240px] rounded-lg border border-gold/15 bg-black/70 p-2.5 backdrop-blur-sm">
      <p className="mb-1.5 text-[10px] font-bold text-gold/70">عائلات الرواية</p>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        {mains.slice(0, 12).map((m, i) => (
          <button
            key={m.id}
            onClick={() => onToggleFaction(m.id)}
            className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[9px] text-gold/60 transition-colors hover:bg-gold/10 hover:text-gold"
            style={{ borderRight: `2px solid ${FACTION_COLORS[i % FACTION_COLORS.length]}` }}
          >
            <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: FACTION_COLORS[i % FACTION_COLORS.length] }} />
            <span className="truncate">{m.name}</span>
            <span className="mr-auto text-gold/40">{toArabicDigits(factionCounts.get(m.id) || 0)}</span>
          </button>
        ))}
      </div>
      {presentRelTypes.length > 0 && (
        <div className="mt-1.5 border-t border-gold/10 pt-1.5">
          {presentRelTypes.map((key) => {
            const val = REL_STYLES[key];
            return (
              <span key={key} className="mr-1.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px]" style={{ backgroundColor: `${val.color}20`, color: val.color }}>
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: val.color }} />
                {val.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Info card for the selected character */
export function NetworkSelectedPanel({
  selected,
  selectedRels,
  characters,
}: {
  selected: CharNode;
  selectedRels: RelationEdge[];
  characters: CharNode[];
}) {
  return (
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
  );
}

/** Info card for the active faction */
export function NetworkFactionPanel({
  leader,
  members,
}: {
  leader: CharNode;
  members: CharNode[];
}) {
  return (
    <div className="absolute top-16 right-3 z-20 max-w-[240px] rounded-lg border border-gold/25 bg-black/85 p-3 backdrop-blur-sm">
      <h3 className="font-naskh text-sm font-bold text-gold">عائلة {leader.name}</h3>
      <p className="mt-0.5 text-[10px] text-gold/60">{toArabicDigits(members.length + 1)} شخصية</p>
      <div className="mt-2 flex max-h-40 flex-wrap gap-1 overflow-y-auto">
        {[leader, ...members].slice(0, 60).map((c) => (
          <span key={c.id} className="rounded-full border border-gold/15 bg-gold/5 px-1.5 py-0.5 text-[9px] text-gold/80">
            {c.name}
          </span>
        ))}
        {members.length > 59 && (
          <span className="px-1 py-0.5 text-[9px] text-gold/40">+ {toArabicDigits(members.length - 59)} أخرى</span>
        )}
      </div>
    </div>
  );
}

/** Cursor-following tooltip — always mounted, coords via ref */
export function NetworkTooltip({
  elRef,
  text,
  sub,
}: {
  elRef: React.RefObject<HTMLDivElement | null>;
  text: string;
  sub?: string;
}) {
  return (
    <div
      ref={elRef}
      className={"pointer-events-none fixed z-50 rounded-lg border border-gold/30 bg-black/90 px-3 py-2 shadow-xl backdrop-blur-sm transition-opacity duration-100 " + (text ? "opacity-100" : "opacity-0")}
      style={{ left: -9999, top: -9999 }}
    >
      <p className="font-naskh text-sm font-bold text-gold">{text || ""}</p>
      {sub && <p className="mt-0.5 text-[10px] text-gold/60">{sub}</p>}
    </div>
  );
}
