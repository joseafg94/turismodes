import { AppNav } from "@/components/AppNav";

type PlaceholderPageProps = {
  description: string;
  title: string;
};

export function PlaceholderPage({
  description,
  title,
}: PlaceholderPageProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-8">
      <AppNav />
      <section className="rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="font-heading text-3xl font-bold">{title}</h1>
        <p className="mt-3 text-slate-500">{description}</p>
      </section>
    </main>
  );
}
