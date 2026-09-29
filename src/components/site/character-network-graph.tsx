"use client";

import { useState, useMemo, useCallback, useRef, useId, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { FACTION_COLORS, REL_STYLES, getRelStyle } from "./network/constants";
import { computeLayout } from "./network/layout";
import {
  NetworkTopBar,
  NetworkZoomControls,
  NetworkLegend,
  NetworkSelectedPanel,
  NetworkFactionPanel,
  NetworkTooltip,
} from "./network/panels";
import type { CharNode, RelationEdge } from "./network/types";

type Props = {
  characters: CharNode[];
  relations: RelationEdge[];
};

export function CharacterNetworkGraph({ characters, relations }: Props) {
  const uid = useId();
  const { t, formatNumber } = useLanguage();
  const glowId = `glow-${uid}`;
  const coreId = `coreGrad-${uid}`;
  const ringGradId = `ringGrad-${uid}`;

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeFaction, setActiveFaction] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [hoveredRel, setHoveredRel] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showRelations, setShowRelations] = useState(false);
  const [nodeLimit, setNodeLimit] = useState(200);
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<{ text: string; sub?: string } | null>(null);
  const tooltipElRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ sx: number; sy: number; bx: number; by: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const [grabbing, setGrabbing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const q = query.trim().toLowerCase();
  const matchesQuery = useCallback(
    (name: string) => {
      if (!q) return null;
      return name.toLowerCase().includes(q);
    },
    [q]
  );

  // ═══ PROGRESSIVE RENDERING ═══
  // 788 nodes in one SVG is a lot of DOM to mount at once. Draw the most
  // mentioned first (the page already sorts by mentionCount desc) and let the
  // user reveal more. Searching always searches the FULL list, so a match is
  // never hidden behind the "more" button.
  // All isMain characters are always included so every family keeps its leader.
  const renderedChars = useMemo(() => {
    if (q) return characters.filter((c) => matchesQuery(c.name));
    if (characters.length <= nodeLimit) return characters;
    const head = characters.slice(0, nodeLimit);
    const shownIds = new Set(head.map((c) => c.id));
    const missingMains = characters.filter((c) => c.isMain && !shownIds.has(c.id));
    return missingMains.length > 0 ? [...head, ...missingMains] : head;
  }, [characters, nodeLimit, q, matchesQuery]);

  const hiddenCount = characters.length - renderedChars.length;

  const { pos, factionOf, protagonist } = useMemo(() => computeLayout(renderedChars), [renderedChars]);

  // faction leader id → its followers (for legend + click highlight)
  const factionLeaders = useMemo(() => {
    const mains = renderedChars.filter((c) => c.isMain);
    const map = new Map<number, CharNode[]>();
    for (const c of renderedChars) {
      const leader = factionOf.get(c.id);
      if (leader === undefined) continue;
      if (!map.has(leader)) map.set(leader, []);
      map.get(leader)!.push(c);
    }
    return { mains, map };
  }, [renderedChars, factionOf]);

  const factionIndex = useMemo(() => {
    const idx = new Map<number, number>();
    factionLeaders.mains.forEach((m, i) => idx.set(m.id, i));
    return idx;
  }, [factionLeaders.mains]);

  // Tooltip coordinates are updated via direct DOM style (ref) — never via
  // setState — so following the cursor does not re-render the whole SVG graph.
  const moveTooltip = useCallback((clientX: number, clientY: number) => {
    const el = tooltipElRef.current;
    if (el) {
      el.style.left = `${clientX + 14}px`;
      el.style.top = `${clientY - 10}px`;
    }
  }, []);

  const showTooltip = useCallback((e: React.MouseEvent, text: string, sub?: string) => {
    setTooltip({ text, sub });
    moveTooltip(e.clientX, e.clientY);
  }, [moveTooltip]);

  const hideTooltip = useCallback(() => setTooltip(null), []);

  // Filtered nodes + edges
  // With 2k+ relations, rendering every line makes the graph slow and noisy.
  // Relations render only when: the toggle is on, searching, or a node/faction
  // is selected — then they are focused anyway.
  const visibleRelations = useMemo(() => {
    if (!q && !showRelations && selectedId == null && activeFaction == null) return [];
    if (!q) return relations;
    const wanted = new Set<number>();
    for (const c of characters) if (matchesQuery(c.name)) wanted.add(c.id);
    return relations.filter((r) => wanted.has(r.fromId) || wanted.has(r.toId));
  }, [relations, characters, matchesQuery, q, showRelations, selectedId, activeFaction]);

  // Filter ids: selection / faction / search — hover deliberately excluded so
  // moving the cursor never re-renders (or re-dims) the whole graph.
  const filterIds = useMemo(() => {
    if (selectedId != null) return new Set<number>([selectedId]);
    if (activeFaction != null) {
      const s = new Set<number>([activeFaction]);
      for (const f of factionLeaders.map.get(activeFaction) || []) s.add(f.id);
      return s;
    }
    if (q) {
      const s = new Set<number>();
      for (const c of characters) if (matchesQuery(c.name)) s.add(c.id);
      return s;
    }
    return null;
  }, [selectedId, activeFaction, q, characters, matchesQuery, factionLeaders]);

  const activeRelIds = useMemo(() => {
    if (filterIds === null) return null;
    return new Set(
      visibleRelations.filter((r) => filterIds.has(r.fromId) || filterIds.has(r.toId)).map((r) => r.id)
    );
  }, [filterIds, visibleRelations]);

  const hasFilter = filterIds !== null;

  const reset = () => {
    setSelectedId(null);
    setActiveFaction(null);
    setHoveredId(null);
    setQuery("");
  };

  const curvePath = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const offset = Math.min(dist * 0.12, 8);
    const cxp = mx + (dy / dist) * offset;
    const cyp = my - (dx / dist) * offset;
    return `M${x1},${y1} Q${cxp},${cyp} ${x2},${y2}`;
  }, []);

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

  // relation types actually present in the data (legend key)
  const presentRelTypes = useMemo(() => {
    const seen = new Set<string>();
    for (const r of relations) if (REL_STYLES[r.type]) seen.add(r.type);
    return [...seen];
  }, [relations]);

  const activeFactionLeader = activeFaction != null
    ? characters.find((c) => c.id === activeFaction) ?? null
    : null;

  // ═══ STATIC "others" group ═══
  // Every non-main character without active filter/hover styling is rendered
  // into ONE memoized group. While the user only hovers, this array keeps the
  // exact same element references, so React skips re-diffing hundreds of <g>s.
  const staticOthers = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (const ch of renderedChars) {
      if (ch.isMain) continue;
      const p = pos.get(ch.id);
      if (!p) continue;
      const dimmed = hasFilter && !filterIds!.has(ch.id);
      const nodeColor = ch.color || FACTION_COLORS[(factionOf.get(ch.id) != null ? factionIndex.get(factionOf.get(ch.id)!) ?? 0 : 0) % FACTION_COLORS.length];
      out.push(
        <g
          key={ch.id}
          style={{ cursor: "pointer" }}
          onClick={() => {
            if (suppressClickRef.current) return;
            setSelectedId((v) => (v === ch.id ? null : ch.id));
            setActiveFaction(null);
          }}
          onMouseEnter={(e) => {
            setHoveredId(ch.id);
            showTooltip(e, ch.name, `${formatNumber(ch.appearanceCount)} ${t("ظهور")}`);
          }}
          onMouseLeave={() => { setHoveredId(null); hideTooltip(); }}
          opacity={dimmed ? 0.12 : 1}
        >
          <circle
            cx={p.x} cy={p.y} r={1.35}
            fill={`${nodeColor}26`}
            stroke={nodeColor}
            strokeWidth="0.12"
          />
          <text
            x={p.x} y={p.y}
            fill={nodeColor}
            fontSize="1.25"
            textAnchor="middle" dominantBaseline="central"
            className="pointer-events-none font-naskh font-bold"
          >
            {ch.name.charAt(0)}
          </text>
        </g>
      );
    }
    return out;
  }, [renderedChars, pos, hasFilter, filterIds, factionOf, factionIndex, showTooltip, hideTooltip]);

  // ═══ dynamic "others": filtered / hovered / selected nodes drawn on top ═══
  const dynamicOthers = useMemo(() => {
    const out: CharNode[] = [];
    for (const ch of renderedChars) {
      if (ch.isMain) continue;
      if (filterIds?.has(ch.id) || hoveredId === ch.id || selectedId === ch.id) out.push(ch);
    }
    return out;
  }, [renderedChars, filterIds, hoveredId, selectedId]);

  // ═══ PAN (drag) ═══
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    panRef.current = { sx: e.clientX, sy: e.clientY, bx: pan.x, by: pan.y, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!panRef.current) return;
    const dx = e.clientX - panRef.current.sx;
    const dy = e.clientY - panRef.current.sy;
    if (!panRef.current.moved && Math.hypot(dx, dy) > 5) {
      panRef.current.moved = true;
      setGrabbing(true);
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    if (panRef.current.moved) setPan({ x: panRef.current.bx + dx, y: panRef.current.by + dy });
  };
  const onPointerUp = () => {
    if (panRef.current?.moved) {
      suppressClickRef.current = true;
      setTimeout(() => { suppressClickRef.current = false; }, 0);
    }
    panRef.current = null;
    setGrabbing(false);
  };

  const manyRelations = visibleRelations.length > 700;

  return (
    <div
      ref={containerRef}
      className={"gold-card relative overflow-hidden rounded-xl cosmic-bg " + (grabbing ? "cursor-grabbing" : "")}
      onMouseMove={(e) => moveTooltip(e.clientX, e.clientY)}
    >
      <div className="starfield absolute inset-0" />

      {/* ═══ TOP BAR: search + stats ═══ */}
      <NetworkTopBar
        characterCount={characters.length}
        familyCount={factionLeaders.mains.length}
        relationCount={relations.length}
        showRelations={showRelations}
        onToggleRelations={() => setShowRelations((v) => !v)}
        query={query}
        onQueryChange={setQuery}
      />

      {/* ═══ ZOOM CONTROLS ═══ */}
      <NetworkZoomControls
        zoom={zoom}
        onZoom={setZoom}
        onReset={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
      />

      {/* ═══ LEGEND ═══ */}
      <NetworkLegend
        mains={factionLeaders.mains}
        factionCounts={factionCounts}
        activeFaction={activeFaction}
        onToggleFaction={(id) => setActiveFaction(activeFaction === id ? null : id)}
        presentRelTypes={presentRelTypes}
      />

      {/* ═══ RESET ═══ */}
      {hasFilter && (
        <button onClick={reset} className="absolute left-3 bottom-3 z-20 rounded-md border border-gold/30 bg-black/70 px-3 py-1.5 text-xs text-gold backdrop-blur-sm transition-colors hover:bg-gold/20">
          {t("إلغاء التحديد ✕")}
        </button>
      )}

      {/* ═══ LOAD MORE NODES ═══ */}
      {hiddenCount > 0 && !q && (
        <button
          onClick={() => setNodeLimit((n) => n + 300)}
          className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-gold/30 bg-black/75 px-4 py-1.5 text-xs text-gold backdrop-blur-sm transition-colors hover:bg-gold/20"
          title={t("عرض المزيد من الشخصيات في الدائرة")}
        >
          {t("عرض")} {formatNumber(Math.min(hiddenCount, 300))} {t("شخصية أخرى")}
          <span className="mr-1.5 text-gold/40">
            ({formatNumber(renderedChars.length)} / {formatNumber(characters.length)})
          </span>
        </button>
      )}

      {/* ═══ SELECTED / FACTION INFO ═══ */}
      {selected && (
        <NetworkSelectedPanel selected={selected} selectedRels={selectedRels} characters={characters} />
      )}

      {activeFaction && !selected && activeFactionLeader && (
        <NetworkFactionPanel leader={activeFactionLeader} members={factionLeaders.map.get(activeFaction) || []} />
      )}

      {/* ═══ SVG GRAPH ═══ */}
      <div
        className="relative z-10 overflow-hidden rounded-b-xl"
        style={{ transform: mounted ? `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` : "scale(0.96)", transformOrigin: "center center", transition: grabbing ? "none" : "transform 0.3s ease" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {!mounted ? (
          <div className="flex aspect-square w-full flex-col items-center justify-center gap-3" style={{ minHeight: "520px", maxHeight: "72vh" }}>
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-gold/10 border-t-gold" style={{ animationDuration: "1.4s" }} />
              <div className="absolute inset-3 animate-spin rounded-full border border-gold/20 border-b-gold/60" style={{ animationDirection: "reverse", animationDuration: "2s" }} />
            </div>
            <p className="font-naskh text-sm text-gold/50">{t("جارٍ رسم مجرة الشخصيات…")}</p>
          </div>
        ) : (
        <svg viewBox="0 0 100 100" className={"aspect-square w-full " + (grabbing ? "cursor-grabbing" : "cursor-grab")} style={{ minHeight: "520px", maxHeight: "72vh" }}>
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
          {factionLeaders.mains.map((m) => {
            const p = pos.get(m.id);
            if (!p) return null;
            const angle = Math.atan2(p.y - 50, p.x - 50);
            const leaderIdx = factionIndex.get(m.id) ?? 0;
            const color = FACTION_COLORS[leaderIdx % FACTION_COLORS.length];
            const isActive = activeFaction === m.id;
            const half = (Math.PI / Math.max(factionLeaders.mains.length, 1)) * 0.85;
            return (
              <g key={m.id} style={{ cursor: "pointer" }} onClick={() => setActiveFaction(isActive ? null : m.id)}
                onMouseEnter={(e) => showTooltip(e, `${t("عائلة")} ${m.name}`, `${formatNumber(factionCounts.get(m.id) || 0)} ${t("شخصية تتبعها")}`)}
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
                {!manyRelations && (
                  <path d={curvePath(fromPos.x, fromPos.y, toPos.x, toPos.y)} fill="none" stroke="transparent" strokeWidth="1.6" style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => relHover(rel, e, true)}
                    onMouseLeave={(e) => relHover(rel, e, false)} />
                )}
                <path d={curvePath(fromPos.x, fromPos.y, toPos.x, toPos.y)} fill="none" stroke={style.color}
                  strokeWidth={isHovered ? "0.28" : isActive ? "0.2" : "0.12"}
                  opacity={dimmed ? 0.04 : isHovered ? 1 : isActive ? 0.85 : 0.4}
                  strokeDasharray={style.color === "#ef4444" ? "0.5,0.3" : "none"}
                  filter={isHovered || isActive ? `url(#${glowId})` : undefined} />
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

          {/* STATIC character nodes (memoized — stable across hover) */}
          {staticOthers}

          {/* MAIN RING NODES */}
          {renderedChars.map((ch) => {
            if (!ch.isMain) return null;
            const p = pos.get(ch.id);
            if (!p) return null;
            const isProtag = protagonist?.id === ch.id;
            const leaderIdx = ch.isMain ? (factionIndex.get(ch.id) ?? 0) : 0;
            const nodeColor = ch.color || (ch.isMain ? "#d4a843" : FACTION_COLORS[leaderIdx % FACTION_COLORS.length]);
            const isSelected = selectedId === ch.id;
            const isActiveNode = hasFilter ? (filterIds as Set<number>).has(ch.id) : true;
            const dimmed = hasFilter && !isActiveNode && !isSelected;

            const rMain = 2.6, rProtag = 4.2;
            const r = isProtag ? rProtag : rMain;

            return (
              <g key={ch.id} style={{ cursor: "pointer" }}
                onClick={() => {
                  if (suppressClickRef.current) return;
                  setSelectedId(isSelected ? null : ch.id);
                  setActiveFaction(null);
                }}
                onMouseEnter={(e) => {
                  setHoveredId(ch.id);
                  showTooltip(e, ch.name, `${formatNumber(ch.appearanceCount)} ${t("ظهور")}` + (ch.isMain && !isProtag ? ` · ${t("قائد عائلة")}` : "") + (isProtag ? ` · ${t("البطل")}` : ""));
                }}
                onMouseLeave={() => { setHoveredId(null); hideTooltip(); }}
                opacity={dimmed ? 0.12 : 1}>
                {/* Protagonist aura (static — no continuous animation) */}
                {isProtag && (
                  <circle cx={p.x} cy={p.y} r={6.2} fill="none" stroke="#ffd76e" strokeWidth="0.12" opacity="0.5" />
                )}
                {/* Hover / selected glow (static ring) */}
                {(isSelected || hoveredId === ch.id) && (
                  <circle cx={p.x} cy={p.y} r={r + 1.6} fill="none" stroke="#ffd76e" strokeWidth="0.12" opacity="0.6" />
                )}

                {/* Node disc */}
                <circle cx={p.x} cy={p.y} r={r}
                  fill={isProtag ? "#241604" : "#1c1206"}
                  stroke={isSelected ? "#ffd700" : isProtag ? "#ffd76e" : "#d4a843"}
                  strokeWidth={isSelected ? "0.28" : isProtag ? "0.22" : "0.2"}
                  filter={isSelected ? `url(#${glowId})` : undefined} />

                {/* Faction-colored rim for main ring */}
                {!isProtag && (
                  <circle cx={p.x} cy={p.y} r={r * 0.55} fill="none" stroke={nodeColor} strokeWidth="0.08" opacity="0.7" />
                )}

                {/* Letter */}
                <text x={p.x} y={p.y}
                  fill={isProtag ? "#ffd76e" : nodeColor}
                  fontSize={isProtag ? 3.4 : 2.3}
                  textAnchor="middle" dominantBaseline="central"
                  className="pointer-events-none font-naskh font-bold">
                  {ch.name.charAt(0)}
                </text>

                {/* Labels — mains always, bigger for protagonist */}
                <g className="pointer-events-none" style={{ transition: "opacity 0.2s" }}>
                  <rect x={p.x - 5} y={p.y + r + 0.3} width="10" height={isProtag ? 2.4 : 2.1} rx="1.1" fill="rgba(0,0,0,0.66)" />
                  <text x={p.x} y={p.y + r + 1.7}
                    fill={isSelected ? "#ffd700" : isProtag ? "#ffd76e" : "#d4a843"}
                    fontSize={isProtag ? 2.1 : 1.6}
                    textAnchor="middle"
                    className="font-naskh font-bold"
                    style={{ filter: "drop-shadow(0 0 1.5px black)" }}>
                    {ch.name.length > 16 ? ch.name.slice(0, 16) + "…" : ch.name}
                  </text>
                </g>
              </g>
            );
          })}

          {/* DYNAMIC "others" overlay: filtered / hovered / selected nodes */}
          {dynamicOthers.map((ch) => {
            const p = pos.get(ch.id);
            if (!p) return null;
            const isSelected = selectedId === ch.id;
            const isHovered = hoveredId === ch.id;
            const nodeColor = ch.color || FACTION_COLORS[(factionOf.get(ch.id) != null ? factionIndex.get(factionOf.get(ch.id)!) ?? 0 : 0) % FACTION_COLORS.length];
            return (
              <g key={`ov-${ch.id}`} style={{ cursor: "pointer" }}
                onClick={() => {
                  if (suppressClickRef.current) return;
                  setSelectedId(isSelected ? null : ch.id);
                  setActiveFaction(null);
                }}
                onMouseEnter={(e) => {
                  setHoveredId(ch.id);
                  showTooltip(e, ch.name, `${formatNumber(ch.appearanceCount)} ${t("ظهور")}`);
                }}
                onMouseLeave={() => { setHoveredId(null); hideTooltip(); }}>
                {(isSelected || isHovered) && (
                  <circle cx={p.x} cy={p.y} r={1.35 + 1.4} fill="none" stroke="#ffd76e" strokeWidth="0.12" opacity="0.6" />
                )}
                <circle cx={p.x} cy={p.y} r={1.35}
                  fill={`${nodeColor}33`}
                  stroke={isSelected ? "#ffd700" : nodeColor}
                  strokeWidth={isSelected ? "0.28" : "0.14"}
                  filter={isSelected ? `url(#${glowId})` : undefined} />
                <text x={p.x} y={p.y}
                  fill={nodeColor}
                  fontSize="1.25"
                  textAnchor="middle" dominantBaseline="central"
                  className="pointer-events-none font-naskh font-bold">
                  {ch.name.charAt(0)}
                </text>
                {(isSelected || isHovered) && (
                  <g className="pointer-events-none">
                    <rect x={p.x - 5} y={p.y + 1.65} width="10" height="2.1" rx="1.1" fill="rgba(0,0,0,0.75)" />
                    <text x={p.x} y={p.y + 3.05}
                      fill={isSelected ? "#ffd700" : "#c9a84c"}
                      fontSize="1.3"
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

      {/* ═══ TOOLTIP — always mounted; coords via ref so cursor tracking never re-renders the graph ═══ */}
      <NetworkTooltip
        elRef={tooltipElRef}
        text={tooltip?.text || ""}
        sub={tooltip?.sub}
      />
    </div>
  );
}
