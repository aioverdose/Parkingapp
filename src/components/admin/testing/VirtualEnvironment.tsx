"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { TEST_USERS } from "@/lib/testing/constants";
import MapComponent, { Marker, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { VirtualEnvironment } from "@/lib/virtual-environment/engine";
import { TEST_ROUTES } from "@/lib/testing/testRoutes";
import { LONG_BEACH_CENTER } from "@/lib/testing/constants";
import type { VenvAgentState, VenvTimelineEvent, VenvEnvironmentConfig } from "@/lib/virtual-environment/types";
import { AGENT_COLORS } from "@/lib/virtual-environment/types";
import { MAP_STYLE_URL } from "@/lib/map";
import {
  Play, Square, RotateCcw, Plus, Trash2, Download,
  Car, Footprints, Navigation, MapPin, Radio, Clock,
  Gauge, Smartphone, ChevronDown, ChevronUp, AlertTriangle,
  Target, Route,
} from "lucide-react";

export function VirtualEnvironmentSandbox() {
  const envRef = useRef(new VirtualEnvironment());
  const [agents, setAgents] = useState<VenvAgentState[]>([]);
  const [timeline, setTimeline] = useState<VenvTimelineEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [simTime, setSimTime] = useState(0);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [config, setConfig] = useState<VenvEnvironmentConfig>(envRef.current.getConfig());
  const [viewState, setViewState] = useState({
    latitude: LONG_BEACH_CENTER.lat,
    longitude: LONG_BEACH_CENTER.lng,
    zoom: 14,
  });
  const [showControlPanel, setShowControlPanel] = useState(true);
  const [showTimeline, setShowTimeline] = useState(true);
  const [spawnLat, setSpawnLat] = useState(LONG_BEACH_CENTER.lat);
  const [spawnLng, setSpawnLng] = useState(LONG_BEACH_CENTER.lng);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [broadcastEnabled, setBroadcastEnabled] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>(TEST_USERS[0].id);

  const pendingBroadcasts = useRef<{ userId: string; latitude: number; longitude: number; heading: number | null; speed: number | null; accuracy: number | null }[]>([]);

  const flushBroadcasts = useCallback(async () => {
    const batch = pendingBroadcasts.current.splice(0);
    if (batch.length === 0) return;
    try {
      await fetch("/api/venv/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: batch }),
      });
    } catch {
    }
  }, []);

  const env = envRef.current;
  const selectedAgent = useMemo(() => agents.find((a) => a.id === selectedAgentId) ?? null, [agents, selectedAgentId]);

  const refresh = useCallback(() => {
    setAgents(env.getAgents());
    setTimeline(env.getTimeline());
    setSimTime(env.getSimTime());
    flushBroadcasts();
  }, [env, flushBroadcasts]);

  const handleBroadcast = useCallback((agent: VenvAgentState) => {
    if (!broadcastEnabled) return;
    pendingBroadcasts.current.push({
      userId: agent.userId,
      latitude: agent.lat,
      longitude: agent.lng,
      heading: agent.heading,
      speed: agent.speed,
      accuracy: agent.accuracy,
    });
  }, [broadcastEnabled]);

  const toggleSimulation = useCallback(() => {
    if (running) {
      env.stop();
      setRunning(false);
    } else {
      env.start(refresh, handleBroadcast);
      setRunning(true);
    }
  }, [running, env, refresh, handleBroadcast]);

  const handleSpawn = useCallback(() => {
    env.spawnAgent(spawnLat, spawnLng, "owner", broadcastEnabled ? selectedUserId : undefined);
    refresh();
  }, [env, spawnLat, spawnLng, refresh, broadcastEnabled, selectedUserId]);

  const handleRemoveAgent = useCallback((id: string) => {
    env.removeAgent(id);
    if (selectedAgentId === id) setSelectedAgentId(null);
    refresh();
  }, [env, selectedAgentId, refresh]);

  const handleLoadRoute = useCallback((agentId: string) => {
    const route = TEST_ROUTES[selectedRouteIdx];
    if (!route) return;
    env.loadRoute(agentId, route.waypoints);
    env.startRoute(agentId, 5);
    refresh();
  }, [env, selectedRouteIdx, refresh]);

  const handleStopRoute = useCallback((agentId: string) => {
    env.stopRoute(agentId);
    refresh();
  }, [env, refresh]);

  const handleConfigChange = useCallback((partial: Partial<VenvEnvironmentConfig>) => {
    env.updateConfig(partial);
    setConfig(env.getConfig());
  }, [env]);

  const handleReset = useCallback(() => {
    env.reset();
    setRunning(false);
    setSelectedAgentId(null);
    setConfig(env.getConfig());
    refresh();
  }, [env, refresh]);

  const handleExport = useCallback(() => {
    const blob = new Blob([env.toJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `virtual-env-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [env]);

  const handleSetSpawnFromMap = useCallback((e: { lngLat: { lat: number; lng: number } }) => {
    setSpawnLat(e.lngLat.lat);
    setSpawnLng(e.lngLat.lng);
  }, []);

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Top bar */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-emerald-400" />
            <span className="font-bold text-sm text-white">Virtual Environment</span>
            <span className="text-[10px] text-zinc-500">— Simulation Sandbox</span>
          </div>
          <div className="h-4 w-px bg-zinc-700" />
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
            <Clock size={12} />
            <span className="font-mono">{(simTime / 1000).toFixed(1)}s</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${running ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`} />
            <span className="text-[10px] text-zinc-500">{running ? "Running" : "Paused"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500">{agents.length} agent{agents.length !== 1 ? "s" : ""}</span>
          <div className="h-4 w-px bg-zinc-700" />
          <button
            onClick={toggleSimulation}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              running
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {running ? <Square size={14} /> : <Play size={14} />}
            {running ? "Pause" : "Run"}
          </button>
          <button onClick={handleReset} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5">
            <RotateCcw size={14} /> Reset
          </button>
          <button onClick={handleExport} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Map area */}
        <div className="flex-1 relative">
          <MapComponent
            {...viewState}
            onMove={(e) => setViewState(e.viewState)}
            onClick={handleSetSpawnFromMap}
            style={{ width: "100%", height: "100%" }}
            mapStyle={MAP_STYLE_URL}
          >
            <NavigationControl position="top-right" />
            {agents.map((a) => (
              <Marker key={a.id} latitude={a.lat} longitude={a.lng} onClick={() => setSelectedAgentId(a.id)}>
                <div className="relative cursor-pointer group">
                  <div
                    className={`w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-bold transition-all ${
                      selectedAgentId === a.id ? "ring-2 ring-yellow-400 scale-125" : ""
                    }`}
                    style={{ backgroundColor: a.color }}
                  >
                    {a.label.charAt(0)}
                  </div>
                  {a.routePlaying && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border border-white animate-pulse" />
                  )}
                  {(a.status === "driving" || a.routePlaying) && a.heading !== undefined && (
                    <div
                      className="absolute -top-0.5 -left-0.5 w-7 h-7 border-2 border-transparent border-t-white/40 rounded-full animate-spin"
                      style={{ animationDuration: "2s" }}
                    />
                  )}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    {a.label} — {a.status}
                  </div>
                </div>
              </Marker>
            ))}
          </MapComponent>

          {/* Click hint */}
          <div className="absolute bottom-4 left-4 bg-black/70 text-zinc-300 text-[10px] px-3 py-2 rounded-lg pointer-events-none">
            Click map to set spawn point · Click agent to select
          </div>

          {/* Environment status overlay */}
          <div className="absolute top-4 right-4 bg-black/70 rounded-lg p-3 text-[10px] space-y-1.5 pointer-events-none">
            <div className="flex items-center gap-2 text-zinc-400">
              <Radio size={12} />
              <span>GPS Noise: {config.gpsNoiseLevel === 0 ? "Off" : `${config.gpsNoiseLevel}x`}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Gauge size={12} />
              <span>Speed: {config.timeSpeedMultiplier}x</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Smartphone size={12} />
              <span>Underground: {config.undergroundMode ? "On" : "Off"}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Radio size={12} />
              <span>Broadcast: {broadcastEnabled ? "Live" : "Off"}</span>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-80 shrink-0 border-l border-zinc-800 bg-zinc-900 flex flex-col overflow-hidden">
          {/* Control panel toggle */}
          <button
            onClick={() => setShowControlPanel(!showControlPanel)}
            className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 hover:bg-zinc-800/50 transition"
          >
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
              <Navigation size={14} className="text-emerald-400" />
              Controls
            </span>
            {showControlPanel ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
          </button>

          {showControlPanel && (
            <div className="border-b border-zinc-800">
              {/* Spawn controls */}
              <div className="p-3 border-b border-zinc-800">
                <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Spawn Agent</p>
                <div className="flex gap-1.5 mb-2">
                  <input
                    type="number"
                    step="0.0001"
                    value={spawnLat}
                    onChange={(e) => setSpawnLat(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300"
                    placeholder="Lat"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={spawnLng}
                    onChange={(e) => setSpawnLng(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300"
                    placeholder="Lng"
                  />
                </div>
                {broadcastEnabled && (
                  <div className="mb-2">
                    <label className="text-[10px] text-zinc-500 block mb-1">Test User</label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300"
                    >
                      {TEST_USERS.map((u) => (
                        <option key={u.id} value={u.id}>{u.label} — {u.vehicleType}</option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  onClick={handleSpawn}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} /> Spawn Agent
                </button>
              </div>

              {/* Environment settings */}
              <div className="p-3 border-b border-zinc-800">
                <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Environment</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">Sim Speed</span>
                    <div className="flex gap-1">
                      {[1, 2, 5, 10].map((m) => (
                        <button
                          key={m}
                          onClick={() => handleConfigChange({ timeSpeedMultiplier: m })}
                          className={`px-2 py-1 rounded text-[10px] font-medium border transition ${
                            config.timeSpeedMultiplier === m
                              ? "bg-emerald-900/40 border-emerald-700 text-emerald-400"
                              : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:bg-zinc-700"
                          }`}
                        >
                          {m}x
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">GPS Noise</span>
                    <div className="flex gap-1">
                      {[0, 1, 2, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => handleConfigChange({ gpsNoiseLevel: n })}
                          className={`px-2 py-1 rounded text-[10px] font-medium border transition ${
                            config.gpsNoiseLevel === n
                              ? "bg-emerald-900/40 border-emerald-700 text-emerald-400"
                              : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:bg-zinc-700"
                          }`}
                        >
                          {n === 0 ? "Off" : `${n}x`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.undergroundMode}
                      onChange={(e) => handleConfigChange({ undergroundMode: e.target.checked })}
                      className="rounded accent-emerald-600"
                    />
                    <span className="text-[10px] text-zinc-400">Underground Mode</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={broadcastEnabled}
                      onChange={(e) => setBroadcastEnabled(e.target.checked)}
                      className="rounded accent-emerald-600"
                    />
                    <span className="text-[10px] text-zinc-400">Broadcast to Supabase</span>
                  </label>
                </div>
              </div>

              {/* Agent list */}
              <div className="p-3">
                <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">
                  Agents ({agents.length})
                </p>
                {agents.length === 0 && (
                  <p className="text-[10px] text-zinc-600 text-center py-4">
                    No agents spawned yet.<br />Click the map and press Spawn.
                  </p>
                )}
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {agents.map((a) => (
                    <div
                      key={a.id}
                      className={`rounded-lg border p-2 text-xs transition cursor-pointer ${
                        selectedAgentId === a.id
                          ? "border-emerald-600 bg-emerald-900/20"
                          : "border-zinc-800 bg-zinc-800/50 hover:bg-zinc-800"
                      }`}
                      onClick={() => setSelectedAgentId(a.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.color }} />
                          <span className="font-medium text-zinc-200">{a.label}</span>
                          <span className="text-[10px] text-zinc-500">({a.role})</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveAgent(a.id); }}
                          className="text-zinc-600 hover:text-red-400 transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                        <span className={`px-1 py-0.5 rounded font-medium ${
                          a.status === "driving" ? "bg-blue-900/40 text-blue-400" :
                          a.status === "parked" ? "bg-amber-900/40 text-amber-400" :
                          "bg-zinc-800 text-zinc-500"
                        }`}>
                          {a.status}
                        </span>
                        <span>{a.lat.toFixed(4)}, {a.lng.toFixed(4)}</span>
                        <span>{a.broadcastCount} tx</span>
                        <span className={a.userId.startsWith("virtual-") ? "text-zinc-700" : "text-blue-500"}>
                          {a.userId.startsWith("virtual-") ? "virt" : "live"}
                        </span>
                      </div>
                      <div className="flex gap-1 mt-1.5">
                        <select
                          value={selectedRouteIdx}
                          onChange={(e) => setSelectedRouteIdx(Number(e.target.value))}
                          className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-[10px] text-zinc-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {TEST_ROUTES.map((r, i) => (
                            <option key={i} value={i}>{r.name}</option>
                          ))}
                        </select>
                        {a.routePlaying ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStopRoute(a.id); }}
                            className="bg-red-600/30 text-red-400 px-2 py-1 rounded text-[10px] font-medium hover:bg-red-600/50 transition"
                          >
                            Stop
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleLoadRoute(a.id); }}
                            className="bg-emerald-600/30 text-emerald-400 px-2 py-1 rounded text-[10px] font-medium hover:bg-emerald-600/50 transition"
                          >
                            Route
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Selected agent details */}
          {selectedAgent && (
            <div className="border-b border-zinc-800 p-3 bg-zinc-800/30">
              <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Selected: {selectedAgent.label}</p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-zinc-800 rounded p-2">
                  <span className="text-zinc-500">Position</span>
                  <p className="text-zinc-300 font-mono">{selectedAgent.lat.toFixed(5)}, {selectedAgent.lng.toFixed(5)}</p>
                </div>
                <div className="bg-zinc-800 rounded p-2">
                  <span className="text-zinc-500">Speed</span>
                  <p className="text-zinc-300 font-mono">{selectedAgent.speed.toFixed(1)} mph</p>
                </div>
                <div className="bg-zinc-800 rounded p-2">
                  <span className="text-zinc-500">Heading</span>
                  <p className="text-zinc-300 font-mono">{selectedAgent.heading.toFixed(0)}°</p>
                </div>
                <div className="bg-zinc-800 rounded p-2">
                  <span className="text-zinc-500">Status</span>
                  <p className="text-zinc-300 capitalize">{selectedAgent.status}</p>
                </div>
              </div>
            </div>
          )}

          {/* Timeline toggle */}
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 hover:bg-zinc-800/50 transition mt-auto"
          >
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
              <Clock size={14} className="text-emerald-400" />
              Timeline ({timeline.length})
            </span>
            {showTimeline ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronUp size={14} className="text-zinc-500" />}
          </button>

          {showTimeline && (
            <div className="flex-1 overflow-y-auto p-3 space-y-1 min-h-0">
              {timeline.length === 0 && (
                <p className="text-[10px] text-zinc-600 text-center py-4">No events yet. Spawn agents and run the simulation.</p>
              )}
              {[...timeline].reverse().map((e) => (
                <div key={e.id} className="flex items-start gap-2 text-[10px] py-1 px-2 rounded hover:bg-zinc-800/50">
                  <span className="text-zinc-600 w-12 shrink-0 font-mono">{(e.time / 1000).toFixed(1)}s</span>
                  <div
                    className="w-2 h-2 rounded-full mt-0.5 shrink-0"
                    style={{ backgroundColor: agents.find((a) => a.id === e.agentId)?.color ?? "#666" }}
                  />
                  <span className="text-zinc-400 w-14 truncate shrink-0">{e.agentLabel}</span>
                  <span className={`${
                    e.type === "error" ? "text-red-400" :
                    e.type === "park" ? "text-amber-400" :
                    e.type === "spawn" ? "text-emerald-400" :
                    e.type === "route_end" ? "text-blue-400" :
                    "text-zinc-500"
                  }`}>
                    {e.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
