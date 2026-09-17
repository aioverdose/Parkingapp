"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";

export default function BusinessPrintPage() {
  const { id, template } = useParams<{ id: string; template: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { (async () => { const { data: { session } } = await createBrowserClient().auth.getSession(); if (!session) { setError("Please log in first."); return; } const res = await fetch(`/api/businesses/${id}/dashboard`, { headers: { Authorization: `Bearer ${session.access_token}` } }); const body = await res.json(); if (!res.ok || body.role !== "admin") setError("Only business admins can open print templates."); else setData(body); })(); }, [id]);
  if (error) return <main className="p-8 text-center">{error}</main>;
  if (!data) return <main className="p-8 text-center text-zinc-500">Preparing print template...</main>;
  const flyer = template === "flyer";
  const qr = `https://quickchart.io/qr?size=1000&text=${encodeURIComponent(data.joinUrl)}`;
  return <main className={`print-sheet ${flyer ? "print-flyer" : "print-tent"}`} style={{ borderColor: data.business.primary_color || "#2563eb" }}>
    <div className="flex justify-end print:hidden"><button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold">Print / Save PDF</button></div>
    <div className="print-content text-center">
      {data.business.logo_url && <img src={data.business.logo_url} alt="" className="print-logo" />}
      <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Private network</p>
      <h1 className="text-4xl font-black mt-3">{data.business.app_name || data.business.name}</h1>
      {flyer ? <><p className="text-xl mt-5">Scan → Join → Install the app</p><p className="text-base mt-3">Receive heads-ups when someone is leaving nearby.</p></> : <p className="text-xl mt-5">Get arrival heads-ups from our network</p>}
      <img src={qr} alt="Scan to join" className="print-qr" />
      <p className="font-bold text-lg">Scan to join</p>
      {flyer && <p className="text-sm mt-3">Join our private business network and stay aware of nearby departures.</p>}
      <p className="text-xs text-zinc-600 mt-6">Heads-up only, not a parking reservation. Street rules still apply.</p>
    </div>
  </main>;
}
