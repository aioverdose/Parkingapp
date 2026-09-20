"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";

type Match = { id: string; status: string; match_confidence: number | null; expires_at: string };

export function PotentialMatchBanner() {
  const [match, setMatch] = useState<Match | null>(null);
  useEffect(() => {
    let stopped = false;
    let loading = false;
    const client = createBrowserClient();
    async function load() {
      if (loading) return;
      loading = true;
      const { data: { session } } = await client.auth.getSession();
      try {
        if (!session || stopped) return;
        await fetch("/api/potential-matches/scan", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } }).catch(() => undefined);
        const response = await fetch("/api/potential-matches", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json() as { matches?: Match[] };
        if (!stopped) setMatch(body.matches?.find((item) => item.status !== "mutually_accepted") ?? null);
      } finally {
        loading = false;
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 10_000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, []);
  if (!match) return null;
  return <div className="sticky top-0 z-[45] border-b border-[#9db7ee] bg-[#153ea8] px-4 py-3 text-white"><div className="mx-auto flex max-w-5xl items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-[#b9ccf7]">Potential match</p><p className="text-sm font-bold">A compatible arrival and departure window overlap nearby.</p></div><Link href={`/potential-matches/${match.id}`} className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-black text-[#153ea8]">Review</Link></div></div>;
}
