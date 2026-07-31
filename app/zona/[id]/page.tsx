import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getTranslations } from "@/lib/i18n";

export default function ZonePage() {
  const t = getTranslations("es");

  return (
    <PlaceholderPage
      description={t.routes.zone.description}
      title={t.routes.zone.title}
    />
  );
}
