import { db } from "@/lib/db";
import { BookmarkX } from "lucide-react";
import { toArabicDigits } from "@/lib/format";
import { BookmarksClient } from "./bookmarks-client";

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
      <div className="mb-10 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/25 px-4 py-1 text-xs text-gold/80">
          <BookmarkX className="h-3.5 w-3.5" />
          فصولك المميزة
        </div>
        <h1 className="font-naskh text-4xl font-bold text-gold-gradient sm:text-5xl">
          المفضلة
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {toArabicDigits(allChapters.length)} فصل متاح للإضافة للمفضلة
        </p>
      </div>

      <BookmarksClient allChapters={allChapters} />
    </div>
  );
}
