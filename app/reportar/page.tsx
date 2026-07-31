import { AppNav } from "@/components/AppNav";
import IncidentForm from "@/components/IncidentForm";
import { getTranslations } from "@/lib/i18n";

export default function ReportPage() {
  const t = getTranslations("es");

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-8">
      <AppNav />
      <header className="mt-8">
        <h1 className="font-heading text-3xl font-bold">{t.report.title}</h1>
        <p className="mt-2 text-slate-600">{t.report.description}</p>
      </header>
      <IncidentForm />
    </main>
  );
}
