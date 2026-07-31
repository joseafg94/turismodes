"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { getTranslations } from "@/lib/i18n";
import { getSupabaseClient } from "@/lib/supabase";

type NearbyPlace = {
  category: string | null;
  distance_meters: number;
  hours: { opening_hours?: string } | null;
  id: string;
  name: string;
  rating: number | null;
};

export default function NearbyPage() {
  const t = getTranslations("es");
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const loadPlaces = useCallback(() => {
    setStatus("loading");

    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { data, error } = await getSupabaseClient().rpc(
          "nearby_places",
          {
            lat: coords.latitude,
            lng: coords.longitude,
            max_distance_meters: 500,
            result_limit: 20,
          },
        );

        if (error) {
          setStatus("error");
          return;
        }

        setPlaces((data ?? []) as NearbyPlace[]);
        setStatus("ready");
      },
      () => setStatus("error"),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 10_000 },
    );
  }, []);

  useEffect(() => {
    loadPlaces();
  }, [loadPlaces]);

  const categoryLabels = t.nearby.categories as Record<string, string>;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-8">
      <AppNav />
      <header className="mt-8">
        <h1 className="font-heading text-3xl font-bold">{t.nearby.title}</h1>
        <p className="mt-2 text-slate-600">{t.nearby.description}</p>
      </header>

      {status === "loading" && (
        <div
          aria-label={t.nearby.loading}
          className="mt-8 grid gap-4"
          role="status"
        >
          {[0, 1, 2].map((item) => (
            <div
              className="h-36 animate-pulse rounded-2xl bg-slate-200"
              key={item}
            />
          ))}
        </div>
      )}

      {status === "error" && (
        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-slate-600">{t.nearby.locationError}</p>
          <button
            className="mt-4 rounded-xl bg-primary px-4 py-3 font-semibold text-white"
            onClick={loadPlaces}
            type="button"
          >
            {t.nearby.retry}
          </button>
        </section>
      )}

      {status === "ready" && places.length === 0 && (
        <p className="mt-8 rounded-2xl bg-white p-6 text-slate-600 shadow-sm">
          {t.nearby.empty}
        </p>
      )}

      {status === "ready" && places.length > 0 && (
        <ul className="mt-8 grid gap-4">
          {places.map((place) => (
            <li key={place.id}>
              <Link
                className="block rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
                href={`/lugar/${place.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-xl font-bold">
                      {place.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {place.category
                        ? categoryLabels[place.category] ?? place.category
                        : t.nearby.categoryUnknown}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-primary">
                    {Math.round(place.distance_meters)} {t.nearby.meters}
                  </p>
                </div>
                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold">{t.nearby.hoursLabel}</dt>
                    <dd className="text-slate-600">
                      {place.hours?.opening_hours ??
                        t.nearby.hoursUnavailable}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold">{t.nearby.ratingLabel}</dt>
                    <dd className="text-slate-600">
                      {place.rating === null
                        ? t.nearby.ratingUnavailable
                        : Number(place.rating).toFixed(1)}
                    </dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
