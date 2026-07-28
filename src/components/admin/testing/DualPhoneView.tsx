"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { TEST_USERS } from "@/lib/testing/constants";
import type { DualPhoneState, PhoneNotification, VoiceNavInstruction } from "@/lib/testing/types";
import {
  Wifi, WifiOff, MapPin, Navigation, Car, Coffee, Moon, Bell,
  Volume2, Loader2, X, ChevronDown,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  driving: "#2563eb",
  parked: "#dc2626",
  idle: "#6b7280",
  offline: "#d1d5db",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  driving: <Car size={14} />,
  parked: <Coffee size={14} />,
  idle: <Moon size={14} />,
  offline: <MapPin size={14} />,
};

function createInitialState(userId: string, label: string): DualPhoneState {
  return {
    userId,
    label,
    lat: 33.7701,
    lng: -118.1937,
    speed: 0,
    heading: 0,
    accuracy: 10,
    status: "idle",
    notifications: [],
    voiceInstructions: [],
    currentInstruction: null,
  };
}

interface Props {
  running: boolean;
}

export function DualPhoneView({ running }: Props) {
  const supabase = useRef(createBrowserClient());
  const [devices, setDevices] = useState<[DualPhoneState, DualPhoneState]>([
    createInitialState(TEST_USERS[0].id, TEST_USERS[0].label),
    createInitialState(TEST_USERS[1].id, TEST_USERS[1].label),
  ]);

  const addNotification = useCallback((userId: string, notif: PhoneNotification) => {
    setDevices((prev) => {
      const next = [...prev] as [DualPhoneState, DualPhoneState];
      for (let i = 0; i < 2; i++) {
        if (next[i].userId === userId) {
          next[i] = { ...next[i], notifications: [...next[i].notifications.slice(-19), notif] };
          setTimeout(() => {
            setDevices((p) => {
              const n = [...p] as [DualPhoneState, DualPhoneState];
              for (let j = 0; j < 2; j++) {
                if (n[j].userId === userId) {
                  n[j] = { ...n[j], notifications: n[j].notifications.filter((x) => x.id !== notif.id) };
                }
              }
              return n;
            });
          }, 6000);
          break;
        }
      }
      return next;
    });
  }, []);

  // Subscribe to driver_locations for both test users
  useEffect(() => {
    const client = supabase.current;
    const userIds = [TEST_USERS[0].id, TEST_USERS[1].id];

    const channel = client
      .channel("test-suite:dual-phone")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "driver_locations",
          filter: `user_id=in.(${userIds.join(",")})`,
        },
        (payload) => {
          const row = payload.new as any;
          const idx = row.user_id === userIds[0] ? 0 : 1;
          setDevices((prev) => {
            const next = [...prev] as [DualPhoneState, DualPhoneState];
            const speed = row.speed ?? 0;
            let status: string = speed < 1 ? "parked" : "driving";
            next[idx] = {
              ...next[idx],
              lat: row.latitude,
              lng: row.longitude,
              speed,
              heading: row.heading ?? next[idx].heading,
              accuracy: row.accuracy ?? next[idx].accuracy,
              status: status as any,
            };
            return next;
          });
        },
      )
      .subscribe();

    return () => { void client.removeChannel(channel); };
  }, []);

  // Subscribe to notifications table for both test users
  useEffect(() => {
    const client = supabase.current;
    const userIds = [TEST_USERS[0].id, TEST_USERS[1].id];

    const channel = client
      .channel("test-suite:dual-phone-notifs")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=in.(${userIds.join(",")})`,
        },
        (payload) => {
          const row = payload.new as any;
          const notif: PhoneNotification = {
            id: row.id,
            title: row.title,
            message: row.message,
            type: row.type,
            timestamp: row.created_at,
          };
          addNotification(row.user_id, notif);
        },
      )
      .subscribe();

    return () => { void client.removeChannel(channel); };
  }, [addNotification]);

  // Generate voice nav instructions based on position changes
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setDevices((prev) => {
        const next = [...prev] as [DualPhoneState, DualPhoneState];
        for (let i = 0; i < 2; i++) {
          const d = next[i];
          if (d.status === "driving") {
            const instructions = [
              "Continue straight on Pine Ave",
              "Turn right onto Ocean Blvd in 500 ft",
              "Keep left onto Shoreline Dr",
              "Your destination is ahead on the right",
              "Turn left onto Broadway",
              "Merge onto the I-710 South",
              "Take exit 6A toward Downtown",
            ];
            const instr = instructions[Math.floor(Math.random() * instructions.length)];
            const voiceItem: VoiceNavInstruction = {
              text: instr,
              timestamp: new Date().toISOString(),
            };
            next[i] = {
              ...d,
              currentInstruction: instr,
              voiceInstructions: [...d.voiceInstructions.slice(-9), voiceItem],
            };
          } else if (d.status === "parked" && d.currentInstruction) {
            next[i] = { ...d, currentInstruction: null };
          }
        }
        return next;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [running]);

  const dismissNotif = (userId: string, notifId: string) => {
    setDevices((prev) => {
      const next = [...prev] as [DualPhoneState, DualPhoneState];
      for (let i = 0; i < 2; i++) {
        if (next[i].userId === userId) {
          next[i] = { ...next[i], notifications: next[i].notifications.filter((n) => n.id !== notifId) };
        }
      }
      return next;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 h-full">
      {devices.map((device, idx) => (
        <PhoneFrame key={device.userId} device={device} index={idx} onDismissNotif={dismissNotif} />
      ))}
    </div>
  );
}

function PhoneFrame({
  device,
  index,
  onDismissNotif,
}: {
  device: DualPhoneState;
  index: number;
  onDismissNotif: (userId: string, notifId: string) => void;
}) {
  const notifEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    notifEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [device.notifications.length, device.voiceInstructions.length]);

  return (
    <div className="flex flex-col items-center">
      {/* Phone body */}
      <div className="w-full max-w-sm bg-zinc-900 rounded-[2.5rem] border-4 border-zinc-700 shadow-2xl overflow-hidden relative">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-900 rounded-b-2xl z-20 flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-zinc-700" />
          <div className="w-16 h-1.5 rounded-full bg-zinc-800" />
        </div>

        {/* Screen */}
        <div className="bg-white dark:bg-zinc-950 pt-8" style={{ minHeight: "640px" }}>
          {/* Device header */}
          <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${device.status === "offline" ? "bg-zinc-300" : "bg-emerald-500"}`} />
                <span className="font-bold text-sm">{device.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {device.status === "offline" ? (
                  <><WifiOff size={12} className="text-zinc-400" /><span className="text-[10px] text-zinc-400">Offline</span></>
                ) : (
                  <><Wifi size={12} className="text-emerald-500" /><span className="text-[10px] text-emerald-600">Live</span></>
                )}
              </div>
            </div>
            {/* Status badge */}
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                style={{ backgroundColor: STATUS_COLORS[device.status] || "#6b7280" }}
              >
                {STATUS_ICONS[device.status]} {device.status}
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                {(device.speed * 2.23694).toFixed(1)} mph
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                {device.heading.toFixed(0)}°
              </span>
            </div>
          </div>

          {/* Mini map area */}
          <div className="h-44 bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(circle at center, rgba(59,130,246,0.1) 0%, transparent 70%)",
              }}
            />
            {/* Position dot */}
            <div
              className="absolute w-4 h-4 -ml-2 -mt-2"
              style={{
                left: `${((device.lng + 118.21) / 0.035) * 100}%`,
                top: `${((33.78 - device.lat) / 0.025) * 100}%`,
                transition: "left 0.5s, top 0.5s",
              }}
            >
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
                style={{ backgroundColor: STATUS_COLORS[device.status] || "#6b7280" }}
              />
              <div
                className="absolute inset-0 w-4 h-4 rounded-full animate-ping opacity-30"
                style={{ backgroundColor: STATUS_COLORS[device.status] || "#6b7280" }}
              />
            </div>
            {/* Coordinates */}
            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
              {device.lat.toFixed(5)}, {device.lng.toFixed(5)}
            </div>
            {/* Accuracy ring */}
            <div className="absolute bottom-2 right-2 text-[9px] text-zinc-400 font-mono">
              ±{device.accuracy.toFixed(0)}m
            </div>
          </div>

          {/* Current voice navigation instruction */}
          {device.currentInstruction && (
            <div className="mx-3 mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-start gap-2">
              <Volume2 size={16} className="text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">Voice Navigation</p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">{device.currentInstruction}</p>
              </div>
            </div>
          )}

          {/* Push notifications */}
          <div className="mx-3 mt-2">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Bell size={12} className="text-zinc-400" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Notifications</span>
              {device.notifications.length > 0 && (
                <span className="text-[10px] font-mono text-zinc-500">({device.notifications.length})</span>
              )}
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {device.notifications.map((n) => (
                <div
                  key={n.id}
                  className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5 relative animate-in slide-in-from-top-1"
                >
                  <button
                    onClick={() => onDismissNotif(device.userId, n.id)}
                    className="absolute top-1.5 right-1.5 text-zinc-400 hover:text-zinc-600"
                  >
                    <X size={12} />
                  </button>
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-200 pr-4">{n.title}</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">{n.message}</p>
                  <p className="text-[9px] text-amber-400 mt-0.5">
                    {new Date(n.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
              {device.notifications.length === 0 && (
                <p className="text-[10px] text-zinc-400 text-center py-2">No notifications yet</p>
              )}
            </div>
          </div>

          {/* Voice instruction log */}
          <div className="mx-3 mt-2 mb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Volume2 size={12} className="text-zinc-400" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Voice Nav Log</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {device.voiceInstructions.slice(-5).reverse().map((v, vi) => (
                <div key={vi} className="flex items-start gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <ChevronDown size={10} className="mt-0.5 shrink-0 text-blue-400" />
                  <span>{v.text}</span>
                  <span className="text-[9px] text-zinc-400 ml-auto shrink-0">
                    {new Date(v.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {device.voiceInstructions.length === 0 && (
                <p className="text-[10px] text-zinc-400 text-center py-2">No voice instructions yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Home indicator */}
        <div className="flex justify-center pb-2 pt-1 bg-white dark:bg-zinc-950">
          <div className="w-28 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>
      </div>
    </div>
  );
}
