"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import {
  Megaphone, Users, MapPin, TrendingUp, MousePointerClick, Eye, Percent,
  Bell, BarChart3, Target, Send, Activity, Search, Clock,
} from "lucide-react";

interface AdMetrics {
  id: string;
  title: string;
  business_name: string;
  impressions: number;
  clicks: number;
  active: boolean;
}

interface AgentMetrics {
  activeUsers7d: number;
  alertsToday: number;
  alertsWeek: number;
  alertsMonth: number;
  alertsPerDay: number;
  retentionRate: number;
  topNeighborhoods: { name: string; count: number }[];
  congestionToday: number;
  congestionWeek: number;
  adImpressionsToday: number;
  adImpressionsWeek: number;
  adClicksToday: number;
  adClicksWeek: number;
  adsDriversPerAd: number;
  predictionsToday: number;
  predictionsWeek: number;
  predictionAccuracy: number;
  invitesToday: number;
  invitesWeek: number;
  inviteConversionRate: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, spots: 0, ads: 0, activeChats: 0 });
  const [agent, setAgent] = useState<AgentMetrics>({
    activeUsers7d: 0, alertsToday: 0, alertsWeek: 0, alertsMonth: 0, alertsPerDay: 0,
    retentionRate: 0, topNeighborhoods: [],
    congestionToday: 0, congestionWeek: 0,
    adImpressionsToday: 0, adImpressionsWeek: 0, adClicksToday: 0, adClicksWeek: 0, adsDriversPerAd: 0,
    predictionsToday: 0, predictionsWeek: 0, predictionAccuracy: 0,
    invitesToday: 0, invitesWeek: 0, inviteConversionRate: 0,
  });
  const [ads, setAds] = useState<AdMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60_000).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60_000).toISOString();

      const q = (query: any) => query.then((r: any) => r.count ?? 0).catch(() => 0);
      const qd = (query: any) => query.then((r: any) => r.data ?? []).catch(() => []);

      const [
        users,
        spots,
        adsCount,
        chats,
        adData,
        users7d,
        alertsToday,
        alertsWeek,
        alertsMonth,
        hoodData,
        congestionToday,
        congestionWeek,
        adImpToday,
        adImpWeek,
        adClickToday,
        adClickWeek,
        predToday,
        predWeek,
        predConverted,
        predTotal,
        invToday,
        invWeek,
        invConverted,
        invTotal,
      ] = await Promise.all([
        q(supabase.from("users").select("*", { count: "exact", head: true })),
        q(supabase.from("parking_spots").select("*", { count: "exact", head: true }).eq("status", "active")),
        q(supabase.from("ads").select("*", { count: "exact", head: true }).eq("active", true)),
        q(supabase.from("ephemeral_chats").select("*", { count: "exact", head: true }).eq("status", "active")),
        qd(supabase.from("ads").select("id, title, business_name, impressions, clicks, active").order("created_at", { ascending: false })),
        q(supabase.from("users").select("*", { count: "exact", head: true }).gt("created_at", weekAgo)),
        q(supabase.from("parking_spots" as any).select("*", { count: "exact", head: true }).gte("created_at", todayStart)),
        q(supabase.from("parking_spots" as any).select("*", { count: "exact", head: true }).gte("created_at", weekAgo)),
        q(supabase.from("parking_spots" as any).select("*", { count: "exact", head: true }).gte("created_at", monthAgo)),
        qd(supabase.from("parking_spots").select("address").eq("status", "active").gte("created_at", monthAgo)),
        q(supabase.from("congestion_alerts" as any).select("*", { count: "exact", head: true }).gte("created_at", todayStart)),
        q(supabase.from("congestion_alerts" as any).select("*", { count: "exact", head: true }).gte("created_at", weekAgo)),
        q(supabase.from("ad_analytics" as any).select("*", { count: "exact", head: true }).eq("event_type", "impression").gte("created_at", todayStart)),
        q(supabase.from("ad_analytics" as any).select("*", { count: "exact", head: true }).eq("event_type", "impression").gte("created_at", weekAgo)),
        q(supabase.from("ad_analytics" as any).select("*", { count: "exact", head: true }).eq("event_type", "click").gte("created_at", todayStart)),
        q(supabase.from("ad_analytics" as any).select("*", { count: "exact", head: true }).eq("event_type", "click").gte("created_at", weekAgo)),
        q(supabase.from("spot_predictions" as any).select("*", { count: "exact", head: true }).gte("created_at", todayStart)),
        q(supabase.from("spot_predictions" as any).select("*", { count: "exact", head: true }).gte("created_at", weekAgo)),
        q(supabase.from("spot_predictions" as any).select("*", { count: "exact", head: true }).eq("converted", true)),
        q(supabase.from("spot_predictions" as any).select("*", { count: "exact", head: true })),
        q(supabase.from("invite_conversions" as any).select("*", { count: "exact", head: true }).gte("created_at", todayStart)),
        q(supabase.from("invite_conversions" as any).select("*", { count: "exact", head: true }).gte("created_at", weekAgo)),
        q(supabase.from("invite_conversions" as any).select("*", { count: "exact", head: true }).eq("converted", true)),
        q(supabase.from("invite_conversions" as any).select("*", { count: "exact", head: true })),
      ]);

      const totalAdImpressions = (adData ?? []).reduce((s, a: any) => s + (a.impressions ?? 0), 0);
      const totalAdClicks = (adData ?? []).reduce((s, a: any) => s + (a.clicks ?? 0), 0);
      const activeAds = (adData ?? []).filter((a: any) => a.active).length;

      const hoodMap = new Map<string, number>();
      for (const row of (hoodData ?? [])) {
        const hood = (row.address || "").split(",").pop()?.trim() || "Unknown";
        hoodMap.set(hood, (hoodMap.get(hood) || 0) + 1);
      }
      const topHoods = [...hoodMap.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const totalAlertsWeek = alertsWeek ?? 0;
      const alertsPerDayVal = totalAlertsWeek > 0 ? (totalAlertsWeek / 7) : 0;

      const totalUsers = users ?? 1;
      const users7dVal = users7d ?? 0;
      const retentionRateVal = totalUsers > 0 ? (users7dVal / totalUsers) * 100 : 0;

      const predConvertedVal = predConverted ?? 0;
      const predTotalVal = predTotal ?? 0;
      const predAccuracyVal = predTotalVal > 0 ? (predConvertedVal / predTotalVal) * 100 : 0;

      const invConvertedVal = invConverted ?? 0;
      const invTotalVal = invTotal ?? 0;
      const invConversionVal = invTotalVal > 0 ? (invConvertedVal / invTotalVal) * 100 : 0;

      setStats({
        users: totalUsers,
        spots: spots ?? 0,
        ads: adsCount ?? 0,
        activeChats: chats ?? 0,
      });

      setAgent({
        activeUsers7d: users7dVal,
        alertsToday: alertsToday ?? 0,
        alertsWeek: totalAlertsWeek,
        alertsMonth: alertsMonth ?? 0,
        alertsPerDay: alertsPerDayVal,
        retentionRate: Math.round(retentionRateVal),
        topNeighborhoods: topHoods,
        congestionToday: congestionToday ?? 0,
        congestionWeek: congestionWeek ?? 0,
        adImpressionsToday: adImpToday ?? 0,
        adImpressionsWeek: adImpWeek ?? 0,
        adClicksToday: adClickToday ?? 0,
        adClicksWeek: adClickWeek ?? 0,
        adsDriversPerAd: activeAds > 0 ? Math.round(totalAdClicks / activeAds) : 0,
        predictionsToday: predToday ?? 0,
        predictionsWeek: predWeek ?? 0,
        predictionAccuracy: Math.round(predAccuracyVal),
        invitesToday: invToday ?? 0,
        invitesWeek: invWeek ?? 0,
        inviteConversionRate: Math.round(invConversionVal),
      });

      setAds(adData as AdMetrics[]);
      } catch (err) {
        console.error("Admin dashboard load error:", err);
      }
      setLoading(false);
    }
    load();
  }, []);

  const totalImpressions = ads.reduce((sum, a) => sum + (a.impressions ?? 0), 0);
  const totalClicks = ads.reduce((sum, a) => sum + (a.clicks ?? 0), 0);
  const overallCTR = totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(1) : "0.0";

  const mainCards = [
    { label: "Total Users", value: stats.users, icon: Users, color: "text-blue-600 bg-blue-100" },
    { label: "Active Spots", value: stats.spots, icon: MapPin, color: "text-green-600 bg-green-100" },
    { label: "Active Ads", value: stats.ads, icon: Megaphone, color: "text-amber-600 bg-amber-100" },
    { label: "Active Chats", value: stats.activeChats, icon: TrendingUp, color: "text-purple-600 bg-purple-100" },
  ];

  const agentCards = [
    { label: "Active Users (7d)", value: agent.activeUsers7d, icon: Users, color: "text-blue-600 bg-blue-100" },
    { label: "Alerts Today", value: agent.alertsToday, icon: Bell, color: "text-red-600 bg-red-100" },
    { label: "Alerts This Week", value: agent.alertsWeek, icon: Bell, color: "text-red-600 bg-red-100" },
    { label: "Alerts This Month", value: agent.alertsMonth, icon: Bell, color: "text-red-600 bg-red-100" },
    { label: "Alerts/Day (Avg)", value: agent.alertsPerDay.toFixed(1), icon: Activity, color: "text-orange-600 bg-orange-100" },
    { label: "Retention Rate", value: `${agent.retentionRate}%`, icon: TrendingUp, color: "text-emerald-600 bg-emerald-100" },
    { label: "Congestion Today", value: agent.congestionToday, icon: Clock, color: "text-rose-600 bg-rose-100" },
    { label: "Congestion Week", value: agent.congestionWeek, icon: Clock, color: "text-rose-600 bg-rose-100" },
    { label: "Ad Impressions Today", value: agent.adImpressionsToday, icon: Eye, color: "text-purple-600 bg-purple-100" },
    { label: "Ad Impressions Week", value: agent.adImpressionsWeek, icon: Eye, color: "text-purple-600 bg-purple-100" },
    { label: "Ad Clicks Today", value: agent.adClicksToday, icon: MousePointerClick, color: "text-blue-600 bg-blue-100" },
    { label: "Ad Clicks Week", value: agent.adClicksWeek, icon: MousePointerClick, color: "text-blue-600 bg-blue-100" },
    { label: "Drivers / Ad", value: agent.adsDriversPerAd, icon: Target, color: "text-indigo-600 bg-indigo-100" },
    { label: "Predictions Today", value: agent.predictionsToday, icon: Search, color: "text-cyan-600 bg-cyan-100" },
    { label: "Predictions Week", value: agent.predictionsWeek, icon: Search, color: "text-cyan-600 bg-cyan-100" },
    { label: "Prediction Accuracy", value: `${agent.predictionAccuracy}%`, icon: BarChart3, color: "text-teal-600 bg-teal-100" },
    { label: "Invites Today", value: agent.invitesToday, icon: Send, color: "text-violet-600 bg-violet-100" },
    { label: "Invites Week", value: agent.invitesWeek, icon: Send, color: "text-violet-600 bg-violet-100" },
    { label: "Invite Conv. Rate", value: `${agent.inviteConversionRate}%`, icon: Percent, color: "text-pink-600 bg-pink-100" },
  ];

  if (loading) {
    return <div className="p-6 max-w-6xl mx-auto text-center py-12 text-zinc-500">Loading metrics...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {mainCards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon size={20} />
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Ad Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-purple-600 bg-purple-100">
            <Eye size={20} />
          </div>
          <p className="text-2xl font-bold">{totalImpressions}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Total Impressions</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-blue-600 bg-blue-100">
            <MousePointerClick size={20} />
          </div>
          <p className="text-2xl font-bold">{totalClicks}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Total Clicks</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-emerald-600 bg-emerald-100">
            <Percent size={20} />
          </div>
          <p className="text-2xl font-bold">{overallCTR}%</p>
          <p className="text-xs text-zinc-500 mt-0.5">Click-Through Rate</p>
        </div>
      </div>

      {/* Agent Metrics */}
      <h2 className="text-lg font-bold mb-4 mt-8">Agent Metrics</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
        {agentCards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${card.color}`}>
              <card.icon size={16} />
            </div>
            <p className="text-lg font-bold">{card.value}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Top Neighborhoods */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 mb-8">
        <h2 className="font-bold mb-4">Top 5 Neighborhoods by Alert Count</h2>
        {agent.topNeighborhoods.length > 0 ? (
          <div className="space-y-2">
            {agent.topNeighborhoods.map((hood, i) => (
              <div key={hood.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-400 w-4">{i + 1}.</span>
                <div className="flex-1 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-lg flex items-center px-3 text-white text-xs font-bold"
                    style={{ width: `${Math.min((hood.count / agent.topNeighborhoods[0].count) * 100, 100)}%` }}
                  >
                    {hood.name}
                  </div>
                </div>
                <span className="text-sm font-bold w-8 text-right">{hood.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No data yet</p>
        )}
      </div>

      {/* Ad Performance Table */}
      {ads.length > 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-8">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="font-bold">Ad Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
                  <th className="text-left p-4 font-medium">Campaign</th>
                  <th className="text-left p-4 font-medium">Business</th>
                  <th className="text-right p-4 font-medium">Impressions</th>
                  <th className="text-right p-4 font-medium">Clicks</th>
                  <th className="text-right p-4 font-medium">CTR</th>
                  <th className="text-right p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => {
                  const ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={ad.id} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                      <td className="p-4 font-medium">{ad.title}</td>
                      <td className="p-4 text-zinc-500">{ad.business_name}</td>
                      <td className="p-4 text-right">{ad.impressions}</td>
                      <td className="p-4 text-right">{ad.clicks}</td>
                      <td className="p-4 text-right font-mono">{ctr}%</td>
                      <td className="p-4 text-right">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          ad.active
                            ? "bg-green-100 text-green-700"
                            : "bg-zinc-100 text-zinc-500"
                        }`}>
                          {ad.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-zinc-200 dark:border-zinc-800 text-center text-zinc-500 mb-8">
          <Megaphone className="mx-auto mb-3 opacity-30" size={40} />
          <p className="font-medium">No ad campaigns yet</p>
          <p className="text-sm mt-1">Create your first ad to start tracking performance</p>
          <a href="/admin/ads" className="inline-block mt-4 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition">
            Create Ad
          </a>
        </div>
      )}

      {/* Quick Links */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
        <h2 className="font-bold mb-4">Quick Links</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/admin/ads" className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition">Manage Ad Campaigns</a>
          <a href="/admin/users" className="px-4 py-2.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl text-sm font-bold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition">Manage Users</a>
          <a href="/admin/flags" className="px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition">Review Flags</a>
          <a href="/admin/pilot-areas" className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition">Pilot Areas</a>
          <a href="/admin/street-sweeping" className="px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition">Street Sweeping</a>
        </div>
      </div>
    </div>
  );
}
