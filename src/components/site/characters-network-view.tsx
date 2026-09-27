"use client";

import { useState } from "react";
import { LayoutGrid, GitGraph, FileDown, Braces } from "lucide-react";
import { cn } from "@/lib/utils";
import { CharactersGrid } from "@/components/site/characters-grid";
import { CharacterNetworkGraph } from "@/components/site/character-network-graph";

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

type ViewMode = "grid" | "network";

/**
 * CharactersNetworkView — wrapper that toggles between:
 * - Grid view (بطاقات): card-based character browser with search
 * - Network view (الدائرة): interactive character relationship graph
 */
export function CharactersNetworkView({
  characters,
  relations,
  factions,
}: {
  characters: Character[];
  relations: Relation[];
  factions: Map<number, number>;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("network");

  return (
    <div>
      {/* ═══ VIEW TOGGLE + EXPORT ═══ */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
        <div className="inline-flex rounded-lg border border-gold/20 bg-muted/40 p-0.5">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium transition-all",
              viewMode === "grid"
                ? "bg-gold/20 text-gold shadow-sm"
                : "text-gold/50 hover:text-gold/80"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            بطاقات
          </button>
          <button
            onClick={() => setViewMode("network")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium transition-all",
              viewMode === "network"
                ? "bg-gold/20 text-gold shadow-sm"
                : "text-gold/50 hover:text-gold/80"
            )}
          >
            <GitGraph className="h-3.5 w-3.5" />
            دائرة العلاقات
          </button>
        </div>

        <a
          href="/api/character-relations?format=csv"
          className="flex items-center gap-1.5 rounded-lg border border-gold/20 bg-muted/40 px-3 py-2 text-xs text-gold/60 transition-colors hover:border-gold/40 hover:text-gold"
          title="تحميل كل العلاقات كملف CSV يفتح في Excel"
        >
          <FileDown className="h-3.5 w-3.5" />
          تصدير CSV
        </a>
        <a
          href="/api/character-relations?format=json"
          className="flex items-center gap-1.5 rounded-lg border border-gold/20 bg-muted/40 px-3 py-2 text-xs text-gold/60 transition-colors hover:border-gold/40 hover:text-gold"
          title="تحميل شبكة العلاقات كملف JSON"
        >
          <Braces className="h-3.5 w-3.5" />
          تصدير JSON
        </a>
      </div>

      {/* ═══ VIEW CONTENT ═══ */}
      {viewMode === "grid" ? (
        <CharactersGrid characters={characters} relations={relations} />
      ) : (
        <CharacterNetworkGraph
          characters={characters.map((c) => ({
            id: c.id,
            name: c.name,
            imageUrl: c.imageUrl,
            description: c.description,
            isMain: c.isMain,
            color: c.color,
            appearanceCount: c.appearanceCount,
            mentionCount: c.mentionCount || 0,
            chapters: [],
            factionId: c.isMain ? c.id : (factions.get(c.id) ?? null),
          }))}
          relations={relations.map((r) => ({
            id: r.id,
            fromId: r.fromId,
            toId: r.toId,
            type: r.type,
            description: r.description,
          }))}
        />
      )}
    </div>
  );
}
