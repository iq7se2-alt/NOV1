"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n";

/**
 * Shared 404 body — every not-found route uses it so the copy follows the
 * language toggle. `what` decides the wording ("هذا الفصل" / "هذه الصفحة" …).
 */
export function NotFoundBody({ what }: { what: "chapter" | "page" | "user" }) {
  const { t } = useLanguage();
  const copy = {
    chapter: { title: t("الفصل غير موجود"), body: t("لم نتمكن من العثور على هذا الفصل. ربما تم حذفه أو أن الرابط خاطئ."), back: t("العودة إلى الفهرس"), href: "/chapters" },
    page: { title: t("الصفحة غير موجودة"), body: t("لم نتمكن من العثور على هذه الصفحة."), back: t("العودة للرئيسية"), href: "/" },
    user: { title: t("القارئ غير موجود"), body: t("لم نتمكن من العثور على هذا القارئ. ربما تم حذفه أو أن الرابط خاطئ."), back: t("العودة إلى لوحة المتصدرين"), href: "/leaderboard" },
  }[what];

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-4 text-center">
      <p className="font-naskh text-7xl font-bold text-gold-gradient">٤٠٤</p>
      <h1 className="mt-4 font-naskh text-2xl font-bold text-gold">{copy.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{copy.body}</p>
      <Link
        href={copy.href}
        className="mt-8 rounded-lg border border-gold/30 bg-gold/10 px-6 py-2.5 text-sm text-gold transition-colors hover:bg-gold/20"
      >
        {copy.back}
      </Link>
    </div>
  );
}
