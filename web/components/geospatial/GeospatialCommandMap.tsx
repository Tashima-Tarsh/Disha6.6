"use client";

import DeckGL from "@deck.gl/react";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import { ScatterplotLayer } from "@deck.gl/layers";
import * as maplibregl from "maplibre-gl";
import { useMemo, useState } from "react";
import Map, { AttributionControl, Layer, NavigationControl, ScaleControl, Source } from "react-map-gl/maplibre";
import type { ViewState } from "react-map-gl/maplibre";

import { getOperationalBasemap } from "@/lib/geospatial/basemap-contract";
import type { OperationalFeatureCollection, OperationalGeoFeature } from "@/lib/geospatial/contracts";
import styles from "./geospatial-command-map.module.css";

maplibregl.setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs");

type PointDatum = {
  id: string;
  position: [number, number];
  weight: number;
};

const basemap = getOperationalBasemap();

export function GeospatialCommandMap({
  features,
  selectedFeatureId,
  onSelectFeature,
}: {
  features: OperationalFeatureCollection;
  selectedFeatureId: string | null;
  onSelectFeature: (feature: OperationalGeoFeature) => void;
}) {
  const [viewState, setViewState] = useState<ViewState>({
    longitude: 78.9629,
    latitude: 22.5937,
    zoom: 4.15,
    bearing: 0,
    pitch: 22,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  const points = useMemo<PointDatum[]>(() =>
    features.features.flatMap((feature) => {
      if (feature.geometry.type !== "Point") return [];
      return [{
        id: feature.properties.featureId,
        position: feature.geometry.coordinates,
        weight: Math.max(1, feature.properties.links.length),
      }];
    }), [features.features]);

  const deckLayers = useMemo(() => {
    if (!points.length) return [];
    return [
      new HeatmapLayer<PointDatum>({
        id: "disha-evidence-heat",
        data: points,
        getPosition: (item) => item.position,
        getWeight: (item) => item.weight,
        radiusPixels: 42,
        intensity: 0.65,
        threshold: 0.08,
      }),
      new ScatterplotLayer<PointDatum>({
        id: "disha-evidence-points",
        data: points,
        getPosition: (item) => item.position,
        getRadius: (item) => item.id === selectedFeatureId ? 9000 : 5200,
        radiusMinPixels: 3,
        radiusMaxPixels: 13,
        getFillColor: (item) => item.id === selectedFeatureId ? [242, 200, 109, 235] : [76, 189, 160, 205],
        getLineColor: [8, 19, 28, 220],
        lineWidthMinPixels: 1,
        stroked: true,
        pickable: false,
      }),
    ];
  }, [points, selectedFeatureId]);

  return (
    <div className={styles.shell} id="map">
      <Map
        {...viewState}
        mapLib={maplibregl}
        mapStyle={basemap.styleUrl}
        onMove={(event) => setViewState(event.viewState)}
        onClick={(event) => {
          const id = event.features?.[0]?.properties?.featureId;
          if (!id) return;
          const selected = features.features.find((feature) => feature.properties.featureId === id);
          if (selected) onSelectFeature(selected);
        }}
        interactiveLayerIds={["disha-polygons-fill", "disha-points"]}
        attributionControl={false}
        reuseMaps
      >
        <Source id="disha-admitted-geo" type="geojson" data={features as never}>
          <Layer
            id="disha-polygons-fill"
            type="fill"
            paint={{
              "fill-color": [
                "case",
                ["==", ["get", "featureId"], selectedFeatureId ?? ""],
                "#eec86d",
                "#3e8d78",
              ],
              "fill-opacity": 0.28,
            }}
          />
          <Layer
            id="disha-polygons-outline"
            type="line"
            paint={{
              "line-color": [
                "case",
                ["==", ["get", "featureId"], selectedFeatureId ?? ""],
                "#ffe0a0",
                "#78b9a8",
              ],
              "line-width": [
                "case",
                ["==", ["get", "featureId"], selectedFeatureId ?? ""],
                2.4,
                1.1,
              ],
              "line-opacity": 0.9,
            }}
          />
          <Layer
            id="disha-points"
            type="circle"
            paint={{
              "circle-radius": [
                "case",
                ["==", ["get", "featureId"], selectedFeatureId ?? ""],
                8,
                5,
              ],
              "circle-color": "#4cbda0",
              "circle-stroke-color": "#0b1820",
              "circle-stroke-width": 1.5,
            }}
          />
        </Source>
        <NavigationControl position="top-right" visualizePitch />
        <ScaleControl position="bottom-left" maxWidth={120} unit="metric" />
        <AttributionControl compact customAttribution={basemap.attribution} />
      </Map>

      <DeckGL
        viewState={viewState}
        layers={deckLayers}
        controller={false}
        style={{ position: "absolute", inset: "0px", pointerEvents: "none" }}
      />

      <div className={styles.mapStatus}>
        <span className={features.features.length ? styles.statusReady : styles.statusPending} />
        <div>
          <strong>{features.features.length ? `${features.features.length} admitted features` : "Context map active"}</strong>
          <small>
            {features.features.length
              ? "Every disha6.6 overlay is linked to admitted geospatial provenance."
              : "No authoritative disha6.6 geometry is admitted yet; the basemap is contextual only."}
          </small>
        </div>
      </div>

      <div className={styles.sourceBadge}>
        <strong>{basemap.label}</strong>
        <span>{basemap.role.replaceAll("_", " ")}</span>
      </div>
    </div>
  );
}
