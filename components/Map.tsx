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

const CASCO_VIEJO_CENTER: [number, number] = [-79.5169, 8.9537];
const EMPTY_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#E2E8F0" },
    },
  ],
};

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

    if (!mapContainerRef.current || !style) {
      setStatus("error");
      return;
    }

    const currentMap = new maplibregl.Map({
      container: mapContainerRef.current,
      style: EMPTY_STYLE,
      center: CASCO_VIEJO_CENTER,
      zoom: 15,
      pitch: 0,
      maxPitch: 0,
      bearing: 0,
      dragRotate: false,
      touchPitch: false,
      pitchWithRotate: false,
    });

    currentMap.touchZoomRotate.disableRotation();
    currentMap.setStyle(style, {
      transformStyle: (_previousStyle, nextStyle) => flattenStyle(nextStyle),
    });

    currentMap.once("load", () => {
      currentMap.setBearing(0);
      currentMap.setPitch(0);
      currentMap.setTerrain(null);
      setMap(currentMap);
      void loadZones(currentMap);
    });
    currentMap.on("moveend", () => void loadZones(currentMap));

    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        userMarkerRef.current?.remove();
        userMarkerRef.current = new maplibregl.Marker({ color: "#2563EB" })
          .setLngLat([coords.longitude, coords.latitude])
          .addTo(currentMap);
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 10_000 },
    );

    return () => {
      requestIdRef.current += 1;
      userMarkerRef.current?.remove();
      currentMap.remove();
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
          className="pointer-events-none absolute left-4 top-4 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
          role="status"
        >
          {status === "loading" ? labels.loading : labels.loadError}
        </div>
      )}
    </div>
  );
}
