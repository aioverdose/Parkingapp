"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";

type Event = { id: string; event_type: string; summary: string; created_at: string };

export default function ClientTimelinePage({ params }: { params: { id: string } }) {
  const [events, setEvents] = useState<Event[]>([]);
  useEffect(() => { void (async () => { const session = (await createBrowserClient().auth.getSession()).data.session; if (!session) return; const response = await fetch(`/api/admin/clients/${params.id}`, { headers: { Authorization: `Bearer ${session.access_token}` } }); const body = await response.json(); if (response.ok) setEvents(body.timeline ?? []); })(); }, [params.id]);
  return <main className="mx-auto max-w-4xl p-6 sm:p-8"><Link href={`/admin/clients/${params.id}`} className="text-sm font-bold text-[#2457d6]">← Client overview</Link><h1 className="mt-5 text-4xl font-black">Activity timeline</h1><div className="mt-8 space-y-3">{events.length === 0 && <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-zinc-500">No activity recorded yet.</p>}{events.map((event) => <article key={event.id} className="rounded-2xl border border-zinc-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#2457d6]">{event.event_type.replaceAll("_", " ")}</p><p className="mt-2 text-sm font-semibold text-zinc-700">{event.summary}</p><p className="mt-2 text-xs text-zinc-400">{new Date(event.created_at).toLocaleString()}</p></article>)}</div></main>;
}
