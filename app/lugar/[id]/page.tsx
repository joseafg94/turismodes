import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getTranslations } from "@/lib/i18n";

export default function PlacePage() {
  const t = getTranslations("es");

  return (
    <PlaceholderPage
      description={t.routes.place.description}
      title={t.routes.place.title}
    />
  );
}
