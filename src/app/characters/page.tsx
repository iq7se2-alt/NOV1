import { db } from "@/lib/db";
import { Users } from "lucide-react";
import { toArabicDigits } from "@/lib/format";
import { CharactersNetworkView } from "@/components/site/characters-network-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "الشخصيات | سيد الحقيقة",
  description: "تعرف على شخصيات رواية سيد الحقيقة وعلاقاتهم",
};

export default async function CharactersPage() {
  // Light query: characters + relations only. Appearance chapters load
  // on demand via /api/characters/[id]/appearances when a card opens.
  const [characters, relations] = await Promise.all([
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
  ]);

  // Show ALL characters sorted by real mention count
  const visibleCharacters = characters;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      {/* ═══ HEADER ═══ */}
      <div className="mb-10 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/25 px-4 py-1 text-xs text-gold/80">
          <Users className="h-3.5 w-3.5" />
          شخصيات وعلاقات الرواية
        </div>
        <h1 className="font-naskh text-4xl font-bold text-gold-gradient sm:text-5xl">
          لوحة الشخصيات
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {visibleCharacters.length > 0 ? (
            <>
              <span className="font-bold text-gold">
                {toArabicDigits(visibleCharacters.length)}
              </span>{" "}
              كيان ·{" "}
              <span className="font-bold text-gold">
                {toArabicDigits(relations.length)}
              </span>{" "}
              علاقة · مرتّبة بعدد الذكر
            </>
          ) : (
            "لم تُضف شخصيات بعد"
          )}
        </p>
      </div>

      {visibleCharacters.length === 0 ? (
        <div className="gold-card rounded-lg p-12 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-gold/30" />
          <p className="font-naskh text-lg text-muted-foreground">
            لا توجد شخصيات بعد.
          </p>
        </div>
      ) : (
        <CharactersNetworkView
          characters={visibleCharacters.map((c) => ({
            ...c,
            appearanceCount: c.chapterCount || 0,
            chapters: [],
            chapterParas: {},
          }))}
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
