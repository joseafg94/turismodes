import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getTranslations } from "@/lib/i18n";

export default function AdminPage() {
  const t = getTranslations("es");

  return (
    <PlaceholderPage
      description={t.routes.admin.description}
      title={t.routes.admin.title}
    />
  );
}
