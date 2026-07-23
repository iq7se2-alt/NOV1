"use client";

import { useSyncExternalStore, useState } from "react";
import { Bookmark, CheckCircle2, Clock, BookOpen, TrendingUp, Download, Upload } from "lucide-react";
import { toArabicDigits } from "@/lib/format";

// Types
type ReadingStats = {
  readChapters: number[];
  currentChapter: number | null;
  totalReadingTimeSec: number;
  lastReadAt: string | null;
};

const STORAGE_KEY = "reading-stats";

function loadStats(): ReadingStats {
  if (typeof window === "undefined") {
    return { readChapters: [], currentChapter: null, totalReadingTimeSec: 0, lastReadAt: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { readChapters: [], currentChapter: null, totalReadingTimeSec: 0, lastReadAt: null };
}

function saveStats(stats: ReadingStats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {}
}

/** Mark a chapter as read (called when user opens a chapter in the reader). */
export function markChapterRead(chapterNumber: number) {
  const stats = loadStats();
  if (!stats.readChapters.includes(chapterNumber)) {
    stats.readChapters.push(chapterNumber);
    stats.readChapters.sort((a, b) => a - b);
  }
  stats.currentChapter = chapterNumber;
  stats.lastReadAt = new Date().toISOString();
  saveStats(stats);
  emitStatsChange();
}

/** Add reading time (called periodically while the reader tab is visible). */
export function addReadingTime(seconds: number) {
  const stats = loadStats();
  stats.totalReadingTimeSec += seconds;
  saveStats(stats);
  // Don't emit on every tick (too frequent) — stats will refresh on focus/visibility
}

/** Hook: returns live reading stats that re-read on mount and on focus. */
const statsListeners = new Set<() => void>();
let cachedStats: ReadingStats | null = null;

function subscribeStats(cb: () => void) {
  statsListeners.add(cb);
  const onFocus = () => {
    cachedStats = null; // force re-read
    cb();
  };
  const onStorage = () => {
    cachedStats = null;
    cb();
  };
  window.addEventListener("focus", onFocus);
  window.addEventListener("storage", onStorage);
  return () => {
    statsListeners.delete(cb);
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("storage", onStorage);
  };
}
function getStatsSnapshot(): ReadingStats {
  if (!cachedStats) {
    cachedStats = loadStats();
  }
  return cachedStats;
}
function getStatsServerSnapshot(): ReadingStats {
  return { readChapters: [], currentChapter: null, totalReadingTimeSec: 0, lastReadAt: null };
}
function emitStatsChange() {
  cachedStats = null; // invalidate cache
  statsListeners.forEach((l) => l());
}

export function useReadingStats() {
  const stats = useSyncExternalStore(
    subscribeStats,
    getStatsSnapshot,
    getStatsServerSnapshot
  );
  return { stats, refresh: emitStatsChange };
}

/** Reading stats widget — shows on the home page. */
export function ReadingStatsWidget({
  totalChapters,
}: {
  totalChapters: number;
}) {
  const { stats } = useReadingStats();

  if (stats.readChapters.length === 0) return null;

  const readCount = stats.readChapters.length;
  const progress = totalChapters > 0 ? Math.round((readCount / totalChapters) * 100) : 0;
  const totalMinutes = Math.round(stats.totalReadingTimeSec / 60);
  const lastChapter = stats.currentChapter;

  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  function exportProgress() {
    const data: Record<string, unknown> = {};
    // Gather all localStorage progress keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("reading-") || key.startsWith("lord-of-truth") || key.startsWith("lot-") || key === "reader-font-family" || key === "reader-font-size" || key === "reader-highlight-chars" || key === "lastSeenChapterNumber")) {
        try { data[key] = JSON.parse(localStorage.getItem(key) || ""); } catch { data[key] = localStorage.getItem(key); }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `lot-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  }

  function importProgress() {
    try {
      const data = JSON.parse(importText);
      for (const [key, val] of Object.entries(data)) {
        localStorage.setItem(key, typeof val === "string" ? val : JSON.stringify(val));
      }
      emitStatsChange();
      setShowImport(false); setImportText("");
      alert("تم استيراد التقدم بنجاح! سيتم تحديث الصفحة.");
      window.location.reload();
    } catch { alert("ملف غير صالح. تأكد من صحة الملف."); }
  }

  return (
    <div className="gold-card rounded-lg p-6">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-gold" />
        <h2 className="font-naskh text-lg font-bold">تقدّم قراءتك</h2>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat
          icon={<CheckCircle2 className="h-4 w-4" />}
          value={toArabicDigits(readCount)}
          label={`من ${toArabicDigits(totalChapters)} فصل`}
        />
        <Stat
          icon={<Clock className="h-4 w-4" />}
          value={toArabicDigits(totalMinutes)}
          label="دقيقة قراءة"
        />
        <Stat
          icon={<BookOpen className="h-4 w-4" />}
          value={`${toArabicDigits(progress)}٪`}
          label="مكتمل"
        />
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gold/10">
          <div
            className="h-full rounded-full bg-gradient-to-l from-gold-soft via-gold to-gold/60 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Continue reading */}
      {lastChapter && (
        <div className="mt-4 flex items-center justify-between rounded-md border border-gold/20 bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-gold" />
            <span className="text-sm text-muted-foreground">
              آخر فصل قرأته:
            </span>
            <span className="font-naskh text-sm font-bold text-gold">
              الفصل {toArabicDigits(lastChapter)}
            </span>
          </div>
          <a
            href={`/chapters/${lastChapter}`}
            className="text-xs text-gold/70 hover:text-gold"
          >
            متابعة ←
          </a>
        </div>
      )}

      {/* Export / Import */}
      <div className="mt-4 flex items-center justify-end gap-2">
        <button onClick={exportProgress}
          className="inline-flex items-center gap-1 rounded border border-gold/20 px-2.5 py-1 text-[10px] text-gold/60 hover:border-gold/40 hover:text-gold transition-colors"
          title="تصدير تقدمك لحفظه">
          <Download className="h-3 w-3" /> تصدير
        </button>
        <button onClick={() => setShowImport(!showImport)}
          className="inline-flex items-center gap-1 rounded border border-gold/20 px-2.5 py-1 text-[10px] text-gold/60 hover:border-gold/40 hover:text-gold transition-colors"
          title="استيراد تقدمك من ملف">
          <Upload className="h-3 w-3" /> استيراد
        </button>
      </div>

      {showImport && (
        <div className="mt-3 rounded-md border border-gold/25 bg-muted/50 p-3 space-y-2">
          <p className="text-[10px] text-muted-foreground">الصق محتوى ملف التصدير هنا:</p>
          <textarea value={importText} onChange={e => setImportText(e.target.value)}
            className="w-full h-20 rounded border border-gold/20 bg-muted p-2 text-[11px] font-mono resize-y focus:border-gold/40 focus:outline-none"
            placeholder='{ "reading-stats": {...}, ... }' />
          <div className="flex gap-2">
            <button onClick={importProgress} disabled={!importText.trim()}
              className="flex-1 rounded bg-gold py-1.5 text-[11px] font-bold text-[#1a0a00] hover:bg-gold-soft transition-colors disabled:opacity-40">
              استيراد
            </button>
            <button onClick={() => { setShowImport(false); setImportText(""); }}
              className="rounded border border-gold/20 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-gold transition-colors">
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-md border border-gold/15 bg-muted/50 p-3 text-center">
      <div className="text-gold/60">{icon}</div>
      <div className="font-naskh text-xl font-bold text-gold-gradient">
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
