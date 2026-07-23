"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { toArabicDigits, formatTimeAgo } from "@/lib/format";

type ParaComment = {
  id: number;
  chapterId: number;
  paragraphIndex: number;
  author: string;
  content: string;
  createdAt: string;
};

export function ParagraphComments({
  chapterId,
  paragraphIndex,
  paragraphText,
}: {
  chapterId: number;
  paragraphIndex: number;
  paragraphText: string;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<ParaComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chapters/${chapterId}/paragraph-comments?pi=${paragraphIndex}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch {} finally { setLoading(false); }
  }, [chapterId, paragraphIndex]);

  useEffect(() => { if (open) loadComments(); }, [open, loadComments]);

  async function submit() {
    if (!author.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/chapters/${chapterId}/paragraph-comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: author.trim(), content: content.trim(), paragraphIndex }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => [data.comment, ...prev]);
        setAuthor(""); setContent("");
        toast({ title: "تم", description: "تم نشر تعليقك" });
      }
    } catch {} finally { setSubmitting(false); }
  }

  const preview = paragraphText.slice(0, 60) + (paragraphText.length > 60 ? "…" : "");

  return (
    <span className="relative inline">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "ml-1 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] transition-all opacity-0 group-hover:opacity-100",
          open ? "opacity-100 bg-gold/15 text-gold" : "text-gold/40 hover:text-gold hover:bg-gold/10"
        )}
        title="تعليق على هذه الفقرة"
      >
        <MessageCircle className="h-2.5 w-2.5" />
        {comments.length > 0 && <span>{toArabicDigits(comments.length)}</span>}
      </button>

      {open && (
        <div ref={ref} className="absolute right-0 top-full z-30 mt-2 w-80 rounded-xl border border-gold/25 bg-popover shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gold/15 px-3 py-2">
            <span className="text-xs font-bold text-gold truncate max-w-[85%]">«{preview}»</span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-gold"><X className="h-3.5 w-3.5" /></button>
          </div>

          {/* Comments list */}
          <div className="max-h-60 overflow-y-auto px-3 py-2 space-y-2">
            {loading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-gold/40" /></div>
            ) : comments.length === 0 ? (
              <p className="text-center text-[10px] text-muted-foreground py-2">لا تعليقات بعد</p>
            ) : (
              comments.map(c => (
                <div key={c.id} className="rounded-lg border border-gold/10 bg-muted/30 p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gold">{c.author}</span>
                    <span className="text-[8px] text-muted-foreground">{formatTimeAgo(c.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-foreground/80 whitespace-pre-wrap">{c.content}</p>
                </div>
              ))
            )}
          </div>

          {/* Form */}
          <div className="border-t border-gold/15 p-2 space-y-1.5">
            <input value={author} onChange={e => setAuthor(e.target.value)}
              placeholder="اسمك" maxLength={30}
              className="w-full rounded border border-gold/20 bg-muted px-2 py-1 text-[11px] font-naskh focus:border-gold/40 focus:outline-none" />
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder="تعليقك على هذه الفقرة..." maxLength={500} rows={2}
              className="w-full rounded border border-gold/20 bg-muted px-2 py-1 text-[11px] font-naskh resize-none focus:border-gold/40 focus:outline-none" />
            <button onClick={submit} disabled={!author.trim() || !content.trim() || submitting}
              className="flex w-full items-center justify-center gap-1 rounded bg-gold py-1.5 text-[11px] font-bold text-[#1a0a00] hover:bg-gold-soft transition-colors disabled:opacity-40">
              {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              نشر
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
