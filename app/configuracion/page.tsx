import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getTranslations } from "@/lib/i18n";

export default function SettingsPage() {
  const t = getTranslations("es");

  return (
    <PlaceholderPage
      description={t.routes.settings.description}
      title={t.routes.settings.title}
    />
  );
}
