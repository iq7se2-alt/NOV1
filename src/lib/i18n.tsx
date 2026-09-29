"use client";

/**
 * Language provider + hook for switching UI chrome between
 * Arabic (default) and English. The novel content itself stays
 * Arabic RTL — only the UI chrome (labels, numbers) switches.
 *
 * - `lang`    : current language ("ar" | "en")
 * - `setLang` : switch language (persisted to localStorage)
 * - `toggle`  : convenience toggle between "ar" and "en"
 * - `t(key)`  : translate an Arabic UI string → English when lang === "en".
 *               Keys are the Arabic source strings (so call sites read naturally).
 * - `formatNumber(n)` : format a number with Arabic-Indic digits when lang === "ar",
 *                       Western digits when lang === "en".
 *
 * The state is backed by a module-level external store (kept in sync with
 * localStorage) and exposed to React via `useSyncExternalStore`. This avoids
 * setState-in-effect (which the React hooks lint rule forbids) and avoids
 * hydration mismatches by returning "ar" on the server and the first client
 * render — the actual localStorage value is read on the first subscription.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Language = "ar" | "en";

const STORAGE_KEY = "site-language";

/** Dictionary: Arabic source → English translation. */
const TRANSLATIONS: Record<string, string> = {
  // Nav + general chrome
  الرئيسية: "Home",
  الفصول: "Chapters",
  الشخصيات: "Characters",
  التعليقات: "Comments",
  الخريطة: "Map",
  الإدارة: "Admin",
  "لوحة الإدارة": "Admin Panel",

  // Hero / CTA
  "ابدأ القراءة": "Start Reading",
  "تصفّح الفصول": "Browse Chapters",
  "فصل منشور": "Published Chapters",
  "فصل · فلر": "Chapter · Filler",
  كلمة: "Words",
  "وقت القراءة الكلي": "Total Reading Time",
  "آخر فصل": "Latest Chapter",
  "آخر الفصول": "Latest Chapters",
  "قائمة الفصول": "Chapter List",
  "فهرس الرواية": "Novel Index",
  فلر: "Filler",
  فصل: "Chapter",
  "كل الفصول": "All Chapters",
  "ابحث برقم الفصل أو عنوانه": "Search by chapter number or title",
  "ابحث برقم الفصل أو عنوانه...": "Search by chapter number or title...",
  تنازلي: "Descending",
  تصاعدي: "Ascending",
  مسح: "Clear",
  محدد: "selected",
  "نتائج البحث عن": "Search results for",
  "عرض تصاعدي (1 → الأعلى)": "Ascending view (1 → Top)",
  "عرض تنازلي (الأعلى → 1)": "Descending view (Top → 1)",
  "ابدأ من الفصل الأول": "Start from the first chapter",
  "اغرق في عالم سيد الحقيقة": "Dive into the world of Lord of the Truth",

  // Loading / empty states
  "تحميل هذا الفصل PDF": "Download this chapter as PDF",
  "لا توجد فصول بعد": "No chapters yet",
  "لا توجد فصول بعد.": "No chapters yet.",
  "لا توجد نتائج مطابقة": "No matching results",
  "وصلت لنهاية الفصول": "Reached the end of chapters",
  "تحميل المزيد": "Loading more",
  "تحميل المزيد...": "Loading more...",
  "✦ وصلت لنهاية الفصول ✦": "✦ Reached the end of chapters ✦",

  // Settings
  "إعدادات القراءة": "Reading Settings",

  // Ambient sounds (matching ambient-sounds.tsx labels)
  مطر: "Rain",
  نار: "Fire",
  رياح: "Wind",
  أمواج: "Ocean",
  رعد: "Thunder",
  غابة: "Forest",
  مكتبة: "Library",
  كون: "Cosmic",

  // ─── Pages added after the big quest ───
  // Nav additions
  "الأكثر تفاعلاً": "Most Active",
  "الخط الزمني": "Timeline",

  // /top
  "إحصائيات القراءة": "Reading Stats",
  "الأكثر تفاعلاً | سيد الحقيقة": "Most Active | Lord of the Truth",
  "أكثر فصول الرواية قراءةً وتعليقاً": "The most read and most discussed chapters",
  "الأكثر مشاهدة": "Most Viewed",
  "الأكثر نقاشاً": "Most Discussed",
  مشاهدة: "views",
  تعليق: "comments",
  "رسم بياني": "Chart",
  المشاهدات: "Views",
  "اضغط على أي عمود لفتح الفصل": "Click any bar to open the chapter",

  // /timeline
  "خط زمني": "Timeline",
  "الخط الزمني للرواية": "The Story Timeline",
  "الخط الزمني | سيد الحقيقة": "Timeline | Lord of the Truth",
  "الخط الزمني للرواية: متى ظهرت كل شخصية ومكان": "Story timeline: when every character and place first appears",
  "كثافة الأحداث عبر الرواية": "Event density across the novel",
  ذكر: "mentions",
  "أماكن جديدة": "New places",
  كلمات: "Words",
  شخصية: "Character",
  مكان: "Place",
  "مكان جديد": "new place",
  "الكل / الشخصيات / الأماكن": "All / Characters / Places",
  الكل: "All",
  "الشخصيات فقط": "Characters only",
  "الأماكن فقط": "Places only",
  "لا أحداث في هذا التصنيف": "No events in this category",
  "أول ظهور لكل شخصية": "First appearance of every character",
  "أول ظهور لكل مكان": "First appearance of every place",
  "أول ظهور لكل شخصية ومكان": "First appearance of every character and place",
  "من الفصل": "From chapter",
  "المحور الأفقي = رقم بداية كل مجموعة من ٥٠ فصلاً":
    "The horizontal axis = start chapter of each 50-chapter group",
  "حدث": "events",
  "حدثاً": "more events",
  "حدثاً آخر": "more events",
  عرض: "Show",
  "كل مجموعة": "each group of",
  "فصلاً": "chapters",
  "الفصل": "Chapter",
  "أحداث": "events",

  // characters page
  بطاقات: "Cards",
  "دائرة العلاقات": "Relationship Circle",
  "تصدير CSV": "Export CSV",
  "تصدير JSON": "Export JSON",
  "تحميل كل العلاقات كملف CSV يفتح في Excel": "Download every relation as a CSV that opens in Excel",
  "تحميل شبكة العلاقات كملف JSON": "Download the relation graph as JSON",

  // reader settings panel (the rich ScrollSettingsBar)
  "الخط والحجم": "Font & Size",
  "أبجد": "ABC",
  الحجم: "Size",
  "التمرير التلقائي": "Auto Scroll",
  "سكرول تلقائي": "Auto scroll",
  السرعة: "Speed",
  "إبراز الشخصيات": "Character names",
  "يختفي الشريط تلقائياً عند التوقف": "The bar hides itself when you stop",
  خط: "fonts",
  "إظهار أسماء الشخصيات": "Highlight character names",
  "S يفتح الإعدادات": "S opens the settings",
  "إعدادات القراءة (اضغط S)": "Reading settings (press S)",
  "ابحث عن خط...": "Search a font...",
  "عدّل الإعدادات وشاهد التغييرات مباشرةً": "Adjust and see the change instantly",
  "نوع الخط": "Font family",
  "حجم الخط": "Font size",
  "سرعة التمرير التلقائي": "Auto-scroll speed",
  "غيّر الثيم من الأعلى (زر تبديل الثيم في الشريط العلوي)": "Change the theme from the top bar",
  نسخ: "Naskh",
  القاهرة: "Cairo",
  أميري: "Amiri",
  صغير: "Small",
  متوسط: "Medium",
  كبير: "Large",
  بطيء: "Slow",
  سريع: "Fast",

  // comments
  إخفاء: "Hide",
  "ربط التعليق بكلمة في الفصل": "Link the comment to a word in the chapter",
  "لا توجد تعليقات بعد. كن أول من يعلّق!": "No comments yet. Be the first!",
  "اضغط لإخفاء": "Click to hide",
  "اضغط لإظهار": "Click to show",
  "تعذّر تحميل التعليقات": "Could not load the comments",
  "تعذّر النشر": "Could not publish",
  "عرض ١٠ تعليقات أخرى": "Show 10 more comments",
  "كل التعليقات معروضة": "All comments are shown",
  "يبقى مخفياً في الفصل التالي": "stays hidden for the next chapter",
  "إظهار التعليقات": "Show comments",

  // comments form + counters
  اسمك: "Your name",
  تعليقك: "Your comment",
  "اكتب تعليقك... (يدعم **غامق** و *مائل* و ||حرق||)": "Write a comment... (**bold**, *italic* and ||spoiler|| supported)",
  "اكتب كلمة من الفصل للربط بها...": "Type a word from the chapter to link it...",
  "كلمة الربط": "Link word",
  "نص غامق (Bold)": "Bold text",
  "نص مائل (Italic)": "Italic text",
  "نص مخفي - حرق (Spoiler)": "Hidden text — spoiler",
  "نشر التعليق": "Post comment",
  "حذف التعليق": "Delete comment",
  حذف: "Delete",
  "مرتبط بـ": "Linked to",
  "اضغط للذهاب إلى الكلمة في الفصل": "Jump to the word in the chapter",
  "تعليقاً آخر": "more comments",
  معروض: "Showing",
  من: "of",
  خطأ: "Error",
  "تم النشر": "Posted",
  "تم نشر تعليقك بنجاح": "Your comment was published",
  "تم الحذف": "Deleted",
  "تم حذف التعليق": "The comment was deleted",
  "تعذّر نشر التعليق": "Could not publish the comment",
  "تعذّر الحذف": "Could not delete",

  // /comments page
  // /bookmarks + /search
  "جار التحميل…": "Loading…",
  "جارٍ البحث...": "Searching...",
  "ابحث عن فصل لإضافته للمفضلة...": "Search a chapter to bookmark it...",
  "فصولك المميزة": "Your starred chapters",
  "لا توجد فصول في المفضلة بعد": "No bookmarked chapters yet",
  "ابحث عن فصل وأضفه للمفضلة": "Search a chapter and bookmark it",
  "فصل في المفضلة": "bookmarked chapters",
  "فصل متاح للإضافة للمفضلة": "chapters you can bookmark",
  "حذف الكل": "Clear all",
  "إزالة من المفضلة": "Remove from bookmarks",
  "إضافة للمفضلة": "Add to bookmarks",
  "أضف للمفضلة": "Add to bookmarks",
  "الفصول المميزة": "Bookmarked chapters",
  "ابحث عن كلمة أو جملة في كل الفصول...": "Search a word or sentence across all chapters...",
  "لا توجد نتائج": "No results",
  "جرّب كلمة أخرى": "Try another word",
  "لم يُذكر الاسم بالمرة في أي فصل": "The name is never mentioned in any chapter",
  "جميع الفصول": "All chapters",
  "اكتب حرفين على الأقل للبحث": "Type at least two letters to search",
  "اكتب حرفين على الأقل": "Type at least two letters",
  "اكتب اسم شخصية أو مكان": "Type a character or place name",
  نتيجة: "results",
  مطابقة: "matches",
  "شخصيات وأماكن": "Characters & places",
  "ابدأ الكتابة للبحث": "Start typing to search",
  "بحث في المحتوى": "Search content",
  "ابحث في محتوى الرواية": "Search the novel's content",
  "ابحث في كل شيء": "Search everything",
  "ابحث في كل شيء — شخصية، مكان، فصل، ذكر...":
    "Search everything — character, place, chapter, mention...",
  "فتح نتائج البحث": "Open the search results",
  "تم العثور على": "Found",
  "ذكر لكلمة": "mentions of",
  في: "in",
  "فصولك": "Your chapters",
  "بحث في كل الفصول": "Search across all chapters",
  "بحث متقدم": "Advanced search",
  "ابحث عن أي كلمة أو جملة في جميع فصول الرواية":
    "Search any word or sentence across every chapter",
  "العودة للرئيسية": "Back home",
  "عالم الرواية": "The novel's world",
  "خريطة العالم": "World Map",
  "لم تُضف أماكن بعد": "No places added yet",
  "لا توجد أماكن بعد.": "No places yet.",
  "يمكن إضافة الأماكن من لوحة الإدارة.": "Places can be added from the admin panel.",
  "الذهاب للإدارة": "Go to the admin panel",

  // 404 pages
  "الفصل غير موجود": "Chapter not found",
  "لم نتمكن من العثور على هذا الفصل. ربما تم حذفه أو أن الرابط خاطئ.":
    "We could not find this chapter. It may have been deleted, or the link is wrong.",
  "العودة إلى الفهرس": "Back to the index",
  "الصفحة غير موجودة": "Page not found",
  "لم نتمكن من العثور على هذه الصفحة.": "We could not find this page.",
  "القارئ غير موجود": "Reader not found",
  "لم نتمكن من العثور على هذا القارئ. ربما تم حذفه أو أن الرابط خاطئ.":
    "We could not find this reader. They may have been deleted, or the link is wrong.",
  "العودة إلى لوحة المتصدرين": "Back to the leaderboard",

  // errors
  عذراً: "Sorry",
  "حدث خطأ ما": "Something went wrong",
  "حدث خطأ غير متوقع. يمكنك المحاولة مرة أخرى أو العودة للرئيسية.":
    "An unexpected error happened. You can try again or go back home.",
  "إعادة المحاولة": "Try again",

  // home page
  "رواية ويب عربية · فانتازيا": "Arabic web novel · Fantasy",
  "أحدث ما نُشر من رواية سيد الحقيقة": "The latest from Lord of the Truth",

  // reading stats
  "تقدّم قراءتك": "Your reading progress",
  "دقيقة قراءة": "minutes read",
  مكتمل: "complete",
  "آخر فصل قرأته:": "Last chapter you read:",
  متابعة: "Continue",
  "تصدير تقدمك لحفظه": "Export your progress to save it",
  "استيراد تقدمك من ملف": "Import your progress from a file",
  تصدير: "Export",
  استيراد: "Import",
  "الصق محتوى ملف التصدير هنا:": "Paste the exported file content here:",
  إلغاء: "Cancel",
  "تم استيراد التقدم بنجاح! سيتم تحديث الصفحة.":
    "Progress imported! The page will refresh.",
  "ملف غير صالح. تأكد من صحة الملف.": "Invalid file. Check that the file is correct.",

  // tree of wisdom
  "شجرة الحكمة": "Tree of Wisdom",
  "ازرع شجرتك بالقراءة": "Grow your tree by reading",
  "كل فصل تقرأه يتركب قطعة ذهبية في شجرتك. كلما قرأت أكثر، نبت الجذع، تفرعت الأغصان، وتفتحت ثمار الحكمة.":
    "Every chapter you read adds a golden piece to your tree. The more you read, the trunk grows, branches spread, and the fruits of wisdom open.",
  "يحمّل...": "Loading...",
  بذرة: "Seed",
  جذع: "Trunk",
  أوراق: "Leaves",
  ثمار: "Fruit",
  "المرحلة الحالية": "Current stage",
  "فصل مقروء": "chapters read",
  "ثمرة حكمة": "fruits of wisdom",
  "فصل متبقٍ": "chapters left",

  // continue reading
  "متابعة القراءة": "Continue reading",
  "تابع من حيث توقفت": "Pick up where you left off",

  // smart recap
  "📖 آخر ما حدث في الفصل": "📖 What happened in chapter",
  "تخطّي ✕": "Skip ✕",
  "عرض أقل": "Show less",
  "عرض المزيد": "Show more",
  "اقرأ الفصل السابق كامل ←": "Read the previous chapter in full ←",

  // tree of wisdom (3D)
  "يحمّل شجرة الحكمة...": "Loading the Tree of Wisdom...",
  أغصان: "Branches",
  المرحلة: "Stage",
  "🖱️ اسحب للتدوير · عجلة الفأرة للتكبير": "🖱️ Drag to rotate · scroll to zoom",

  // world map
  تكبير: "Zoom in",
  تصغير: "Zoom out",
  "إعادة ضبط": "Reset",
  شمال: "North",
  أماكن: "places",
  مكتشفة: "discovered",
  ف: "Ch. ",
  "اضغط مرة أخرى للانتقال للفصل": "Click again to jump to the chapter",
  // /characters page
  "شخصيات وعلاقات الرواية": "The novel's characters and relations",
  "لوحة الشخصيات": "Character Board",
  "مرتّبة بعدد الذكر": "sorted by mentions",
  "لم تُضف شخصيات بعد": "No characters added yet",
  "تعليقات القراء": "Reader comments",
  "ابحث في التعليقات أو الأسماء...": "Search comments or names...",
  "رقم الفصل": "Chapter number",
  "لا نتائج لهذا الفلتر": "No results for this filter",
  "لا توجد تعليقات بعد": "No comments yet",
  السابق: "Previous",
  التالي: "Next",

  // network graph
  ظهور: "appearances",
  "شخصية أخرى": "more characters",
  "شخصية تتبعها": "members",
  "إلغاء التحديد ✕": "Clear selection ✕",
  "عرض المزيد من الشخصيات في الدائرة": "Show more characters in the circle",
  "جارٍ رسم مجرة الشخصيات…": "Drawing the character galaxy…",
  عائلة: "Family",
  "قائد عائلة": "family head",
  البطل: "Protagonist",

  // characters grid
  "ابحث عن شخصية أو فرقة أو جيش...": "Search a character, faction or army...",
  "الترتيب": "Sort",
  "عدد الذكر": "Mentions",
  "عدد الفصول": "Chapters",
  الاسم: "Name",
  كيان: "entities",
  "★ رئيسية": "★ Main",
  شخصيات: "Characters",
  "طوائف وعائلات": "Factions & families",
  فرق: "Groups",
  جيوش: "Armies",
  مخلوقات: "Creatures",
  "بها علاقات": "Has relations",
  علاقة: "relations",
  فقرة: "paragraphs",
  "اذهب إلى أول ظهور وسيُظلل الاسم": "Go to the first appearance and highlight the name",
  "الأظهر أولًا عند ذكر واحد. زر الفلاتر لعرض الكل.": "Shows first at one mention. Use the filters to see all.",
  "أول ظهور": "First appearance",
  المرتبة: "Rank",
  "بالذكر": "by mentions",
  "اضغط للانتقال إلى الفقرة وتظليل الاسم ٣ ثواني":
    "Click to jump to the paragraph and highlight the name for 3s",
  "ظهر في": "Appears in",
  "جلب الفصول...": "Loading chapters...",
  "اضغط للذهاب إلى أول ظهور (فقرة": "Click to go to the first appearance (paragraph",
  "وتظليل اسم الشخصية": ") and highlight the character",

  // reader chrome
  القائمة: "Menu",
  "الإشعارات": "Notifications",
  رئيسي: "Main",
  "انتهى الفصل": "End of chapter",
  الفهرس: "Index",
  "إخفاء التعليقات (يبقى مخفياً في الفصل التالي)": "Hide comments (stays hidden next chapter)",

  // font categories (from fonts.ts)
  "خط عربي": "Arabic script",
  سانس: "Sans",
  طباعي: "Print",

  // theme names
  فاتح: "Light",
  "أصفر فاتح": "Sepia",
  داكن: "Dark",
  "ظلام دامس": "Blackout",
  مائي: "Water",
  سينمائي: "Cinematic",
  كتاب: "Book",
  النظام: "System",
  "تبديل المظهر": "Change theme",
  "الأصوات": "Sounds",
};

// ===== External store (module-level) =====
//
// All consumers share a single store. The initial value is "ar" (matches SSR);
// on the client, the first `subscribe()` call reads localStorage and updates
// the value if needed, then notifies listeners.

let currentLang: Language = "ar";
const listeners = new Set<() => void>();
let storeInitialized = false;

function initStore() {
  if (storeInitialized || typeof window === "undefined") return;
  storeInitialized = true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "ar" || stored === "en") {
      currentLang = stored;
    }
  } catch {
    // ignore (private mode etc.)
  }
}

function subscribe(listener: () => void) {
  // First subscription reads localStorage. This happens after hydration so
  // it cannot cause hydration mismatches.
  initStore();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Language {
  return currentLang;
}

function getServerSnapshot(): Language {
  return "ar";
}

function setLangInternal(l: Language) {
  if (currentLang === l) return;
  currentLang = l;
  try {
    window.localStorage.setItem(STORAGE_KEY, l);
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener());
}

// ===== Helpers =====

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

function toArabicDigitsLocal(input: number | string): string {
  return String(input).replace(/[0-9]/g, (d) => ARABIC_DIGITS[Number(d)]);
}

// ===== Context =====

type LanguageContextValue = {
  lang: Language;
  setLang: (l: Language) => void;
  toggle: () => void;
  t: (key: string) => string;
  formatNumber: (n: number | string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLang = useCallback((l: Language) => {
    setLangInternal(l);
  }, []);

  const toggle = useCallback(() => {
    setLangInternal(currentLang === "ar" ? "en" : "ar");
  }, []);

  const t = useCallback(
    (key: string) => {
      if (lang === "en") {
        const translated = TRANSLATIONS[key];
        if (translated) return translated;
      }
      return key;
    },
    [lang]
  );

  const formatNumber = useCallback(
    (n: number | string) => {
      if (lang === "ar") return toArabicDigitsLocal(n);
      return String(n);
    },
    [lang]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, toggle, t, formatNumber }),
    [lang, setLang, toggle, t, formatNumber]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside <LanguageProvider>");
  }
  return ctx;
}
