"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";

type Match = {
  id: string;
  status: string;
  distance_meters: number;
  time_overlap_minutes: number;
  match_confidence: number | null;
  expires_at: string;
  messenger_conversation_id: string | null;
};

export default function PotentialMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let stopped = false;
    void (async () => {
      try {
        const session = (await createBrowserClient().auth.getSession()).data.session;
        if (!session) {
          router.push("/");
          return;
        }

        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 10000);
        let response: Response;
        try {
          response = await fetch(`/api/potential-matches/${id}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: "no-store",
            signal: controller.signal,
          });
        } finally {
          window.clearTimeout(timeout);
        }
        const body = await response.json().catch(() => ({})) as { match?: Match; error?: string };
        if (!response.ok) throw new Error(body.error || "Could not load potential matches");
        const found = body.match;
        if (!found) throw new Error("This potential match is no longer available or has expired.");
        if (!stopped) setMatch(found);
      } catch (reason) {
        if (!stopped) setError(reason instanceof Error ? reason.message : "Could not load potential match");
      } finally {
        if (!stopped) setLoading(false);
      }
    })();
    return () => { stopped = true; };
  }, [id, router]);

  async function decide(decision: "accept" | "decline") {
    const session = (await createBrowserClient().auth.getSession()).data.session;
    if (!session) return;
    const response = await fetch(`/api/potential-matches/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ decision }),
    });
    const body = await response.json().catch(() => ({})) as { match?: Match; error?: string };
    if (!response.ok) setError(body.error || "Could not update potential match");
    else if (body.match?.status === "mutually_accepted") router.push(`/potential-matches/${id}/messages`);
    else if (body.match) setMatch(body.match);
  }

  if (loading) return <main className="p-8">Loading potential match...</main>;
  if (error || !match) return <main className="mx-auto max-w-xl p-6 sm:p-10"><Link href="/" className="text-sm font-bold text-[#2457d6]">Back to app</Link><p className="mt-8 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error || "Potential match unavailable"}</p></main>;

  return <main className="mx-auto max-w-xl p-6 sm:p-10"><Link href="/" className="text-sm font-bold text-[#2457d6]">← Back to app</Link><section className="mt-8 rounded-3xl border border-[#b9ccf7] bg-[#f2f6ff] p-6"><p className="text-xs font-black uppercase tracking-widest text-[#2457d6]">Potential match</p><h1 className="mt-3 text-3xl font-black">A compatible arrival and departure window overlap.</h1><div className="mt-6 grid grid-cols-2 gap-3 text-sm"><Info label="Approximate distance" value={`${match.distance_meters} meters`} /><Info label="Estimated overlap" value={`${match.time_overlap_minutes} minutes`} /><Info label="Match confidence" value={match.match_confidence ? `${Math.round(match.match_confidence)}%` : "Review needed"} /><Info label="Status" value={match.status.replaceAll("_", " ")} /></div><p className="mt-6 text-sm leading-6 text-[#445477]">This is only a potential coordination opportunity. Availability is not guaranteed. Check posted signs and local rules.</p>{match.status !== "mutually_accepted" && <div className="mt-6 flex gap-3"><button onClick={() => void decide("accept")} className="flex-1 rounded-xl bg-[#2457d6] px-4 py-3 text-sm font-black text-white">Accept</button><button onClick={() => void decide("decline")} className="flex-1 rounded-xl border border-[#9db7ee] px-4 py-3 text-sm font-black text-[#153ea8]">Decline</button></div>}{error && <p className="mt-4 rounded-xl bg-red-100 p-3 text-sm font-semibold text-red-800">{error}</p>}</section></main>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</p><p className="mt-1 font-bold capitalize">{value}</p></div>; }
