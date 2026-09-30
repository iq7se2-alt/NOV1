"use client";

import { useLanguage } from "@/lib/i18n";
import { TruthEye } from "@/components/site/truth-eye";

/** The "عين الحقيقة" emblem section on the home page. */
export function TruthEyeSection() {
  const { t } = useLanguage();
  return (
    <section className="relative overflow-hidden border-y border-gold/15 bg-background">
      <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="font-naskh text-3xl font-bold text-gold-gradient sm:text-4xl">
            {t("عين الحقيقة")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            {t("شعار الرواية — يحرسها رمز الوعي، وينبض مع كل فصل تقرأه")}
          </p>
        </div>
        <div className="flex justify-center">
          <TruthEye size={380} label={t("عين الحقيقة")} />
        </div>
      </div>
    </section>
  );
}
