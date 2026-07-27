"use client";

import { useState, useCallback, useEffect } from "react";
import { PRESET_LOCATIONS } from "@/lib/testing/presetLocations";
import { LONG_BEACH_CENTER } from "@/lib/testing/constants";
import { calculateEta, calculateBatchEta, checkOsmConnection } from "@/lib/testing/osrmClient";
import { MapPin, RefreshCw, Wifi, WifiOff, ArrowUpDown, Plus, X } from "lucide-react";

interface EtaResult {
  name: string;
  distanceMeters: number;
  durationSeconds: number;
}

export function EtaTester() {
  const [originLat, setOriginLat] = useState(LONG_BEACH_CENTER.lat.toString());
  const [originLng, setOriginLng] = useState(LONG_BEACH_CENTER.lng.toString());
  const [destLat, setDestLat] = useState("");
  const [destLng, setDestLng] = useState("");
  const [destName, setDestName] = useState("");
  const [result, setResult] = useState<EtaResult | null>(null);
  const [batchResults, setBatchResults] = useState<EtaResult[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [destinations, setDestinations] = useState<{ lat: number; lng: number; name: string }[]>([]);
  const [osrmConnected, setOsmConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rushHour, setRushHour] = useState(false);
  const [offPeak, setOffPeak] = useState(false);
  const [sortKey, setSortKey] = useState<"name" | "duration" | "distance">("duration");

  useEffect(() => {
    checkOsmConnection().then(setOsmConnected);
  }, []);

  const handleCalculateEta = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const oLat = parseFloat(originLat);
      const oLng = parseFloat(originLng);
      const dLat = parseFloat(destLat);
      const dLng = parseFloat(destLng);
      if ([oLat, oLng, dLat, dLng].some(isNaN)) {
        setError("Invalid coordinates");
        return;
      }
      let etas = await calculateEta(oLat, oLng, dLat, dLng);
      if (rushHour) etas.durationSeconds *= 1.3;
      if (offPeak) etas.durationSeconds *= 0.9;
      setResult({ name: destName || "Destination", ...etas });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calculation failed");
    } finally {
      setLoading(false);
    }
  }, [originLat, originLng, destLat, destLng, destName, rushHour, offPeak]);

  const handleAddDestination = useCallback(() => {
    const lat = parseFloat(destLat);
    const lng = parseFloat(destLng);
    if (isNaN(lat) || isNaN(lng)) return;
    setDestinations((prev) => [...prev, { lat, lng, name: destName || `Dest ${prev.length + 1}` }]);
    setDestLat("");
    setDestLng("");
    setDestName("");
  }, [destLat, destLng, destName]);

  const handleRemoveDestination = useCallback((index: number) => {
    setDestinations((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleBatchCalculate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const oLat = parseFloat(originLat);
      const oLng = parseFloat(originLng);
      if (isNaN(oLat) || isNaN(oLng)) { setError("Invalid origin"); return; }
      let etas = await calculateBatchEta(oLat, oLng, destinations);
      if (rushHour) etas = etas.map((e) => ({ ...e, durationSeconds: e.durationSeconds * 1.3 }));
      if (offPeak) etas = etas.map((e) => ({ ...e, durationSeconds: e.durationSeconds * 0.9 }));
      setBatchResults(etas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch calculation failed");
    } finally {
      setLoading(false);
    }
  }, [originLat, originLng, destinations, rushHour, offPeak]);

  const sortedBatch = [...batchResults].sort((a, b) => {
    if (sortKey === "name") return a.name.localeCompare(b.name);
    if (sortKey === "duration") return a.durationSeconds - b.durationSeconds;
    return a.distanceMeters - b.distanceMeters;
  });

  return (
    <div className="h-full overflow-y-auto p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <MapPin size={16} /> ETA Tester
        </h3>
        <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg ${
          osrmConnected ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
        }`}>
          {osrmConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
          OSRM: {osrmConnected ? "Connected" : "Not Connected (using fallback)"}
        </div>
      </div>

      {/* Origin */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3">
        <h4 className="text-xs font-bold text-zinc-500 uppercase">Origin</h4>
        <div className="flex gap-2">
          <input type="number" step="0.000001" value={originLat} onChange={(e) => setOriginLat(e.target.value)} placeholder="Lat" className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          <input type="number" step="0.000001" value={originLng} onChange={(e) => setOriginLng(e.target.value)} placeholder="Lng" className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          <select onChange={(e) => { const p = PRESET_LOCATIONS[Number(e.target.value)]; if (p) { setOriginLat(p.lat.toString()); setOriginLng(p.lng.toString()); } }} defaultValue="-1" className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm">
            <option value="-1" disabled>Preset</option>
            {PRESET_LOCATIONS.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Destination */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-zinc-500 uppercase">Destination</h4>
          <button onClick={() => setBatchMode(!batchMode)} className="text-xs text-blue-600 hover:underline">
            {batchMode ? "Single Mode" : "Batch Mode"}
          </button>
        </div>
        <div className="flex gap-2">
          <input type="text" value={destName} onChange={(e) => setDestName(e.target.value)} placeholder="Name (optional)" className="w-32 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          <input type="number" step="0.000001" value={destLat} onChange={(e) => setDestLat(e.target.value)} placeholder="Lat" className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          <input type="number" step="0.000001" value={destLng} onChange={(e) => setDestLng(e.target.value)} placeholder="Lng" className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm" />
        </div>
        {batchMode && (
          <button onClick={handleAddDestination} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
            <Plus size={12} /> Add Destination
          </button>
        )}
      </div>

      {/* Condition toggles */}
      <div className="flex gap-3">
        <button onClick={() => setRushHour(!rushHour)} className={`text-xs font-medium px-3 py-2 rounded-lg transition ${rushHour ? "bg-amber-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}`}>
          Rush Hour (+30%)
        </button>
        <button onClick={() => setOffPeak(!offPeak)} className={`text-xs font-medium px-3 py-2 rounded-lg transition ${offPeak ? "bg-emerald-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}`}>
          Off-Peak (-10%)
        </button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Single result */}
      {!batchMode && (
        <button onClick={handleCalculateEta} disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition flex items-center gap-2">
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <MapPin size={14} />}
          Calculate ETA
        </button>
      )}
      {!batchMode && result && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="text-xs font-bold text-zinc-500 uppercase mb-2">Result</div>
          <div className="text-lg font-bold text-zinc-900 dark:text-white">{result.name}</div>
          <div className="flex gap-6 mt-2">
            <div><span className="text-2xl font-black text-blue-600">{(result.durationSeconds / 60).toFixed(1)}</span><span className="text-sm text-zinc-500 ml-1">min</span></div>
            <div><span className="text-2xl font-black text-zinc-700 dark:text-zinc-300">{(result.distanceMeters * 0.000621371).toFixed(2)}</span><span className="text-sm text-zinc-500 ml-1">mi</span></div>
          </div>
        </div>
      )}

      {/* Batch mode */}
      {batchMode && (
        <>
          <div className="flex gap-3 items-center">
            <button onClick={handleBatchCalculate} disabled={loading || destinations.length === 0} className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition flex items-center gap-2">
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <MapPin size={14} />}
              Calculate All ETAs ({destinations.length})
            </button>
          </div>

          {destinations.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
              <div className="text-xs font-bold text-zinc-500 uppercase mb-2">Destinations ({destinations.length})</div>
              <div className="space-y-1">
                {destinations.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2">
                    <span>{d.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 font-mono">{d.lat.toFixed(4)}, {d.lng.toFixed(4)}</span>
                      <button onClick={() => handleRemoveDestination(i)} className="text-zinc-400 hover:text-red-500"><X size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sortedBatch.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 p-3 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-bold text-zinc-500 uppercase">Results</span>
                <div className="flex gap-1 ml-auto">
                  {(["name", "duration", "distance"] as const).map((k) => (
                    <button key={k} onClick={() => setSortKey(k)} className={`text-[10px] px-2 py-1 rounded ${sortKey === k ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "text-zinc-400 hover:text-zinc-600"}`}>
                      <ArrowUpDown size={10} className="inline mr-0.5" />{k}
                    </button>
                  ))}
                </div>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {sortedBatch.map((r, i) => (
                  <div key={i} className="flex items-center px-4 py-3 text-sm">
                    <span className="flex-1 font-medium">{r.name}</span>
                    <span className="w-24 text-right font-mono text-blue-600 font-bold">{(r.durationSeconds / 60).toFixed(1)} min</span>
                    <span className="w-24 text-right font-mono text-zinc-500">{(r.distanceMeters * 0.000621371).toFixed(2)} mi</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
