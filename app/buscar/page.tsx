"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { getTranslations } from "@/lib/i18n";
import { getSupabaseClient } from "@/lib/supabase";

const PAGE_SIZE = 10;

type SearchResult = {
  category: string | null;
  id: string;
  name: string;
  result_type: "zone" | "place";
  sort_name: string;
};

type SearchCursor = {
  id: string;
  name: string;
  type: string;
};

export default function SearchPage() {
  const t = getTranslations("es");
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const [cursor, setCursor] = useState<SearchCursor>();
  const [history, setHistory] = useState<Array<SearchCursor | undefined>>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  useEffect(() => {
    if (!term) {
      return;
    }

    let cancelled = false;

    async function search() {
      setStatus("loading");
      const { data, error } = await getSupabaseClient().rpc(
        "search_catalog",
        {
          search_term: term,
          cursor_name: cursor?.name ?? null,
          cursor_type: cursor?.type ?? null,
          cursor_id: cursor?.id ?? null,
          result_limit: PAGE_SIZE,
        },
      );

      if (cancelled) {
        return;
      }

      if (error) {
        setStatus("error");
        return;
      }

      const rows = (data ?? []) as SearchResult[];
      setHasMore(rows.length > PAGE_SIZE);
      setResults(rows.slice(0, PAGE_SIZE));
      setStatus("ready");
    }

    void search();

    return () => {
      cancelled = true;
    };
  }, [cursor, term]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTerm = input.trim();

    if (!nextTerm) {
      return;
    }

    setCursor(undefined);
    setHistory([]);
    setTerm(nextTerm);
  }

  function nextPage() {
    const lastResult = results[results.length - 1];

    if (!lastResult) {
      return;
    }

    setHistory((current) => [...current, cursor]);
    setCursor({
      id: lastResult.id,
      name: lastResult.sort_name,
      type: lastResult.result_type,
    });
  }

  function previousPage() {
    const previousCursor = history[history.length - 1];
    setHistory((current) => current.slice(0, -1));
    setCursor(previousCursor);
  }

  const categoryLabels = t.nearby.categories as Record<string, string>;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-8">
      <AppNav />
      <header className="mt-8">
        <h1 className="font-heading text-3xl font-bold">{t.search.title}</h1>
        <p className="mt-2 text-slate-600">{t.search.description}</p>
      </header>

      <form className="mt-8" onSubmit={submitSearch}>
        <label className="font-semibold" htmlFor="catalog-search">
          {t.search.label}
        </label>
        <div className="mt-2 flex gap-2">
          <input
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-primary"
            id="catalog-search"
            onChange={(event) => setInput(event.target.value)}
            placeholder={t.search.placeholder}
            type="search"
            value={input}
          />
          <button
            className="rounded-xl bg-primary px-5 font-semibold text-white"
            type="submit"
          >
            {t.search.submit}
          </button>
        </div>
      </form>

      {status === "loading" && (
        <div
          aria-label={t.search.loading}
          className="mt-8 grid gap-4"
          role="status"
        >
          {[0, 1, 2].map((item) => (
            <div
              className="h-24 animate-pulse rounded-2xl bg-slate-200"
              key={item}
            />
          ))}
        </div>
      )}

      {status === "error" && (
        <p className="mt-8 rounded-2xl bg-white p-6 text-slate-600 shadow-sm">
          {t.search.error}
        </p>
      )}

      {status === "ready" && results.length === 0 && (
        <p className="mt-8 rounded-2xl bg-white p-6 text-slate-600 shadow-sm">
          {t.search.empty}
        </p>
      )}

      {status === "ready" && results.length > 0 && (
        <>
          <ul className="mt-8 grid gap-4">
            {results.map((result) => (
              <li key={`${result.result_type}-${result.id}`}>
                <Link
                  className="block rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"
                  href={
                    result.result_type === "zone"
                      ? `/zona/${result.id}`
                      : `/lugar/${result.id}`
                  }
                >
                  <h2 className="font-heading text-lg font-bold">
                    {result.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {result.result_type === "zone"
                      ? t.search.types.zone
                      : result.category
                        ? categoryLabels[result.category] ?? result.category
                        : t.search.types.place}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <nav
            aria-label={t.search.paginationLabel}
            className="mt-6 flex items-center justify-between gap-4"
          >
            <button
              className="rounded-xl bg-white px-4 py-3 font-semibold shadow-sm disabled:opacity-40"
              disabled={history.length === 0}
              onClick={previousPage}
              type="button"
            >
              {t.search.previous}
            </button>
            <p className="text-sm text-slate-600">
              {t.search.pageLabel} {history.length + 1}
            </p>
            <button
              className="rounded-xl bg-white px-4 py-3 font-semibold shadow-sm disabled:opacity-40"
              disabled={!hasMore}
              onClick={nextPage}
              type="button"
            >
              {t.search.next}
            </button>
          </nav>
        </>
      )}
    </main>
  );
}
