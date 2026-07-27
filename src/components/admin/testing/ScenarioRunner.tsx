"use client";

import { useState, useCallback } from "react";
import { SimulatedDevice } from "@/lib/testing/simulatedDevice";
import { TEST_ROUTES } from "@/lib/testing/testRoutes";
import { LONG_BEACH_CENTER, MPH_TO_MS, PARKING_SPEED_THRESHOLD } from "@/lib/testing/constants";
import type { TestScenarioStep, TestScenarioResult } from "@/lib/testing/types";
import { Play, Plus, Trash2, CheckCircle, XCircle, Clock, Download } from "lucide-react";

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

export function ScenarioRunner({ device }: Props) {
  const [steps, setSteps] = useState<TestScenarioStep[]>(DEFAULT_STEPS);
  const [results, setResults] = useState<TestScenarioResult[]>([]);
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);

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
    if (!device || running) return;
    setRunning(true);
    setResults([]);
    const allResults: TestScenarioResult[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      setCurrentStep(i);
      const result = await executeStep(device, step);
      allResults.push(result);
      setResults([...allResults]);
      if (!result.passed) break;
    }

    setRunning(false);
    setCurrentStep(null);
  }, [device, steps, running]);

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
    <div className="h-full overflow-y-auto p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Play size={16} /> Scenario Runner
        </h3>
        <div className="flex gap-2">
          <button onClick={addStep} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1 transition">
            <Plus size={12} /> Add Step
          </button>
          <button onClick={runScenario} disabled={running || !device} className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition">
            {running ? "Running..." : "Run Scenario"}
          </button>
          {results.length > 0 && (
            <button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1 transition">
              <Download size={12} /> Export
            </button>
          )}
        </div>
      </div>

      {/* Results summary */}
      {results.length > 0 && (
        <div className="flex gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 text-center">
            <div className="text-2xl font-black text-emerald-600">{passed}</div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">PASSED</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-center">
            <div className="text-2xl font-black text-red-600">{failed}</div>
            <div className="text-[10px] text-red-700 dark:text-red-400 font-medium">FAILED</div>
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, i) => {
          const result = results.find((r) => r.stepId === step.id);
          const isRunning = currentStep === i;
          return (
            <div key={step.id} className={`bg-white dark:bg-zinc-900 border rounded-xl p-4 transition ${
              isRunning ? "border-blue-400 dark:border-blue-600 ring-2 ring-blue-200 dark:ring-blue-800" :
              result ? (result.passed ? "border-emerald-200 dark:border-emerald-800" : "border-red-200 dark:border-red-800") :
              "border-zinc-200 dark:border-zinc-800"
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <span className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">{i + 1}</span>
                <input
                  type="text"
                  value={step.label}
                  onChange={(e) => updateStep(step.id, { label: e.target.value })}
                  className="flex-1 bg-transparent text-sm font-medium outline-none"
                />
                <select
                  value={step.type}
                  onChange={(e) => updateStep(step.id, { type: e.target.value as TestScenarioStep["type"] })}
                  className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-xs"
                >
                  <option value="set_location">Set Location</option>
                  <option value="start_route">Start Route</option>
                  <option value="set_speed">Set Speed</option>
                  <option value="wait">Wait</option>
                  <option value="check_parking">Check Parking</option>
                  <option value="check_geofence">Check Geofence</option>
                  <option value="log">Log</option>
                </select>
                <button onClick={() => removeStep(step.id)} className="text-zinc-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>

              {/* Step params */}
              <div className="ml-9">
                {step.type === "set_location" && (
                  <div className="flex gap-2">
                    <input type="number" step="0.000001" value={Number(step.params.lat) || ""} onChange={(e) => updateStep(step.id, { params: { ...step.params, lat: Number(e.target.value) } })} placeholder="Lat" className="w-32 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-xs" />
                    <input type="number" step="0.000001" value={Number(step.params.lng) || ""} onChange={(e) => updateStep(step.id, { params: { ...step.params, lng: Number(e.target.value) } })} placeholder="Lng" className="w-32 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-xs" />
                  </div>
                )}
                {step.type === "start_route" && (
                  <select value={Number(step.params.routeIndex) || 0} onChange={(e) => updateStep(step.id, { params: { ...step.params, routeIndex: Number(e.target.value) } })} className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-xs">
                    {TEST_ROUTES.map((r, ri) => <option key={ri} value={ri}>{r.name}</option>)}
                  </select>
                )}
                {step.type === "wait" && (
                  <input type="number" value={Number(step.params.durationMs) || 5000} onChange={(e) => updateStep(step.id, { params: { ...step.params, durationMs: Number(e.target.value) } })} placeholder="ms" className="w-32 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-xs" />
                )}
                {step.type === "log" && (
                  <input type="text" value={String(step.params.message || "")} onChange={(e) => updateStep(step.id, { params: { ...step.params, message: e.target.value } })} placeholder="Message" className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-xs" />
                )}
              </div>

              {/* Result */}
              {result && (
                <div className={`ml-9 mt-2 flex items-center gap-2 text-xs ${result.passed ? "text-emerald-600" : "text-red-600"}`}>
                  {result.passed ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  <span>{result.message}</span>
                  <span className="text-zinc-400 ml-auto flex items-center gap-1">
                    <Clock size={10} /> {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              )}

              {isRunning && (
                <div className="ml-9 mt-2">
                  <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-1.5">
                    <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: "100%" }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function executeStep(device: SimulatedDevice, step: TestScenarioStep): Promise<TestScenarioResult> {
  const ts = new Date().toISOString();
  switch (step.type) {
    case "set_location": {
      const lat = Number(step.params.lat) || LONG_BEACH_CENTER.lat;
      const lng = Number(step.params.lng) || LONG_BEACH_CENTER.lng;
      device.setPosition(lat, lng, 0);
      await device.broadcast();
      return { stepId: step.id, label: step.label, passed: true, message: `Set location to ${lat.toFixed(5)}, ${lng.toFixed(5)}`, timestamp: ts };
    }
    case "start_route": {
      const routeIndex = Number(step.params.routeIndex) || 0;
      const speedMultiplier = Number(step.params.speedMultiplier) || 5;
      const route = TEST_ROUTES[routeIndex];
      if (!route) return { stepId: step.id, label: step.label, passed: false, message: "Route not found", timestamp: ts };
      device.loadRoute(route.waypoints);
      device.startPlayback(speedMultiplier);
      return { stepId: step.id, label: step.label, passed: true, message: `Started route: ${route.name} at ${speedMultiplier}x`, timestamp: ts };
    }
    case "set_speed": {
      const speed = Number(step.params.speed) || 0;
      device.setSpeed(speed * MPH_TO_MS);
      return { stepId: step.id, label: step.label, passed: true, message: `Set speed to ${speed} mph`, timestamp: ts };
    }
    case "wait": {
      const duration = Number(step.params.durationMs) || 5000;
      await new Promise((r) => setTimeout(r, duration));
      return { stepId: step.id, label: step.label, passed: true, message: `Waited ${duration}ms`, timestamp: ts };
    }
    case "check_parking": {
      const pos = device.getPosition();
      const isParked = pos.speed < PARKING_SPEED_THRESHOLD;
      return { stepId: step.id, label: step.label, passed: isParked, message: isParked ? "Device is parked (speed < threshold)" : `Device not parked (speed: ${pos.speed.toFixed(1)} m/s)`, timestamp: ts };
    }
    case "check_geofence": {
      return { stepId: step.id, label: step.label, passed: true, message: "Geofence check (placeholder — use Geofence Tester)", timestamp: ts };
    }
    case "log": {
      return { stepId: step.id, label: step.label, passed: true, message: String(step.params.message || "Logged"), timestamp: ts };
    }
    default:
      return { stepId: step.id, label: step.label, passed: false, message: "Unknown step type", timestamp: ts };
  }
}
