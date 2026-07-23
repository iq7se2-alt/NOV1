import { Search } from "lucide-react";
import { SearchClient } from "./search-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "بحث متقدم | سيد الحقيقة",
  description: "ابحث في كل فصول رواية سيد الحقيقة",
};

export default function SearchPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-10 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/25 px-4 py-1 text-xs text-gold/80">
          <Search className="h-3.5 w-3.5" />
          بحث في كل الفصول
        </div>
        <h1 className="font-naskh text-4xl font-bold text-gold-gradient sm:text-5xl">
          بحث متقدم
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ابحث عن أي كلمة أو جملة في جميع فصول الرواية
        </p>
      </div>
      <SearchClient />
    </div>
  );
}
