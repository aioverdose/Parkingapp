"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";

type DirectoryRecord = { id: string; name: string; address: string | null; latitude: number; longitude: number; confidence: number; source: string; verified: boolean; last_verified_at: string };

export default function DirectoryPage() {
  const [records, setRecords] = useState<DirectoryRecord[]>([]);
  const [message, setMessage] = useState("Loading directory...");
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    const { data: { session } } = await createBrowserClient().auth.getSession();
    if (!session) return setMessage("Sign in as an admin to manage the directory.");
    const response = await fetch("/api/admin/directory", { headers: { Authorization: `Bearer ${session.access_token}` } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(body.error || "Could not load directory");
    setRecords(body.records || []);
    setMessage(`${body.records?.length || 0} businesses and places loaded.`);
  };

  useEffect(() => { queueMicrotask(() => { void load(); }); }, []);

  const sync = async () => {
    const { data: { session } } = await createBrowserClient().auth.getSession();
    if (!session) return;
    setSyncing(true);
    const response = await fetch("/api/admin/directory/sync", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? `Synced ${body.synced || 0} OpenStreetMap records.` : body.error || "Sync failed");
    setSyncing(false);
    if (response.ok) await load();
  };

  return <main className="p-6 max-w-5xl mx-auto"><div className="flex items-center justify-between gap-4 mb-6"><div><p className="text-xs uppercase tracking-widest text-blue-600 font-bold">Location intelligence</p><h1 className="text-2xl font-black mt-1">Business Directory</h1><p className="text-sm text-zinc-500 mt-2">OpenStreetMap place enrichment for destination-aware SPOT matching in Belmont Shore.</p></div><button onClick={() => void sync()} disabled={syncing} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{syncing ? "Syncing..." : "Sync 2nd Street Area"}</button></div><p className="mb-5 rounded-xl bg-zinc-100 dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">{message}</p><div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"><div className="grid grid-cols-[1fr_1fr_100px_110px] gap-3 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500"><span>Business / place</span><span>Address</span><span>Confidence</span><span>Source</span></div>{records.map((record) => <div key={record.id} className="grid grid-cols-[1fr_1fr_100px_110px] gap-3 border-b border-zinc-100 dark:border-zinc-800 px-4 py-3 text-sm last:border-0"><span className="font-semibold">{record.name}</span><span className="truncate text-zinc-500">{record.address || "Address not provided"}</span><span className="text-zinc-500">{Math.round(record.confidence * 100)}%</span><span className="text-xs text-zinc-500">{record.source}{record.verified ? " · verified" : ""}</span></div>)}</div></main>;
}
