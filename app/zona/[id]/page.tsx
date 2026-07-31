"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { getTranslations } from "@/lib/i18n";
import { getSupabaseClient } from "@/lib/supabase";

type RiskLevel = "low" | "medium" | "high" | "unknown";

type Source = {
  note_es?: string;
  publisher?: string;
  url?: string;
};

type Zone = {
  confidence_ttl: number | null;
  data_sources: {
    risk_evidence?: Source[];
  } | null;
  last_updated: string | null;
  name_es: string;
  risk_level: RiskLevel | null;
};

const riskStyles: Record<RiskLevel, string> = {
  low: "border-[#16A34A] bg-[#16A34A]/10",
  medium: "border-[#EAB308] bg-[#EAB308]/10",
  high: "border-[#DC2626] bg-[#DC2626]/10",
  unknown: "border-[#94A3B8] bg-[#94A3B8]/10",
};

function safeSourceUrl(value?: string) {
  if (!value) {
    return;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return;
  }
}

export default function ZonePage({ params }: { params: { id: string } }) {
  const t = getTranslations("es");
  const [zone, setZone] = useState<Zone>();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadZone() {
      const { data, error } = await getSupabaseClient()
        .from("zones")
        .select(
          "name_es,risk_level,data_sources,last_updated,confidence_ttl",
        )
        .eq("id", params.id)
        .eq("active", true)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error || !data) {
        setHasError(true);
        return;
      }

      setZone(data as Zone);
    }

    void loadZone();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (!zone) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-8">
        <AppNav />
        <section className="rounded-2xl bg-white p-8 shadow-sm" role="status">
          <h1 className="font-heading text-3xl font-bold">
            {hasError ? t.zoneDetail.loadError : t.zoneDetail.loading}
          </h1>
        </section>
      </main>
    );
  }

  const ttlMilliseconds = (zone.confidence_ttl ?? 0) * 86_400_000;
  const lastUpdated = zone.last_updated
    ? new Date(zone.last_updated)
    : undefined;
  const isExpired =
    !lastUpdated ||
    ttlMilliseconds <= 0 ||
    Date.now() > lastUpdated.getTime() + ttlMilliseconds;
  const riskLevel: RiskLevel = isExpired
    ? "unknown"
    : zone.risk_level ?? "unknown";
  const riskCopy = {
    low: t.zoneDetail.levels.low,
    medium: t.zoneDetail.levels.medium,
    high: t.zoneDetail.levels.high,
    unknown: t.zoneDetail.levels.unknown,
  }[riskLevel];
  const sources = Array.isArray(zone.data_sources?.risk_evidence)
    ? zone.data_sources.risk_evidence
    : [];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-8">
      <AppNav />
      <article className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <h1 className="font-heading text-3xl font-bold">{zone.name_es}</h1>

        <section
          className={`mt-6 rounded-xl border-l-4 p-4 ${riskStyles[riskLevel]}`}
        >
          <h2 className="text-sm font-semibold text-slate-600">
            {t.zoneDetail.levelLabel}
          </h2>
          <p className="mt-1 font-heading text-xl font-bold">{riskCopy}</p>
        </section>

        <dl className="mt-8 grid gap-8">
          <div>
            <dt className="font-heading text-lg font-bold">
              {t.zoneDetail.sourcesLabel}
            </dt>
            <dd className="mt-3">
              {sources.length > 0 ? (
                <ul className="space-y-4">
                  {sources.map((source, index) => {
                    const url = safeSourceUrl(source.url);

                    return (
                      <li
                        className="rounded-xl border border-slate-200 p-4"
                        key={`${source.publisher}-${index}`}
                      >
                        {url ? (
                          <a
                            className="font-semibold text-primary underline-offset-4 hover:underline"
                            href={url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {source.publisher ?? t.zoneDetail.sourceFallback}
                          </a>
                        ) : (
                          <p className="font-semibold">
                            {source.publisher ?? t.zoneDetail.sourceFallback}
                          </p>
                        )}
                        {source.note_es && (
                          <p className="mt-2 text-slate-600">
                            {source.note_es}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-slate-600">{t.zoneDetail.noSources}</p>
              )}
            </dd>
          </div>

          <div>
            <dt className="font-heading text-lg font-bold">
              {t.zoneDetail.updatedLabel}
            </dt>
            <dd className="mt-2 text-slate-600">
              {lastUpdated
                ? new Intl.DateTimeFormat("es-PA", {
                    dateStyle: "long",
                    timeStyle: "short",
                    timeZone: "America/Panama",
                  }).format(lastUpdated)
                : t.zoneDetail.noUpdateDate}
            </dd>
          </div>
        </dl>

        <p className="mt-8 border-t border-slate-200 pt-6 text-sm text-slate-500">
          {t.zoneDetail.guidance}
        </p>
      </article>
    </main>
  );
}
