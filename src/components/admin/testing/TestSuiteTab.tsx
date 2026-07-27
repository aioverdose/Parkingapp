"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { SimulatedDevice } from "@/lib/testing/simulatedDevice";
import { TEST_USERS } from "@/lib/testing/constants";
import type { TestingPanel, ParkingDetectionEvent, SimulatedPosition } from "@/lib/testing/types";
import { GpsSimulator } from "./GpsSimulator";
import { RoutePlayback } from "./RoutePlayback";
import { ParkingTester } from "./ParkingTester";
import { TrackingMonitor } from "./TrackingMonitor";
import { EtaTester } from "./EtaTester";
import { GeofenceTester } from "./GeofenceTester";
import { ScenarioRunner } from "./ScenarioRunner";
import { Map, Route, Gauge, Radar, MapPin, Fence, Play, RotateCcw, AlertTriangle, ChevronDown } from "lucide-react";

const PANELS: { key: TestingPanel; label: string; icon: React.ReactNode; phase: 1 | 2 }[] = [
  { key: "gps", label: "GPS Simulator", icon: <Map size={16} />, phase: 1 },
  { key: "routes", label: "Route Playback", icon: <Route size={16} />, phase: 1 },
  { key: "parking", label: "Parking Detection", icon: <Gauge size={16} />, phase: 1 },
  { key: "tracking", label: "Tracking Monitor", icon: <Radar size={16} />, phase: 1 },
  { key: "eta", label: "ETA Tester", icon: <MapPin size={16} />, phase: 2 },
  { key: "geofence", label: "Geofence Tester", icon: <Fence size={16} />, phase: 2 },
  { key: "scenarios", label: "Scenario Runner", icon: <Play size={16} />, phase: 2 },
];

export function TestSuiteTab() {
  const supabase = createBrowserClient();
  const [activePanel, setActivePanel] = useState<TestingPanel>("gps");
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);
  const [events, setEvents] = useState<ParkingDetectionEvent[]>([]);
  const [positions, setPositions] = useState<SimulatedPosition[]>([]);
  const deviceRef = useRef<SimulatedDevice | null>(null);

  useEffect(() => {
    const device = new SimulatedDevice(supabase, TEST_USERS[selectedDeviceIndex].id);
    deviceRef.current = device;
    return () => device.destroy();
  }, [selectedDeviceIndex, supabase]);

  const getDevice = useCallback(() => deviceRef.current, []);

  const handlePositionUpdate = useCallback((pos: SimulatedPosition) => {
    setPositions((prev) => [...prev.slice(-599), pos]);
  }, []);

  const handleParkingEvent = useCallback((evt: ParkingDetectionEvent) => {
    setEvents((prev) => [...prev.slice(-99), evt]);
  }, []);

  const handleResetAll = useCallback(() => {
    const device = deviceRef.current;
    if (device) {
      device.destroy();
      deviceRef.current = new SimulatedDevice(supabase, TEST_USERS[selectedDeviceIndex].id);
    }
    setEvents([]);
    setPositions([]);
    localStorage.removeItem("testsuite_last_position");
  }, [selectedDeviceIndex, supabase]);

  return (
    <div className="h-screen flex flex-col">
      {/* TEST MODE Banner */}
      <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} />
          <span className="font-bold text-sm">TEST MODE</span>
          <span className="text-xs opacity-80">— Simulated GPS data only</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedDeviceIndex}
              onChange={(e) => setSelectedDeviceIndex(Number(e.target.value))}
              className="appearance-none bg-amber-600 text-white text-sm font-medium rounded-lg pl-3 pr-8 py-1.5 border border-amber-400 cursor-pointer"
            >
              {TEST_USERS.map((u, i) => (
                <option key={u.id} value={i}>{u.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button
            onClick={handleResetAll}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
          >
            <RotateCcw size={14} /> Reset All
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 px-4 pt-3 pb-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-x-auto shrink-0">
        {PANELS.map((p) => (
          <button
            key={p.key}
            onClick={() => setActivePanel(p.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              activePanel === p.key
                ? "bg-blue-600 text-white"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            {p.icon}
            {p.label}
            {p.phase === 2 && <span className="text-[10px] opacity-60 ml-0.5">P2</span>}
          </button>
        ))}
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {activePanel === "gps" && (
          <GpsSimulator device={getDevice()} onPositionUpdate={handlePositionUpdate} />
        )}
        {activePanel === "routes" && (
          <RoutePlayback device={getDevice()} onPositionUpdate={handlePositionUpdate} />
        )}
        {activePanel === "parking" && (
          <ParkingTester
            device={getDevice()}
            events={events}
            onParkingEvent={handleParkingEvent}
            onPositionUpdate={handlePositionUpdate}
          />
        )}
        {activePanel === "tracking" && (
          <TrackingMonitor />
        )}
        {activePanel === "eta" && <EtaTester />}
        {activePanel === "geofence" && <GeofenceTester device={getDevice()} />}
        {activePanel === "scenarios" && <ScenarioRunner device={getDevice()} />}
      </div>
    </div>
  );
}
