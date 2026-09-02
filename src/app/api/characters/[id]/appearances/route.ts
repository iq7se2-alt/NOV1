import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/characters/[id]/appearances
// Returns the chapters a character/loc appears in with first-mention paragraph index.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const charId = Number(id);
  if (!Number.isFinite(charId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const rows = await db.chapterCharacter.findMany({
    where: { characterId: charId },
    select: { paragraphIndex: true, chapter: { select: { number: true } } },
    orderBy: { chapterId: "asc" },
  });

  // chapter number → smallest paragraph index (first mention)
  const paraByChapter = new Map<number, number>();
  for (const r of rows) {
    const n = r.chapter.number;
    const prev = paraByChapter.get(n);
    if (prev === undefined || r.paragraphIndex < prev) {
      paraByChapter.set(n, r.paragraphIndex);
    }
  }
  const chapters = [...paraByChapter.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([number, para]) => ({ number, para }));

  return NextResponse.json(
    { count: chapters.length, chapters },
    { headers: { "Cache-Control": "public, max-age=600" } }
  );
}
