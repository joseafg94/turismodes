"use client";

import { useEffect } from "react";
import type { FeatureCollection, Polygon } from "geojson";
import maplibregl, { type GeoJSONSource } from "maplibre-gl";

export type ZoneRiskLevel = "low" | "medium" | "high" | "unknown";

type ZoneProperties = {
  id: string;
  name_en: string;
  name_es: string;
  risk_level: ZoneRiskLevel;
};

export type ZoneFeatureCollection = FeatureCollection<
  Polygon,
  ZoneProperties
>;

type ZoneLayerProps = {
  map?: maplibregl.Map;
  onZoneSelect: (id: string) => void;
  zones: ZoneFeatureCollection;
};

const SOURCE_ID = "zones";
const FILL_LAYER_ID = "zones-fill";
const OUTLINE_LAYER_ID = "zones-outline";
const EMPTY_ZONES: ZoneFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export function ZoneLayer({ map, onZoneSelect, zones }: ZoneLayerProps) {
  useEffect(() => {
    if (!map || !map.isStyleLoaded()) {
      return;
    }

    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: EMPTY_ZONES,
    });
    map.addLayer({
      id: FILL_LAYER_ID,
      type: "fill",
      source: SOURCE_ID,
      paint: {
        "fill-color": [
          "match",
          ["get", "risk_level"],
          "low",
          "#16A34A",
          "medium",
          "#EAB308",
          "high",
          "#DC2626",
          "#94A3B8",
        ],
        "fill-opacity": 0.45,
      },
    });
    map.addLayer({
      id: OUTLINE_LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      paint: {
        "line-color": [
          "match",
          ["get", "risk_level"],
          "low",
          "#16A34A",
          "medium",
          "#EAB308",
          "high",
          "#DC2626",
          "#94A3B8",
        ],
        "line-width": 2,
      },
    });

    const handleClick = (event: maplibregl.MapLayerMouseEvent) => {
      const id = event.features?.[0]?.properties?.id;

      if (typeof id === "string") {
        onZoneSelect(id);
      }
    };
    const showPointer = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const hidePointer = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("click", FILL_LAYER_ID, handleClick);
    map.on("mouseenter", FILL_LAYER_ID, showPointer);
    map.on("mouseleave", FILL_LAYER_ID, hidePointer);

    return () => {
      map.off("click", FILL_LAYER_ID, handleClick);
      map.off("mouseenter", FILL_LAYER_ID, showPointer);
      map.off("mouseleave", FILL_LAYER_ID, hidePointer);
    };
  }, [map, onZoneSelect]);

  useEffect(() => {
    const source = map?.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(zones);
  }, [map, zones]);

  return null;
}
