"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import CustomerVoiceWelcome from "@/components/business/CustomerVoiceWelcome";

type Business = { id: string; name: string; description: string | null; logo_url: string | null; app_name: string | null; primary_color: string | null; welcome_message: string | null; house_notes: string | null; promo_text: string | null; info_link: string | null };

export default function CustomerBusinessHome() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { (async () => { const supabase = createBrowserClient(); const { data: { session } } = await supabase.auth.getSession(); if (!session) { router.replace(`/auth/login?next=${encodeURIComponent(`/business/${id}/customer`)}`); return; } const response = await fetch(`/api/businesses/${id}`, { headers: { Authorization: `Bearer ${session.access_token}` } }); const body = await response.json().catch(() => ({})); if (!response.ok) { setError(body.error || "Unable to load this business network."); return; } setBusiness(body.business); })(); }, [id, router]);

  if (error) return <main className="min-h-screen grid place-items-center p-6 text-center"><p className="text-red-600">{error}</p></main>;
  if (!business) return <main className="min-h-screen grid place-items-center p-6 text-zinc-500">Loading your business network...</main>;
  const brand = business.primary_color || "#2563eb";
  return <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-5" style={{ borderTop: `5px solid ${brand}` }}><div className="max-w-lg mx-auto space-y-5"><header className="flex items-center gap-3 pt-3">{business.logo_url ? <img src={business.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover" /> : <div className="w-12 h-12 rounded-xl grid place-items-center text-white font-bold text-xl" style={{ backgroundColor: brand }}>{business.name.charAt(0)}</div>}<div><p className="text-xs text-zinc-500">Private business network</p><h1 className="font-bold text-xl">{business.app_name || business.name}</h1></div></header><CustomerVoiceWelcome businessName={business.app_name || business.name} brandColor={brand} businessId={business.id} /><a href="/arrival" className="block rounded-2xl bg-blue-600 px-4 py-4 text-center text-sm font-bold text-white shadow-lg shadow-blue-600/20">Start SPOT Arrival Mode</a>{business.welcome_message && <p className="text-sm text-zinc-600 dark:text-zinc-300">{business.welcome_message}</p>}{business.house_notes && <div className="rounded-2xl bg-amber-50 text-amber-950 p-4 text-sm"><strong>Good to know:</strong> {business.house_notes}</div>}{business.promo_text && <p className="text-sm">{business.promo_text}</p>}{business.info_link && <a href={business.info_link} target="_blank" rel="noreferrer" className="text-sm font-semibold" style={{ color: brand }}>More from {business.name}</a>}<p className="text-xs text-zinc-500 pb-5">This network provides arrival heads-ups only. It does not reserve or guarantee public parking. Street rules always apply.</p></div></main>;
}
