import { db } from "@/lib/db";
import { toArabicDigits } from "@/lib/format";
import { MilestoneClient, TimelinePageHeader } from "@/components/site/milestone-timeline";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "الخط الزمني | سيد الحقيقة",
  description: "الخط الزمني للرواية: متى ظهرت كل شخصية ومكان",
};

const BUCKET = 50;

type Milestone = {
  chapter: number;
  kind: "character" | "location";
  name: string;
  imageUrl: string | null;
  meta: string;
};

export default async function TimelinePage() {
  const [chapters, mains, locations] = await Promise.all([
    db.chapter.findMany({ orderBy: { number: "asc" }, select: { number: true, wordCount: true } }),
    db.character.findMany({
      where: { isMain: true },
      orderBy: { mentionCount: "desc" },
      select: { name: true, imageUrl: true, firstChapter: true, mentionCount: true },
    }),
    db.location.findMany({
      orderBy: { startChapter: "asc" },
      select: { name: true, startChapter: true, mentionCount: true, kind: true },
    }),
  ]);

  // ── per-bucket data: new characters, new locations, total words ────────────
  const buckets = new Map<number, { chapter: number; chars: number; newLocs: number; words: number }>();
  const ensure = (n: number) => {
    const b = Math.floor(n / BUCKET) * BUCKET;
    if (!buckets.has(b)) buckets.set(b, { chapter: b, chars: 0, newLocs: 0, words: 0 });
    return buckets.get(b)!;
  };
  for (const c of chapters) ensure(c.number).words += c.wordCount ?? 0;

  const milestones: Milestone[] = [
    ...mains
      .filter((m) => m.firstChapter != null)
      .map((m) => {
        ensure(m.firstChapter!).chars++;
        return {
          chapter: m.firstChapter!,
          kind: "character" as const,
          name: m.name,
          imageUrl: m.imageUrl,
          meta: String(m.mentionCount), // count only; unit rendered client-side
        };
      }),
    ...locations
      .filter((l) => l.startChapter != null)
      .map((l) => {
        ensure(l.startChapter).newLocs++;
        return {
          chapter: l.startChapter,
          kind: "location" as const,
          name: l.name,
          imageUrl: null,
          meta: "",
        };
      }),
  ].sort((a, b) => a.chapter - b.chapter);

  const chart = [...buckets.values()].sort((a, b) => a.chapter - b.chapter);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <TimelinePageHeader eventCount={milestones.length} bucket={BUCKET} />

      <MilestoneClient data={chart} milestones={milestones} />
    </div>
  );
}
