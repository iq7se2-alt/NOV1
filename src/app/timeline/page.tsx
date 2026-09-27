import { db } from "@/lib/db";
import { MilestoneTimeline, MilestoneList } from "@/components/site/milestone-timeline";
import { toArabicDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "الخط الزمني | سيد الحقيقة",
  description: "الخط الزمني للرواية: متى ظهرت كل شخصية ومكان",
};

const BUCKET = 50; // chapters per bucket

export default async function TimelinePage() {
  const [chapters, mains, locations] = await Promise.all([
    db.chapter.findMany({
      orderBy: { number: "asc" },
      select: { number: true, title: true, wordCount: true, _count: { select: { comments: true } } },
    }),
    db.character.findMany({
      where: { isMain: true },
      orderBy: { mentionCount: "desc" },
      select: { id: true, name: true, imageUrl: true, firstChapter: true, mentionCount: true, kind: true },
    }),
    db.location.findMany({
      orderBy: { startChapter: "asc" },
      select: { id: true, name: true, startChapter: true, mentionCount: true, kind: true },
    }),
  ]);

  const maxChapter = chapters.length ? chapters[Math.floor(chapters.length / 2)].number : 1;

  // per-bucket: how many distinct characters appear, how many new locations
  const buckets = new Map<number, { chapter: number; chars: number; newLocs: number; words: number }>();
  for (let i = 0; i < chapters.length; i++) {
    const n = chapters[i].number;
    const b = Math.floor(n / BUCKET) * BUCKET;
    if (!buckets.has(b)) buckets.set(b, { chapter: b, chars: 0, newLocs: 0, words: 0 });
    const row = buckets.get(b)!;
    row.chars = Math.max(row.chars, 0);
    row.words += chapters[i].wordCount ?? 0;
  }
  for (const l of locations) {
    const b = Math.floor((l.startChapter ?? 1) / BUCKET) * BUCKET;
    const row = buckets.get(b);
    if (row) row.newLocs++;
  }

  // character density per bucket from ChapterCharacter (distinct characters)
  const densities = await db.chapterCharacter.findMany({
    select: { chapterId: true, characterId: true },
  });
  const chapterIdToNumber = new Map<number, number>();
  {
    const rows = await db.chapter.findMany({ select: { id: true, number: true } });
    for (const r of rows) chapterIdToNumber.set(r.id, r.number);
  }
  const perBucketChars = new Map<number, Set<number>>();
  for (const d of densities) {
    const num = chapterIdToNumber.get(d.chapterId);
    if (num == null) continue;
    const b = Math.floor(num / BUCKET) * BUCKET;
    if (!perBucketChars.has(b)) perBucketChars.set(b, new Set());
    perBucketChars.get(b)!.add(d.characterId);
  }
  const chart = [...buckets.values()]
    .map((b) => ({ ...b, chars: perBucketChars.get(b.chapter)?.size ?? 0 }))
    .sort((a, b) => a.chapter - b.chapter);

  // milestones: first appearance of every main character + every location
  const milestones = [
    ...mains
      .filter((m) => m.firstChapter != null)
      .map((m) => ({
        chapter: m.firstChapter!,
        kind: "character" as const,
        name: m.name,
        imageUrl: m.imageUrl,
        meta: `${toArabicDigits(m.mentionCount)} ذكر`,
      })),
    ...locations
      .filter((l) => l.startChapter != null)
      .map((l) => ({
        chapter: l.startChapter,
        kind: "location" as const,
        name: l.name,
        imageUrl: null,
        meta: l.kind === "place" ? "مكان" : l.kind ?? "",
      })),
  ].sort((a, b) => a.chapter - b.chapter);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-10 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/25 px-4 py-1 text-xs text-gold/80">
          خط زمني
        </div>
        <h1 className="font-naskh text-4xl font-bold text-gold-gradient sm:text-5xl">الخط الزمني للرواية</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {toArabicDigits(milestones.length)} حدث · كل فصل {toArabicDigits(BUCKET)} فصلاً
        </p>
      </div>

      <MilestoneTimeline data={chart} />

      <section className="mt-10">
        <h2 className="mb-4 font-naskh text-lg font-bold text-gold">أول ظهور لكل شخصية ومكان</h2>
        <MilestoneList milestones={milestones} />
      </section>
    </div>
  );
}
