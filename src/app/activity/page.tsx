"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { ArrowLeft, Bell, CheckCircle2, Clock3, Handshake, Loader2, MessageCircle, Navigation, Sparkles } from "lucide-react";

interface ActivityMatch { id: string; status: string; created_at: string; spot?: { address?: string | null; departure_time?: string | null }; spot_owner?: { name?: string | null }; seeker?: { name?: string | null } }
interface ActivityNotice { id: string; title: string; message: string; type: string; created_at: string; read: boolean }

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(value?: string | null) {
  if (!value) return "Time pending";
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function ActivityPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<ActivityMatch[]>([]);
  const [notifications, setNotifications] = useState<ActivityNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { router.push("/"); return; }
    try {
      const [matchesResponse, noticesResponse] = await Promise.all([
        fetch("/api/matches?status=all", { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch("/api/notifications", { headers: { Authorization: `Bearer ${session.access_token}` } }).then((response) => response.json() as Promise<{ notifications?: ActivityNotice[] }>),
      ]);
      if (!matchesResponse.ok) throw new Error("Could not load activity");
      const matchBody = await matchesResponse.json() as { matches?: ActivityMatch[] };
      setMatches(matchBody.matches ?? []);
      setNotifications((noticesResponse.notifications ?? []).slice(0, 12));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load activity");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f6f8f6] text-sm font-semibold text-[#71807b]"><Loader2 className="mr-2 h-5 w-5 animate-spin text-[#e85d3f]" />Loading your activity</div>;
  if (error) return <div className="flex min-h-screen items-center justify-center bg-[#f6f8f6] p-6"><div className="rounded-3xl border border-[#dce3df] bg-white p-8 text-center"><p className="font-bold text-[#17211e]">Activity is unavailable</p><p className="mt-2 text-sm text-[#71807b]">{error}</p><button type="button" onClick={() => void load()} className="mt-5 rounded-xl bg-[#17211e] px-5 py-3 text-sm font-bold text-white">Try again</button></div></div>;

  const completed = matches.filter((match) => match.status === "completed").length;
  const pending = matches.filter((match) => ["pending", "offered", "confirmed_by_owner", "confirmed_by_seeker", "confirmed"].includes(match.status)).length;
  return <main className="premium-shell premium-grid min-h-screen px-5 pb-12 pt-7 text-[#17211e] sm:px-8 sm:pt-10"><div className="mx-auto max-w-5xl"><header className="flex items-center justify-between"><button type="button" onClick={() => router.push("/")} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dce3df] bg-white text-[#71807b] hover:text-[#17211e]" aria-label="Back to discover"><ArrowLeft className="h-4 w-4" /></button><div className="text-center"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e85d3f]">Your parking trail</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Activity</h1></div><button type="button" onClick={() => router.push("/profile")} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0c9a5] text-sm font-black">AL</button></header><section className="mt-9"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e85d3f]">A little momentum goes a long way</p><h2 className="mt-2 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">Your activity, at a glance.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#71807b]">Every completed departure makes the network more useful for the next person arriving.</p></section><section className="mt-8 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-[#17211e] p-5 text-white"><Handshake className="h-5 w-5 text-[#f0c9a5]" /><p className="mt-5 text-3xl font-bold">{completed}</p><p className="mt-1 text-xs text-[#b7c3be]">Completed handoffs</p></div><div className="rounded-2xl border border-[#dce3df] bg-white p-5"><Clock3 className="h-5 w-5 text-[#e85d3f]" /><p className="mt-5 text-3xl font-bold">{pending}</p><p className="mt-1 text-xs text-[#71807b]">Active matches</p></div><div className="rounded-2xl border border-[#dce3df] bg-white p-5"><Bell className="h-5 w-5 text-[#e85d3f]" /><p className="mt-5 text-3xl font-bold">{notifications.filter((notice) => !notice.read).length}</p><p className="mt-1 text-xs text-[#71807b]">Unread updates</p></div></section><div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><section className="rounded-3xl border border-[#dce3df] bg-white p-6 sm:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#82908a]">Match history</p><h2 className="mt-2 text-xl font-bold">Your handoffs</h2></div><Navigation className="h-5 w-5 text-[#82908a]" /></div>{matches.length === 0 ? <div className="py-14 text-center"><Sparkles className="mx-auto h-8 w-8 text-[#e85d3f]" /><p className="mt-4 font-bold">Your first match is still ahead.</p><p className="mt-2 text-sm text-[#71807b]">Set your schedule and start participating in the network.</p><button type="button" onClick={() => router.push("/")} className="mt-5 rounded-xl bg-[#e85d3f] px-4 py-3 text-sm font-bold text-white">Find a match</button></div> : <div className="mt-6 space-y-3">{matches.map((match) => { const partner = match.spot_owner?.name || match.seeker?.name || "Parking partner"; const done = match.status === "completed"; return <div key={match.id} className="flex items-start gap-4 rounded-2xl bg-[#f6f8f6] p-4"><span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${done ? "bg-[#e5f2e7] text-[#4b805d]" : "bg-[#fff0eb] text-[#e85d3f]"}`}>{done ? <CheckCircle2 className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold">{done ? "Handoff completed" : "Match in progress"}</p><span className="text-[10px] font-bold uppercase tracking-wider text-[#82908a]">{formatDate(match.created_at)}</span></div><p className="mt-1 text-xs text-[#71807b]">With {partner} · {match.spot?.address || "Three-block zone"}</p><p className="mt-2 text-xs font-semibold text-[#e85d3f]">{formatTime(match.spot?.departure_time)} · <span className="capitalize text-[#82908a]">{match.status.replaceAll("_", " ")}</span></p></div></div>})}</div>}</section><section className="rounded-3xl border border-[#dce3df] bg-white p-6 sm:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#82908a]">Recent updates</p><h2 className="mt-2 text-xl font-bold">Notifications</h2></div><MessageCircle className="h-5 w-5 text-[#82908a]" /></div>{notifications.length === 0 ? <p className="mt-7 rounded-2xl bg-[#f6f8f6] p-4 text-sm text-[#71807b]">You&apos;re all caught up. New match updates will appear here.</p> : <div className="mt-6 space-y-4">{notifications.slice(0, 6).map((notice) => <div key={notice.id} className="flex gap-3 border-b border-[#edf1ed] pb-4 last:border-0"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notice.read ? "bg-[#dce3df]" : "bg-[#e85d3f]"}`} /><div><p className="text-sm font-bold">{notice.title}</p><p className="mt-1 text-xs leading-5 text-[#71807b]">{notice.message}</p><p className="mt-1 text-[10px] text-[#82908a]">{formatDate(notice.created_at)}</p></div></div>)}</div>}<button type="button" onClick={() => router.push("/notifications")} className="mt-5 flex items-center gap-2 text-sm font-bold text-[#e85d3f]">View all notifications <span aria-hidden="true">→</span></button></section></div></div></main>;
}
