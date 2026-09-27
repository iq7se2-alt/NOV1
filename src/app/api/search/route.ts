import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/** Normalise Arabic for matching: strip diacritics/tatweel, unify alef/ya/ta-marbuta */
function norm(s: string) {
  return s
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
    .replace(/\u0649/g, "\u064A")
    .replace(/\u0629/g, "\u0647")
    .toLowerCase()
    .trim();
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], total: 0, entities: [] });
  }

  // ── Entity suggestions: characters & locations whose name matches the query
  // (starts-with ranks above contains, and a longer mention count ranks first).
  const nq = norm(q);
  if (nq.length >= 2) {
    const [chars, locs] = await Promise.all([
      db.character.findMany({
        where: {
          OR: [{ name: { contains: q } }, { nameEn: { contains: q } }],
        },
        select: { id: true, name: true, nameEn: true, kind: true, mentionCount: true, imageUrl: true, firstChapter: true },
        take: 60,
        orderBy: { mentionCount: "desc" },
      }),
      db.location.findMany({
        where: { name: { contains: q } },
        select: { id: true, name: true, kind: true, mentionCount: true, startChapter: true },
        take: 20,
        orderBy: { mentionCount: "desc" },
      }),
    ]);

    const score = (name: string) => {
      const n = norm(name);
      if (n.startsWith(nq)) return 2;
      if (name.toLowerCase().startsWith(q.toLowerCase())) return 2;
      if (n.includes(nq)) return 1;
      return 0;
    };

    const entities = [
      ...chars
        .map((c) => ({ ...c, score: Math.max(score(c.name), score(c.nameEn || "")) }))
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score || b.mentionCount - a.mentionCount)
        .slice(0, 8)
        .map((c) => ({
          type: "character" as const,
          id: c.id,
          name: c.name,
          sub: c.nameEn,
          kind: c.kind,
          mentionCount: c.mentionCount,
          imageUrl: c.imageUrl,
          chapter: c.firstChapter,
        })),
      ...locs
        .map((l) => ({ ...l, score: score(l.name) }))
        .filter((l) => l.score > 0)
        .sort((a, b) => b.score - a.score || b.mentionCount - a.mentionCount)
        .slice(0, 4)
        .map((l) => ({
          type: "location" as const,
          id: l.id,
          name: l.name,
          sub: null,
          kind: l.kind,
          mentionCount: l.mentionCount,
          imageUrl: null,
          chapter: l.startChapter,
        })),
    ];

    if (req.nextUrl.searchParams.get("entitiesOnly") === "1") {
      return NextResponse.json({ entities, results: [], total: 0 });
    }
  } else {
    return NextResponse.json({ results: [], total: 0, entities: [] });
  }

  // Search across ALL chapters for the query
  const chapters = await db.chapter.findMany({
    select: { id: true, number: true, title: true, content: true },
    orderBy: { number: "asc" },
  });

  const results: Array<{
    chapterNumber: number;
    chapterTitle: string;
    chapterId: number;
    matches: Array<{ context: string; position: number }>;
    matchCount: number;
  }> = [];

  for (const ch of chapters) {
    const content = ch.content;
    const matches: Array<{ context: string; position: number }> = [];
    let idx = 0;

    while (true) {
      idx = content.indexOf(q, idx);
      if (idx === -1) break;

      // Extract surrounding context (±60 chars)
      const start = Math.max(0, idx - 60);
      const end = Math.min(content.length, idx + q.length + 60);
      let context = content.slice(start, end);
      if (start > 0) context = "…" + context;
      if (end < content.length) context = context + "…";

      matches.push({ context, position: idx });
      idx += q.length;
    }

    if (matches.length > 0) {
      results.push({
        chapterNumber: ch.number,
        chapterTitle: ch.title,
        chapterId: ch.id,
        matches: matches.slice(0, 50), // max 50 per chapter
        matchCount: matches.length,
      });
    }
  }

  return NextResponse.json({
    results,
    total: results.reduce((s, r) => s + r.matchCount, 0),
    chaptersFound: results.length,
  });
}
