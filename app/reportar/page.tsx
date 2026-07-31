import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getTranslations } from "@/lib/i18n";

export default function ReportPage() {
  const t = getTranslations("es");

  return (
    <PlaceholderPage
      description={t.routes.report.description}
      title={t.routes.report.title}
    />
  );
}
