"use client";

import { useState, useEffect, useCallback } from "react";
import MapComponent, { Marker, NavigationControl, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { createBrowserClient } from "@/lib/supabaseClient";
import { TEST_USERS, LONG_BEACH_CENTER, IDLE_TIMEOUT_MS, PARKING_SPEED_THRESHOLD } from "@/lib/testing/constants";
import type { DeviceStatus } from "@/lib/testing/types";
import { Radar, Wifi, WifiOff, Clock, Car, Coffee, Moon } from "lucide-react";

interface DeviceState {
  userId: string;
  label: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  accuracy: number;
  recordedAt: string;
  status: DeviceStatus;
}

const STATUS_COLORS: Record<DeviceStatus, string> = {
  driving: "#2563eb",
  parked: "#dc2626",
  idle: "#6b7280",
  offline: "#d1d5db",
};

const STATUS_ICONS: Record<DeviceStatus, React.ReactNode> = {
  driving: <Car size={12} />,
  parked: <Coffee size={12} />,
  idle: <Moon size={12} />,
  offline: <Clock size={12} />,
};

function getStatus(speed: number, lastUpdate: string): DeviceStatus {
  const now = Date.now();
  const ts = new Date(lastUpdate).getTime();
  if (now - ts > IDLE_TIMEOUT_MS) return "offline";
  if (speed < PARKING_SPEED_THRESHOLD) return "parked";
  return "driving";
}

export function TrackingMonitor() {
  const supabase = createBrowserClient();
  const [devices, setDevices] = useState<Map<string, DeviceState>>(new Map());
  const [connected, setConnected] = useState(false);
  const [totalBroadcasts, setTotalBroadcasts] = useState(0);
  const [selectedDevice, setSelectedDevice] = useState<DeviceState | null>(null);
  const [viewState, setViewState] = useState({
    latitude: LONG_BEACH_CENTER.lat,
    longitude: LONG_BEACH_CENTER.lng,
    zoom: 14,
  });

  const testUserIds = TEST_USERS.map((u) => u.id);

  useEffect(() => {
    const fetchInitial = async () => {
      const { data } = await supabase
        .from("driver_locations")
        .select("*")
        .in("user_id", testUserIds)
        .order("recorded_at", { ascending: false });

      if (!data) return;
      const latest = new Map<string, DeviceState>();
      for (const row of data) {
        if (!latest.has(row.user_id)) {
          const user = TEST_USERS.find((u) => u.id === row.user_id);
          latest.set(row.user_id, {
            userId: row.user_id,
            label: user?.label ?? row.user_id.slice(0, 8),
            lat: row.latitude,
            lng: row.longitude,
            speed: row.speed ?? 0,
            heading: row.heading ?? 0,
            accuracy: row.accuracy ?? 0,
            recordedAt: row.recorded_at,
            status: getStatus(row.speed ?? 0, row.recorded_at),
          });
        }
      }
      setDevices(latest);
      setTotalBroadcasts(data.length);
    };

    fetchInitial();
  }, [supabase, testUserIds]);

  useEffect(() => {
    const channel = supabase
      .channel("test-suite:tracking-monitor")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "driver_locations", filter: `user_id=in.(${testUserIds.join(",")})` },
        (payload) => {
          const row = payload.new as {
            user_id: string;
            latitude: number;
            longitude: number;
            speed: number | null;
            heading: number | null;
            accuracy: number | null;
            recorded_at: string;
          };

          const user = TEST_USERS.find((u) => u.id === row.user_id);
          setDevices((prev) => {
            const next = new Map(prev);
            next.set(row.user_id, {
              userId: row.user_id,
              label: user?.label ?? row.user_id.slice(0, 8),
              lat: row.latitude,
              lng: row.longitude,
              speed: row.speed ?? 0,
              heading: row.heading ?? 0,
              accuracy: row.accuracy ?? 0,
              recordedAt: row.recorded_at,
              status: getStatus(row.speed ?? 0, row.recorded_at),
            });
            return next;
          });
          setTotalBroadcasts((c) => c + 1);
        },
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => { void supabase.removeChannel(channel); };
  }, [supabase, testUserIds]);

  const deviceArray = Array.from(devices.values());

  return (
    <div className="h-full flex">
      {/* Right sidebar: device list */}
      <div className="w-72 shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col order-2 lg:order-3">
        {/* Status bar */}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-zinc-500 uppercase">Devices ({deviceArray.length})</h4>
            <div className="flex items-center gap-1.5">
              {connected ? (
                <><Wifi size={12} className="text-emerald-500" /><span className="text-[10px] text-emerald-600">Connected</span></>
              ) : (
                <><WifiOff size={12} className="text-red-500" /><span className="text-[10px] text-red-600">Disconnected</span></>
              )}
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span>Broadcasts received:</span>
            <span className="font-mono">{totalBroadcasts}</span>
          </div>
        </div>

        {/* Device list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {deviceArray.length === 0 && (
            <p className="text-xs text-zinc-400 text-center mt-8">
              No test devices broadcasting yet.<br />
              Use the GPS Simulator to start.
            </p>
          )}
          {deviceArray.map((d) => (
            <button
              key={d.userId}
              onClick={() => setSelectedDevice(d)}
              className={`w-full text-left rounded-lg p-3 text-xs border transition ${
                selectedDevice?.userId === d.userId
                  ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20"
                  : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-zinc-900 dark:text-white">{d.label}</span>
                <span
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                  style={{ backgroundColor: STATUS_COLORS[d.status] }}
                >
                  {STATUS_ICONS[d.status]} {d.status}
                </span>
              </div>
              <div className="text-zinc-500 space-y-0.5">
                <div>{d.lat.toFixed(5)}, {d.lng.toFixed(5)}</div>
                <div>Speed: {(d.speed * 2.23694).toFixed(1)} mph | Accuracy: ±{d.accuracy.toFixed(0)}m</div>
                <div className="flex items-center gap-1">
                  <Clock size={10} />
                  {new Date(d.recordedAt).toLocaleTimeString()}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative order-1 lg:order-2">
        <MapComponent
          {...viewState}
          onMove={(e) => setViewState(e.viewState)}
          style={{ width: "100%", height: "100%" }}
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        >
          <NavigationControl position="top-right" />
          {deviceArray.map((d) => (
            <Marker key={d.userId} latitude={d.lat} longitude={d.lng}>
              <div className="relative cursor-pointer" onClick={() => setSelectedDevice(d)}>
                <div
                  className="w-5 h-5 rounded-full border-2 border-white shadow-lg"
                  style={{ backgroundColor: STATUS_COLORS[d.status] }}
                />
                <div
                  className="absolute inset-0 w-5 h-5 rounded-full animate-ping opacity-20"
                  style={{ backgroundColor: STATUS_COLORS[d.status] }}
                />
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/75 text-white text-[9px] px-1.5 py-0.5 rounded">
                  {d.label}
                </div>
              </div>
            </Marker>
          ))}
          {selectedDevice && (
            <Popup
              latitude={selectedDevice.lat}
              longitude={selectedDevice.lng}
              onClose={() => setSelectedDevice(null)}
              closeButton
            >
              <div className="text-xs p-1 space-y-1">
                <div className="font-bold">{selectedDevice.label}</div>
                <div>Speed: {(selectedDevice.speed * 2.23694).toFixed(1)} mph</div>
                <div>Heading: {selectedDevice.heading.toFixed(0)}°</div>
                <div>Accuracy: ±{selectedDevice.accuracy.toFixed(0)}m</div>
                <div>Updated: {new Date(selectedDevice.recordedAt).toLocaleTimeString()}</div>
              </div>
            </Popup>
          )}
        </MapComponent>

        {/* Status legend */}
        <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur rounded-lg p-3 text-[10px] space-y-1.5 shadow-lg">
          <div className="font-bold text-zinc-500 uppercase mb-1">Status Legend</div>
          {(["driving", "parked", "idle", "offline"] as DeviceStatus[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[s] }} />
              <span className="capitalize">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
