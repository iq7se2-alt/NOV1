import { db } from "@/lib/db";

/**
 * Server-side faction assignment: for every non-main character, find the
 * "main" character it co-appears with in the most chapters.
 * Cached by chapterCharacter row count (invalidates when data rebuilds).
 */

let cache: { key: number; map: Map<number, number> } | null = null;

export async function getFactionMap(): Promise<Map<number, number>> {
  const key = await db.chapterCharacter.count();
  if (cache && cache.key === key) return cache.map;

  const [mains, rows] = await Promise.all([
    db.character.findMany({ where: { isMain: true }, select: { id: true } }),
    db.chapterCharacter.findMany({
      select: { characterId: true, chapter: { select: { number: true } } },
    }),
  ]);

  const chaptersOf = new Map<number, Set<number>>();
  for (const r of rows) {
    let s = chaptersOf.get(r.characterId);
    if (!s) chaptersOf.set(r.characterId, (s = new Set()));
    s.add(r.chapter.number);
  }

  const mainIds = new Set(mains.map((m) => m.id));
  const map = new Map<number, number>();
  for (const [charId, chapSet] of chaptersOf) {
    if (mainIds.has(charId)) continue;
    let best: number | null = null;
    let bestScore = 0;
    for (const m of mains) {
      if (m.id === charId) continue;
      const ms = chaptersOf.get(m.id);
      if (!ms) continue;
      let score = 0;
      for (const ch of chapSet) if (ms.has(ch)) score++;
      if (score > bestScore) {
        bestScore = score;
        best = m.id;
      }
    }
    if (best !== null) map.set(charId, best);
  }

  cache = { key, map };
  return map;
}
