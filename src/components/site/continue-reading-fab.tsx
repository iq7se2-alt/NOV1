"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "reading-stats";

/**
 * Floating "Continue Reading" button — appears at bottom-left
 * when user has a last-read chapter, hidden on chapter pages.
 */
export function ContinueReadingFab() {
  const [lastChapter, setLastChapter] = useState<number | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Don't show on chapter pages
    if (window.location.pathname.startsWith("/chapters/")) {
      setLastChapter(null);
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stats = JSON.parse(raw);
        if (stats.currentChapter && stats.currentChapter > 0) {
          setLastChapter(stats.currentChapter);
        }
      }
    } catch {}
  }, []);

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    let lastY = 0;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastY + 5 && y > 200) setHidden(true);
      else if (y < lastY - 5) setHidden(false);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!lastChapter) return null;

  return (
    <Link
      href={`/chapters/${lastChapter}`}
      className={cn(
        "fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-full border border-gold/40 bg-background/90 px-4 py-3 shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-gold hover:shadow-gold/20",
        hidden ? "translate-y-24 opacity-0" : "translate-y-0 opacity-100"
      )}
      title="كمل قراءة من حيث توقفت"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
        <BookOpen className="h-4 w-4 text-gold" />
      </span>
      <span className="flex items-center gap-1 text-sm font-naskh text-gold">
        كمل قراءة
        <ArrowLeft className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}
