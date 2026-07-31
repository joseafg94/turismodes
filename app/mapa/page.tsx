import Map from "@/components/Map";
import { getTranslations } from "@/lib/i18n";

export default function MapPage() {
  const t = getTranslations("es");

  return (
    <main className="h-screen w-full">
      <Map labels={t.map} />
    </main>
  );
}
