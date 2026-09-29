import { db } from "@/lib/db";
import { Users } from "lucide-react";
import { toArabicDigits } from "@/lib/format";
import { CharactersNetworkView } from "@/components/site/characters-network-view";
import { CharactersPageHeader, CharactersEmptyState } from "@/components/site/characters-page-header";
import { getFactionMap } from "@/lib/factions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "الشخصيات | سيد الحقيقة",
  description: "تعرف على شخصيات رواية سيد الحقيقة وعلاقاتهم",
};

export default async function CharactersPage() {
  // Light query: characters + relations only. Appearance chapters load
  // on demand via /api/characters/[id]/appearances when a card opens.
  const [characters, relations, factions] = await Promise.all([
    db.character.findMany({
      orderBy: [{ mentionCount: "desc" }, { isMain: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        nameEn: true,
        description: true,
        imageUrl: true,
        color: true,
        isMain: true,
        kind: true,
        mentionCount: true,
        chapterCount: true,
        firstChapter: true,
      },
    }),
    db.characterRelation.findMany({
      select: {
        id: true,
        fromId: true,
        toId: true,
        type: true,
        description: true,
        from: { select: { name: true } },
        to: { select: { name: true } },
      },
    }),
    getFactionMap(),
  ]);

  // Show ALL characters sorted by real mention count
  const visibleCharacters = characters;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      {/* ═══ HEADER ═══ */}
      <CharactersPageHeader characterCount={visibleCharacters.length} relationCount={relations.length} />

      {visibleCharacters.length === 0 ? (
        <CharactersEmptyState />
      ) : (
        <CharactersNetworkView
          characters={visibleCharacters.map((c) => ({
            ...c,
            appearanceCount: c.chapterCount || 0,
            chapters: [],
            chapterParas: {},
          }))}
          factions={factions}
          relations={relations.map((r) => ({
            id: r.id,
            fromId: r.fromId,
            toId: r.toId,
            type: r.type,
            description: r.description,
            fromName: r.from.name,
            toName: r.to.name,
          }))}
        />
      )}
    </div>
  );
}
