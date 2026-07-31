"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import maplibregl, { type StyleSpecification } from "maplibre-gl";
import { getSupabaseClient } from "@/lib/supabase";
import {
  ZoneLayer,
  type ZoneFeatureCollection,
  type ZoneRiskLevel,
} from "@/components/ZoneLayer";

const CASCO_VIEJO_CENTER: [number, number] = [-79.5348, 8.9533];
type MapLabels = {
  ariaLabel: string;
  loadError: string;
  loading: string;
};

type MapProps = {
  labels: MapLabels;
};

type ZoneRow = {
  geometry: GeoJSON.Polygon;
  id: string;
  name_en: string;
  name_es: string;
  risk_level: ZoneRiskLevel | null;
};

function flattenStyle(style: StyleSpecification): StyleSpecification {
  return {
    ...style,
    bearing: 0,
    pitch: 0,
    projection: { type: "mercator" },
    sky: undefined,
    terrain: undefined,
    layers: style.layers.filter(
      (layer) =>
        layer.type !== "fill-extrusion" && layer.type !== "hillshade",
    ),
  };
}

export default function Map({ labels }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const userMarkerRef = useRef<maplibregl.Marker>();
  const requestIdRef = useRef(0);
  const router = useRouter();
  const [map, setMap] = useState<maplibregl.Map>();
  const [zones, setZones] = useState<ZoneFeatureCollection>({
    type: "FeatureCollection",
    features: [],
  });
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const loadZones = useCallback(async (currentMap: maplibregl.Map) => {
    const bounds = currentMap.getBounds();
    const requestId = ++requestIdRef.current;
    const { data, error } = await getSupabaseClient().rpc("zones_in_view", {
      min_lat: bounds.getSouth(),
      min_lng: bounds.getWest(),
      max_lat: bounds.getNorth(),
      max_lng: bounds.getEast(),
    });

    if (requestId !== requestIdRef.current) {
      return;
    }

    if (error) {
      setStatus("error");
      return;
    }

    const rows = (data ?? []) as ZoneRow[];
    setZones({
      type: "FeatureCollection",
      features: rows.map((zone) => ({
        type: "Feature",
        geometry: zone.geometry,
        properties: {
          id: zone.id,
          name_en: zone.name_en,
          name_es: zone.name_es,
          risk_level: zone.risk_level ?? "unknown",
        },
      })),
    });
    setStatus("ready");
  }, []);

  const openZone = useCallback(
    (id: string) => router.push(`/zona/${encodeURIComponent(id)}`),
    [router],
  );

  useEffect(() => {
    const style = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
    let currentMap: maplibregl.Map | undefined;
    let cancelled = false;

    if (!mapContainerRef.current || !style) {
      setStatus("error");
      return;
    }
    const styleUrl = style;

    async function initializeMap() {
      try {
        const response = await fetch(styleUrl);

        if (!response.ok) {
          throw new Error();
        }

        const styleSpecification =
          (await response.json()) as StyleSpecification;

        if (cancelled || !mapContainerRef.current) {
          return;
        }

        currentMap = new maplibregl.Map({
          container: mapContainerRef.current,
          style: flattenStyle(styleSpecification),
          center: CASCO_VIEJO_CENTER,
          zoom: 14,
          pitch: 0,
          maxPitch: 0,
          bearing: 0,
          dragRotate: false,
          touchPitch: false,
          pitchWithRotate: false,
        });

        currentMap.touchZoomRotate.disableRotation();
        currentMap.once("load", () => {
          if (!currentMap) {
            return;
          }

          currentMap.setBearing(0);
          currentMap.setPitch(0);
          currentMap.setTerrain(null);
          setMap(currentMap);
          void loadZones(currentMap);
        });
        currentMap.on("moveend", () => {
          if (currentMap) {
            void loadZones(currentMap);
          }
        });

        navigator.geolocation?.getCurrentPosition(
          ({ coords }) => {
            if (!currentMap) {
              return;
            }

            userMarkerRef.current?.remove();
            userMarkerRef.current = new maplibregl.Marker({
              color: "#2563EB",
            })
              .setLngLat([coords.longitude, coords.latitude])
              .addTo(currentMap);
          },
          () => undefined,
          { enableHighAccuracy: true, maximumAge: 30_000, timeout: 10_000 },
        );
      } catch {
        setStatus("error");
      }
    }

    void initializeMap();

    return () => {
      cancelled = true;
      requestIdRef.current += 1;
      userMarkerRef.current?.remove();
      currentMap?.remove();
    };
  }, [loadZones]);

  return (
    <div className="relative h-full w-full">
      <div
        aria-label={labels.ariaLabel}
        className="h-full w-full"
        ref={mapContainerRef}
        role="region"
      />
      <ZoneLayer map={map} onZoneSelect={openZone} zones={zones} />
      {status !== "ready" && (
        <div
          className="pointer-events-none absolute bottom-4 left-4 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
          role="status"
        >
          {status === "loading" ? labels.loading : labels.loadError}
        </div>
      )}
    </div>
  );
}
