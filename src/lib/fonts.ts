/**
 * Unified font system — used by both reader-view and ScrollSettingsBar.
 * All fonts are loaded via next/font/google in layout.tsx.
 *
 * To add a new font:
 * 1. Import it in src/app/layout.tsx with next/font/google
 * 2. Assign it a CSS variable (--font-xxx)
 * 3. Add an entry here with the matching cssVar
 */

export type FontKey =
  | "naskh"
  | "cairo"
  | "amiri"
  | "kufi"
  | "reem"
  | "scheherazade"
  | "lateef"
  | "marhey"
  | "lemonada"
  | "tajawal"
  | "almarai"
  | "aref"
  | "mirza"
  | "harmattan"
  | "mada"
  | "jomhuria"
  | "rakkas"
  | "baloo"
  | "elMessiri"
  | "changa"
  | "katibeh"
  | "lalezar";

export const FONTS: { key: FontKey; label: string; labelEn: string; cssVar: string; category: string }[] = [
  { key: "naskh", label: "نسخ", labelEn: "Noto Naskh Arabic", cssVar: "var(--font-naskh), serif", category: "كلاسيكي" },
  { key: "cairo", label: "القاهرة", labelEn: "Cairo", cssVar: "var(--font-cairo), sans-serif", category: "عصري" },
  { key: "amiri", label: "أميري", labelEn: "Amiri", cssVar: "var(--font-amiri), serif", category: "كلاسيكي" },
  { key: "kufi", label: "كوفي", labelEn: "Noto Kufi Arabic", cssVar: "var(--font-kufi), sans-serif", category: "كلاسيكي" },
  { key: "reem", label: "ريم", labelEn: "Reem Kufi", cssVar: "var(--font-reem), sans-serif", category: "عصري" },
  { key: "scheherazade", label: "شهرزاد", labelEn: "Scheherazade New", cssVar: "var(--font-scheherazade), serif", category: "كلاسيكي" },
  { key: "lateef", label: "لطيف", labelEn: "Lateef", cssVar: "var(--font-lateef), serif", category: "كلاسيكي" },
  { key: "marhey", label: "مرحي", labelEn: "Marhey", cssVar: "var(--font-marhey), sans-serif", category: "عصري" },
  { key: "lemonada", label: "ليموناضة", labelEn: "Lemonada", cssVar: "var(--font-lemonada), sans-serif", category: "عصري" },
  { key: "tajawal", label: "تجوال", labelEn: "Tajawal", cssVar: "var(--font-tajawal), sans-serif", category: "عصري" },
  { key: "almarai", label: "المراعي", labelEn: "Almarai", cssVar: "var(--font-almarai), sans-serif", category: "عصري" },
  { key: "aref", label: "عارف", labelEn: "Aref Ruqaa", cssVar: "var(--font-aref), serif", category: "كلاسيكي" },
  { key: "mirza", label: "ميرزا", labelEn: "Mirza", cssVar: "var(--font-mirza), sans-serif", category: "عصري" },
  { key: "harmattan", label: "هرمتن", labelEn: "Harmattan", cssVar: "var(--font-harmattan), sans-serif", category: "عصري" },
  { key: "mada", label: "مدى", labelEn: "Mada", cssVar: "var(--font-mada), sans-serif", category: "عصري" },
  { key: "jomhuria", label: "جمهورية", labelEn: "Jomhuria", cssVar: "var(--font-jomhuria), serif", category: "زخرفي" },
  { key: "rakkas", label: "ركاص", labelEn: "Rakkas", cssVar: "var(--font-rakkas), sans-serif", category: "زخرفي" },
  { key: "baloo", label: "بالو", labelEn: "Baloo Bhaijaan", cssVar: "var(--font-baloo), sans-serif", category: "عصري" },
  { key: "elMessiri", label: "المسيري", labelEn: "El Messiri", cssVar: "var(--font-elmessiri), sans-serif", category: "عصري" },
  { key: "changa", label: "تشانجا", labelEn: "Changa", cssVar: "var(--font-changa), sans-serif", category: "عصري" },
  { key: "katibeh", label: "كاتبة", labelEn: "Katibeh", cssVar: "var(--font-katibeh), serif", category: "زخرفي" },
  { key: "lalezar", label: "لاله زار", labelEn: "Lalezar", cssVar: "var(--font-lalezar), sans-serif", category: "زخرفي" },
];

export const DEFAULT_FONT: FontKey = "naskh";

export const FONT_KEY_STORAGE = "reader-font-family";
export const FONT_SIZE_STORAGE = "reader-font-size";

export function getFontCssVar(key: FontKey): string {
  return FONTS.find((f) => f.key === key)?.cssVar || FONTS[0].cssVar;
}

export function getFontLabel(key: FontKey): string {
  return FONTS.find((f) => f.key === key)?.label || "";
}

export function isValidFont(key: string): key is FontKey {
  return FONTS.some((f) => f.key === key);
}
