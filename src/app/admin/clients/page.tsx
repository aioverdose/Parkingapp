"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Briefcase, Plus, Search } from "lucide-react";
import { createBrowserClient } from "@/lib/supabaseClient";

type ClientFile = { id: string; internal_reference: string; display_name: string; relationship_status: string; engagement_status: string; priority: string; city: string | null; study_area_name: string | null; updated_at: string };

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientFile[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  async function load(query = "") {
    const session = (await createBrowserClient().auth.getSession()).data.session;
    if (!session) return;
    const response = await fetch(`/api/admin/clients${query ? `?search=${encodeURIComponent(query)}` : ""}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
    const body = await response.json();
    if (!response.ok) setError(body.error || "Could not load client files"); else setClients(body.clients ?? []);
  }

  useEffect(() => { void load(); }, []);

  return <main className="mx-auto max-w-6xl p-6 sm:p-8"><header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#e85d3f]">Consultant workspace</p><h1 className="mt-2 text-4xl font-black tracking-[-0.05em]">Client Files</h1><p className="mt-2 text-sm text-[#71807b]">Private client, prospect, assessment, and pilot records.</p></div><Link href="/admin/clients/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2457d6] px-4 py-3 text-sm font-bold text-white"><Plus size={17} /> New client file</Link></header><div className="mt-7 flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void load(search); }} placeholder="Search client name, reference, or city" className="app-input w-full rounded-xl py-3 pl-10 pr-4" /></div><button type="button" onClick={() => void load(search)} className="rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold">Search</button></div>{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}<div className="mt-7 grid gap-3">{clients.map((client) => <Link key={client.id} href={`/admin/clients/${client.id}`} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#9db7ee]"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#e8efff] text-[#2457d6]"><Briefcase size={20} /></div><div><p className="text-xs font-bold uppercase tracking-wider text-zinc-400">{client.internal_reference}</p><h2 className="mt-1 text-lg font-black">{client.display_name}</h2><p className="mt-1 text-sm text-zinc-500">{client.study_area_name || client.city || "Study area not set"}</p></div></div><div className="flex gap-2 text-xs font-bold"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{client.relationship_status}</span><span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600">{client.engagement_status}</span></div></div></Link>)}{clients.length === 0 && <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center text-sm text-zinc-500">No client files yet. Create the first one from an onsite conversation.</div>}</div></main>;
}
