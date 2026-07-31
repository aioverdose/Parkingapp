"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { SimulatedDevice } from "@/lib/testing/simulatedDevice";
import { LONG_BEACH_CENTER, PARKING_SPEED_THRESHOLD, PARKING_DETECTION_WINDOW, MPH_TO_MS, MS_TO_MPH } from "@/lib/testing/constants";
import type { SimulatedPosition, ParkingDetectionEvent } from "@/lib/testing/types";
import { MAP_STYLE_URL } from "@/lib/map";
import { Gauge, Car, AlertTriangle, CheckCircle, XCircle, Clock, Zap, ArrowDown, Play, Square } from "lucide-react";

interface Props {
  device: SimulatedDevice | null;
  events: ParkingDetectionEvent[];
  onParkingEvent: (evt: ParkingDetectionEvent) => void;
  onPositionUpdate: (pos: SimulatedPosition) => void;
}

export function ParkingTester({ device, events, onParkingEvent, onPositionUpdate }: Props) {
  const [speedMph, setSpeedMph] = useState(0);
  const [gpsNoise, setGpsNoise] = useState(false);
  const [underground, setUnderground] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [devicePos, setDevicePos] = useState<{ lat: number; lng: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recentSpeedsRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (simRef.current) clearInterval(simRef.current);
    };
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (!device) return;
      const pos = device.getPosition();
      setDevicePos({ lat: pos.lat, lng: pos.lng });
      onPositionUpdate(pos);

      recentSpeedsRef.current.push(pos.speed);
      if (recentSpeedsRef.current.length > PARKING_DETECTION_WINDOW) {
        recentSpeedsRef.current = recentSpeedsRef.current.slice(-PARKING_DETECTION_WINDOW);
      }

      if (recentSpeedsRef.current.length >= 10) {
        const allSlow = recentSpeedsRef.current.every((s) => s < PARKING_SPEED_THRESHOLD);
        if (allSlow) {
          const evt: ParkingDetectionEvent = {
            timestamp: new Date().toISOString(),
            lat: pos.lat,
            lng: pos.lng,
            speed: pos.speed,
            detected: true,
            method: `speed_threshold_${PARKING_DETECTION_WINDOW}s`,
          };
          onParkingEvent(evt);
          recentSpeedsRef.current = [];
        }
      }
    }, 1000);
  }, [device, onPositionUpdate, onParkingEvent]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const handleSetSpeed = useCallback(
    (mph: number) => {
      setSpeedMph(mph);
      if (device) device.setSpeed(mph * MPH_TO_MS);
    },
    [device],
  );

  const handleSimulateParking = useCallback(() => {
    if (!device) return;
    setSimulating(true);
    device.setSpeed(0);
    setSpeedMph(0);
    recentSpeedsRef.current = [];
    startPolling();

    let elapsed = 0;
    simRef.current = setInterval(() => {
      elapsed++;
      if (elapsed >= 30) {
        if (simRef.current) clearInterval(simRef.current);
        setSimulating(false);
        stopPolling();
      }
    }, 1000);
  }, [device, startPolling, stopPolling]);

  const handleStopSimulation = useCallback(() => {
    if (simRef.current) clearInterval(simRef.current);
    setSimulating(false);
    stopPolling();
  }, [stopPolling]);

  const handleSimulateDriving = useCallback(() => {
    if (!device) return;
    setSimulating(true);
    const pos = device.getPosition();
    let step = 0;
    const latStep = 0.0001;
    const lngStep = 0.00015;
    startPolling();

    simRef.current = setInterval(() => {
      if (!device) return;
      step++;
      const newLat = pos.lat + latStep * step;
      const newLng = pos.lng + lngStep * step;
      device.setPosition(newLat, newLng, 25 * MPH_TO_MS, 90);
      device.broadcast().catch(() => {});
      setSpeedMph(25);
      if (step >= 60) {
        if (simRef.current) clearInterval(simRef.current);
        setSimulating(false);
        stopPolling();
      }
    }, 1000);
  }, [device, startPolling, stopPolling]);

  const handleToggleNoise = useCallback(() => {
    if (!device) return;
    if (gpsNoise) { device.disableGpsNoise(); setGpsNoise(false); }
    else { device.enableGpsNoise(); setGpsNoise(true); }
  }, [device, gpsNoise]);

  const handleToggleUnderground = useCallback(() => {
    if (!device) return;
    if (underground) { device.disableUndergroundMode(); setUnderground(false); }
    else { device.enableUndergroundMode(); setUnderground(true); }
  }, [device, underground]);

  return (
    <div className="h-full flex">
      {/* Left sidebar */}
      <div className="w-80 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 overflow-y-auto space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Gauge size={16} /> Parking Detection
        </h3>

        {/* Speed control */}
        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">
            Manual Speed: {speedMph.toFixed(1)} mph ({(speedMph * MPH_TO_MS).toFixed(1)} m/s)
          </label>
          <input
            type="range"
            min="0"
            max="60"
            step="0.5"
            value={speedMph}
            onChange={(e) => handleSetSpeed(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Simulation buttons */}
        <div className="space-y-2">
          <button
            onClick={handleSimulateParking}
            disabled={simulating}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Car size={14} /> Simulate Parking (30s)
          </button>
          <button
            onClick={handleSimulateDriving}
            disabled={simulating}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Play size={14} /> Simulate Driving (25 mph)
          </button>
          {simulating && (
            <button
              onClick={handleStopSimulation}
              className="w-full bg-zinc-500 hover:bg-zinc-600 text-white text-sm font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
            >
              <Square size={14} /> Stop Simulation
            </button>
          )}
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
            <span>GPS Noise</span>
            <Zap size={14} className={gpsNoise ? "" : "opacity-30"} />
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
            <ArrowDown size={14} className={underground ? "" : "opacity-30"} />
          </button>
        </div>

        {/* Status */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-zinc-500">Current speed:</span>
            <span className="font-mono">{speedMph.toFixed(1)} mph</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Simulating:</span>
            <span className={`font-medium ${simulating ? "text-amber-600" : "text-zinc-400"}`}>
              {simulating ? "Active" : "Off"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Detection threshold:</span>
            <span className="font-mono">&lt;{PARKING_SPEED_THRESHOLD} m/s for {PARKING_DETECTION_WINDOW}s</span>
          </div>
        </div>
      </div>

      {/* Center: Map */}
      <div className="flex-1 relative">
        <Map
          latitude={LONG_BEACH_CENTER.lat}
          longitude={LONG_BEACH_CENTER.lng}
          zoom={14}
          style={{ width: "100%", height: "100%" }}
          mapStyle={MAP_STYLE_URL}
        >
          <NavigationControl position="top-right" />
          {devicePos && (
            <Marker latitude={devicePos.lat} longitude={devicePos.lng}>
              <div className="relative">
                <div className={`w-5 h-5 rounded-full border-2 border-white shadow-lg ${
                  speedMph < MPH_TO_MS * PARKING_SPEED_THRESHOLD ? "bg-red-600" : "bg-blue-600"
                }`} />
                <div className={`absolute inset-0 w-5 h-5 rounded-full animate-ping opacity-30 ${
                  speedMph < MPH_TO_MS * PARKING_SPEED_THRESHOLD ? "bg-red-400" : "bg-blue-400"
                }`} />
              </div>
            </Marker>
          )}
        </Map>
      </div>

      {/* Right sidebar: Event log */}
      <div className="w-72 shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
          <h4 className="text-xs font-bold text-zinc-500 uppercase">Detection Log ({events.length})</h4>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {events.length === 0 && (
            <p className="text-xs text-zinc-400 text-center mt-8">No parking events detected yet</p>
          )}
          {[...events].reverse().map((evt, i) => (
            <div
              key={i}
              className={`rounded-lg p-2.5 text-xs border ${
                evt.detected
                  ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {evt.detected ? (
                  <CheckCircle size={12} className="text-emerald-600" />
                ) : (
                  <XCircle size={12} className="text-red-600" />
                )}
                <span className="font-bold">
                  {evt.detected ? "PARKING DETECTED" : "No detection"}
                </span>
              </div>
              <div className="text-zinc-500 space-y-0.5">
                <div className="flex items-center gap-1">
                  <Clock size={10} />
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </div>
                <div>{evt.lat.toFixed(5)}, {evt.lng.toFixed(5)}</div>
                <div>Speed: {evt.speed.toFixed(1)} m/s | Method: {evt.method}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
