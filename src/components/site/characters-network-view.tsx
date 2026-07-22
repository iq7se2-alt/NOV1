"use client";

import { useState } from "react";
import { LayoutGrid, GitGraph } from "lucide-react";
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
  appearanceCount: number;
  chapters: number[];
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
}: {
  characters: Character[];
  relations: Relation[];
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  return (
    <div>
      {/* ═══ VIEW TOGGLE ═══ */}
      <div className="mb-6 flex items-center justify-center gap-2">
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
            isMain: c.isMain,
            color: c.color,
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
