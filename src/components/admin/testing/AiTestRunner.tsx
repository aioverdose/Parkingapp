"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { TEST_ROUTES } from "@/lib/testing/testRoutes";
import type { AiTestRunReport, AiTestProgress, AiTestConfig } from "@/lib/testing/ai-test-engine";
import { Play, Square, Download, RotateCcw, CheckCircle, XCircle, Brain, Gauge, Route, Radio, Loader2 } from "lucide-react";

export function AiTestRunner() {
  const [config, setConfig] = useState<AiTestConfig>({
    routeIndices: [0, 1],
    speedMultipliers: [2, 5],
    gpsNoiseEnabled: false,
    undergroundModeEnabled: false,
    iterations: 1,
    checkParkingDetection: true,
    checkMatchFlow: false,
  });
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [progress, setProgress] = useState<AiTestProgress | null>(null);
  const [report, setReport] = useState<AiTestRunReport | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggleRoute = useCallback((idx: number) => {
    setConfig((prev) => ({
      ...prev,
      routeIndices: prev.routeIndices.includes(idx)
        ? prev.routeIndices.filter((i) => i !== idx)
        : [...prev.routeIndices, idx].sort(),
    }));
  }, []);

  const toggleSpeed = useCallback((mul: number) => {
    setConfig((prev) => ({
      ...prev,
      speedMultipliers: prev.speedMultipliers.includes(mul)
        ? prev.speedMultipliers.filter((m) => m !== mul)
        : [...prev.speedMultipliers, mul].sort(),
    }));
  }, []);

  const startRun = useCallback(async () => {
    setRunning(true);
    setReport(null);
    setProgress(null);

    try {
      const res = await fetch("/api/ai-test/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.runId) {
        setRunId(data.runId);
      } else {
        setRunning(false);
      }
    } catch {
      setRunning(false);
    }
  }, [config]);

  useEffect(() => {
    if (!runId || !running) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/ai-test/run?runId=${runId}`);
        const data = await res.json();
        if (data.progress) setProgress(data.progress);
        if (data.report) {
          setReport(data.report);
          if (data.progress?.status === "completed" || data.progress?.status === "failed") {
            setRunning(false);
            if (pollRef.current) clearInterval(pollRef.current);
          }
        }
      } catch {}
    }, 1000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [runId, running]);

  const handleExport = useCallback(() => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-test-report-${report.runId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report]);

  const handleReset = useCallback(() => {
    setRunId(null);
    setProgress(null);
    setReport(null);
    setRunning(false);
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const scenarioCount = config.routeIndices.length * config.speedMultipliers.length * config.iterations;

  return (
    <div className="h-full flex flex-col lg:flex-row bg-zinc-50 dark:bg-zinc-950">
      {/* Config panel */}
      <div className="lg:w-80 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
              <Brain size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold">AI Test Runner</h3>
              <p className="text-[10px] text-zinc-400">Autonomous simulation campaign</p>
            </div>
          </div>

          <div className="flex gap-2">
            {running ? (
              <button
                onClick={handleReset}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2.5 rounded-xl transition flex items-center justify-center gap-2"
              >
                <Square size={14} /> Stop
              </button>
            ) : (
              <button
                onClick={startRun}
                disabled={scenarioCount === 0}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-xs font-bold px-3 py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-purple-200 dark:shadow-purple-900/30"
              >
                <Play size={14} /> Run Campaign
              </button>
            )}
            {report && !running && (
              <>
                <button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-2 rounded-xl transition">
                  <Download size={14} />
                </button>
                <button onClick={handleReset} className="bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-xs font-medium px-3 py-2 rounded-xl transition">
                  <RotateCcw size={14} />
                </button>
              </>
            )}
          </div>

          {running && progress && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-zinc-500">{progress.currentScenario ?? "Starting..."}</span>
                <span className="font-bold text-purple-600">{progress.progress}%</span>
              </div>
              <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Route selection */}
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <Route size={14} className="text-zinc-500" />
            <span className="text-xs font-bold">Routes</span>
          </div>
          <div className="space-y-1.5">
            {TEST_ROUTES.map((r, i) => (
              <label key={i} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.routeIndices.includes(i)}
                  onChange={() => toggleRoute(i)}
                  className="rounded accent-purple-600"
                />
                <div>
                  <span className="text-xs font-medium">{r.name}</span>
                  <p className="text-[10px] text-zinc-400 line-clamp-1">{r.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Speed multipliers */}
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <Gauge size={14} className="text-zinc-500" />
            <span className="text-xs font-bold">Speed Multipliers</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[2, 5, 10, 20].map((mul) => (
              <button
                key={mul}
                onClick={() => toggleSpeed(mul)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  config.speedMultipliers.includes(mul)
                    ? "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300"
                    : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500"
                }`}
              >
                {mul}x
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <Radio size={14} className="text-zinc-500" />
            <span className="text-xs font-bold">Options</span>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.gpsNoiseEnabled}
                onChange={(e) => setConfig((prev) => ({ ...prev, gpsNoiseEnabled: e.target.checked }))}
                className="rounded accent-purple-600"
              />
              <span className="text-xs">GPS Noise (±50m)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.undergroundModeEnabled}
                onChange={(e) => setConfig((prev) => ({ ...prev, undergroundModeEnabled: e.target.checked }))}
                className="rounded accent-purple-600"
              />
              <span className="text-xs">Underground Mode</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.checkMatchFlow}
                onChange={(e) => setConfig((prev) => ({ ...prev, checkMatchFlow: e.target.checked }))}
                className="rounded accent-purple-600"
              />
              <span className="text-xs">Test Match Flow</span>
            </label>
          </div>
          <div className="mt-2">
            <label className="text-xs text-zinc-500">Iterations per combo</label>
            <select
              value={config.iterations}
              onChange={(e) => setConfig((prev) => ({ ...prev, iterations: Number(e.target.value) }))}
              className="ml-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-xs"
            >
              {[1, 2, 3, 5, 10].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <p className="text-[10px] text-zinc-400 mt-2">
            {scenarioCount} scenario{scenarioCount !== 1 ? "s" : ""} will be run
          </p>
        </div>

        {/* Progress log */}
        {progress && (
          <div className="p-3">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase mb-2">Run Log</h4>
            <div className="space-y-0.5 max-h-60 overflow-y-auto">
              {progress.log.map((entry, i) => (
                <p key={i} className="text-[10px] text-zinc-500 font-mono leading-relaxed">{entry}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results panel */}
      <div className="flex-1 overflow-y-auto">
        {!report && !running && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8">
              <Brain size={48} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
              <p className="text-sm font-bold text-zinc-400">AI Test Runner</p>
              <p className="text-xs text-zinc-400 mt-1">Configure and run autonomous simulation campaigns</p>
            </div>
          </div>
        )}

        {running && !report && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8">
              <Loader2 size={32} className="mx-auto text-purple-600 animate-spin mb-3" />
              <p className="text-sm font-bold text-zinc-500">Running campaign...</p>
              <p className="text-xs text-zinc-400 mt-1">{progress?.currentScenario}</p>
            </div>
          </div>
        )}

        {report && (
          <div className="p-4 space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Total</p>
                <p className="text-2xl font-black mt-1">{report.totalScenarios}</p>
                <p className="text-[10px] text-zinc-500">scenarios</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-4">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Passed</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{report.passedScenarios}</p>
                <p className="text-[10px] text-zinc-500">
                  {report.totalScenarios > 0 ? Math.round((report.passedScenarios / report.totalScenarios) * 100) : 0}% rate
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-red-200 dark:border-red-800 p-4">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Failed</p>
                <p className="text-2xl font-black text-red-600 mt-1">{report.failedScenarios}</p>
                <p className="text-[10px] text-zinc-500">{report.summary.totalErrors} errors</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Duration</p>
                <p className="text-2xl font-black mt-1">
                  {Math.round((new Date(report.completedAt).getTime() - new Date(report.startedAt).getTime()) / 1000)}s
                </p>
                <p className="text-[10px] text-zinc-500">
                  {report.totalScenarios > 0
                    ? `${Math.round((new Date(report.completedAt).getTime() - new Date(report.startedAt).getTime()) / report.totalScenarios / 1000)}s avg`
                    : ""}
                </p>
              </div>
            </div>

            {/* Detection metrics */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
              <h4 className="text-xs font-bold mb-3 flex items-center gap-2">
                <Gauge size={14} className="text-purple-600" />
                Detection Metrics
              </h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-black text-purple-600">
                    {Math.round(report.summary.parkingDetectionRate * 100)}%
                  </p>
                  <p className="text-[10px] text-zinc-500">Parking Detection</p>
                </div>
                <div>
                  <p className="text-lg font-black text-purple-600">
                    {Math.round(report.summary.matchSuccessRate * 100)}%
                  </p>
                  <p className="text-[10px] text-zinc-500">Match Success</p>
                </div>
                <div>
                  <p className="text-lg font-black text-purple-600">
                    {report.summary.avgParkingDetectionTimeMs !== null
                      ? `${Math.round(report.summary.avgParkingDetectionTimeMs / 1000)}s`
                      : "N/A"}
                  </p>
                  <p className="text-[10px] text-zinc-500">Avg Detection Time</p>
                </div>
              </div>
            </div>

            {/* Detailed results table */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
              <h4 className="text-xs font-bold mb-3 flex items-center gap-2">
                <CheckCircle size={14} className="text-purple-600" />
                Per-Scenario Results
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="text-left py-2 pr-3 font-bold text-zinc-500">Scenario</th>
                      <th className="text-left py-2 pr-3 font-bold text-zinc-500">Route</th>
                      <th className="text-right py-2 pr-3 font-bold text-zinc-500">Speed</th>
                      <th className="text-right py-2 pr-3 font-bold text-zinc-500">Duration</th>
                      <th className="text-center py-2 pr-3 font-bold text-zinc-500">Parked</th>
                      <th className="text-center py-2 font-bold text-zinc-500">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.metrics.map((m, i) => (
                      <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                        <td className="py-2 pr-3 font-medium">{m.scenarioName}</td>
                        <td className="py-2 pr-3 text-zinc-500">{m.routeName}</td>
                        <td className="py-2 pr-3 text-right text-zinc-500">{m.speedMultiplier}x</td>
                        <td className="py-2 pr-3 text-right font-mono text-zinc-500">
                          {m.durationMs > 0 ? `${Math.round(m.durationMs / 1000)}s` : "-"}
                        </td>
                        <td className="py-2 pr-3 text-center">
                          {m.parkingDetected
                            ? <CheckCircle size={14} className="inline text-emerald-500" />
                            : <XCircle size={14} className="inline text-red-500" />
                          }
                        </td>
                        <td className="py-2 text-center">
                          {m.errors.length > 0
                            ? <span className="text-red-500 font-medium">{m.errors.length}</span>
                            : <span className="text-zinc-300">-</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
