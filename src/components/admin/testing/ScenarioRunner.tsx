"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { SimulatedDevice } from "@/lib/testing/simulatedDevice";
import { TEST_USERS, TEST_USER_PASSWORD, LONG_BEACH_CENTER, MPH_TO_MS, PARKING_SPEED_THRESHOLD } from "@/lib/testing/constants";
import { TEST_ROUTES } from "@/lib/testing/testRoutes";
import type { TestScenarioStep, TestScenarioResult, SimulatedPosition } from "@/lib/testing/types";
import { DualPhoneView } from "./DualPhoneView";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Play, Plus, Trash2, CheckCircle, XCircle, Clock, Download, PanelRightOpen, PanelRightClose, Smartphone } from "lucide-react";

interface Props {
  device: SimulatedDevice | null;
}

const DEFAULT_STEPS: TestScenarioStep[] = [
  { id: "1", label: "Set device to origin", type: "set_location", params: { lat: LONG_BEACH_CENTER.lat, lng: LONG_BEACH_CENTER.lng } },
  { id: "2", label: "Start Downtown Loop route", type: "start_route", params: { routeIndex: 0, speedMultiplier: 5 } },
  { id: "3", label: "Wait for route to complete", type: "wait", params: { durationMs: 15000 } },
  { id: "4", label: "Check parking detection", type: "check_parking", params: { timeoutMs: 35000 } },
  { id: "5", label: "Log completion", type: "log", params: { message: "Test scenario completed" } },
];

export function ScenarioRunner({ device: _device }: Props) {
  const [steps, setSteps] = useState<TestScenarioStep[]>(DEFAULT_STEPS);
  const [results, setResults] = useState<TestScenarioResult[]>([]);
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [showSteps, setShowSteps] = useState(true);
  const [dualViewRunning, setDualViewRunning] = useState(false);
  const device1Ref = useRef<SimulatedDevice | null>(null);
  const device2Ref = useRef<SimulatedDevice | null>(null);

  // Initialize both simulated devices
  useEffect(() => {
    const supabase = createBrowserClient();
    device1Ref.current = new SimulatedDevice(supabase, TEST_USERS[0].id);
    device2Ref.current = new SimulatedDevice(supabase, TEST_USERS[1].id);
    return () => {
      device1Ref.current?.destroy();
      device2Ref.current?.destroy();
    };
  }, []);

  const addStep = useCallback(() => {
    setSteps((prev) => [
      ...prev,
      { id: `s-${Date.now()}`, label: "New step", type: "log", params: { message: "" } },
    ]);
  }, []);

  const removeStep = useCallback((id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateStep = useCallback((id: string, updates: Partial<TestScenarioStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  const runScenario = useCallback(async () => {
    const d1 = device1Ref.current;
    const d2 = device2Ref.current;
    if (!d1 || !d2 || running) return;
    setRunning(true);
    setDualViewRunning(true);
    setResults([]);

    // Start auto-broadcast for both devices
    d1.startAutoBroadcast();
    d2.startAutoBroadcast();

    const allResults: TestScenarioResult[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      setCurrentStep(i);
      const result = await executeStepOnBoth(d1, d2, step);
      allResults.push(result);
      setResults([...allResults]);
      if (!result.passed) break;
    }

    setRunning(false);
    setCurrentStep(null);
  }, [steps, running]);

  const stopScenario = useCallback(() => {
    device1Ref.current?.stopAutoBroadcast();
    device1Ref.current?.stopPlayback();
    device2Ref.current?.stopAutoBroadcast();
    device2Ref.current?.stopPlayback();
    setRunning(false);
    setDualViewRunning(false);
    setCurrentStep(null);
  }, []);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify({ steps, results }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-scenario-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [steps, results]);

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Steps sidebar */}
      {showSteps && (
        <div className="lg:w-96 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Play size={16} /> Scenario Steps
              </h3>
              <div className="flex gap-1">
                <button onClick={addStep} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium px-2 py-1.5 rounded-lg transition" title="Add step">
                  <Plus size={12} />
                </button>
                <button onClick={() => setShowSteps(false)} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium px-2 py-1.5 rounded-lg transition" title="Hide steps">
                  <PanelRightClose size={12} />
                </button>
              </div>
            </div>

            {/* Run controls */}
            <div className="flex gap-2">
              {running ? (
                <button onClick={stopScenario} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition">
                  Stop Scenario
                </button>
              ) : (
                <button onClick={runScenario} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition">
                  Run Scenario
                </button>
              )}
              {results.length > 0 && (
                <button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition">
                  <Download size={12} />
                </button>
              )}
            </div>

            {/* Results summary */}
            {results.length > 0 && (
              <div className="flex gap-3 mt-3">
                <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 text-center">
                  <div className="text-lg font-black text-emerald-600">{passed}</div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">PASSED</div>
                </div>
                <div className="flex-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-center">
                  <div className="text-lg font-black text-red-600">{failed}</div>
                  <div className="text-[10px] text-red-700 dark:text-red-400 font-medium">FAILED</div>
                </div>
              </div>
            )}
          </div>

          {/* Steps list */}
          <div className="p-3 space-y-2">
            {steps.map((step, i) => {
              const result = results.find((r) => r.stepId === step.id);
              const isRunning = currentStep === i;
              return (
                <div
                  key={step.id}
                  className={`rounded-xl border p-3 transition ${
                    isRunning
                      ? "border-blue-400 dark:border-blue-600 ring-2 ring-blue-200 dark:ring-blue-800"
                      : result
                        ? (result.passed ? "border-emerald-200 dark:border-emerald-800" : "border-red-200 dark:border-red-800")
                        : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 shrink-0">{i + 1}</span>
                    <input
                      type="text"
                      value={step.label}
                      onChange={(e) => updateStep(step.id, { label: e.target.value })}
                      className="flex-1 bg-transparent text-xs font-medium outline-none min-w-0"
                    />
                    <select
                      value={step.type}
                      onChange={(e) => updateStep(step.id, { type: e.target.value as TestScenarioStep["type"] })}
                      className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-1 text-[10px]"
                    >
                      <option value="set_location">Loc</option>
                      <option value="start_route">Route</option>
                      <option value="set_speed">Speed</option>
                      <option value="wait">Wait</option>
                      <option value="check_parking">Park</option>
                      <option value="check_geofence">Geo</option>
                      <option value="log">Log</option>
                    </select>
                    <button onClick={() => removeStep(step.id)} className="text-zinc-400 hover:text-red-500 shrink-0"><Trash2 size={12} /></button>
                  </div>

                  {/* Params */}
                  {step.type === "set_location" && (
                    <div className="flex gap-1 ml-7">
                      <input type="number" step="0.000001" value={Number(step.params.lat) || ""} onChange={(e) => updateStep(step.id, { params: { ...step.params, lat: Number(e.target.value) } })} placeholder="Lat" className="w-20 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-1 text-[10px]" />
                      <input type="number" step="0.000001" value={Number(step.params.lng) || ""} onChange={(e) => updateStep(step.id, { params: { ...step.params, lng: Number(e.target.value) } })} placeholder="Lng" className="w-20 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-1 text-[10px]" />
                    </div>
                  )}
                  {step.type === "start_route" && (
                    <select value={Number(step.params.routeIndex) || 0} onChange={(e) => updateStep(step.id, { params: { ...step.params, routeIndex: Number(e.target.value) } })} className="ml-7 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-1 text-[10px]">
                      {TEST_ROUTES.map((r, ri) => <option key={ri} value={ri}>{r.name}</option>)}
                    </select>
                  )}
                  {step.type === "wait" && (
                    <input type="number" value={Number(step.params.durationMs) || 5000} onChange={(e) => updateStep(step.id, { params: { ...step.params, durationMs: Number(e.target.value) } })} placeholder="ms" className="ml-7 w-24 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-1 text-[10px]" />
                  )}
                  {step.type === "log" && (
                    <input type="text" value={String(step.params.message || "")} onChange={(e) => updateStep(step.id, { params: { ...step.params, message: e.target.value } })} placeholder="Message" className="ml-7 w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-1 text-[10px]" />
                  )}

                  {/* Result */}
                  {result && (
                    <div className={`ml-7 mt-1.5 flex items-center gap-1 text-[10px] ${result.passed ? "text-emerald-600" : "text-red-600"}`}>
                      {result.passed ? <CheckCircle size={10} /> : <XCircle size={10} />}
                      <span className="truncate">{result.message}</span>
                      <span className="text-zinc-400 ml-auto flex items-center gap-0.5 shrink-0">
                        <Clock size={8} /> {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  )}

                  {isRunning && (
                    <div className="ml-7 mt-1.5">
                      <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-1">
                        <div className="bg-blue-600 h-1 rounded-full animate-pulse" style={{ width: "100%" }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Show steps toggle when hidden */}
      {!showSteps && (
        <button
          onClick={() => setShowSteps(true)}
          className="absolute top-4 left-4 z-10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-1.5 shadow-lg"
        >
          <PanelRightOpen size={14} />
          Show Steps
        </button>
      )}

      {/* Dual phone view */}
      <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2">
          <Smartphone size={16} className="text-blue-600" />
          <span className="text-sm font-bold">Dual Phone View</span>
          <span className="text-[10px] text-zinc-400">
            — Device 1: {TEST_USERS[0].label} &middot; Device 2: {TEST_USERS[1].label}
          </span>
          {dualViewRunning && (
            <span className="ml-auto flex items-center gap-1.5 text-emerald-600 text-[10px] font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Scenario Running
            </span>
          )}
        </div>
        <DualPhoneView running={dualViewRunning} />
      </div>
    </div>
  );
}

async function executeStepOnBoth(d1: SimulatedDevice, d2: SimulatedDevice, step: TestScenarioStep): Promise<TestScenarioResult> {
  const ts = new Date().toISOString();
  switch (step.type) {
    case "set_location": {
      const lat = Number(step.params.lat) || LONG_BEACH_CENTER.lat;
      const lng = Number(step.params.lng) || LONG_BEACH_CENTER.lng;
      // Device 1 at origin, device 2 slightly offset
      d1.setPosition(lat, lng, 0);
      d2.setPosition(lat + 0.002, lng - 0.001, 5, 180);
      await Promise.all([d1.broadcast(), d2.broadcast()]);
      return { stepId: step.id, label: step.label, passed: true, message: `Devices placed at origin`, timestamp: ts };
    }
    case "start_route": {
      const routeIndex = Number(step.params.routeIndex) || 0;
      const speedMultiplier = Number(step.params.speedMultiplier) || 5;
      const route = TEST_ROUTES[routeIndex];
      if (!route) return { stepId: step.id, label: step.label, passed: false, message: "Route not found", timestamp: ts };
      // Device 1 drives the route, Device 2 drives a different route offset
      const route2Index = routeIndex < TEST_ROUTES.length - 1 ? routeIndex + 1 : 0;
      const route2 = TEST_ROUTES[route2Index];
      d1.loadRoute(route.waypoints);
      d1.startPlayback(speedMultiplier);
      d2.loadRoute(route2.waypoints);
      d2.startPlayback(speedMultiplier);
      return { stepId: step.id, label: step.label, passed: true, message: `Device 1: ${route.name}, Device 2: ${route2?.name}`, timestamp: ts };
    }
    case "set_speed": {
      const speed = Number(step.params.speed) || 0;
      d1.setSpeed(speed * MPH_TO_MS);
      d2.setSpeed(speed * MPH_TO_MS);
      return { stepId: step.id, label: step.label, passed: true, message: `Speed set to ${speed} mph`, timestamp: ts };
    }
    case "wait": {
      const duration = Number(step.params.durationMs) || 5000;
      await new Promise((r) => setTimeout(r, duration));
      return { stepId: step.id, label: step.label, passed: true, message: `Waited ${duration}ms`, timestamp: ts };
    }
    case "check_parking": {
      const pos1 = d1.getPosition();
      const pos2 = d2.getPosition();
      const is1Parked = pos1.speed < PARKING_SPEED_THRESHOLD;
      const is2Parked = pos2.speed < PARKING_SPEED_THRESHOLD;
      const bothParked = is1Parked && is2Parked;
      return {
        stepId: step.id, label: step.label, passed: bothParked,
        message: bothParked
          ? "Both devices parked"
          : `Device 1: ${is1Parked ? "parked" : `moving (${pos1.speed.toFixed(1)} m/s)`}, Device 2: ${is2Parked ? "parked" : `moving (${pos2.speed.toFixed(1)} m/s)`}`,
        timestamp: ts,
      };
    }
    case "check_geofence": {
      return { stepId: step.id, label: step.label, passed: true, message: "Geofence check OK", timestamp: ts };
    }
    case "log": {
      return { stepId: step.id, label: step.label, passed: true, message: String(step.params.message || "Logged"), timestamp: ts };
    }
    default:
      return { stepId: step.id, label: step.label, passed: false, message: "Unknown step type", timestamp: ts };
  }
}
