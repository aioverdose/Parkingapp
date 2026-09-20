"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { createBrowserClient } from "@/lib/supabaseClient";

type Health = Record<string, unknown>;
type EventRow = { event_name: string; occurred_at: string; correlation_suffix: string; route_origin: string; outcome: string; duration_ms: number | null; failure_code: string | null };
type OperationsResponse = { environment: { label: string; project_suffix: string | null; preview_url: string | null; deployment_id: string | null; commit_id: string | null }; flags: { neutral_matching_enabled: boolean; legacy_matching_enabled: boolean }; neutral_radius_meters: number; legacy_guard_state: string; health: Health; events: EventRow[] };

const cards = [
  ["Eligible schedule users", "eligible_schedule_users"],
  ["Users with windows", "users_with_current_windows"],
  ["Users missing windows", "users_missing_windows"],
  ["Current windows", "current_window_count"],
  ["Sync successes", "sync_success_count"],
  ["Sync failures", "sync_failure_count"],
  ["Scans", "scan_count"],
  ["Zero-candidate scans", "zero_candidate_scan_count"],
  ["Potential matches", "potential_match_count"],
  ["Dedupe suppressions", "dedupe_suppression_count"],
  ["Legacy routes blocked", "legacy_blocked_count"],
  ["Average sync/scan latency", "average_latency_ms"],
] as const;

function numberValue(health: Health, key: string) {
  const value = health[key];
  return typeof value === "number" ? value : 0;
}

export default function MatchingOperationsPage() {
  const [data, setData] = useState<OperationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const session = (await createBrowserClient().auth.getSession()).data.session;
      if (!session?.access_token) throw new Error("Unauthorized");
      const response = await fetch("/api/admin/matching-operations?hours=24&limit=50", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Matching operations unavailable");
      setData(body as OperationsResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Matching operations unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#f6f8f6] text-sm font-semibold text-[#71807b]"><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Loading matching operations...</main>;
  if (error || !data) return <main className="flex min-h-screen items-center justify-center bg-[#f6f8f6] p-6"><section className="rounded-3xl border border-[#f1c6bb] bg-white p-8 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-[#e85d3f]" /><h1 className="mt-3 text-xl font-bold">Matching operations unavailable</h1><p className="mt-2 text-sm text-[#71807b]">{error || "Health data unavailable"}</p><button type="button" onClick={() => void load()} className="mt-5 rounded-xl bg-[#17211e] px-4 py-2 text-sm font-bold text-white">Retry</button></section></main>;

  const status = String(data.health.status || "blocked");
  const statusTone = status === "healthy" ? "bg-[#eff9ef] text-[#3d7650]" : "bg-[#fff5e8] text-[#94651b]";
  return <main className="min-h-screen bg-[#f6f8f6] px-5 py-7 text-[#17211e] sm:px-8 lg:px-10 lg:py-10"><div className="mx-auto max-w-7xl">
    <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#e85d3f]">Admin / Operations</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em]">Matching Operations</h1><p className="mt-2 text-sm text-[#71807b]">Privacy-safe synchronization and neutral matching health.</p></div><div className="flex items-center gap-3"><span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${statusTone}`}><span className="h-2 w-2 rounded-full bg-current" />{status}</span><button type="button" onClick={() => void load()} className="rounded-xl border border-[#dce3df] bg-white p-2.5 text-[#71807b]" aria-label="Refresh matching operations"><RefreshCw className="h-4 w-4" /></button></div></header>
    <section className="mt-6 rounded-2xl border border-[#e5a08d] bg-[#fff8f4] p-4"><div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold"><span>{data.environment.label}</span><span>Project suffix: {data.environment.project_suffix || "unavailable"}</span><span>Radius: {data.neutral_radius_meters} m</span><span>Legacy: {data.legacy_guard_state}</span></div><div className="mt-2 text-xs text-[#71807b]">Preview: {data.environment.preview_url || "unavailable"} · Deployment: {data.environment.deployment_id || "unavailable"} · Commit: {data.environment.commit_id || "unavailable"}</div></section>
    <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, key]) => <article key={key} className="rounded-2xl border border-[#dce3df] bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#82908a]">{label}</p><p className="mt-3 text-3xl font-bold">{key === "average_latency_ms" ? `${numberValue(data.health, key)} ms` : numberValue(data.health, key)}</p></article>)}</section>
    <section className="mt-6 grid gap-4 lg:grid-cols-3"><article className="rounded-2xl border border-[#dce3df] bg-white p-5"><div className="flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4 text-[#4b805d]" />Flags</div><p className="mt-4 text-sm">Neutral matching: {data.flags.neutral_matching_enabled ? "enabled" : "disabled"}</p><p className="mt-1 text-sm">Legacy matching: {data.flags.legacy_matching_enabled ? "enabled" : "disabled"}</p></article><article className="rounded-2xl border border-[#dce3df] bg-white p-5 lg:col-span-2"><h2 className="font-bold">Recent safe events</h2><div className="mt-3 space-y-2">{data.events.length === 0 ? <p className="text-sm text-[#71807b]">No events in the selected window.</p> : data.events.map((event, index) => <div key={`${event.occurred_at}-${event.correlation_suffix}-${index}`} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf0ee] py-2 text-xs last:border-0"><span className="font-bold">{event.event_name}</span><span className="text-[#71807b]">{event.outcome} · {event.route_origin} · {event.correlation_suffix}</span><span className="text-[#71807b]">{event.duration_ms == null ? "-" : `${event.duration_ms} ms`}{event.failure_code ? ` · ${event.failure_code}` : ""}</span></div>)}</div></article></section>
  </div></main>;
}
