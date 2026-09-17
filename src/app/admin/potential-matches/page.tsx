"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { AlertTriangle, Calendar, CheckCircle2, Clock, Loader2, RefreshCw, User } from "lucide-react";

type Person = { id: string; name: string | null; email: string | null };
type Match = {
  id: string;
  status: string;
  created_at: string;
  spot?: { address?: string | null; departure_time?: string | null; return_time?: string | null; relay_mode?: string | null } | null;
  spot_owner?: Person | null;
  seeker?: Person | null;
};

const activeStatuses = new Set(["pending", "offered", "confirmed_by_owner", "confirmed_by_seeker", "confirmed"]);

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Time unavailable";
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export default function PotentialMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getToken = async () => (await createBrowserClient().auth.getSession()).data.session?.access_token;
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = await getToken();
    if (!token) { setError("Not authenticated"); setLoading(false); return; }
    const response = await fetch("/api/admin/potential-matches", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setError(body.error || `Server error ${response.status}`);
    else setMatches(body.matches ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const clearAll = async () => {
    if (!window.confirm("Clear all matches and their match notifications? This cannot be undone.")) return;
    setClearing(true); setError(null); setMessage(null);
    const token = await getToken();
    if (!token) { setError("Not authenticated"); setClearing(false); return; }
    const response = await fetch("/api/admin/potential-matches", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setError(body.error || "Could not clear matches");
    else { setMatches([]); setMessage(`Cleared ${body.cleared ?? 0} matches.`); }
    setClearing(false);
  };

  const active = matches.filter((match) => activeStatuses.has(match.status));
  const historical = matches.filter((match) => !activeStatuses.has(match.status));

  return <main className="mx-auto max-w-5xl p-6">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div><h1 className="text-2xl font-bold">Potential Matches</h1><p className="mt-1 text-sm text-zinc-500">Live match records, participants, acceptance status, and scheduled handoff times.</p></div>
      <div className="flex gap-2"><button type="button" onClick={() => void load()} disabled={loading || clearing} className="flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-600 hover:text-zinc-900 disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button><button type="button" onClick={() => void clearAll()} disabled={clearing || matches.length === 0} className="flex h-10 items-center gap-2 rounded-xl bg-red-600 px-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"><AlertTriangle size={16} />{clearing ? "Clearing..." : "Clear all matches"}</button></div>
    </header>
    {message && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
    {loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div> : <>
      <section className="mt-7"><h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><Clock size={15} className="text-emerald-500" />Active matches ({active.length})</h2>{active.length === 0 ? <Empty text="No active matches" /> : <div className="space-y-3">{active.map((match) => <MatchCard key={match.id} match={match} />)}</div>}</section>
      {historical.length > 0 && <section className="mt-8 opacity-60"><h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><Calendar size={15} className="text-zinc-400" />History ({historical.length})</h2><div className="space-y-3">{historical.map((match) => <MatchCard key={match.id} match={match} />)}</div></section>}
    </>}
  </main>;
}

function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">{text}</div>; }

function MatchCard({ match }: { match: Match }) {
  return <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><User size={15} className="text-zinc-400" /><span className="font-bold">{match.spot_owner?.name || match.spot_owner?.email || "Unknown owner"}</span><span className="text-zinc-400">↔</span><span className="font-bold">{match.seeker?.name || match.seeker?.email || "Unknown seeker"}</span></div><p className="mt-2 text-xs text-zinc-500">{match.spot?.address || "No address"}</p></div><span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase text-blue-700">{statusLabel(match.status)}</span></div><div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600"><span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1"><Clock size={12} /> Departure: {formatDate(match.spot?.departure_time)}</span>{match.spot?.return_time && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-amber-800"><CheckCircle2 size={12} /> Return: {formatDate(match.spot.return_time)}</span>}<span className="rounded-full bg-zinc-100 px-2 py-1">Created: {formatDate(match.created_at)}</span></div></article>;
}
