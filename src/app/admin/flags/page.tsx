"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { AlertTriangle, CheckCircle, Trash2, Loader2, Search, Shield } from "lucide-react";

interface SpotFlag {
  id: string;
  spot_id: string;
  flagged_by_user_id: string;
  flag_type: string;
  comment: string | null;
  created_at: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
}

export default function AdminFlagsPage() {
  const adminSupabase = createBrowserClient();
  const supabase = createBrowserClient();
  const [flags, setFlags] = useState<(SpotFlag & { spot_address?: string; flagger_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadFlags() {
    const { data: flagsData } = await (adminSupabase as any)
      .from("spot_flags")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    const processedFlags = await Promise.all(
      (flagsData ?? []).map(async (f: SpotFlag) => {
        const { data: spot } = await supabase.from("parking_spots").select("address").eq("id", f.spot_id).maybeSingle();
        const { data: user } = await supabase.from("users").select("name, email").eq("id", f.flagged_by_user_id).maybeSingle();
        return {
          ...f,
          spot_address: spot?.address ?? "Unknown",
          flagger_name: user?.name ?? user?.email ?? "Unknown",
        };
      })
    );

    setFlags(processedFlags);
    setLoading(false);
  }

  useEffect(() => {
    loadFlags();
  }, []);

  const filtered = flags.filter(
    (f) =>
      !search ||
      f.flag_type.toLowerCase().includes(search.toLowerCase()) ||
      (f.spot_address ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (f.flagger_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (f.comment ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  async function resolveFlag(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    await (adminSupabase as any)
      .from("spot_flags")
      .update({ resolved: true, resolved_by: session.user.id, resolved_at: new Date().toISOString() })
      .eq("id", id);
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, resolved: true, resolved_by: session.user.id, resolved_at: new Date().toISOString() } : f)));
  }

  async function deleteFlaggedSpot(spotId: string) {
    if (!confirm("Delete this spot and all its flags?")) return;
    await adminSupabase.from("parking_spots").delete().eq("id", spotId);
    setFlags((prev) => prev.filter((f) => f.spot_id !== spotId));
  }

  const flagTypeLabel: Record<string, string> = {
    wrong_location: "Wrong Location",
    fake_spot: "Fake Spot",
    rude_user: "Rude User",
    dangerous_behavior: "Dangerous",
    other: "Other",
  };

  const flagTypeColor: Record<string, string> = {
    wrong_location: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    fake_spot: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    rude_user: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    dangerous_behavior: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    other: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  };

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;

  const unresolvedCount = flags.filter((f) => !f.resolved).length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Flagged Spots</h1>
          <p className="text-sm text-zinc-500 mt-1">{unresolvedCount} unresolved / {flags.length} total</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input
          type="text"
          placeholder="Search flags by type, spot, or comment..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          <Shield className="mx-auto mb-4 opacity-30" size={48} />
          <p className="font-medium">No flags found</p>
          <p className="text-sm mt-1">Flagged spots will appear here for moderation.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((f) => (
            <div key={f.id} className={`bg-white dark:bg-zinc-900 border rounded-2xl p-4 ${
              f.resolved ? "border-zinc-200 dark:border-zinc-800 opacity-60" : "border-red-200 dark:border-red-800"
            }`}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${flagTypeColor[f.flag_type] ?? "bg-zinc-100 text-zinc-700"}`}>
                      {flagTypeLabel[f.flag_type] ?? f.flag_type}
                    </span>
                    {f.resolved && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                        Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold mt-1 truncate">{f.spot_address}</p>
                  {f.comment && <p className="text-xs text-zinc-500 mt-1">&quot;{f.comment}&quot;</p>}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-400">
                    <span>Flagged by: {f.flagger_name}</span>
                    <span>{new Date(f.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!f.resolved && (
                    <button onClick={() => resolveFlag(f.id)} className="p-2 text-zinc-400 hover:text-green-600 transition" title="Resolve">
                      <CheckCircle size={18} />
                    </button>
                  )}
                  <button onClick={() => deleteFlaggedSpot(f.spot_id)} className="p-2 text-zinc-400 hover:text-red-600 transition" title="Delete spot">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
