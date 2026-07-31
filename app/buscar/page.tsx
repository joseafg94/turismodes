import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getTranslations } from "@/lib/i18n";

export default function SearchPage() {
  const t = getTranslations("es");

  return (
    <PlaceholderPage
      description={t.routes.search.description}
      title={t.routes.search.title}
    />
  );
}
