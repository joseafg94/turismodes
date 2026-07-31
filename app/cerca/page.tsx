import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getTranslations } from "@/lib/i18n";

export default function NearbyPage() {
  const t = getTranslations("es");

  return (
    <PlaceholderPage
      description={t.routes.nearby.description}
      title={t.routes.nearby.title}
    />
  );
}
