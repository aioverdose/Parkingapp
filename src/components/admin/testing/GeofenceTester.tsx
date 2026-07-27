"use client";

import { useState, useCallback } from "react";
import Map, { Marker, Source, Layer, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { SimulatedDevice } from "@/lib/testing/simulatedDevice";
import { LONG_BEACH_CENTER } from "@/lib/testing/constants";
import type { GeofenceZone, GeofenceEvent } from "@/lib/testing/types";
import { Fence, Plus, Trash2, LogIn, LogOut, Clock } from "lucide-react";

interface Props {
  device: SimulatedDevice | null;
}

const GEOFENCE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export function GeofenceTester({ device }: Props) {
  const [viewState, setViewState] = useState({ latitude: LONG_BEACH_CENTER.lat, longitude: LONG_BEACH_CENTER.lng, zoom: 14 });
  const [geofences, setGeofences] = useState<GeofenceZone[]>([]);
  const [events, setEvents] = useState<GeofenceEvent[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [currentDraw, setCurrentDraw] = useState<{ lat: number; lng: number }[]>([]);
  const [geofenceName, setGeofenceName] = useState("");
  const [selectedGeofence, setSelectedGeofence] = useState<string | null>(null);
  const [devicePos, setDevicePos] = useState<{ lat: number; lng: number } | null>(null);

  const handleMapClick = useCallback(
    (e: { lngLat: { lat: number; lng: number } }) => {
      if (!drawing) return;
      setCurrentDraw((prev) => [...prev, { lat: e.lngLat.lat, lng: e.lngLat.lng }]);
    },
    [drawing],
  );

  const handleFinishDrawing = useCallback(() => {
    if (currentDraw.length < 3) return;
    const id = `gf-${Date.now()}`;
    setGeofences((prev) => [
      ...prev,
      { id, name: geofenceName || `Geofence ${prev.length + 1}`, coordinates: currentDraw, color: GEOFENCE_COLORS[prev.length % GEOFENCE_COLORS.length] },
    ]);
    setCurrentDraw([]);
    setDrawing(false);
    setGeofenceName("");
  }, [currentDraw, geofenceName]);

  const handleDeleteGeofence = useCallback((id: string) => {
    setGeofences((prev) => prev.filter((g) => g.id !== id));
    if (selectedGeofence === id) setSelectedGeofence(null);
  }, [selectedGeofence]);

  const isPointInPolygon = (lat: number, lng: number, polygon: { lat: number; lng: number }[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng, yi = polygon[i].lat;
      const xj = polygon[j].lng, yj = polygon[j].lat;
      if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  };

  const handleSimulateEntry = useCallback(
    (gfId: string) => {
      if (!device) return;
      const gf = geofences.find((g) => g.id === gfId);
      if (!gf || gf.coordinates.length === 0) return;
      const centerLat = gf.coordinates.reduce((s, c) => s + c.lat, 0) / gf.coordinates.length;
      const centerLng = gf.coordinates.reduce((s, c) => s + c.lng, 0) / gf.coordinates.length;
      device.setPosition(centerLat, centerLng, 0);
      device.broadcast().catch(() => {});
      setDevicePos({ lat: centerLat, lng: centerLng });
      setEvents((prev) => [
        { timestamp: new Date().toISOString(), geofenceId: gfId, geofenceName: gf.name, type: "entry", lat: centerLat, lng: centerLng },
        ...prev,
      ]);
    },
    [device, geofences],
  );

  const handleSimulateExit = useCallback(
    (gfId: string) => {
      if (!device) return;
      const gf = geofences.find((g) => g.id === gfId);
      if (!gf || gf.coordinates.length === 0) return;
      const centerLat = gf.coordinates.reduce((s, c) => s + c.lat, 0) / gf.coordinates.length;
      const centerLng = gf.coordinates.reduce((s, c) => s + c.lng, 0) / gf.coordinates.length;
      const exitLat = centerLat + 0.005;
      const exitLng = centerLng + 0.005;
      device.setPosition(exitLat, exitLng, 15);
      device.broadcast().catch(() => {});
      setDevicePos({ lat: exitLat, lng: exitLng });
      setEvents((prev) => [
        { timestamp: new Date().toISOString(), geofenceId: gfId, geofenceName: gf.name, type: "exit", lat: exitLat, lng: exitLng },
        ...prev,
      ]);
    },
    [device, geofences],
  );

  const drawPolygon = currentDraw.length >= 2 ? { type: "Feature" as const, geometry: { type: "Polygon" as const, coordinates: [[...currentDraw.map((c) => [c.lng, c.lat]), [currentDraw[0].lng, currentDraw[0].lat]]] }, properties: {} } : null;

  return (
    <div className="h-full flex">
      {/* Left sidebar */}
      <div className="w-80 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 overflow-y-auto space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Fence size={16} /> Geofence Tester
        </h3>

        <div className="space-y-2">
          <input type="text" value={geofenceName} onChange={(e) => setGeofenceName(e.target.value)} placeholder="Geofence name" className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button onClick={() => { setDrawing(!drawing); setCurrentDraw([]); }} className={`flex-1 text-sm font-medium py-2 rounded-lg transition ${drawing ? "bg-red-600 text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
              {drawing ? "Cancel Draw" : "Draw Geofence"}
            </button>
            {drawing && currentDraw.length >= 3 && (
              <button onClick={handleFinishDrawing} className="flex-1 bg-emerald-600 text-white text-sm font-medium py-2 rounded-lg transition">
                Finish ({currentDraw.length} pts)
              </button>
            )}
          </div>
          {drawing && <p className="text-[10px] text-zinc-400 text-center">Click on the map to add points. Min 3 points.</p>}
        </div>

        {/* Geofence list */}
        <div className="space-y-2">
          {geofences.map((gf) => (
            <div key={gf.id} className={`rounded-lg p-3 text-xs border ${selectedGeofence === gf.id ? "border-blue-300 bg-blue-50 dark:bg-blue-900/20" : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: gf.color }} />
                  <span className="font-bold">{gf.name}</span>
                </div>
                <button onClick={() => handleDeleteGeofence(gf.id)} className="text-zinc-400 hover:text-red-500"><Trash2 size={12} /></button>
              </div>
              <div className="text-zinc-500 mb-2">{gf.coordinates.length} vertices</div>
              <div className="flex gap-1.5">
                <button onClick={() => handleSimulateEntry(gf.id)} className="flex-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-medium py-1.5 rounded flex items-center justify-center gap-1">
                  <LogIn size={10} /> Entry
                </button>
                <button onClick={() => handleSimulateExit(gf.id)} className="flex-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-medium py-1.5 rounded flex items-center justify-center gap-1">
                  <LogOut size={10} /> Exit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <Map {...viewState} onMove={(e) => setViewState(e.viewState)} onClick={handleMapClick} style={{ width: "100%", height: "100%" }} mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json">
          <NavigationControl position="top-right" />
          {geofences.map((gf) => {
            const polygon = { type: "Feature" as const, geometry: { type: "Polygon" as const, coordinates: [[...gf.coordinates.map((c) => [c.lng, c.lat]), [gf.coordinates[0].lng, gf.coordinates[0].lat]]] }, properties: {} };
            return (
              <Source key={gf.id} id={`gf-${gf.id}`} type="geojson" data={polygon}>
                <Layer id={`gf-fill-${gf.id}`} type="fill" paint={{ "fill-color": gf.color, "fill-opacity": 0.15 }} />
                <Layer id={`gf-line-${gf.id}`} type="line" paint={{ "line-color": gf.color, "line-width": 2 }} />
              </Source>
            );
          })}
          {drawPolygon && (
            <Source id="current-draw" type="geojson" data={drawPolygon}>
              <Layer id="draw-fill" type="fill" paint={{ "fill-color": "#3b82f6", "fill-opacity": 0.2 }} />
              <Layer id="draw-line" type="line" paint={{ "line-color": "#3b82f6", "line-width": 2, "line-dasharray": [3, 3] }} />
            </Source>
          )}
          {currentDraw.map((c, i) => (
            <Marker key={i} latitude={c.lat} longitude={c.lng}>
              <div className="w-3 h-3 bg-blue-600 rounded-full border border-white" />
            </Marker>
          ))}
          {devicePos && (
            <Marker latitude={devicePos.lat} longitude={devicePos.lng}>
              <div className="w-5 h-5 bg-emerald-600 rounded-full border-2 border-white shadow-lg" />
            </Marker>
          )}
        </Map>
      </div>

      {/* Right sidebar: Event log */}
      <div className="w-72 shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
          <h4 className="text-xs font-bold text-zinc-500 uppercase">Events ({events.length})</h4>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {events.length === 0 && <p className="text-xs text-zinc-400 text-center mt-8">No geofence events yet</p>}
          {events.map((evt, i) => (
            <div key={i} className={`rounded-lg p-2.5 text-xs border ${evt.type === "entry" ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"}`}>
              <div className="flex items-center gap-1.5 mb-1">
                {evt.type === "entry" ? <LogIn size={12} className="text-emerald-600" /> : <LogOut size={12} className="text-red-600" />}
                <span className="font-bold uppercase">{evt.type}</span>
                <span className="text-zinc-500">— {evt.geofenceName}</span>
              </div>
              <div className="text-zinc-500 flex items-center gap-1">
                <Clock size={10} /> {new Date(evt.timestamp).toLocaleTimeString()}
                <span className="ml-1">{evt.lat.toFixed(5)}, {evt.lng.toFixed(5)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
