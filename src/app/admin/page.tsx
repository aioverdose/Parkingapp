"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  Building2,
  ChevronRight,
  Clock3,
  MapPin,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

interface Neighborhood { name: string; count: number }
interface Ad { id: string; title: string; business_name: string; impressions: number; clicks: number; active: boolean }
interface DashboardData {
  stats: { users: number; spots: number; ads: number; activeChats: number; activeMatches: number; pendingMatches: number; flaggedMembers: number; flaggedMessages: number };
  agent: {
    activeUsers7d: number; alertsToday: number; alertsWeek: number; alertsMonth: number;
    congestionToday: number; topNeighborhoods: Neighborhood[]; adImpressionsToday: number;
    adClicksToday: number; predictionAccuracy: number; invitesToday: number; inviteConversionRate: number;
    ads: Ad[];
  };
}

let currentDashboardStats: DashboardData["stats"] | null = null;

const emptyData: DashboardData = {
  stats: { users: 0, spots: 0, ads: 0, activeChats: 0, activeMatches: 0, pendingMatches: 0, flaggedMembers: 0, flaggedMessages: 0 },
  agent: { activeUsers7d: 0, alertsToday: 0, alertsWeek: 0, alertsMonth: 0, congestionToday: 0, topNeighborhoods: [], adImpressionsToday: 0, adClicksToday: 0, predictionAccuracy: 0, invitesToday: 0, inviteConversionRate: 0, ads: [] },
};

function MetricCard({ label, value, detail, icon: Icon, tone, href }: { label: string; value: string | number; detail: string; icon: typeof Users; tone: string; href?: string }) {
  const live = currentDashboardStats;
  const mapped = label === "Active handoffs" && live ? { label: "Active matches", value: live.activeMatches, detail: `${live.pendingMatches} pending matches`, href: "/admin/potential-matches" } : label === "Live conversations" && live ? { label: "Flagged members", value: live.flaggedMembers, detail: `${live.flaggedMessages} flagged/reported messages`, href: "/admin/messenger" } : { label, value, detail, href };
  const content = <><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#82908a]">{mapped.label}</p><p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#17211e]">{mapped.value}</p></div><span className={`rounded-xl p-2.5 ${tone}`}><Icon className="h-5 w-5" /></span></div><p className="mt-4 text-xs font-semibold text-[#82908a]">{mapped.detail}</p></>;
  return mapped.href ? <Link href={mapped.href} className="block rounded-2xl border border-[#dce3df] bg-white p-5 shadow-[0_18px_45px_-35px_rgba(23,33,30,0.4)] hover:border-[#e5a08d]">{content}</Link> : <article className="rounded-2xl border border-[#dce3df] bg-white p-5 shadow-[0_18px_45px_-35px_rgba(23,33,30,0.4)]">{content}</article>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setError("Not authenticated"); return; }
       const response = await fetch("/api/admin/dashboard", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      const body = await response.json() as DashboardData & { error?: string };
      if (!response.ok) throw new Error(body.error || `Server error ${response.status}`);
      setData({ ...emptyData, ...body, stats: { ...emptyData.stats, ...body.stats }, agent: { ...emptyData.agent, ...body.agent } });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Failed to load dashboard"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const initial = window.setTimeout(() => { void load(); }, 0);
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 30_000);
    const onFocus = () => { void load(); };
    window.addEventListener("focus", onFocus);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); window.removeEventListener("focus", onFocus); };
  }, [load]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f6f8f6] text-sm font-semibold text-[#71807b]"><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Loading Parking Meeters operations...</div>;
  if (error) return <div className="flex min-h-screen items-center justify-center bg-[#f6f8f6] p-6"><div className="max-w-sm rounded-3xl border border-[#f1c6bb] bg-white p-8 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-[#e85d3f]" /><h1 className="mt-4 text-xl font-bold text-[#17211e]">Dashboard unavailable</h1><p className="mt-2 text-sm text-[#71807b]">{error}</p><button type="button" onClick={() => void load()} className="mt-6 rounded-xl bg-[#17211e] px-5 py-3 text-sm font-bold text-white">Try again</button></div></div>;

  const { stats, agent } = data;
  currentDashboardStats = stats;
  const maxNeighborhood = agent.topNeighborhoods[0]?.count || 1;
  const adImpressions = agent.adImpressionsToday || 0;
  const adClicks = agent.adClicksToday || 0;
  const ctr = adImpressions ? `${((adClicks / adImpressions) * 100).toFixed(1)}%` : "0.0%";
  const dashboardDate = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  return <main className="min-h-screen bg-[#f6f8f6] px-5 py-7 text-[#17211e] sm:px-8 lg:px-10 lg:py-10"><div className="mx-auto max-w-7xl"><header className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e85d3f] text-white"><MapPin className="h-5 w-5" /></div><span className="text-sm font-bold tracking-tight">Parking Meeters <span className="font-normal text-[#82908a]">/ Admin</span></span></div><p className="mt-9 text-xs font-bold uppercase tracking-[0.18em] text-[#e85d3f]">{dashboardDate}</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">Good morning, team.</h1><p className="mt-3 text-sm text-[#71807b]">Here&apos;s what&apos;s happening across your parking network.</p></div><div className="flex items-center gap-3"><span className="flex items-center gap-2 rounded-full border border-[#cfe3d0] bg-[#eff9ef] px-3 py-2 text-xs font-bold text-[#3d7650]"><span className="h-2 w-2 rounded-full bg-[#50a667]" />All systems operational</span><button type="button" onClick={() => void load()} aria-label="Refresh dashboard" className="rounded-xl border border-[#dce3df] bg-white p-2.5 text-[#71807b] hover:text-[#17211e]"><RefreshCw className="h-4 w-4" /></button></div></header><section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Member network" value={stats.users} detail={`+${agent.activeUsers7d} active in the last 7 days`} icon={Users} tone="bg-[#e6f0e8] text-[#4b805d]" /><MetricCard label="Active handoffs" value={stats.spots} detail={`${agent.alertsToday} departure alerts today`} icon={MapPin} tone="bg-[#fff0eb] text-[#e85d3f]" /><MetricCard label="Live conversations" value={stats.activeChats} detail="Private member chats open now" icon={Activity} tone="bg-[#e8edf5] text-[#58749b]" /><MetricCard label="Match signal" value={`${agent.predictionAccuracy}%`} detail="Prediction conversion accuracy" icon={TrendingUp} tone="bg-[#f5ecd9] text-[#a67b37]" /></section><div className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]"><section className="rounded-3xl bg-[#17211e] p-6 text-white sm:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f0c9a5]">Network pulse</p><h2 className="mt-2 text-2xl font-bold tracking-tight">The curb is moving.</h2><p className="mt-2 max-w-md text-sm leading-6 text-[#b7c3be]">Monitor departures, matches, and member activity before they become support issues.</p></div><div className="rounded-2xl bg-white/10 p-3 text-[#f0c9a5]"><BellRing className="h-5 w-5" /></div></div><div className="mt-8 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-[#b7c3be]">Alerts today</p><p className="mt-2 text-2xl font-bold">{agent.alertsToday}</p><p className="mt-1 text-[11px] text-[#f0c9a5]">{agent.alertsWeek} this week</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-[#b7c3be]">Congestion events</p><p className="mt-2 text-2xl font-bold">{agent.congestionToday}</p><p className="mt-1 text-[11px] text-[#b7c3be]">Needs review if rising</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-[#b7c3be]">Invites today</p><p className="mt-2 text-2xl font-bold">{agent.invitesToday}</p><p className="mt-1 text-[11px] text-[#b7c3be]">{agent.inviteConversionRate}% conversion</p></div></div><a href="/admin/control-tower" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#f0c9a5]">Open control tower <ArrowUpRight className="h-4 w-4" /></a></section><section className="rounded-3xl border border-[#dce3df] bg-white p-6 sm:p-8"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e85d3f]">Fast actions</p><h2 className="mt-2 text-2xl font-bold tracking-tight">Keep things moving.</h2></div><ShieldCheck className="h-5 w-5 text-[#e85d3f]" /></div><div className="mt-7 space-y-2"><a href="/admin/users" className="flex items-center justify-between rounded-xl bg-[#f6f8f6] px-4 py-3 text-sm font-bold hover:bg-[#edf1ed]"><span className="flex items-center gap-3"><Users className="h-4 w-4 text-[#e85d3f]" />Review members</span><ChevronRight className="h-4 w-4 text-[#82908a]" /></a><a href="/admin/potential-matches" className="flex items-center justify-between rounded-xl bg-[#f6f8f6] px-4 py-3 text-sm font-bold hover:bg-[#edf1ed]"><span className="flex items-center gap-3"><Clock3 className="h-4 w-4 text-[#e85d3f]" />Check potential matches</span><ChevronRight className="h-4 w-4 text-[#82908a]" /></a><a href="/admin/flags" className="flex items-center justify-between rounded-xl bg-[#f6f8f6] px-4 py-3 text-sm font-bold hover:bg-[#edf1ed]"><span className="flex items-center gap-3"><AlertTriangle className="h-4 w-4 text-[#e85d3f]" />Resolve flagged activity</span><ChevronRight className="h-4 w-4 text-[#82908a]" /></a><a href="/admin/broadcast" className="flex items-center justify-between rounded-xl bg-[#f6f8f6] px-4 py-3 text-sm font-bold hover:bg-[#edf1ed]"><span className="flex items-center gap-3"><Megaphone className="h-4 w-4 text-[#e85d3f]" />Send member update</span><ChevronRight className="h-4 w-4 text-[#82908a]" /></a></div></section></div><div className="mt-6 grid gap-6 lg:grid-cols-2"><section className="rounded-3xl border border-[#dce3df] bg-white p-6 sm:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#82908a]">Where activity is happening</p><h2 className="mt-2 text-xl font-bold">Top parking zones</h2></div><Building2 className="h-5 w-5 text-[#82908a]" /></div>{agent.topNeighborhoods.length ? <div className="mt-7 space-y-4">{agent.topNeighborhoods.map((zone, index) => <div key={zone.name}><div className="mb-1.5 flex justify-between text-xs font-bold"><span><span className="mr-2 text-[#e85d3f]">0{index + 1}</span>{zone.name}</span><span className="text-[#82908a]">{zone.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#edf1ed]"><div className="h-full rounded-full bg-[#e85d3f]" style={{ width: `${Math.min((zone.count / maxNeighborhood) * 100, 100)}%` }} /></div></div>)}</div> : <p className="mt-7 rounded-xl bg-[#f6f8f6] p-4 text-sm text-[#82908a]">Zone activity will appear as members create parking alerts.</p>}</section><section className="rounded-3xl border border-[#dce3df] bg-white p-6 sm:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#82908a]">Business network</p><h2 className="mt-2 text-xl font-bold">Partner performance</h2></div><Megaphone className="h-5 w-5 text-[#82908a]" /></div><div className="mt-7 grid grid-cols-3 gap-3"><div className="rounded-xl bg-[#f6f8f6] p-3"><p className="text-[10px] uppercase tracking-wider text-[#82908a]">Impressions</p><p className="mt-2 text-xl font-bold">{adImpressions}</p></div><div className="rounded-xl bg-[#f6f8f6] p-3"><p className="text-[10px] uppercase tracking-wider text-[#82908a]">Clicks</p><p className="mt-2 text-xl font-bold">{adClicks}</p></div><div className="rounded-xl bg-[#fff0eb] p-3"><p className="text-[10px] uppercase tracking-wider text-[#e85d3f]">CTR</p><p className="mt-2 text-xl font-bold">{ctr}</p></div></div>{agent.ads.length ? <div className="mt-5 space-y-2">{agent.ads.slice(0, 3).map((ad) => <div key={ad.id} className="flex items-center justify-between border-b border-[#edf1ed] py-3 text-sm last:border-0"><div><p className="font-bold">{ad.title}</p><p className="mt-0.5 text-xs text-[#82908a]">{ad.business_name}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${ad.active ? "bg-[#eff9ef] text-[#3d7650]" : "bg-[#f1f3f1] text-[#82908a]"}`}>{ad.active ? "Live" : "Paused"}</span></div>)}</div> : <p className="mt-5 text-sm text-[#82908a]">No partner campaigns are active yet.</p>}<a href="/admin/ads" className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[#e85d3f]">Manage campaigns <ArrowUpRight className="h-4 w-4" /></a></section></div></div></main>;
}
