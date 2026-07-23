"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, Trash2, Download, Hash, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toArabicDigits, formatArabicDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type ChapterItem = {
  id: number; number: number; title: string; wordCount: number; createdAt: string;
};

const STORAGE_KEY = "lot-bookmarks";

function getBookmarks(): number[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveBookmarks(ids: number[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function BookmarksClient({ allChapters }: { allChapters: ChapterItem[] }) {
  const [bookmarkIds, setBookmarkIds] = useState<number[]>([]);
  const [q, setQ] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setBookmarkIds(getBookmarks()); setMounted(true); }, []);

  const toggle = (num: number) => {
    setBookmarkIds(prev => {
      const next = prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num];
      saveBookmarks(next);
      return next;
    });
  };
  const clearAll = () => { setBookmarkIds([]); saveBookmarks([]); };

  // All bookmarked chapters (sorted by chapter number desc)
  const bookmarked = allChapters
    .filter(ch => bookmarkIds.includes(ch.number))
    .sort((a, b) => b.number - a.number);

  // Filter by search
  const filtered = q.trim()
    ? bookmarked.filter(ch => ch.title.includes(q.trim()) || String(ch.number).includes(q.trim()))
    : bookmarked;

  // All chapters NOT bookmarked (for the "add" section)
  const notBookmarked = allChapters
    .filter(ch => !bookmarkIds.includes(ch.number))
    .sort((a, b) => b.number - a.number);
  const filteredNotBookmarked = q.trim()
    ? notBookmarked.filter(ch => ch.title.includes(q.trim()) || String(ch.number).includes(q.trim()))
    : [];

  if (!mounted) return <div className="text-center text-muted-foreground py-20">جار التحميل…</div>;

  return (
    <div>
      {/* Search */}
      <div className="mb-6 flex gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/50" />
          <Input value={q} onChange={e => setQ(e.target.value)}
            placeholder="ابحث عن فصل لإضافته للمفضلة..."
            className="border-gold/25 bg-muted pr-10 font-naskh" />
          {q && <button onClick={() => setQ("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gold"><X className="h-3.5 w-3.5" /></button>}
        </div>
      </div>

      {/* Bookmarked chapters */}
      {bookmarkIds.length === 0 && !q.trim() ? (
        <div className="gold-card rounded-lg p-12 text-center">
          <Bookmark className="mx-auto mb-4 h-12 w-12 text-gold/30" />
          <p className="font-naskh text-lg text-muted-foreground">لا توجد فصول في المفضلة بعد</p>
          <p className="mt-2 text-sm text-muted-foreground/70">ابحث عن فصل وأضفه للمفضلة</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              <span className="font-bold text-gold">{toArabicDigits(bookmarkIds.length)}</span> فصل في المفضلة
            </span>
            <button onClick={clearAll} className="flex items-center gap-1 text-xs text-red-400/70 hover:text-red-400 transition-colors">
              <Trash2 className="h-3 w-3" /> حذف الكل
            </button>
          </div>
          <div className="space-y-2">
            {filtered.map(ch => (
              <div key={ch.number} className="gold-card group flex items-center gap-3 rounded-lg p-3 transition-all">
                <button onClick={() => toggle(ch.number)} className="shrink-0 text-gold hover:text-gold-soft transition-colors" title="إزالة من المفضلة">
                  <BookmarkCheck className="h-5 w-5 fill-gold" />
                </button>
                <Link href={`/chapters/${ch.number}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gold/30 bg-muted/70 font-mono text-sm font-bold text-gold">
                    {toArabicDigits(ch.number)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-naskh text-sm font-bold text-foreground group-hover:text-gold transition-colors">{ch.title}</h3>
                    <div className="mt-0.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Hash className="h-2.5 w-2.5" />{toArabicDigits(ch.wordCount)} كلمة</span>
                      <span>{formatArabicDate(ch.createdAt)}</span>
                    </div>
                  </div>
                </Link>
                <button onClick={() => window.open(`/print/${ch.number}`, "_blank")}
                  className="shrink-0 rounded p-1.5 text-gold/50 hover:text-gold hover:bg-gold/10 transition-colors" title="PDF">
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Search results: chapters to add */}
      {q.trim() && filteredNotBookmarked.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 font-naskh text-lg font-bold text-gold/80">أضف للمفضلة</h2>
          <div className="space-y-2">
            {filteredNotBookmarked.slice(0, 30).map(ch => (
              <div key={ch.number} className="gold-card flex items-center gap-3 rounded-lg p-3 transition-all opacity-60 hover:opacity-100">
                <button onClick={() => toggle(ch.number)} className="shrink-0 text-gold/50 hover:text-gold transition-colors" title="إضافة للمفضلة">
                  <Bookmark className="h-5 w-5" />
                </button>
                <Link href={`/chapters/${ch.number}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gold/20 bg-muted/70 font-mono text-sm font-bold text-gold/70">
                    {toArabicDigits(ch.number)}
                  </div>
                  <h3 className="truncate font-naskh text-sm text-foreground/80">{ch.title}</h3>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
