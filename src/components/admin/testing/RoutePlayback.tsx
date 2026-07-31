"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Map, { Marker, Source, Layer, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { SimulatedDevice } from "@/lib/testing/simulatedDevice";
import { TEST_ROUTES } from "@/lib/testing/testRoutes";
import { parseGpx, waypointsToGeoJson } from "@/lib/testing/gpxParser";
import { LONG_BEACH_CENTER } from "@/lib/testing/constants";
import type { SimulatedPosition, RouteWaypoint, PlaybackState } from "@/lib/testing/types";
import { MAP_STYLE_URL } from "@/lib/map";
import { Route, Play, Pause, Square, SkipForward, SkipBack, Upload, ChevronDown } from "lucide-react";

interface Props {
  device: SimulatedDevice | null;
  onPositionUpdate: (pos: SimulatedPosition) => void;
}

export function RoutePlayback({ device, onPositionUpdate }: Props) {
  const [viewState, setViewState] = useState({
    latitude: LONG_BEACH_CENTER.lat,
    longitude: LONG_BEACH_CENTER.lng,
    zoom: 14,
  });
  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>([]);
  const [routeName, setRouteName] = useState<string>("");
  const [gpxText, setGpxText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [playback, setPlayback] = useState<PlaybackState>({
    playing: false,
    currentIndex: 0,
    totalWaypoints: 0,
    speedMultiplier: 1,
    percent: 0,
  });
  const [devicePos, setDevicePos] = useState<{ lat: number; lng: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (!device) return;
      const pos = device.getPosition();
      setDevicePos({ lat: pos.lat, lng: pos.lng });
      setPlayback(device.getPlaybackState());
      onPositionUpdate(pos);
    }, 200);
  }, [device, onPositionUpdate]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const loadRoute = useCallback(
    (wps: RouteWaypoint[], name: string) => {
      if (!device) return;
      setWaypoints(wps);
      setRouteName(name);
      setError(null);
      device.loadRoute(wps);
      setPlayback(device.getPlaybackState());
      if (wps.length > 0) {
        const bounds = wps.reduce(
          (b, w) => ({
            minLat: Math.min(b.minLat, w.lat),
            maxLat: Math.max(b.maxLat, w.lat),
            minLng: Math.min(b.minLng, w.lng),
            maxLng: Math.max(b.maxLng, w.lng),
          }),
          { minLat: Infinity, maxLat: -Infinity, minLng: Infinity, maxLng: -Infinity },
        );
        setViewState({
          latitude: (bounds.minLat + bounds.maxLat) / 2,
          longitude: (bounds.minLng + bounds.maxLng) / 2,
          zoom: 14,
        });
      }
    },
    [device],
  );

  const handlePresetRoute = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const idx = Number(e.target.value);
      if (idx < 0) return;
      const route = TEST_ROUTES[idx];
      loadRoute(route.waypoints, route.name);
    },
    [loadRoute],
  );

  const handleParseGpx = useCallback(() => {
    try {
      const wps = parseGpx(gpxText);
      if (wps.length === 0) { setError("No waypoints found in GPX"); return; }
      loadRoute(wps, "Custom GPX");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse GPX");
    }
  }, [gpxText, loadRoute]);

  const handlePlay = useCallback(() => {
    if (!device) return;
    device.startPlayback(playback.speedMultiplier);
    startPolling();
  }, [device, playback.speedMultiplier, startPolling]);

  const handlePause = useCallback(() => {
    if (!device) return;
    device.pausePlayback();
    stopPolling();
    setPlayback(device.getPlaybackState());
  }, [device, stopPolling]);

  const handleStop = useCallback(() => {
    if (!device) return;
    device.stopPlayback();
    stopPolling();
    setPlayback(device.getPlaybackState());
    setDevicePos(null);
  }, [device, stopPolling]);

  const handleStepForward = useCallback(() => {
    if (!device) return;
    device.stepForward();
    const pos = device.getPosition();
    setDevicePos({ lat: pos.lat, lng: pos.lng });
    setPlayback(device.getPlaybackState());
    onPositionUpdate(pos);
  }, [device, onPositionUpdate]);

  const handleStepBackward = useCallback(() => {
    if (!device) return;
    device.stepBackward();
    const pos = device.getPosition();
    setDevicePos({ lat: pos.lat, lng: pos.lng });
    setPlayback(device.getPlaybackState());
    onPositionUpdate(pos);
  }, [device, onPositionUpdate]);

  const handleSpeedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const speed = Number(e.target.value);
      setPlayback((prev) => ({ ...prev, speedMultiplier: speed }));
    },
    [],
  );

  const lineGeoJson = waypoints.length > 1 ? waypointsToGeoJson(waypoints) : null;

  return (
    <div className="h-full flex">
      {/* Left sidebar */}
      <div className="w-80 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 overflow-y-auto space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Route size={16} /> Route Playback
        </h3>

        {/* Preset routes */}
        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">Preset Routes</label>
          <select
            onChange={handlePresetRoute}
            defaultValue="-1"
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="-1" disabled>Select a route...</option>
            {TEST_ROUTES.map((r, i) => (
              <option key={i} value={i}>{r.name} — {r.description}</option>
            ))}
          </select>
        </div>

        {/* GPX upload */}
        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">Paste GPX XML</label>
          <textarea
            value={gpxText}
            onChange={(e) => setGpxText(e.target.value)}
            placeholder='<trk><trkseg><trkpt lat="33.77" lon="-118.19">...</trkpt></trkseg></trk>'
            rows={4}
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono resize-none"
          />
          <button
            onClick={handleParseGpx}
            disabled={!gpxText.trim()}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Upload size={14} /> Parse GPX
          </button>
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>

        {/* Route info */}
        {waypoints.length > 0 && (
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-500">Route:</span>
              <span className="font-medium">{routeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Waypoints:</span>
              <span className="font-mono">{playback.totalWaypoints}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Progress:</span>
              <span className="font-mono">{playback.currentIndex + 1} / {playback.totalWaypoints}</span>
            </div>
          </div>
        )}

        {/* Speed multiplier */}
        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">
            Speed: {playback.speedMultiplier}x
          </label>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={playback.speedMultiplier}
            onChange={handleSpeedChange}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span>1x</span><span>5x</span><span>10x</span>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-200"
              style={{ width: `${playback.percent}%` }}
            />
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex gap-2">
          <button
            onClick={handleStepBackward}
            disabled={playback.totalWaypoints === 0}
            className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 text-zinc-700 dark:text-zinc-300 py-2 rounded-lg transition flex items-center justify-center"
          >
            <SkipBack size={16} />
          </button>
          {playback.playing ? (
            <button
              onClick={handlePause}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg transition flex items-center justify-center gap-1 text-sm font-medium"
            >
              <Pause size={14} /> Pause
            </button>
          ) : (
            <button
              onClick={handlePlay}
              disabled={playback.totalWaypoints < 2}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white py-2 rounded-lg transition flex items-center justify-center gap-1 text-sm font-medium"
            >
              <Play size={14} /> Play
            </button>
          )}
          <button
            onClick={handleStop}
            disabled={playback.totalWaypoints === 0}
            className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 text-zinc-700 dark:text-zinc-300 py-2 rounded-lg transition flex items-center justify-center"
          >
            <Square size={16} />
          </button>
          <button
            onClick={handleStepForward}
            disabled={playback.totalWaypoints === 0}
            className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 text-zinc-700 dark:text-zinc-300 py-2 rounded-lg transition flex items-center justify-center"
          >
            <SkipForward size={16} />
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <Map
          {...viewState}
          onMove={(e) => setViewState(e.viewState)}
          style={{ width: "100%", height: "100%" }}
          mapStyle={MAP_STYLE_URL}
        >
          <NavigationControl position="top-right" />
          {lineGeoJson && (
            <Source id="route-line" type="geojson" data={lineGeoJson}>
              <Layer
                id="route-line-layer"
                type="line"
                paint={{
                  "line-color": "#2563eb",
                  "line-width": 3,
                  "line-opacity": 0.8,
                }}
              />
            </Source>
          )}
          {waypoints.map((w, i) => (
            <Marker key={i} latitude={w.lat} longitude={w.lng}>
              <div
                className={`w-2.5 h-2.5 rounded-full border border-white ${
                  i === playback.currentIndex ? "bg-red-500 scale-150" : "bg-blue-400"
                }`}
                title={w.name || `Waypoint ${i}`}
              />
            </Marker>
          ))}
          {devicePos && (
            <Marker latitude={devicePos.lat} longitude={devicePos.lng}>
              <div className="relative">
                <div className="w-5 h-5 bg-emerald-600 rounded-full border-2 border-white shadow-lg" />
                <div className="absolute inset-0 w-5 h-5 bg-emerald-400 rounded-full animate-ping opacity-30" />
              </div>
            </Marker>
          )}
        </Map>
      </div>
    </div>
  );
}
