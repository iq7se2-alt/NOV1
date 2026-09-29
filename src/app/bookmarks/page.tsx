import { db } from "@/lib/db";
import { BookmarkX } from "lucide-react";
import { toArabicDigits } from "@/lib/format";
import { BookmarksClient } from "./bookmarks-client";
import { BookmarksPageHeader } from "@/components/site/bookmarks-page-header";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "المفضلة | سيد الحقيقة",
  description: "فصولك المفضلة من رواية سيد الحقيقة",
};

export default async function BookmarksPage() {
  const allChapters = await db.chapter.findMany({
    orderBy: { number: "desc" },
    select: { id: true, number: true, title: true, wordCount: true, createdAt: true },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <BookmarksPageHeader chapterCount={allChapters.length} />

      <BookmarksClient allChapters={allChapters.map(c => ({ ...c, createdAt: c.createdAt.toISOString() }))} />
    </div>
  );
}
