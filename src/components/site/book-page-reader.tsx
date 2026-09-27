"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  Users,
  EyeOff,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toArabicDigits } from "@/lib/format";
import {
  processContentWithCharacters,
  type Character,
} from "@/lib/characters";
import { CommentsSection } from "@/components/site/comments-section";
import { cn } from "@/lib/utils";

type ReaderChapter = {
  id: number;
  number: number;
  title: string;
  content: string;
  wordCount: number;
  views: number;
  createdAt: string;
  coverImageUrl?: string | null;
};

type ChapterLink = { number: number; title: string } | null;

type FontFamilyKey = "naskh" | "cairo" | "amiri";
type FontSizeKey = "sm" | "md" | "lg";

const FONT_FAMILIES: Record<FontFamilyKey, string> = {
  naskh: "var(--font-naskh), serif",
  cairo: "var(--font-cairo), sans-serif",
  amiri: "var(--font-amiri), serif",
};
const FONT_SIZES: Record<FontSizeKey, string> = {
  sm: "18px",
  md: "20px",
  lg: "24px",
};

function CharacterMention({ character, name }: { character: Character | undefined; name: string }) {
  if (!character) return <span className="font-semibold text-gold">{name}</span>;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          data-char-id={character.id}
          className="inline-flex cursor-pointer font-semibold text-gold transition-colors hover:text-purple"
        >
          {name}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-64 border-gold/25 bg-popover p-0" align="center">
        {character.imageUrl ? (
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-md bg-black/30">
            <img
              src={character.imageUrl}
              alt={character.name}
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-t-md bg-accent">
            <span className="font-naskh text-4xl font-bold text-gold/40">{character.name.charAt(0)}</span>
          </div>
        )}
        <div className="p-3">
          <div className="flex items-center gap-2">
            <h3 className="font-naskh text-lg font-bold text-foreground">{character.name}</h3>
            {character.isMain && <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[10px] text-gold">رئيسي</span>}
          </div>
          {character.description && <p className="mt-2 text-sm leading-relaxed text-foreground/80">{character.description}</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ProcessedParagraph({
  text,
  index,
  characters,
}: {
  text: string;
  index: number;
  characters: Character[];
}) {
  const segments = useMemo(
    () => processContentWithCharacters(text, characters),
    [text, characters]
  );

  return (
    <p id={`para-${index}`}>
      {segments.map((seg, i) => {
        if (seg.type === "character") {
          const char = characters.find((c) => c.name === seg.name);
          return (
            <CharacterMention key={i} character={char} name={seg.name} />
          );
        }
        return <span key={i}>{seg.value}</span>;
      })}
    </p>
  );
}

/**
 * BookPageReader — clean book-themed reader with gold text.
 * Simple scrollable layout, no page flipping.
 */
export function BookPageReader({
  chapter,
  prev,
  next,
  characters = [],
}: {
  chapter: ReaderChapter;
  prev: ChapterLink;
  next: ChapterLink;
  characters?: Character[];
}) {
  const [showComments, setShowComments] = useState(true);
  const [highlightCharacters, setHighlightCharacters] = useState(true);
  const [fontFamily, setFontFamily] = useState<FontFamilyKey>("naskh");
  const [fontSize, setFontSize] = useState<FontSizeKey>("md");

  const paragraphs = chapter.content
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  // ══ JUMP TO FIRST WORD + NAME FLASH (3s) ══
  // Arriving via /chapters/<n>?char=<charId>#para-<p> from the character
  // page: scroll to that paragraph and make the character's name glow.
  // Without #para-<p>, the paragraph index is fetched from the appearances API.
  useEffect(() => {
    const hash = window.location.hash;
    const charId = new URLSearchParams(window.location.search).get("char");
    const paraMatch = hash.match(/^#para-(\d+)$/);
    if (!charId && !paraMatch) return;

    const flashAt = (paraIndex: string | null) => {
      let attempts = 0;
      const flash = () => {
        attempts++;
        const targetPara = paraIndex
          ? document.getElementById(`para-${paraIndex}`)
          : document.querySelector(".reader-prose [id^='para-']");
        if (!targetPara) {
          if (attempts < 30) setTimeout(flash, 150);
          return;
        }
        targetPara.scrollIntoView({ behavior: "smooth", block: "center" });

        if (charId) {
          const button = Array.from(
            targetPara.querySelectorAll("[data-char-id]")
          ).find((b) => b.getAttribute("data-char-id") === charId);
          if (button) {
            button.classList.add("char-flash");
            button.scrollIntoView({ behavior: "smooth", block: "center" });
            setTimeout(() => button.classList.remove("char-flash"), 3000);
          } else if (paraIndex) {
            targetPara.classList.add("ring-2", "ring-gold/50", "rounded");
            setTimeout(
              () =>
                targetPara.classList.remove("ring-2", "ring-gold/50", "rounded"),
              3000
            );
          } else {
            // char not in the first paragraph — search the whole chapter
            const all = document.querySelectorAll("[data-char-id]");
            const hit = Array.from(all).find(
              (b) => b.getAttribute("data-char-id") === charId
            );
            if (hit) {
              hit.classList.add("char-flash");
              hit.scrollIntoView({ behavior: "smooth", block: "center" });
              setTimeout(() => hit.classList.remove("char-flash"), 3000);
            } else if (paraMatch) {
              targetPara.classList.add("ring-2", "ring-gold/50", "rounded");
              setTimeout(
                () =>
                  targetPara.classList.remove("ring-2", "ring-gold/50", "rounded"),
                3000
              );
            }
          }
        } else if (paraMatch) {
          targetPara.classList.add("ring-2", "ring-gold/50", "rounded");
          setTimeout(
            () =>
              targetPara.classList.remove("ring-2", "ring-gold/50", "rounded"),
            3000
          );
        }
      };
      setTimeout(flash, 120);
    };

    if (paraMatch) {
      flashAt(paraMatch[1]);
    } else if (charId) {
      fetch(`/api/characters/${charId}/appearances`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const hit = d?.chapters?.find(
            (c: { number: number }) => c.number === chapter.number
          );
          flashAt(hit ? String(hit.para) : null);
        })
        .catch(() => flashAt(null));
    }
  }, [chapter.number]);

  return (
    <article className="mx-auto max-w-3xl px-4 pt-14 pb-10 sm:px-6">
      {/* Header */}
      <header className="mb-8 text-center">
        <div className="mb-2 inline-flex items-center gap-2 text-xs text-gold/70">
          <span className="h-px w-8 bg-gold/40" />
          الفصل {toArabicDigits(chapter.number)}
          <span className="h-px w-8 bg-gold/40" />
        </div>
        <h1 className="font-naskh text-4xl font-bold text-gold-gradient sm:text-5xl" style={{ fontFamily: FONT_FAMILIES[fontFamily] }}>
          {chapter.title}
        </h1>
      </header>

      {/* Content */}
      <div
        className="reader-prose"
        style={{ fontFamily: FONT_FAMILIES[fontFamily], fontSize: FONT_SIZES[fontSize], lineHeight: "2.5" }}
      >
        {paragraphs.map((p, i) =>
          highlightCharacters ? (
            <ProcessedParagraph
              key={i}
              text={p}
              index={i}
              characters={characters}
            />
          ) : (
            <p key={i}>{p}</p>
          )
        )}
      </div>

      {/* End divider */}
      <div className="my-10 text-center">
        <div className="gold-divider mb-4" />
        <p className="font-naskh text-sm text-gold/60">انتهى الفصل</p>
      </div>

      {/* Chapter navigation */}
      <nav className="mx-auto grid max-w-3xl grid-cols-2 gap-4 px-4 sm:px-6">
        {prev ? (
          <Link href={`/chapters/${prev.number}`} className="gold-card flex items-center justify-between rounded-lg p-4">
            <ChevronRight className="h-5 w-5 shrink-0 text-gold/70" />
            <div className="min-w-0 flex-1 text-center">
              <p className="font-naskh text-xs text-gold/50">الفصل {toArabicDigits(prev.number)}</p>
              <p className="mt-0.5 truncate font-naskh text-sm text-foreground">{prev.title || `الفصل ${toArabicDigits(prev.number)}`}</p>
            </div>
            <div className="h-5 w-5 shrink-0" />
          </Link>
        ) : <div />}
        {next ? (
          <Link href={`/chapters/${next.number}`} className="gold-card flex items-center justify-between rounded-lg p-4">
            <div className="h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1 text-center">
              <p className="font-naskh text-xs text-gold/50">الفصل {toArabicDigits(next.number)}</p>
              <p className="mt-0.5 truncate font-naskh text-sm text-foreground">{next.title || `الفصل ${toArabicDigits(next.number)}`}</p>
            </div>
            <ChevronLeft className="h-5 w-5 shrink-0 text-gold/70" />
          </Link>
        ) : <div />}
      </nav>

      {/* Comments */}
      <div className="mt-6 flex flex-col items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowComments(!showComments)}
          className="border-gold/25 text-gold/70 hover:border-gold/50 hover:text-gold"
        >
          التعليقات {showComments ? "▲" : "▼"}
        </Button>
        {showComments && <CommentsSection chapterNumber={chapter.number} />}

        <Link href="/chapters">
          <Button variant="outline" size="sm" className="border-gold/25 text-gold/70 hover:border-gold/50 hover:text-gold">
            <ListOrdered className="ml-1.5 h-4 w-4" />
            الفهرس
          </Button>
        </Link>
      </div>

      {/* Floating settings button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gold/40 bg-background shadow-lg shadow-gold/10 transition-all hover:border-gold hover:shadow-gold/20">
              <Settings className="h-5 w-5 text-gold" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" side="top" className="w-56 border-gold/25 bg-popover p-3">
            <div className="mb-2 text-xs font-bold text-gold">نوع الخط</div>
            <div className="mb-3 flex gap-1">
              {(["naskh", "cairo", "amiri"] as FontFamilyKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setFontFamily(k)}
                  className={cn(
                    "flex-1 rounded px-2 py-1.5 text-xs transition-colors",
                    fontFamily === k
                      ? "bg-gold/20 text-gold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  style={{ fontFamily: FONT_FAMILIES[k] }}
                >
                  {k === "naskh" ? "ن" : k === "cairo" ? "ق" : "أ"}
                </button>
              ))}
            </div>
            <div className="mb-2 text-xs font-bold text-gold">حجم الخط</div>
            <div className="mb-3 flex gap-1">
              {(["sm", "md", "lg"] as FontSizeKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setFontSize(k)}
                  className={cn(
                    "flex-1 rounded px-2 py-1.5 text-xs transition-colors",
                    fontSize === k
                      ? "bg-gold/20 text-gold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {k === "sm" ? "صغير" : k === "md" ? "متوسط" : "كبير"}
                </button>
              ))}
            </div>
            {characters.length > 0 && (
              <>
                <div className="mb-2 border-t border-gold/15 pt-2 text-xs font-bold text-gold">الشخصيات</div>
                <button
                  onClick={() => setHighlightCharacters(!highlightCharacters)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors",
                    highlightCharacters
                      ? "bg-gold/20 text-gold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {highlightCharacters ? (
                    <>
                      <Users className="h-3.5 w-3.5" />
                      إخفاء أسماء الشخصيات
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      إظهار أسماء الشخصيات
                    </>
                  )}
                </button>
              </>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </article>
  );
}
