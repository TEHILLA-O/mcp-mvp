"use client";

import { geoArea, geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { useEffect, useMemo, useState } from "react";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";

export interface MapRow {
  geographyId: string;
  name: string;
  shapeName: string | null;
  value: number;
  unit: string;
  period: string;
}

export function NigeriaMap({
  rows,
  selectedId,
  onSelect,
}: {
  rows: MapRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [geo, setGeo] = useState<FeatureCollection<Geometry, { shapeName: string }> | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/geo/nigeria-states.geojson", { signal: controller.signal })
      .then((response) => response.json())
      .then((data: FeatureCollection<Geometry, { shapeName: string }>) => setGeo(data))
      .catch((reason: unknown) => {
        if ((reason as { name?: string }).name !== "AbortError") setError("The state boundaries could not be loaded.");
      });
    return () => controller.abort();
  }, []);

  const lookup = useMemo(() => new Map(rows.map((row) => [row.shapeName, row])), [rows]);
  const values = rows.map((row) => row.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const oriented = useMemo(() => (geo ? { ...geo, features: geo.features.map(orientFeature) } : null), [geo]);
  const path = useMemo(() => {
    if (!oriented) return null;
    const projection = geoMercator().fitExtent(
      [
        [24, 16],
        [616, 530],
      ],
      oriented as GeoPermissibleObjects,
    );
    return geoPath(projection);
  }, [oriented]);

  if (error) return <p className="p-6 text-sm text-[var(--danger)]">{error}</p>;
  if (!oriented || !path) return <div className="h-[560px] animate-pulse bg-black/5 dark:bg-white/5" aria-hidden />;

  const active = rows.find((row) => row.geographyId === (hover ?? selectedId));

  return (
    <div className="relative">
      <svg viewBox="0 0 640 560" role="group" aria-label="Choropleth of Nigeria by state" className="h-auto w-full">
        <defs>
          <pattern id="missing-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <rect width="6" height="6" fill="#241e2c" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#4a4158" strokeWidth="2" />
          </pattern>
        </defs>
        {oriented.features.map((feature) => {
          const row = lookup.get(feature.properties.shapeName);
          const selected = row?.geographyId === selectedId;
          const d = path(feature) ?? "";
          return (
            <path
              key={feature.properties.shapeName}
              d={d}
              tabIndex={0}
              role="button"
              aria-label={row ? `${row.name}, ${row.value.toFixed(2)} ${row.unit}, ${row.period}` : `${feature.properties.shapeName}, not published`}
              fill={row ? heat(row.value, min, max) : "url(#missing-hatch)"}
              stroke={selected || row?.geographyId === hover ? "#f8fafc" : "#1a1424"}
              strokeWidth={selected || row?.geographyId === hover ? 1.8 : 1}
              className="cursor-pointer outline-none focus-visible:stroke-[var(--accent)]"
              onMouseEnter={() => row && setHover(row.geographyId)}
              onMouseLeave={() => setHover(null)}
              onClick={() => row && onSelect(row.geographyId)}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && row) {
                  event.preventDefault();
                  onSelect(row.geographyId);
                }
              }}
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute top-3 left-3 rounded-xl border border-white/10 bg-[#12151f]/90 px-3 py-2 text-sm text-white">
        <p className="font-medium">{active ? active.name : "Hover a state"}</p>
        <p className="text-[#c5cad6]">{active ? `${active.value.toFixed(2)} ${active.unit} · ${active.period}` : "Missing stays hatched, not zero."}</p>
      </div>
    </div>
  );
}

function orientFeature(feature: Feature<Geometry, { shapeName: string }>) {
  if (geoArea(feature) < 1 || !feature.geometry) return feature;
  return { ...feature, geometry: rewind(feature.geometry) };
}

function rewind(geometry: Geometry): Geometry {
  if (geometry.type === "Polygon") return { ...geometry, coordinates: geometry.coordinates.map(reverseRing) };
  if (geometry.type === "MultiPolygon") return { ...geometry, coordinates: geometry.coordinates.map((polygon) => polygon.map(reverseRing)) };
  return geometry;
}

function reverseRing(ring: Position[]) {
  return [...ring].reverse();
}

function heat(value: number, min: number, max: number): string {
  const t = max === min ? 0.5 : (value - min) / (max - min);
  const stops = [
    [61, 214, 122],
    [244, 208, 63],
    [226, 59, 74],
  ];
  const scaled = t * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(scaled));
  const local = scaled - index;
  const from = stops[index] ?? stops[0]!;
  const to = stops[index + 1] ?? from;
  const channel = from.map((start, slot) => Math.round(start + ((to[slot] ?? start) - start) * local));
  return `rgb(${channel.join(",")})`;
}
