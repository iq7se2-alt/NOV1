"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="cosmic-bg relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      <div className="starfield absolute inset-0" />
      <div className="relative">
        <p className="font-naskh text-5xl font-bold text-gold-gradient">{t("عذراً")}</p>
        <h1 className="mt-4 font-naskh text-2xl font-bold text-foreground">
          {t("حدث خطأ ما")}
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {t("حدث خطأ غير متوقع. يمكنك المحاولة مرة أخرى أو العودة للرئيسية.")}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button
            onClick={reset}
            className="bg-gold text-[#1a0a00] hover:bg-gold-soft"
          >
            {t("إعادة المحاولة")}
          </Button>
          <Link href="/">
            <Button
              variant="outline"
              className="border-gold/25 text-gold hover:border-gold/50 hover:bg-gold/10"
            >
              {t("الرئيسية")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
