"use client";

import { useState, useCallback } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { SimulatedDevice } from "@/lib/testing/simulatedDevice";
import { PRESET_LOCATIONS } from "@/lib/testing/presetLocations";
import { LONG_BEACH_CENTER, MS_TO_MPH, MPH_TO_MS } from "@/lib/testing/constants";
import type { SimulatedPosition } from "@/lib/testing/types";
import { MapPin, Radio, RadioOff, Zap, ArrowDown, Compass } from "lucide-react";

interface Props {
  device: SimulatedDevice | null;
  onPositionUpdate: (pos: SimulatedPosition) => void;
}

export function GpsSimulator({ device, onPositionUpdate }: Props) {
  const [viewState, setViewState] = useState({
    latitude: LONG_BEACH_CENTER.lat,
    longitude: LONG_BEACH_CENTER.lng,
    zoom: 14,
  });
  const [lat, setLat] = useState(LONG_BEACH_CENTER.lat.toString());
  const [lng, setLng] = useState(LONG_BEACH_CENTER.lng.toString());
  const [speedMph, setSpeedMph] = useState(0);
  const [heading, setHeading] = useState(0);
  const [accuracy, setAccuracy] = useState(10);
  const [autoBroadcast, setAutoBroadcast] = useState(false);
  const [gpsNoise, setGpsNoise] = useState(false);
  const [underground, setUnderground] = useState(false);
  const [broadcastCount, setBroadcastCount] = useState(0);
  const [devicePos, setDevicePos] = useState<{ lat: number; lng: number } | null>(null);

  const applyPosition = useCallback(
    (newLat: number, newLng: number) => {
      if (!device) return;
      const speed = speedMph * MPH_TO_MS;
      device.setPosition(newLat, newLng, speed, heading, accuracy);
      setDevicePos({ lat: newLat, lng: newLng });
      setLat(newLat.toFixed(6));
      setLng(newLng.toFixed(6));
    },
    [device, speedMph, heading, accuracy],
  );

  const handleMapClick = useCallback(
    (e: { lngLat: { lat: number; lng: number } }) => {
      applyPosition(e.lngLat.lat, e.lngLat.lng);
    },
    [applyPosition],
  );

  const handleSetLocation = useCallback(() => {
    const newLat = parseFloat(lat);
    const newLng = parseFloat(lng);
    if (isNaN(newLat) || isNaN(newLng)) return;
    applyPosition(newLat, newLng);
    setViewState((prev) => ({ ...prev, latitude: newLat, longitude: newLng }));
  }, [lat, lng, applyPosition]);

  const handlePreset = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const idx = Number(e.target.value);
      if (idx < 0) return;
      const preset = PRESET_LOCATIONS[idx];
      applyPosition(preset.lat, preset.lng);
      setViewState((prev) => ({ ...prev, latitude: preset.lat, longitude: preset.lng, zoom: 15 }));
    },
    [applyPosition],
  );

  const handleBroadcast = useCallback(async () => {
    if (!device) return;
    await device.broadcast();
    onPositionUpdate(device.getPosition());
    setBroadcastCount((c) => c + 1);
  }, [device, onPositionUpdate]);

  const handleToggleAutoBroadcast = useCallback(() => {
    if (!device) return;
    if (autoBroadcast) {
      device.stopAutoBroadcast();
      setAutoBroadcast(false);
    } else {
      device.startAutoBroadcast();
      setAutoBroadcast(true);
    }
  }, [device, autoBroadcast]);

  const handleToggleNoise = useCallback(() => {
    if (!device) return;
    if (gpsNoise) {
      device.disableGpsNoise();
      setGpsNoise(false);
    } else {
      device.enableGpsNoise();
      setGpsNoise(true);
    }
  }, [device, gpsNoise]);

  const handleToggleUnderground = useCallback(() => {
    if (!device) return;
    if (underground) {
      device.disableUndergroundMode();
      setUnderground(false);
    } else {
      device.enableUndergroundMode();
      setUnderground(true);
    }
  }, [device, underground]);

  return (
    <div className="h-full flex">
      {/* Left sidebar controls */}
      <div className="w-80 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 overflow-y-auto space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">GPS Simulator</h3>

        {/* Preset */}
        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">Preset Locations</label>
          <select
            onChange={handlePreset}
            defaultValue="-1"
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="-1" disabled>Select a location...</option>
            {PRESET_LOCATIONS.map((p, i) => (
              <option key={i} value={i}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Manual coordinates */}
        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">Manual Coordinates</label>
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              step="0.000001"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="Latitude"
              className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="0.000001"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="Longitude"
              className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleSetLocation}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
          >
            <MapPin size={14} /> Set Location
          </button>
        </div>

        {/* Speed */}
        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">
            Speed: {speedMph.toFixed(1)} mph ({(speedMph * MPH_TO_MS).toFixed(1)} m/s)
          </label>
          <input
            type="range"
            min="0"
            max="60"
            step="0.5"
            value={speedMph}
            onChange={(e) => {
              const v = Number(e.target.value);
              setSpeedMph(v);
              if (device) device.setSpeed(v * MPH_TO_MS);
            }}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span>0</span><span>30</span><span>60 mph</span>
          </div>
        </div>

        {/* Heading */}
        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">
            Heading: {heading}°
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="360"
              step="5"
              value={heading}
              onChange={(e) => {
                const v = Number(e.target.value);
                setHeading(v);
                if (device) device.setHeading(v);
              }}
              className="flex-1"
            />
            <div
              className="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-600 flex items-center justify-center"
              style={{ transform: `rotate(${heading}deg)` }}
            >
              <Compass size={16} className="text-blue-600" />
            </div>
          </div>
        </div>

        {/* Accuracy */}
        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">
            Accuracy: ±{accuracy}m
          </label>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={accuracy}
            onChange={(e) => setAccuracy(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Toggles */}
        <div className="space-y-2">
          <button
            onClick={handleToggleNoise}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
              gpsNoise
                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700"
                : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
            }`}
          >
            <span>GPS Noise (±50m)</span>
            {gpsNoise ? <Zap size={14} /> : <Zap size={14} className="opacity-30" />}
          </button>

          <button
            onClick={handleToggleUnderground}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
              underground
                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700"
                : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
            }`}
          >
            <span>Underground Mode</span>
            {underground ? <ArrowDown size={14} /> : <ArrowDown size={14} className="opacity-30" />}
          </button>
        </div>

        {/* Broadcast controls */}
        <div className="space-y-2">
          <button
            onClick={handleBroadcast}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 rounded-lg transition"
          >
            Broadcast Once
          </button>
          <button
            onClick={handleToggleAutoBroadcast}
            className={`w-full flex items-center justify-center gap-2 text-sm font-medium py-2 rounded-lg transition ${
              autoBroadcast
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            {autoBroadcast ? <><RadioOff size={14} /> Stop Auto-Broadcast</> : <><Radio size={14} /> Start Auto-Broadcast</>}
          </button>
        </div>

        {/* Status */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-zinc-500">Broadcasts:</span>
            <span className="font-mono font-medium">{broadcastCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Auto-broadcast:</span>
            <span className={`font-medium ${autoBroadcast ? "text-emerald-600" : "text-zinc-400"}`}>
              {autoBroadcast ? "Active" : "Off"}
            </span>
          </div>
        </div>

        <p className="text-[10px] text-zinc-400 text-center">Click anywhere on the map to set location</p>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <Map
          {...viewState}
          onMove={(e) => setViewState(e.viewState)}
          onClick={handleMapClick}
          style={{ width: "100%", height: "100%" }}
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        >
          <NavigationControl position="top-right" />
          {devicePos && (
            <Marker latitude={devicePos.lat} longitude={devicePos.lng}>
              <div className="relative">
                <div className="w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-lg" />
                <div className="absolute inset-0 w-5 h-5 bg-blue-400 rounded-full animate-ping opacity-30" />
              </div>
            </Marker>
          )}
        </Map>
      </div>
    </div>
  );
}
