"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { intelligenceFeedClient } from "@/lib/integrations/osiris/client";

export type IntelLayer =
  | "flights"
  | "earthquakes"
  | "fires"
  | "maritime"
  | "satellites"
  | "weather"
  | "cctv";

const LAYER_LABELS: Record<IntelLayer, string> = {
  flights: "Aviation (OpenSky)",
  earthquakes: "Seismic (USGS)",
  fires: "Wildfires (NASA FIRMS)",
  maritime: "Maritime / Ports",
  satellites: "Satellites (CelesTrak)",
  weather: "Severe Weather (NASA EONET)",
  cctv: "Public CCTV",
};

const LAYER_COLORS: Record<IntelLayer, string> = {
  flights: "#00e5ff",
  earthquakes: "#f9a825",
  fires: "#e65100",
  maritime: "#26c6da",
  satellites: "#b388ff",
  weather: "#7e57c2",
  cctv: "#ec407a",
};

const CARTO_DARK =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

interface IntelligenceMapProps {
  className?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
  onEntityClick?: (entity: {
    type: string;
    value: string;
    layer?: string;
    state?: string;
  }) => void;
}

export default function IntelligenceMap({
  className = "",
  initialCenter = [20, 0],
  initialZoom = 2,
  onEntityClick,
}: IntelligenceMapProps) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const onEntityClickRef = useRef(onEntityClick);

  useEffect(() => {
    onEntityClickRef.current = onEntityClick;
  }, [onEntityClick]);

  const [activeLayers, setActiveLayers] = useState<Record<IntelLayer, boolean>>({
    flights: true,
    earthquakes: true,
    fires: false,
    maritime: true,
    satellites: true,
    weather: false,
    cctv: false,
  });
  const [layerStats, setLayerStats] = useState<Record<string, { count: number; fetchedAt: string }>>({});
  const [ready, setReady] = useState(false);

  // maplibre-gl needs the worker for off-main-thread tile decoding
  maplibregl.setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs");

  const addLayer = useCallback(
    (map: maplibregl.Map, layer: IntelLayer, features: any) => {
      const sourceId = `osiris-${layer}`;
      const layerId = `${layer}-points`;
      const color = LAYER_COLORS[layer];

      if (map.getSource(sourceId)) map.removeSource(sourceId);
      map.addSource(sourceId, { type: "geojson", data: features });

      if (map.getLayer(layerId)) map.removeLayer(layerId);

      map.addLayer({
        id: layerId,
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 3, 5, 6, 10, 10],
          "circle-color": color,
          "circle-opacity": 0.8,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#000000",
          "circle-stroke-opacity": 0.7,
        },
      });

      map.on("click", layerId, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = (f.properties as Record<string, unknown>) ?? {};
        const coords = e.lngLat;
        const title = String(props.title || props.name || props.place || layer);
        const detail = String(
          props.summary ||
            props.place ||
            props.magnitude ||
            props.callsign ||
            props.vessel ||
            props.status ||
            "",
        );
        const source = String(props.source || props.source_name || "OSIRIS");
        const retrieved = props.retrieved_at || props.timestamp || props.time;
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: false })
          .setLngLat(coords)
          .setHTML(`
            <div class="p-2 text-xs font-mono leading-relaxed">
              <div class="font-bold text-cyan-300 mb-1">${escapeHtml(title)}</div>
              <div class="text-slate-300 mb-1">${escapeHtml(detail)}</div>
              <div class="text-[10px] text-slate-500 border-t border-slate-800 pt-1 flex justify-between">
                <span>${escapeHtml(layer)}</span>
                <span>${escapeHtml(source)}</span>
              </div>
              ${retrieved ? `<div class="text-[10px] text-slate-500 mt-1">retrieved ${escapeHtml(String(retrieved))}</div>` : ""}
            </div>
          `)
          .addTo(map);
        onEntityClickRef.current?.({
          type: String(props.feature_type ?? props.type ?? layer),
          value: title,
          layer,
          state: (props.verification_state ?? "observed") as
            | "observed"
            | "inferred"
            | "correlated"
            | "predicted"
            | "verify_required",
        });
      });
    },
    [],
  );

  const removeLayer = useCallback((map: maplibregl.Map, layer: IntelLayer) => {
    const sourceId = `osiris-${layer}`;
    const layerId = `${layer}-points`;
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  }, []);

  const fetchLayer = useCallback(async (layer: IntelLayer) => {
    try {
      const data = await intelligenceFeedClient.getFeed(layer);
      const features: any = data?.features ?? data ?? { type: "FeatureCollection", features: [] };
      setLayerStats((prev) => ({
        ...prev,
        [layer]: { count: (features.features ?? []).length, fetchedAt: new Date().toISOString() },
      }));
      return { layer, features };
    } catch (err) {
      console.warn(`[IntelligenceMap] ${layer} feed unavailable:`, err);
      setLayerStats((prev) => ({ ...prev, [layer]: { count: 0, fetchedAt: new Date().toISOString() } }));
      return { layer, features: { type: "FeatureCollection", features: [] } };
    }
  }, []);

  // Initialise map
  useEffect(() => {
    if (!containerRef.current) return;
    if (maplibregl) {
      // Carto basemap requires no access token
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CARTO_DARK,
      center: initialCenter,
      zoom: initialZoom,
      minZoom: 1,
      maxZoom: 18,
      attributionControl: {
        compact: true,
        customAttribution:
          "Basemap \u00a9 CARTO / OpenStreetMap \u00b7 Intelligence via OSIRIS (OpenSky, USGS, NASA FIRMS, CelesTrak, EONET, public CCTV)",
      } as const,
      transformRequest: (url: string) => {
        if (url.includes("cartocdn.com")) {
          return { url };
        }
        return { url };
      },
    });

    map.on("load", () => {
      mapRef.current = map;
      setReady(true);
      // Draw day/night terminator as a fill layer
      map.addSource("osiris-terminator", {
        type: "geojson",
        data: terminatorGeometry(),
      });
      map.addLayer({
        id: "terminator",
        type: "fill",
        source: "osiris-terminator",
        paint: { "fill-color": "#000000", "fill-opacity": 0.35 },
      });

      // Render active layers
      Object.keys(activeLayers).forEach((key) => {
        if (activeLayers[key as IntelLayer]) {
          void fetchLayer(key as IntelLayer).then(({ layer, features }) => {
            if (mapRef.current && activeLayers[layer]) {
              addLayer(mapRef.current!, layer, features);
            }
          });
        }
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-render layers when toggled
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    Object.keys(activeLayers).forEach((key) => {
      const layer = key as IntelLayer;
      if (activeLayers[layer]) {
        void fetchLayer(layer).then(({ layer: l, features }) => {
          if (mapRef.current && activeLayers[l]) addLayer(mapRef.current!, l, features);
        });
      } else {
        removeLayer(map, layer);
      }
    });
  }, [activeLayers, fetchLayer, addLayer, removeLayer]);

  const toggleLayer = (layer: IntelLayer) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 z-10">
          <span className="text-cyan-400 font-mono text-xs animate-pulse">initializing global intelligence grid…</span>
        </div>
      )}
      <div className="absolute bottom-2 right-2 z-30 flex flex-col gap-1 text-xs font-mono text-slate-400">
        {Object.entries(layerStats).map(([key, st]) => {
          const layer = key as IntelLayer;
          const on = activeLayers[layer];
          return (
            <div
              key={layer}
              className={`flex items-center gap-1.5 rounded bg-slate-900/80 border border-slate-800/60 px-2 py-1 backdrop-blur-sm ${on ? "border-cyan-500/40" : ""}`}
            >
              <span className={`text-[9px] font-bold ${on ? "text-cyan-300" : "text-slate-500"}`}>
                {LAYER_LABELS[layer]}
              </span>
              <span className="text-slate-500">{st.count}</span>
              <button
                type="button"
                onClick={() => toggleLayer(layer)}
                className="ml-2 p-0.5 rounded hover:bg-slate-800 transition-colors"
                aria-label={on ? `Disable ${LAYER_LABELS[layer]}` : `Enable ${LAYER_LABELS[layer]}`}
              >
                {on ? "✖" : "○"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function terminatorGeometry(): any {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const declination = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
  const decRad = (declination * Math.PI) / 180;
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const subsolarLng = (12 - utcHours) * 15;
  const points: [number, number][] = [];
  for (let lng = -180; lng <= 180; lng += 2) {
    const lngRad = ((lng - subsolarLng) * Math.PI) / 180;
    const lat = (Math.atan(-Math.cos(lngRad) / Math.tan(decRad)) * 180) / Math.PI;
    points.push([lng, lat]);
  }
  const darkSide = declination >= 0 ? -90 : 90;
  points.push([180, darkSide]);
  points.push([-180, darkSide]);
  points.push(points[0]);
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [points] },
    properties: {},
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
