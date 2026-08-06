"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { BehaviorAgent } from "@/lib/behavior/agent";
import { GpsSensor, MotionSensor, requestMotionPermission, isMotionSensorSupported } from "@/lib/behavior/sensors";
import { FAST_BEHAVIOR_AGENT_CONFIG } from "@/lib/behavior/device-test";
import type { DeviceTestEventPayload, DeviceTestSummary } from "@/lib/behavior/device-test";
import type {
  BehaviorAgentEvent,
  BehaviorAgentSnapshot,
  BehaviorAgentState,
  GpsSample,
  MotionFeatures,
  MotionPermissionState,
} from "@/lib/behavior/types";
import {
  ArrowLeft, Play, Square, RotateCcw, Activity, Footprints,
  Radio, CheckCircle2, XCircle, Loader2, Sparkles,
} from "lucide-react";

type LogKind = "state" | "event" | "gps" | "motion" | "permission" | "note" | "error";

interface LogEntry {
  id: number;
  kind: LogKind;
  message: string;
  at: number;
}

const EVENT_CHECKLIST = [
  "PARK_CONFIRMED",
  "WALKING_AWAY_CONFIRMED",
  "RETURNING_CONFIRMED",
  "NEAR_CAR_CONFIRMED",
  "CAR_MOVED_CONFIRMED",
];

const PHASE_HINTS: Record<BehaviorAgentState, string> = {
  unknown: "Start driving. The agent watches for you to park.",
  driving: "Keep driving, then park somewhere.",
  parking_in_progress: "Parked — stay still, the agent is confirming parking...",
  parked: "Exit the car and walk away from it.",
  walking_away: "Keep walking away from the car.",
  away: "Now walk back toward the car.",
  returning: "Keep walking back to the car.",
  near_car: "You're near the car. Get in and drive off.",
  vehicle_moved: "All events detected. End the test.",
};

const EMPTY_SNAPSHOT: BehaviorAgentSnapshot = {
  state: "unknown",
  parkedLocation: null,
  parkedAt: null,
  speedMs: null,
  distanceToCarMeters: null,
  walkingEtaSeconds: null,
  parkingProgress: 0,
  lastEvent: null,
  motionAvailable: false,
  gpsAvailable: false,
};

export default function BehaviorDeviceTestPage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [motionSupported, setMotionSupported] = useState(false);
  const [motionPermission, setMotionPermission] = useState<MotionPermissionState>("unknown");
  const [fastMode, setFastMode] = useState(false);
  const [snapshot, setSnapshot] = useState<BehaviorAgentSnapshot>(EMPTY_SNAPSHOT);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [detectedEventTypes, setDetectedEventTypes] = useState<string[]>([]);
  const [gpsStatus, setGpsStatus] = useState({ fixes: 0, running: false, last: null as GpsSample | null });
  const [motionStatus, setMotionStatus] = useState({ samples: 0, running: false, last: null as MotionFeatures | null, permission: "unknown" as MotionPermissionState });

  const agentRef = useRef<BehaviorAgent | null>(null);
  const gpsRef = useRef<GpsSensor | null>(null);
  const motionRef = useRef<MotionSensor | null>(null);
  const testIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const lastStateRef = useRef<BehaviorAgentState | null>(null);
  const lastGpsLogAtRef = useRef(0);
  const lastMotionLogAtRef = useRef(0);
  const startedAtRef = useRef(0);
  const peakVibrationRef = useRef(0);
  const logIdRef = useRef(0);
  const logRef = useRef<LogEntry[]>([]);
  const runningRef = useRef(false);
  const fastModeRef = useRef(false);
  const statsRef = useRef({ gpsFixes: 0, motionSamples: 0, agentEvents: [] as { type: string; confidence: number; at: number }[] });

  const addLog = useCallback((kind: LogKind, message: string) => {
    const entry: LogEntry = { id: ++logIdRef.current, kind, message, at: Date.now() };
    const next = [...logRef.current.slice(-199), entry];
    logRef.current = next;
    setLog(next);
  }, []);

  const postEvents = useCallback(async (events: DeviceTestEventPayload[]) => {
    const testId = testIdRef.current;
    const token = tokenRef.current;
    if (!testId || !token) return;
    try {
      await fetch(`/api/behavior/tests/${testId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ events }),
      });
    } catch {
    }
  }, []);

  const handleAgentEvents = useCallback((events: BehaviorAgentEvent[]) => {
    const agent = agentRef.current;
    const now = Date.now();
    for (const ev of events) {
      addLog("event", `${ev.type} — ${Math.round(ev.confidence * 100)}%`);
      statsRef.current.agentEvents.push({ type: ev.type, confidence: ev.confidence, at: ev.timestamp });
      setDetectedEventTypes((prev) => prev.includes(ev.type) ? prev : [...prev, ev.type]);
      postEvents([{
        eventType: "agent_event",
        agentState: ev.state,
        agentEventType: ev.type,
        confidence: ev.confidence,
        lat: ev.lat ?? null,
        lng: ev.lng ?? null,
        timestamp: ev.timestamp,
      }]);
    }
    if (agent) {
      const st = agent.getState();
      if (st !== lastStateRef.current) {
        lastStateRef.current = st;
        addLog("state", st);
        postEvents([{ eventType: "state", agentState: st, timestamp: now }]);
      }
    }
  }, [addLog, postEvents]);

  const handleGpsSample = useCallback((sample: GpsSample) => {
    const agent = agentRef.current;
    if (!agent || !runningRef.current) return;
    const events = agent.ingest({ timestamp: sample.timestamp, gps: sample, motion: null });
    handleAgentEvents(events);
    statsRef.current.gpsFixes++;
    setGpsStatus((prev) => ({ fixes: prev.fixes + 1, running: true, last: sample }));
    if (statsRef.current.gpsFixes === 1) {
      addLog("gps", "First GPS fix acquired");
      postEvents([{
        eventType: "sensor",
        detail: { milestone: "first_fix" },
        lat: sample.lat,
        lng: sample.lng,
        speedMs: sample.speedMs ?? null,
        accuracy: sample.accuracy ?? null,
        timestamp: sample.timestamp,
      }]);
    }
    if (Date.now() - lastGpsLogAtRef.current >= 10_000) {
      lastGpsLogAtRef.current = Date.now();
      postEvents([{
        eventType: "sensor",
        lat: sample.lat,
        lng: sample.lng,
        speedMs: sample.speedMs ?? null,
        accuracy: sample.accuracy ?? null,
        timestamp: sample.timestamp,
      }]);
    }
  }, [handleAgentEvents, addLog, postEvents]);

  const handleMotionFeatures = useCallback((features: MotionFeatures) => {
    const agent = agentRef.current;
    if (!agent || !runningRef.current) return;
    const events = agent.ingest({ timestamp: features.timestamp, gps: null, motion: features });
    handleAgentEvents(events);
    statsRef.current.motionSamples++;
    if (features.vibrationEnergy > peakVibrationRef.current) {
      peakVibrationRef.current = features.vibrationEnergy;
    }
    setMotionStatus((prev) => ({ ...prev, samples: prev.samples + 1, running: true, last: features }));
    if (statsRef.current.motionSamples === 1) {
      addLog("motion", "Motion data streaming");
      postEvents([{
        eventType: "sensor",
        detail: { milestone: "first_motion" },
        vibrationEnergy: features.vibrationEnergy,
        stepCadence: features.stepCadence,
        timestamp: features.timestamp,
      }]);
    }
    if (Date.now() - lastMotionLogAtRef.current >= 10_000) {
      lastMotionLogAtRef.current = Date.now();
      postEvents([{
        eventType: "sensor",
        vibrationEnergy: features.vibrationEnergy,
        stepCadence: features.stepCadence,
        timestamp: features.timestamp,
      }]);
    }
  }, [handleAgentEvents, addLog, postEvents]);

  const stopSensors = useCallback(() => {
    gpsRef.current?.stop();
    motionRef.current?.stop();
    gpsRef.current = null;
    motionRef.current = null;
  }, []);

  const endTest = useCallback(async (aborted: boolean) => {
    if (!runningRef.current) return;
    runningRef.current = false;
    setRunning(false);
    stopSensors();

    const agent = agentRef.current;
    if (agent) setSnapshot(agent.getSnapshot());

    const durationSeconds = Math.round((Date.now() - startedAtRef.current) / 1000);
    const statesObserved = Array.from(
      new Set(logRef.current.filter((l) => l.kind === "state").map((l) => l.message)),
    );

    const summary: DeviceTestSummary = {
      durationSeconds,
      statesObserved,
      agentEvents: statsRef.current.agentEvents,
      gpsFixes: statsRef.current.gpsFixes,
      motionSamples: statsRef.current.motionSamples,
      peakVibration: Math.round(peakVibrationRef.current * 100) / 100,
      parkedLocation: agent?.getSnapshot().parkedLocation ?? null,
      motionPermission,
      fastMode: fastModeRef.current,
    };

    const testId = testIdRef.current;
    const token = tokenRef.current;
    if (testId && token) {
      try {
        await fetch(`/api/behavior/tests/${testId}/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: aborted ? "aborted" : "complete", summary }),
        });
      } catch {
      }
    }
    addLog(aborted ? "error" : "note", aborted ? "Test aborted." : "Test complete — sent to admin dashboard.");
    setGpsStatus((prev) => ({ ...prev, running: false }));
    setMotionStatus((prev) => ({ ...prev, running: false }));
  }, [stopSensors, addLog, motionPermission]);

  const handleStart = useCallback(async () => {
    if (starting || runningRef.current) return;
    setStarting(true);
    setError(null);
    try {
      const token = tokenRef.current;
      if (!token) {
        setError("Not authenticated — sign in first.");
        setStarting(false);
        return;
      }

      const res = await fetch("/api/behavior/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          testName: fastModeRef.current ? "device test (fast mode)" : "device test (default thresholds)",
          deviceLabel: navigator.userAgent.includes("iPhone") || navigator.userAgent.includes("iPad")
            ? "iOS device"
            : navigator.userAgent.includes("Android")
              ? "Android device"
              : "Desktop/browser",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.test?.id) {
        throw new Error(data.error || "Failed to start test session");
      }
      testIdRef.current = data.test.id;

      let perm: MotionPermissionState = "unknown";
      if (motionSupported) {
        perm = await requestMotionPermission();
        setMotionPermission(perm);
        setMotionStatus((prev) => ({ ...prev, permission: perm }));
      }
      postEvents([{ eventType: "permission", detail: { motion: perm, motionSupported }, timestamp: Date.now() }]);

      const agent = new BehaviorAgent(fastModeRef.current ? FAST_BEHAVIOR_AGENT_CONFIG : {});
      agentRef.current = agent;
      lastStateRef.current = null;
      startedAtRef.current = Date.now();
      lastGpsLogAtRef.current = 0;
      lastMotionLogAtRef.current = 0;
      peakVibrationRef.current = 0;
      statsRef.current = { gpsFixes: 0, motionSamples: 0, agentEvents: [] };
      setSnapshot(EMPTY_SNAPSHOT);

      const gps = new GpsSensor(handleGpsSample, (err) => {
        addLog("error", `GPS error: ${err?.message ?? "unavailable"}`);
        postEvents([{ eventType: "error", detail: { source: "gps", message: err?.message ?? "unavailable" }, timestamp: Date.now() }]);
      });
      gpsRef.current = gps;
      gps.start();

      if (motionSupported) {
        const motion = new MotionSensor(handleMotionFeatures);
        motionRef.current = motion;
        motion.start();
      }

      runningRef.current = true;
      setRunning(true);
      setGpsStatus({ fixes: 0, running: true, last: null });
      setMotionStatus({ samples: 0, running: true, last: null, permission: perm });
      addLog("note", `Test started — ${fastModeRef.current ? "fast" : "default"} thresholds`);
      addLog("permission", `Motion permission: ${perm}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start test");
    } finally {
      setStarting(false);
    }
  }, [starting, motionSupported, postEvents, addLog, handleGpsSample, handleMotionFeatures]);

  const handleReset = useCallback(() => {
    stopSensors();
    runningRef.current = false;
    setRunning(false);
    setSnapshot(EMPTY_SNAPSHOT);
    setGpsStatus({ fixes: 0, running: false, last: null });
    setMotionStatus({ samples: 0, running: false, last: null, permission: motionPermission });
    setDetectedEventTypes([]);
    setError(null);
    logRef.current = [];
    setLog([]);
    lastStateRef.current = null;
    agentRef.current = null;
    testIdRef.current = null;
  }, [stopSensors, motionPermission]);

  useEffect(() => {
    setMotionSupported(isMotionSensorSupported());
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (!session?.user) {
        router.push("/");
        return;
      }
      tokenRef.current = session.access_token;
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const agent = agentRef.current;
      if (agent) setSnapshot(agent.getSnapshot());
    }, 500);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    return () => {
      if (runningRef.current && testIdRef.current && tokenRef.current) {
        const testId = testIdRef.current;
        const token = tokenRef.current;
        void fetch(`/api/behavior/tests/${testId}/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: "aborted", summary: null }),
        }).catch(() => {});
      }
    };
  }, []);

  const detectedEvents = new Set(detectedEventTypes);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-28">
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => router.push("/profile")} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold">Behavior Agent Test</h1>
            <p className="text-[11px] text-zinc-500">Real GPS + motion on this device</p>
          </div>
          {running && (
            <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
            </span>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 text-xs text-red-600 dark:text-red-400 font-medium">
            {error}
          </div>
        )}

        {/* Script / phase card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <Sparkles size={16} className="text-violet-500" /> Live Agent
            </h2>
            <span className={`font-mono text-xs font-bold px-2.5 py-1 rounded-full ${
              snapshot.state === "parked" || snapshot.state === "near_car"
                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600"
                : snapshot.state === "vehicle_moved"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
            }`}>
              {snapshot.state}
            </span>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">{PHASE_HINTS[snapshot.state]}</p>

          {snapshot.state === "parking_in_progress" && (
            <div className="mb-4">
              <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, snapshot.parkingProgress * 100)}%` }} />
              </div>
              <p className="text-[10px] text-zinc-400 mt-1.5">{Math.round(Math.min(1, snapshot.parkingProgress) * 100)}% confirmed</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-[11px] mb-4">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
              <span className="text-zinc-400">Dist to car</span>
              <p className="font-mono font-bold mt-0.5">
                {snapshot.distanceToCarMeters != null ? `${Math.round(snapshot.distanceToCarMeters)} m` : "—"}
              </p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
              <span className="text-zinc-400">Speed</span>
              <p className="font-mono font-bold mt-0.5">
                {snapshot.speedMs != null ? `${snapshot.speedMs.toFixed(1)} m/s` : "—"}
              </p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 col-span-2">
              <span className="text-zinc-400">Parked location</span>
              <p className="font-mono font-bold mt-0.5">
                {snapshot.parkedLocation
                  ? `${snapshot.parkedLocation.lat.toFixed(5)}, ${snapshot.parkedLocation.lng.toFixed(5)}`
                  : "Not parked yet"}
              </p>
            </div>
          </div>

          <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2">Events to detect</p>
          <div className="grid grid-cols-1 gap-1">
            {EVENT_CHECKLIST.map((name) => {
              const done = detectedEvents.has(name);
              return (
                <div key={name} className={`flex items-center gap-2 text-[11px] font-mono px-2 py-1.5 rounded-lg ${done ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400"}`}>
                  {done ? <CheckCircle2 size={13} /> : <XCircle size={13} className="text-zinc-300 dark:text-zinc-600" />}
                  {name}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sensor cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <Radio size={14} className="text-blue-500" /> GPS
              </span>
              <span className={`w-2 h-2 rounded-full ${gpsStatus.running ? "bg-blue-500 animate-pulse" : "bg-zinc-300 dark:bg-zinc-700"}`} />
            </div>
            <p className="text-2xl font-black font-mono">{gpsStatus.fixes}</p>
            <p className="text-[10px] text-zinc-400 mb-2">fixes</p>
            {gpsStatus.last ? (
              <>
                <p className="font-mono text-[10px] text-zinc-500 truncate">
                  {gpsStatus.last.lat.toFixed(5)}, {gpsStatus.last.lng.toFixed(5)}
                </p>
                <p className="text-[10px] text-zinc-400">
                  ±{Math.round(gpsStatus.last.accuracy ?? 0)} m · {gpsStatus.last.speedMs != null ? `${gpsStatus.last.speedMs.toFixed(1)} m/s` : "no speed"}
                </p>
              </>
            ) : (
              <p className="text-[10px] text-zinc-400">Waiting for fix...</p>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <Activity size={14} className="text-violet-500" /> Motion
              </span>
              <span className={`w-2 h-2 rounded-full ${motionStatus.running ? "bg-violet-500 animate-pulse" : "bg-zinc-300 dark:bg-zinc-700"}`} />
            </div>
            <p className="text-2xl font-black font-mono">{motionStatus.samples}</p>
            <p className="text-[10px] text-zinc-400 mb-2">samples</p>
            {motionStatus.last ? (
              <>
                <p className="text-[10px] text-zinc-500">vib {motionStatus.last.vibrationEnergy.toFixed(1)}</p>
                <p className="text-[10px] text-zinc-400">cadence {motionStatus.last.stepCadence.toFixed(1)}</p>
              </>
            ) : (
              <p className="text-[10px] text-zinc-400">Permission: {motionPermission}</p>
            )}
          </div>
        </div>

        {/* Mode toggle */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold">Thresholds</p>
              <p className="text-[10px] text-zinc-400">
                {fastMode ? "Fast — park 15s, walk 6s" : "Default — park 30s, walk 15s"}
              </p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => { if (!running) { setFastMode(false); fastModeRef.current = false; } }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${!fastMode ? "bg-violet-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}
              >
                Default
              </button>
              <button
                onClick={() => { if (!running) { setFastMode(true); fastModeRef.current = true; } }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${fastMode ? "bg-violet-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}
              >
                Fast
              </button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 mb-4">
          {running ? (
            <>
              <button
                onClick={() => endTest(false)}
                className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition"
              >
                <Square size={16} /> End Test
              </button>
              <button
                onClick={() => endTest(true)}
                className="h-12 px-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-800 text-xs font-bold transition"
              >
                Abort
              </button>
            </>
          ) : (
            <button
              onClick={handleStart}
              disabled={starting}
              className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-violet-200 dark:shadow-violet-900/30"
            >
              {starting ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
              {starting ? "Starting..." : "Start Test"}
            </button>
          )}
          {!running && log.length > 0 && (
            <button
              onClick={handleReset}
              className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center transition"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>

        {!running && !motionSupported && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 mb-4">
            Motion sensors not supported in this browser. GPS-only mode — parking needs ~30s stationary and vehicle-move needs real driving.
          </p>
        )}

        <p className="text-[10px] text-zinc-400 mb-4 leading-relaxed">
          Run this on your phone over HTTPS. Script: drive → park and stay still until{" "}
          <span className="font-mono">parked</span> → walk away ≥30m → walk back → get in and drive off. Every
          agent decision is recorded to the admin dashboard.
        </p>

        {/* Log */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
          <h3 className="font-bold text-xs mb-2 flex items-center gap-2">
            <Footprints size={14} className="text-zinc-400" /> Test Log ({log.length})
          </h3>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {log.length === 0 && <p className="text-[11px] text-zinc-400 py-3 text-center">No events yet — start a test.</p>}
            {[...log].reverse().map((entry) => (
              <div key={entry.id} className="flex items-start gap-2 text-[11px] py-1">
                <span className="text-zinc-300 dark:text-zinc-600 font-mono w-16 shrink-0">
                  {new Date(entry.at).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" })}
                </span>
                <span className={`font-mono shrink-0 ${
                  entry.kind === "event" ? "text-violet-500" :
                  entry.kind === "state" ? "text-emerald-600" :
                  entry.kind === "error" ? "text-red-500" :
                  entry.kind === "gps" ? "text-blue-500" :
                  entry.kind === "motion" ? "text-violet-400" :
                  entry.kind === "permission" ? "text-amber-600" :
                  "text-zinc-500"
                }`}>
                  {entry.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
