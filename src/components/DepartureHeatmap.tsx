"use client";

import { useEffect, useState } from "react";
import Map, { Layer, Source } from "react-map-gl/maplibre";
import type { SavedParkingSpot } from "@/lib/parking-spot";
import { createBrowserClient } from "@/lib/supabaseClient";
import { MAP_STYLE_URL } from "@/lib/map";
import type { DepartureCell } from "@/lib/departure-heatmap";

export function DepartureHeatmap({ primarySpot }: { primarySpot: SavedParkingSpot | null }) {
  const [cells, setCells] = useState<DepartureCell[]>([]);
  useEffect(() => {
    if (!primarySpot) return;
    let cancelled = false;
    void createBrowserClient().auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) return;
       const localNow = new Date();
       const response = await fetch(`/api/profile/departure-heatmap?lat=${primarySpot.latitude}&lng=${primarySpot.longitude}&day=${localNow.getDay()}&hour=${localNow.getHours()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok && !cancelled) setCells((await response.json()).cells ?? []);
    });
    return () => { cancelled = true; };
  }, [primarySpot]);

  if (!primarySpot) return null;
  const data = { type: "FeatureCollection" as const, features: cells.map((cell) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [cell.lng, cell.lat] }, properties: { score: cell.score, level: cell.level } })) };
  return <section className="app-card mt-4 overflow-hidden p-5 sm:p-6" aria-labelledby="departure-patterns-title"><div className="mb-3"><p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#71807b]">Departure patterns</p><h2 id="departure-patterns-title" className="mt-1 text-sm font-bold">Aggregated neighborhood signal</h2></div><div className="h-56 overflow-hidden rounded-2xl"><Map initialViewState={{ latitude: primarySpot.latitude, longitude: primarySpot.longitude, zoom: 13.5 }} mapStyle={MAP_STYLE_URL} interactive={false} attributionControl={false} style={{ width: "100%", height: "100%" }}><Source id="departure-patterns" type="geojson" data={data}><Layer id="departure-pattern-circles" type="circle" paint={{ "circle-color": ["match", ["get", "level"], "high", "#2f9e62", "medium", "#d9982b", "#d6533f"], "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 8, 15, 22], "circle-opacity": 0.58, "circle-stroke-color": "#ffffff", "circle-stroke-width": 1 }} /></Source></Map></div><div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-[#52615b]" aria-label="Departure pattern legend"><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#2f9e62]" />More likely departures</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#d6533f]" />Lower signal</span></div><p className="mt-3 text-xs leading-5 text-[#71807b]">Aggregated neighborhood signal, not live availability or a parking guarantee.</p></section>;
}
