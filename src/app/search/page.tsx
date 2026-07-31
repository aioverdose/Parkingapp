"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Loader2, Search, MapPin, ArrowLeft, Filter, X, Clock, Car } from "lucide-react";

type VehicleType = "compact" | "sedan" | "suv" | "truck" | "van" | "motorcycle" | null;

interface SpotResult {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  address: string;
  departure_time: string;
  return_time: string | null;
  vehicle_type: string | null;
  relay_mode: "imminent" | "scheduled";
  tip_message: string | null;
  created_at: string;
  status: string;
}

const VEHICLE_TYPES = [
  { value: "", label: "Any vehicle" },
  { value: "compact", label: "Compact" },
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
  { value: "truck", label: "Truck" },
  { value: "van", label: "Van" },
  { value: "motorcycle", label: "Motorcycle" },
];

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [relayMode, setRelayMode] = useState("");
  const [results, setResults] = useState<SpotResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const doSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    const admin = (await import("@/lib/supabaseAdmin")).createAdminClient();

    const now = new Date().toISOString();
    let q = admin
      .from("parking_spots")
      .select("*")
      .eq("status", "active")
      .gt("expires_at", now)
      .gt("departure_time", now)
      .order("departure_time", { ascending: true });

    if (vehicleType) {
      q = q.eq("vehicle_type", vehicleType);
    }
    if (relayMode) {
      q = q.eq("relay_mode", relayMode);
    }

    const { data } = await q;
    let spots = (data ?? []) as SpotResult[];

    if (query.trim()) {
      const lower = query.toLowerCase();
      spots = spots.filter(
        (s) =>
          s.address?.toLowerCase().includes(lower) ||
          s.tip_message?.toLowerCase().includes(lower),
      );
    }

    setResults(spots);
    setLoading(false);
  }, [query, vehicleType, relayMode]);

  useEffect(() => {
    if (searched) doSearch();
  }, [vehicleType, relayMode, doSearch, searched]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-lg mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push("/")} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Search Spots</h1>
        </div>

        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text" value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder="Search address or tip..."
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-10 h-11 rounded-xl border flex items-center justify-center transition ${
              showFilters
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600"
            }`}
          >
            <Filter size={16} />
          </button>
          <button
            onClick={doSearch}
            className="px-5 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition"
          >
            Search
          </button>
        </div>

        {showFilters && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Filters</span>
              <button onClick={() => { setVehicleType(""); setRelayMode(""); }} className="text-xs text-blue-600 hover:text-blue-700 transition">
                Clear all
              </button>
            </div>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
            >
              {VEHICLE_TYPES.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
            <select
              value={relayMode}
              onChange={(e) => setRelayMode(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
            >
              <option value="">Any relay mode</option>
              <option value="imminent">Imminent (leaving now)</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
            <MapPin size={40} className="mx-auto text-zinc-300 mb-3" />
            <p className="text-zinc-500 text-sm">No spots found</p>
            <p className="text-zinc-400 text-xs mt-1">Try adjusting your filters.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-400 font-medium mb-2">{results.length} spot{results.length !== 1 && "s"} available</p>
            {results.map((spot) => (
              <button
                key={spot.id}
                onClick={() => router.push(`/?spot=${spot.id}`)}
                className="w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 text-left hover:border-zinc-300 dark:hover:border-zinc-700 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin size={14} className="text-blue-500 shrink-0" />
                      <p className="text-sm font-bold truncate">{spot.address || "Unknown location"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {spot.vehicle_type && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                          <Car size={10} />{spot.vehicle_type}
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        spot.relay_mode === "imminent"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                      }`}>
                        {spot.relay_mode === "imminent" ? "Imminent" : "Scheduled"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock size={10} />
                      {new Date(spot.departure_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    {spot.tip_message && (
                      <p className="text-[10px] text-zinc-400 mt-1 italic truncate max-w-[120px]">
                        &ldquo;{spot.tip_message}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
