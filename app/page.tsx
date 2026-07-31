import Link from "next/link";
import { getTranslations } from "@/lib/i18n";

export default function Home() {
  const t = getTranslations("es");

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="font-heading text-4xl font-bold">{t.home.title}</h1>
        <p className="mt-4 text-slate-500">{t.home.description}</p>
        <Link
          className="mt-8 inline-flex min-h-12 items-center rounded-xl bg-primary px-5 font-semibold text-white"
          href="/mapa"
        >
          {t.home.cta}
        </Link>
      </section>
    </main>
  );
}
