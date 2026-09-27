"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Waves, Sparkles, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

type FloatingWord = {
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number;
  burst?: number; // burst animation timer
};

// Sample of distinctive words from the novel
const NOVEL_WORDS = [
  "القانون", "الطاقة", "المستوى", "العبقري", "القديس", "الدوق", "الإمبراطور",
  "روبين", "قيصر", "المستبصر", "بيلي", "آرو", "ريتشارد", "زافاروس",
  "بورتون", "ألتون", "الشمس السوداء", "دوليفار", "إيفرين", "المارشال",
  "السيادة", "الحقيقة", "القانون الإلهي", "المسار", "الروح", "الفضاء",
  "الضوء", "النار", "الظل", "الكون", "القدر", "الحكمة", "القوة",
  "المعركة", "الأنهار", "الأكاديمية", "القطاع", "البوابة", "القبيلة",
  "المملكة", "الدوقية", "العائلة", "الموهبة", "الذكاء", "العبقرية",
  "الموت", "الحياة", "الزمن", "الأبدية", "السلطان", "النبوة"
];

const WORD_OCEAN_THEME_CLASS = "theme-word-ocean";

export function WordOceanCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordsRef = useRef<FloatingWord[]>([]);
  const animationRef = useRef<number>(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const [clickedWord, setClickedWord] = useState<string | null>(null);
  const [burstPos, setBurstPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Cached canvas size in CSS pixels. Reading canvas.offsetWidth inside the
    // render loop forces a layout flush for every single word every frame.
    let cw = canvas.offsetWidth;
    let ch = canvas.offsetHeight;

    const resize = () => {
      cw = canvas.offsetWidth;
      ch = canvas.offsetHeight;
      canvas.width = cw * window.devicePixelRatio;
      canvas.height = ch * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize floating words
    wordsRef.current = Array.from({ length: 40 }, () => {
      const w = NOVEL_WORDS[Math.floor(Math.random() * NOVEL_WORDS.length)];
      return {
        text: w,
        x: Math.random() * cw,
        y: Math.random() * ch,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2,
        size: 14 + Math.random() * 22,
        opacity: 0.3 + Math.random() * 0.5,
        hue: 180 + Math.random() * 60,
      };
    });

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      // Find clicked word
      const words = wordsRef.current;
      let foundWord: string | null = null;
      for (const word of words) {
        const dx = cx - word.x;
        const dy = cy - word.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 40) {
          foundWord = word.text;
          word.burst = 1; // trigger burst animation
          break;
        }
      }
      if (foundWord) {
        setClickedWord(foundWord);
        setBurstPos({ x: cx, y: cy });
        setTimeout(() => setClickedWord(null), 3000);
        setTimeout(() => setBurstPos(null), 1000);
      }
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("mouseleave", () => {
      mouseRef.current = { x: -1000, y: -1000 };
    });

    let lastFont = "";

    const animate = () => {
      ctx.clearRect(0, 0, cw, ch);

      // Draw wave background
      const time = Date.now() * 0.0005;

      // Draw wave lines
      for (let w = 0; w < 3; w++) {
        ctx.beginPath();
        ctx.strokeStyle = `hsla(${190 + w * 10}, 60%, 50%, 0.08)`;
        ctx.lineWidth = 1;
        for (let x = 0; x < cw; x += 5) {
          const y =
            ch / 2 +
            Math.sin(x * 0.01 + time + w) * 30 +
            Math.sin(x * 0.02 + time * 1.5 + w) * 15 +
            w * 40;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Update and draw words
      const words = wordsRef.current;
      for (const word of words) {
        word.x += word.vx;
        word.y += word.vy;

        // Wrap around edges (uses the cached size — no layout read per word)
        if (word.x < -100) word.x = cw + 100;
        if (word.x > cw + 100) word.x = -100;
        if (word.y < -50) word.y = ch + 50;
        if (word.y > ch + 50) word.y = -50;

        // Mouse interaction (hover glow)
        const dx = mouseRef.current.x - word.x;
        const dy = mouseRef.current.y - word.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const hovered = dist < 60;

        // Burst animation
        let burst = word.burst ?? 0;
        if (burst > 0) {
          burst = Math.max(0, burst - 0.02);
          word.burst = burst;
        }

        const fontSize = Math.round(word.size + (burst > 0 ? burst * 20 : 0));
        const font = `${hovered || burst > 0 ? "bold " : ""}${fontSize}px var(--font-naskh), serif`;
        // Assigning ctx.font re-parses the string and re-resolves the face —
        // only touch it when it actually changed.
        if (font !== lastFont) {
          ctx.font = font;
          lastFont = font;
        }
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (burst > 0) {
          ctx.shadowColor = "#ffd700";
          ctx.shadowBlur = 30 + burst * 20;
          ctx.fillStyle = `rgba(255, 215, 0, ${burst})`;
        } else if (hovered) {
          ctx.shadowColor = "#d4b05e";
          ctx.shadowBlur = 20;
          ctx.fillStyle = "#f0c870";
        } else {
          ctx.shadowBlur = 0;
          ctx.fillStyle = `hsla(${word.hue}, 50%, 70%, ${word.opacity})`;
        }
        ctx.fillText(word.text, word.x, word.y);
      }
      ctx.shadowBlur = 0;

      // Draw burst particles
      if (burstPos) {
        const particles = 12;
        for (let i = 0; i < particles; i++) {
          const angle = (Math.PI * 2 * i) / particles;
          const dist = 30 + (1 - (Date.now() % 1000) / 1000) * 50;
          const px = burstPos.x + Math.cos(angle) * dist;
          const py = burstPos.y + Math.sin(angle) * dist;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 215, 0, 0.6)";
          ctx.fill();
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    // Pause the loop while the tab is hidden — an ambient decoration does not
    // need to burn a core animating behind another window.
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationRef.current);
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleClick);
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(animationRef.current);
    };
  }, [active, burstPos]);

  if (!active) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-auto absolute inset-0 h-full w-full"
        style={{ cursor: "pointer" }}
      />
      {/* Clicked word popup */}
      {clickedWord && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 animate-float-in rounded-2xl border border-gold/40 bg-background/90 px-6 py-4 text-center backdrop-blur-md">
          <div className="text-2xl font-bold text-gold-gradient">{clickedWord}</div>
          <div className="mt-1 text-xs text-muted-foreground">كلمة من رواية سيد الحقيقة</div>
        </div>
      )}
    </>
  );
}

export function WordOceanToggle() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("word-ocean-theme");
    if (stored === "true") {
      setActive(true);
      document.documentElement.classList.add(WORD_OCEAN_THEME_CLASS);
    }
  }, []);

  const toggle = () => {
    const next = !active;
    setActive(next);
    localStorage.setItem("word-ocean-theme", String(next));
    if (next) {
      document.documentElement.classList.add(WORD_OCEAN_THEME_CLASS);
    } else {
      document.documentElement.classList.remove(WORD_OCEAN_THEME_CLASS);
    }
  };

  return (
    <button
      onClick={toggle}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
        active
          ? "border-cyan/60 bg-cyan/15 text-cyan"
          : "border-gold/20 text-gold/60 hover:border-gold/40"
      )}
      title="ثيم بحر الكلمات"
    >
      <Waves className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">بحر الكلمات</span>
    </button>
  );
}

export function WordOceanExperience() {
  const [intensity, setIntensity] = useState(1);

  return (
    <div className="relative h-[70vh] overflow-hidden rounded-xl border border-cyan/20 bg-gradient-to-b from-[#0a1525] via-[#0d2535] to-[#103045]">
      <WordOceanCanvas active={true} />

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <h2 className="font-naskh text-4xl font-bold text-cyan-gradient sm:text-5xl">
          بحر الكلمات
        </h2>
        <p className="mt-3 font-naskh text-sm text-cyan/60">
          كلمات الرواية تطفو كأمواج · مرر الماوس لتضيء · اضغط كلمة لتنفجر
        </p>
      </div>

      <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg border border-cyan/30 bg-background/80 px-3 py-2 backdrop-blur-md">
        <Sparkles className="h-3.5 w-3.5 text-cyan" />
        <span className="text-xs text-cyan/70">الكثافة</span>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={intensity}
          onChange={(e) => setIntensity(Number(e.target.value))}
          className="w-20 accent-cyan"
        />
        <RotateCcw
          className="h-3 w-3 cursor-pointer text-cyan/40 hover:text-cyan"
          onClick={() => setIntensity(1)}
        />
      </div>
    </div>
  );
}
