"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";

type Business = { id: string; slug: string; name: string; description: string | null; logo_url: string | null; app_name: string | null; primary_color: string | null; accent_color: string | null; welcome_message: string | null; house_notes: string | null; promo_text: string | null; info_link: string | null };

export default function BusinessJoinPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetch(`/api/join/${slug}${window.location.search}`).then(async (res) => {
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Business not found");
      setBusiness(body.business);
    }).catch((err) => setError(err.message));
  }, [slug]);

  const join = async () => {
    const supabase = createBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    setJoining(true);
    const res = await fetch(`/api/join/${slug}${window.location.search}`, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } });
    const body = await res.json();
    if (!res.ok) setError(body.error || "Unable to join this network");
    else { localStorage.setItem("pwa_install_name", business?.app_name || business?.name || "ParkingMeeters"); router.push(`/business/${body.business_id}/customer`); }
    setJoining(false);
  };

  if (error) return <main className="min-h-screen grid place-items-center p-6"><div className="max-w-md text-center"><h1 className="text-xl font-bold">This join link is unavailable</h1><p className="text-sm text-zinc-500 mt-2">{error}</p></div></main>;
  if (!business) return <main className="min-h-screen grid place-items-center p-6 text-zinc-500">Loading network...</main>;

  const brand = business.primary_color || "#2563eb";
  return <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-5 flex items-center justify-center" style={{ ["--brand" as string]: brand } as React.CSSProperties}>
    <section className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-7 text-center">
      {business.logo_url ? <img src={business.logo_url} alt="" className="w-20 h-20 rounded-2xl object-cover mx-auto mb-5" /> : <div className="w-20 h-20 rounded-2xl mx-auto mb-5 grid place-items-center text-white text-3xl font-bold" style={{ backgroundColor: brand }}>{business.name.charAt(0)}</div>}
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Private business network</p>
      <h1 className="text-3xl font-bold mt-2">{business.app_name || business.name}</h1>
      <p className="text-zinc-600 dark:text-zinc-300 mt-4">{business.welcome_message || business.description || "Join for arrival heads-ups when someone is leaving nearby."}</p>
      <div className="text-left rounded-2xl bg-zinc-50 dark:bg-zinc-800 p-4 mt-6 text-sm space-y-2"><p>Join this private business network.</p><p>Receive heads-ups when someone is leaving nearby.</p><p className="font-semibold">Heads-ups only. This is not a reservation and parking is never guaranteed.</p></div>
      {business.house_notes && <p className="text-left text-sm text-zinc-500 mt-4"><strong>House note:</strong> {business.house_notes}</p>}
      {business.promo_text && <p className="text-left text-sm mt-3">{business.promo_text}</p>}
      <button onClick={join} disabled={joining} className="w-full mt-7 py-3 rounded-2xl text-white font-bold disabled:opacity-50" style={{ backgroundColor: brand }}>{joining ? "Joining..." : "Join this network"}</button>
      <p className="text-xs text-zinc-500 mt-4">After joining, add the app to your home screen when prompted. On iPhone, use Share then Add to Home Screen.</p>
      {business.info_link && <a href={business.info_link} target="_blank" rel="noreferrer" className="inline-block text-sm mt-4" style={{ color: brand }}>More from {business.name}</a>}
    </section>
  </main>;
}
