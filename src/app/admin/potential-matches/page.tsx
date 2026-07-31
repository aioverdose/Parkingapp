"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Loader2, MapPin, Clock, User, RefreshCw, Calendar } from "lucide-react";

interface PotentialMatchUser {
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  spot_id: string;
  address: string;
  latitude: number;
  longitude: number;
  departure_time: string;
  return_time: string | null;
  relay_mode: "imminent" | "scheduled";
  created_at: string;
}

export default function PotentialMatchesPage() {
  const [spots, setSpots] = useState<PotentialMatchUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { setError("Not authenticated"); setLoading(false); return; }

    const res = await fetch("/api/admin/potential-matches", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || `Server error ${res.status}`);
    } else {
      const data = await res.json();
      setSpots(data.spots ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeSpots = spots.filter((s) => new Date(s.departure_time) > new Date());
  const expiredSpots = spots.filter((s) => new Date(s.departure_time) <= new Date());

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Potential Matches</h1>
          <p className="text-sm text-zinc-500 mt-1">Users with active parking spots that have departure/return times set</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 mb-4">
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>
      ) : (
        <>
          <div className="mb-3">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <Clock size={14} className="text-emerald-500" /> Active ({activeSpots.length})
            </h2>
          </div>
          {activeSpots.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center mb-6">
              <MapPin size={40} className="mx-auto text-zinc-300 mb-3" />
              <p className="text-zinc-500 text-sm">No active spots with scheduled times</p>
            </div>
          ) : (
            <div className="space-y-2 mb-8">
              {activeSpots.map((s) => (
                <SpotCard key={s.spot_id} spot={s} />
              ))}
            </div>
          )}

          {expiredSpots.length > 0 && (
            <>
              <h2 className="font-bold text-sm flex items-center gap-2 mb-3 mt-6">
                <Calendar size={14} className="text-zinc-400" /> Past ({expiredSpots.length})
              </h2>
              <div className="space-y-2 opacity-60">
                {expiredSpots.map((s) => (
                  <SpotCard key={s.spot_id} spot={s} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function SpotCard({ spot }: { spot: PotentialMatchUser }) {
  const departsIn = Math.round((new Date(spot.departure_time).getTime() - Date.now()) / 60000);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <User size={14} className="text-zinc-400 shrink-0" />
            <span className="text-sm font-bold truncate">{spot.user_name || spot.user_email || "Unknown"}</span>
            {spot.user_phone && (
              <span className="text-[10px] text-zinc-400">{spot.user_phone}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <MapPin size={12} />
            <span className="truncate">{spot.address || "No address"}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
              <Clock size={10} />
              Departs {new Date(spot.departure_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {departsIn > 0 && departsIn < 120 && (
                <span className="text-emerald-600 dark:text-emerald-400">({departsIn}m)</span>
              )}
            </span>
            {spot.return_time && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                Returns {new Date(spot.return_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
              spot.relay_mode === "imminent"
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }`}>
              {spot.relay_mode}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
