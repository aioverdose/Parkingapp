"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import {
  Loader2, RefreshCw, Smartphone, AlertTriangle,
  Activity, MapPin, Gauge, Sparkles,
} from "lucide-react";

interface DeviceTest {
  id: string;
  user_id: string;
  device_label: string | null;
  test_name: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  summary: {
    durationSeconds?: number;
    statesObserved?: string[];
    agentEvents?: { type: string; confidence: number; at: number }[];
    gpsFixes?: number;
    motionSamples?: number;
    peakVibration?: number;
    parkedLocation?: { lat: number; lng: number } | null;
    motionPermission?: string;
    fastMode?: boolean;
  } | null;
  created_at: string;
  user: { id: string; name: string | null; email: string | null } | null;
}

interface TestEvent {
  id: string;
  event_type: string;
  agent_state: string | null;
  agent_event_type: string | null;
  confidence: number | null;
  latitude: number | null;
  longitude: number | null;
  speed_ms: number | null;
  accuracy: number | null;
  vibration_energy: number | null;
  step_cadence: number | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

const EVENT_COLORS: Record<string, string> = {
  agent_event: "text-violet-600",
  state: "text-emerald-600",
  sensor: "text-blue-500",
  permission: "text-amber-600",
  note: "text-zinc-500",
  error: "text-red-500",
};

function formatDuration(started: string, ended: string | null): string {
  const end = ended ? new Date(ended).getTime() : Date.now();
  const secs = Math.max(0, Math.round((end - new Date(started).getTime()) / 1000));
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export function DeviceTestMonitor() {
  const supabase = createBrowserClient();
  const [tests, setTests] = useState<DeviceTest[]>([]);
  const [selected, setSelected] = useState<DeviceTest | null>(null);
  const [events, setEvents] = useState<TestEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTests = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch("/api/admin/behavior-tests", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        setError("Failed to load device tests");
        return;
      }
      const json = await res.json();
      setTests(json.tests ?? []);
      setError(null);
    } catch {
      setError("Failed to load device tests");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const fetchEvents = useCallback(async (testId: string) => {
    setEvents(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`/api/admin/behavior-tests?test_id=${testId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setEvents(json.events ?? []);
    } catch {
    }
  }, [supabase]);

  useEffect(() => {
    fetchTests();
    const interval = setInterval(fetchTests, 15_000);
    return () => clearInterval(interval);
  }, [fetchTests]);

  const selectTest = useCallback((test: DeviceTest) => {
    setSelected(test);
    void fetchEvents(test.id);
  }, [fetchEvents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-violet-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row bg-zinc-50 dark:bg-zinc-950">
      {/* List */}
      <div className="lg:w-96 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-violet-600" />
            <h3 className="text-sm font-bold">Device Tests</h3>
            <span className="text-[10px] text-zinc-400">({tests.length})</span>
          </div>
          <button
            onClick={fetchTests}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
        {error && (
          <div className="m-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2 text-xs text-red-600 flex items-center gap-1.5">
            <AlertTriangle size={12} /> {error}
          </div>
        )}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
          {tests.length === 0 && (
            <p className="text-xs text-zinc-400 text-center py-10 px-4">
              No device tests yet. Run one from the phone test page.
            </p>
          )}
          {tests.map((test) => (
            <button
              key={test.id}
              onClick={() => selectTest(test)}
              className={`w-full text-left p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition ${
                selected?.id === test.id ? "bg-violet-50 dark:bg-violet-900/20" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold truncate">
                  {test.user?.name || test.user?.email?.split("@")[0] || "Unknown"}
                </p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                  test.status === "complete"
                    ? "bg-emerald-50 text-emerald-600"
                    : test.status === "running"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-red-50 text-red-600"
                }`}>
                  {test.status}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 truncate">{test.test_name || "hardware sensor run"}</p>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400">
                <span>{test.device_label || "—"}</span>
                <span>·</span>
                <span>{formatDuration(test.started_at, test.ended_at)}</span>
                {test.summary?.agentEvents?.length ? (
                  <>
                    <span>·</span>
                    <span className="text-violet-500">{test.summary.agentEvents.length} events</span>
                  </>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8">
              <Smartphone size={48} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
              <p className="text-sm font-bold text-zinc-400">Device Test Monitor</p>
              <p className="text-xs text-zinc-400 mt-1">
                Real-hardware runs of the micro behavior agent, recorded from phones.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4 max-w-3xl">
            {/* Header */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold">{selected.test_name || "Device test"}</h3>
                <button onClick={() => setSelected(null)} className="text-xs text-zinc-400 hover:text-zinc-600">
                  Close
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                  <span className="text-zinc-400">User</span>
                  <p className="font-bold truncate">{selected.user?.name || selected.user?.email || "—"}</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                  <span className="text-zinc-400">Device</span>
                  <p className="font-bold truncate">{selected.device_label || "—"}</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                  <span className="text-zinc-400">Duration</span>
                  <p className="font-bold">{formatDuration(selected.started_at, selected.ended_at)}</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                  <span className="text-zinc-400">Mode</span>
                  <p className="font-bold">{selected.summary?.fastMode ? "Fast" : "Default"}</p>
                </div>
              </div>
            </div>

            {/* Summary */}
            {selected.summary && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
                <h4 className="text-xs font-bold mb-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-violet-600" /> Summary
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-xl font-black text-violet-600">{selected.summary.agentEvents?.length ?? 0}</p>
                    <p className="text-[10px] text-zinc-500">Agent events</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-blue-600">{selected.summary.gpsFixes ?? 0}</p>
                    <p className="text-[10px] text-zinc-500">GPS fixes</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-violet-500">{selected.summary.motionSamples ?? 0}</p>
                    <p className="text-[10px] text-zinc-500">Motion samples</p>
                  </div>
                  <div>
                    <p className="text-xl font-black">{selected.summary.peakVibration ?? 0}</p>
                    <p className="text-[10px] text-zinc-500">Peak vibration</p>
                  </div>
                </div>

                {selected.summary.statesObserved && selected.summary.statesObserved.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5">States observed</p>
                    <div className="flex flex-wrap gap-1">
                      {selected.summary.statesObserved.map((s) => (
                        <span key={s} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selected.summary.agentEvents && selected.summary.agentEvents.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5">Agent events</p>
                    <div className="flex flex-wrap gap-1">
                      {selected.summary.agentEvents.map((e, i) => (
                        <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                          {e.type} · {Math.round(e.confidence * 100)}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selected.summary.parkedLocation && (
                  <p className="text-[10px] text-zinc-400 mt-3 flex items-center gap-1.5">
                    <MapPin size={12} className="text-blue-500" />
                    Parked at {selected.summary.parkedLocation.lat.toFixed(5)}, {selected.summary.parkedLocation.lng.toFixed(5)}
                  </p>
                )}
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
              <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
                <Activity size={14} className="text-zinc-400" /> Timeline
                {events === null && <Loader2 className="animate-spin w-3 h-3 text-zinc-400" />}
              </h4>
              <div className="space-y-1">
                {events !== null && events.length === 0 && (
                  <p className="text-[11px] text-zinc-400 py-2">No recorded events.</p>
                )}
                {events?.map((e) => (
                  <div key={e.id} className="flex items-start gap-2 text-[11px] py-1 border-b border-zinc-50 dark:border-zinc-800/50 last:border-0">
                    <span className="text-zinc-300 dark:text-zinc-600 font-mono w-20 shrink-0">
                      {new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                    <span className={`font-mono font-bold w-24 shrink-0 ${EVENT_COLORS[e.event_type] ?? "text-zinc-500"}`}>
                      {e.event_type}
                    </span>
                    {e.agent_event_type ? (
                      <span className="text-violet-600 font-mono shrink-0">
                        {e.agent_event_type}
                        {e.confidence != null ? ` · ${Math.round(e.confidence * 100)}%` : ""}
                      </span>
                    ) : e.agent_state ? (
                      <span className="text-emerald-600 font-mono shrink-0">{e.agent_state}</span>
                    ) : null}
                    {e.latitude != null && (
                      <span className="text-zinc-400 font-mono shrink-0">
                        {e.latitude.toFixed(5)},{e.longitude?.toFixed(5)}
                      </span>
                    )}
                    {e.vibration_energy != null && (
                      <span className="text-zinc-400 font-mono shrink-0">
                        <Gauge size={10} className="inline mr-0.5" />{e.vibration_energy.toFixed(1)}
                      </span>
                    )}
                    {e.speed_ms != null && (
                      <span className="text-zinc-400 font-mono shrink-0">{e.speed_ms.toFixed(1)} m/s</span>
                    )}
                    {e.detail && Object.keys(e.detail).length > 0 && (
                      <span className="text-zinc-400 truncate">{JSON.stringify(e.detail)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
