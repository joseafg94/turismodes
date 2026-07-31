import Map from "@/components/Map";
import { AppNav } from "@/components/AppNav";
import { getTranslations } from "@/lib/i18n";

export default function MapPage() {
  const t = getTranslations("es");

  return (
    <main className="relative h-screen w-full">
      <div className="absolute inset-x-4 top-4 z-10 overflow-x-auto rounded-2xl bg-white/95 p-2 shadow-sm">
        <AppNav className="w-max flex-nowrap" />
      </div>
      <Map labels={t.map} />
    </main>
  );
}
