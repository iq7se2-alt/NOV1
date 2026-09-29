import { SearchClient } from "./search-client";
import { I18nPageHeader } from "@/components/site/i18n-page-header";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "بحث متقدم | سيد الحقيقة",
  description: "ابحث في كل فصول رواية سيد الحقيقة",
};

export default function SearchPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <I18nPageHeader
        badge="بحث في كل الفصول"
        title="بحث متقدم"
        subtitle="ابحث عن أي كلمة أو جملة في جميع فصول الرواية"
      />
      <SearchClient />
    </div>
  );
}
