"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Activity, ArrowRight, Bell, Check, Clock3, Heart, Loader2, MapPin, MessageCircle, Navigation, RefreshCw, ShieldCheck, UserRound, X, Zap } from "lucide-react";

interface ParkingProfile { departure: string; arrival: string; zone: string; vehicle: string }
interface MatchRecord {
  id: string;
  status: string;
  created_at: string;
  spot?: { address?: string | null; departure_time?: string | null; vehicle_type?: string | null } | null;
  spot_owner?: { id?: string; name?: string | null; vehicle_type?: string | null } | null;
  seeker?: { id?: string; name?: string | null; vehicle_type?: string | null } | null;
}

function formatTime(value?: string | null) { return value ? new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "Time pending"; }

export function ParkingDashboard({ profile }: { profile: ParkingProfile }) {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadMatches = useCallback(async (quiet = false) => {
    const supabase = createBrowserClient();
    if (quiet) setRefreshing(true); else setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setLoading(false); setRefreshing(false); return; }
    setUserId(session.user.id);
    try {
      const response = await fetch("/api/matches?status=all", { headers: { Authorization: `Bearer ${session.access_token}` } });
      const body = await response.json() as { matches?: MatchRecord[]; error?: string };
      if (!response.ok) throw new Error(body.error || "Could not load matches");
      setMatches(body.matches ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load matches");
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => { void loadMatches(); }, 0); return () => window.clearTimeout(timer); }, [loadMatches]);

  const respond = async (matchId: string, action: "confirm" | "reject") => {
    setBusyId(matchId); setMessage(null);
    try {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please sign in again");
      const response = await fetch(`/api/matches/${matchId}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ action }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to update match");
      setMessage(action === "confirm" ? "Match confirmed. Both drivers will be notified." : "Match passed. We will keep looking.");
      await loadMatches(true);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update match"); }
    finally { setBusyId(null); }
  };

  const activeMatches = matches.filter((match) => ["pending", "offered", "confirmed_by_owner", "confirmed_by_seeker", "confirmed"].includes(match.status));
  const completed = matches.filter((match) => match.status === "completed").length;
  const current = activeMatches[0];
  const partner = current ? (current.spot_owner?.id === userId ? current.seeker : current.spot_owner) : null;
  const isOffer = current?.status === "offered" && current.seeker?.id === userId;
  const canConfirm = current && (current.status === "pending" || isOffer || (current.status === "confirmed_by_seeker" && current.spot_owner?.id === userId) || (current.status === "confirmed_by_owner" && current.seeker?.id === userId));

  return <div className="min-h-screen bg-[#f6f8f6] text-[#17211e]"><header className="border-b border-[#dce3df] bg-[#fbfcfb]"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8"><Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-[-0.04em]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e85d3f] text-white shadow-lg shadow-[#e85d3f]/20"><Zap className="h-4 w-4 fill-current" /></span>Parking <span className="text-[#e85d3f]">Meeters</span></Link><div className="flex items-center gap-3"><Link href="/activity" className="hidden items-center gap-2 rounded-xl border border-[#dce3df] px-3 py-2 text-xs font-bold text-[#71807b] sm:flex"><Activity className="h-4 w-4" />Activity</Link><Link href="/messages" className="hidden items-center gap-2 rounded-xl border border-[#dce3df] px-3 py-2 text-xs font-bold text-[#71807b] sm:flex"><MessageCircle className="h-4 w-4" />Messages</Link><Link href="/profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0c9a5] text-sm font-black">AL</Link></div></div></header><main className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8 sm:pt-10"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e85d3f]">Your parking network</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">Find your parking people.</h1><p className="mt-3 text-sm text-[#71807b]">Real matches based on your schedule, zone, and vehicle.</p></div><button type="button" onClick={() => void loadMatches(true)} className="flex w-fit items-center gap-2 rounded-xl border border-[#dce3df] bg-white px-4 py-2.5 text-sm font-bold text-[#71807b] hover:text-[#17211e]"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh matches</button></div><section className="mt-8 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-[#17211e] p-4 text-white"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#b7c3be]">Your window</p><p className="mt-2 text-lg font-bold">{profile.departure} - {profile.arrival}</p><p className="mt-1 text-xs text-[#b7c3be]">{profile.vehicle} · weekdays</p></div><div className="rounded-2xl border border-[#dce3df] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#9aa7a1]">Your zone</p><p className="mt-2 truncate text-sm font-bold">{profile.zone}</p><p className="mt-1 flex items-center gap-1 text-xs text-[#e85d3f]"><MapPin className="h-3 w-3" />Three blocks protected</p></div><div className="rounded-2xl border border-[#dce3df] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#9aa7a1]">Your progress</p><p className="mt-2 text-lg font-bold">{completed} completed</p><p className="mt-1 text-xs text-[#71807b]">{activeMatches.length} active match{activeMatches.length === 1 ? "" : "es"}</p></div></section><div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,480px)_1fr] xl:items-start"><section><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-bold">Your best match</h2><p className="mt-1 text-sm text-[#71807b]">Confirm together before the handoff begins.</p></div><span className="flex items-center gap-1.5 text-xs font-bold text-[#e85d3f]"><span className="h-2 w-2 rounded-full bg-[#e85d3f]" />Live</span></div>{loading ? <div className="flex min-h-[350px] items-center justify-center rounded-3xl border border-[#dce3df] bg-white text-sm font-semibold text-[#71807b]"><Loader2 className="mr-2 h-5 w-5 animate-spin text-[#e85d3f]" />Searching your network</div> : current ? <article className="overflow-hidden rounded-3xl border border-[#dce3df] bg-white shadow-[0_24px_70px_-40px_rgba(23,33,30,0.35)]"><div className="relative flex min-h-[220px] items-end bg-gradient-to-br from-[#f0c9a5] to-[#d8e3ed] p-6"><span className="absolute right-5 top-5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-black backdrop-blur">Schedule fit</span><div className="flex h-24 w-24 items-center justify-center rounded-full border-8 border-white/50 bg-[#17211e] text-2xl font-bold text-white shadow-xl">{(partner?.name || "PM").slice(0, 2).toUpperCase()}</div><div className="ml-4"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#17211e]/60">{current.status === "confirmed" ? "Confirmed handoff" : "Potential match"}</p><h2 className="mt-1 text-3xl font-bold tracking-tight">{partner?.name || "Parking partner"}</h2></div></div><div className="p-6"><div className="grid grid-cols-2 gap-4 border-b border-[#edf0ee] pb-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#9aa7a1]">Departure</p><p className="mt-1 text-sm font-bold">{formatTime(current.spot?.departure_time)}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#9aa7a1]">Vehicle</p><p className="mt-1 text-sm font-bold">{partner?.vehicle_type || current.spot?.vehicle_type || "Compatible vehicle"}</p></div></div><p className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#71807b]"><MapPin className="h-4 w-4 text-[#e85d3f]" />{current.spot?.address || profile.zone}</p><p className="mt-2 flex items-center gap-2 text-xs text-[#82908a]"><Clock3 className="h-3.5 w-3.5" />Status: <span className="capitalize">{current.status.replaceAll("_", " ")}</span></p>{canConfirm && <div className="mt-6 flex gap-3"><button type="button" disabled={busyId === current.id} onClick={() => void respond(current.id, "reject")} className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#dce3df] text-[#71807b] hover:border-[#e85d3f] hover:text-[#e85d3f]"><X className="h-5 w-5" /></button><button type="button" disabled={busyId === current.id} onClick={() => void respond(current.id, "confirm")} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#17211e] text-sm font-bold text-white hover:bg-[#2c3d36]">{busyId === current.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4 fill-[#f0c9a5] text-[#f0c9a5]" />}Confirm handoff</button></div>}{current.status === "confirmed" && <Link href={`/match/${current.id}`} className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[#e85d3f] py-3 text-sm font-bold text-white hover:bg-[#d84f33]">Open handoff <ArrowRight className="h-4 w-4" /></Link>}</div></article> : <div className="rounded-3xl border border-[#dce3df] bg-white p-8 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff0eb] text-[#e85d3f]"><Navigation className="h-6 w-6" /></div><h2 className="mt-5 text-xl font-bold">No live match yet</h2><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#71807b]">Keep your schedule active and post a departure to help someone else join the network.</p><Link href="/profile" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#17211e] px-4 py-3 text-sm font-bold text-white">Manage my schedule <ArrowRight className="h-4 w-4" /></Link></div>}{message && <p className="mt-4 rounded-xl bg-[#17211e] px-4 py-3 text-center text-sm font-bold text-white">{message}</p>}</section><aside className="space-y-4"><div className="rounded-3xl border border-[#dce3df] bg-white p-6 sm:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#e85d3f]">How it works</p><h2 className="mt-2 text-xl font-bold">A fair exchange.</h2></div><ShieldCheck className="h-5 w-5 text-[#e85d3f]" /></div><div className="mt-6 space-y-5"><p className="flex gap-3 text-sm leading-6"><Check className="mt-1 h-4 w-4 shrink-0 text-[#e85d3f]" /><span><strong>Match on timing.</strong> Your departure and arrival windows need to overlap.</span></p><p className="flex gap-3 text-sm leading-6"><Check className="mt-1 h-4 w-4 shrink-0 text-[#e85d3f]" /><span><strong>Confirm together.</strong> Both drivers opt in before a handoff opens.</span></p><p className="flex gap-3 text-sm leading-6"><Check className="mt-1 h-4 w-4 shrink-0 text-[#e85d3f]" /><span><strong>Give to get.</strong> Complete one departure handoff to unlock arrival matches.</span></p></div></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1"><Link href="/activity" className="flex items-center gap-3 rounded-2xl border border-[#dce3df] bg-white p-4 text-sm font-bold hover:border-[#e85d3f]"><Bell className="h-4 w-4 text-[#e85d3f]" />View activity <ArrowRight className="ml-auto h-4 w-4 text-[#82908a]" /></Link><Link href="/profile" className="flex items-center gap-3 rounded-2xl border border-[#dce3df] bg-white p-4 text-sm font-bold hover:border-[#e85d3f]"><UserRound className="h-4 w-4 text-[#e85d3f]" />Edit profile <ArrowRight className="ml-auto h-4 w-4 text-[#82908a]" /></Link></div></aside></div></main></div>;
}
