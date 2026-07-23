import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], total: 0 });
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
