"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Search, X, Loader2, Hash, BookOpen, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toArabicDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

type MatchResult = {
  chapterNumber: number;
  chapterTitle: string;
  chapterId: number;
  matches: Array<{ context: string }>;
  matchCount: number;
};

export function SearchClient() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<MatchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async () => {
    if (q.trim().length < 2) return;
    setLoading(true); setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResults(data.results || []);
      setTotal(data.total || 0);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, [q]);

  function highlightContext(context: string, query: string) {
    const idx = context.indexOf(query);
    if (idx === -1) return context;
    return (
      <>
        {context.slice(0, idx)}
        <mark className="rounded bg-gold/30 px-0.5 text-gold font-bold">{query}</mark>
        {context.slice(idx + query.length)}
      </>
    );
  }

  return (
    <div>
      <form onSubmit={e => { e.preventDefault(); doSearch(); }} className="mb-8">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/50" />
            <Input value={q} onChange={e => setQ(e.target.value)}
              placeholder="ابحث عن كلمة أو جملة في كل الفصول..."
              className="border-gold/25 bg-muted pr-10 font-naskh text-sm h-11"
              autoFocus />
            {q && (
              <button type="button" onClick={() => { setQ(""); setResults([]); setSearched(false); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gold">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button type="submit" disabled={loading || q.trim().length < 2}
            className="shrink-0 flex items-center gap-2 rounded-lg bg-gold px-6 py-2 text-sm font-bold text-[#1a0a00] hover:bg-gold-soft transition-colors disabled:opacity-40">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            بحث
          </button>
        </div>
      </form>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gold/60" />
          <p className="text-sm text-muted-foreground">جار البحث في {toArabicDigits(2354)} فصل...</p>
        </div>
      )}

      {!loading && searched && total === 0 && (
        <div className="gold-card rounded-lg p-12 text-center">
          <Search className="mx-auto mb-4 h-12 w-12 text-gold/30" />
          <p className="font-naskh text-lg text-muted-foreground">لا توجد نتائج</p>
          <p className="mt-1 text-sm text-muted-foreground/70">جرّب كلمة أخرى</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <div className="mb-6 text-sm text-muted-foreground text-center">
            <span className="font-bold text-gold">{toArabicDigits(total)}</span> نتيجة في{" "}
            <span className="font-bold text-gold">{toArabicDigits(results.length)}</span> فصل
          </div>

          <div className="space-y-4">
            {results.map(ch => (
              <div key={ch.chapterId} className="gold-card rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <Link href={`/chapters/${ch.chapterNumber}`}
                    className="flex items-center gap-3 group/link">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gold/30 bg-muted/70 font-mono text-sm font-bold text-gold">
                      {toArabicDigits(ch.chapterNumber)}
                    </div>
                    <div>
                      <h3 className="font-naskh text-base font-bold text-foreground group-hover/link:text-gold transition-colors">
                        {ch.chapterTitle}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                        <Hash className="h-2.5 w-2.5" />
                        {toArabicDigits(ch.matchCount)} نتيجة
                      </div>
                    </div>
                  </Link>
                  <Link href={`/chapters/${ch.chapterNumber}`}
                    className="shrink-0 flex items-center gap-1 text-xs text-gold/60 hover:text-gold transition-colors">
                    <BookOpen className="h-3.5 w-3.5" />
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Match contexts */}
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {ch.matches.slice(0, 10).map((m, i) => (
                    <div key={i} className="rounded-md border border-gold/10 bg-muted/30 p-2.5">
                      <p className="text-[12px] leading-relaxed text-foreground/70 font-naskh text-justify">
                        {highlightContext(m.context, q.trim())}
                      </p>
                    </div>
                  ))}
                  {ch.matchCount > 10 && (
                    <p className="text-center text-[10px] text-muted-foreground/60 py-1">
                      + {toArabicDigits(ch.matchCount - 10)} نتيجة أخرى في هذا الفصل
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!searched && (
        <div className="gold-card rounded-lg p-12 text-center">
          <Search className="mx-auto mb-4 h-12 w-12 text-gold/30" />
          <p className="font-naskh text-lg text-muted-foreground">اكتب كلمة للبحث عنها في جميع الفصول</p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            مثال: روبين، قيصر، الطاقة، المعركة...
          </p>
        </div>
      )}
    </div>
  );
}
