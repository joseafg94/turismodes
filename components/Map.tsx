"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

const CASCO_VIEJO_CENTER: [number, number] = [-79.5169, 8.9537];

export default function Map() {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const style = process.env.NEXT_PUBLIC_MAP_STYLE_URL;

    if (!mapContainerRef.current || !style) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style,
      center: CASCO_VIEJO_CENTER,
      zoom: 15,
      pitch: 0,
      maxPitch: 0,
      bearing: 0,
      dragRotate: false,
      touchPitch: false,
      pitchWithRotate: false,
    });

    map.touchZoomRotate.disableRotation();
    map.on("style.load", () => {
      for (const layer of map.getStyle().layers ?? []) {
        if (layer.type === "fill-extrusion") {
          map.removeLayer(layer.id);
        }
      }
    });

    return () => map.remove();
  }, []);

  return <div ref={mapContainerRef} className="h-full w-full" />;
}
