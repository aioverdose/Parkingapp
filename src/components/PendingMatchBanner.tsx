"use client";

import Link from "next/link";
import { BellRing, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { getMatchProtocolHref } from "@/lib/match-protocol";

type Match = { id: string; status: string };

export function PendingMatchBanner() {
  const [match, setMatch] = useState<Match | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserClient();
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { if (!cancelled) setMatch(null); return; }
      // Keep schedule matching active after onboarding/profile edits. The API
      // is idempotent and creates only new compatible matches.
      await fetch("/api/matches/schedule", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => undefined);
      const response = await fetch("/api/matches?status=pending", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      if (!response.ok) return;
      const body = await response.json() as { matches?: Match[] };
      if (!cancelled) setMatch(body.matches?.[0] ?? null);
    }
    void load();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setMatch(null);
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") void load();
    });
    const timer = window.setInterval(() => void load(), 10_000);
    return () => { cancelled = true; authListener.subscription.unsubscribe(); window.clearInterval(timer); };
  }, []);

  if (!match) return null;
  return <div className="sticky top-0 z-40 border-b border-[#9db7ee] bg-[#2457d6] px-4 py-2 text-white shadow-md"><div className="mx-auto flex max-w-5xl items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2 text-sm font-bold"><BellRing className="h-4 w-4 shrink-0" /><span className="truncate">New parking match</span></div><Link href={getMatchProtocolHref(match.id)} onClick={() => setMatch(null)} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-black text-[#153ea8] transition hover:bg-[#e8efff]">Accept match <ChevronRight className="h-3.5 w-3.5" /></Link></div></div>;
}
