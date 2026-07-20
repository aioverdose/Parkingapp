import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "moderator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60_000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60_000).toISOString();

  const safe = async (p: Promise<any>, fallback: any = 0) => {
    try {
      const r = await p;
      return r;
    } catch {
      return { data: null, count: fallback, error: null };
    }
  };

  const [
    { count: users },
    { count: spots },
    { count: adsCount },
    { count: chats },
    { data: adData },
    { count: users7d },
    { count: alertsToday },
    { count: alertsWeek },
    { count: alertsMonth },
    { data: hoodData },
    { count: congestionToday },
    { count: congestionWeek },
    { count: adImpToday },
    { count: adImpWeek },
    { count: adClickToday },
    { count: adClickWeek },
    { count: predToday },
    { count: predWeek },
    { count: predConverted },
    { count: predTotal },
    { count: invToday },
    { count: invWeek },
    { count: invConverted },
    { count: invTotal },
  ] = await Promise.all([
    safe(admin.from("users").select("*", { count: "exact", head: true })),
    safe(admin.from("parking_spots").select("*", { count: "exact", head: true }).eq("status", "active")),
    safe(admin.from("ads").select("*", { count: "exact", head: true }).eq("active", true)),
    safe(admin.from("ephemeral_chats").select("*", { count: "exact", head: true }).eq("status", "active")),
    safe(admin.from("ads").select("id, title, business_name, impressions, clicks, active").order("created_at", { ascending: false }), { data: [] }),
    safe(admin.from("users").select("*", { count: "exact", head: true }).gt("created_at", weekAgo)),
    safe(admin.from("parking_spots" as any).select("*", { count: "exact", head: true }).gte("created_at", todayStart)),
    safe(admin.from("parking_spots" as any).select("*", { count: "exact", head: true }).gte("created_at", weekAgo)),
    safe(admin.from("parking_spots" as any).select("*", { count: "exact", head: true }).gte("created_at", monthAgo)),
    safe(admin.from("parking_spots").select("address").eq("status", "active").gte("created_at", monthAgo), { data: [] }),
    safe(admin.from("congestion_alerts" as any).select("*", { count: "exact", head: true }).gte("created_at", todayStart)),
    safe(admin.from("congestion_alerts" as any).select("*", { count: "exact", head: true }).gte("created_at", weekAgo)),
    safe(admin.from("ad_analytics" as any).select("*", { count: "exact", head: true }).eq("event_type", "impression").gte("created_at", todayStart)),
    safe(admin.from("ad_analytics" as any).select("*", { count: "exact", head: true }).eq("event_type", "impression").gte("created_at", weekAgo)),
    safe(admin.from("ad_analytics" as any).select("*", { count: "exact", head: true }).eq("event_type", "click").gte("created_at", todayStart)),
    safe(admin.from("ad_analytics" as any).select("*", { count: "exact", head: true }).eq("event_type", "click").gte("created_at", weekAgo)),
    safe(admin.from("spot_predictions" as any).select("*", { count: "exact", head: true }).gte("created_at", todayStart)),
    safe(admin.from("spot_predictions" as any).select("*", { count: "exact", head: true }).gte("created_at", weekAgo)),
    safe(admin.from("spot_predictions" as any).select("*", { count: "exact", head: true }).eq("converted", true)),
    safe(admin.from("spot_predictions" as any).select("*", { count: "exact", head: true })),
    safe(admin.from("invite_conversions" as any).select("*", { count: "exact", head: true }).gte("created_at", todayStart)),
    safe(admin.from("invite_conversions" as any).select("*", { count: "exact", head: true }).gte("created_at", weekAgo)),
    safe(admin.from("invite_conversions" as any).select("*", { count: "exact", head: true }).eq("converted", true)),
    safe(admin.from("invite_conversions" as any).select("*", { count: "exact", head: true })),
  ]);

  return NextResponse.json({
    stats: {
      users: users ?? 0,
      spots: spots ?? 0,
      ads: adsCount ?? 0,
      activeChats: chats ?? 0,
    },
    agent: {
      activeUsers7d: users7d ?? 0,
      alertsToday: alertsToday ?? 0,
      alertsWeek: alertsWeek ?? 0,
      alertsMonth: alertsMonth ?? 0,
      topNeighborhoods: (() => {
        const map = new Map<string, number>();
        for (const row of (hoodData ?? [])) {
          const hood = (row.address || "").split(",").pop()?.trim() || "Unknown";
          map.set(hood, (map.get(hood) || 0) + 1);
        }
        return [...map.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
      })(),
      congestionToday: congestionToday ?? 0,
      congestionWeek: congestionWeek ?? 0,
      adImpressionsToday: adImpToday ?? 0,
      adImpressionsWeek: adImpWeek ?? 0,
      adClicksToday: adClickToday ?? 0,
      adClicksWeek: adClickWeek ?? 0,
      ads: adData ?? [],
      predictionsToday: predToday ?? 0,
      predictionsWeek: predWeek ?? 0,
      predictionAccuracy: (() => {
        const c = predConverted ?? 0;
        const t = predTotal ?? 0;
        return t > 0 ? Math.round((c / t) * 100) : 0;
      })(),
      invitesToday: invToday ?? 0,
      invitesWeek: invWeek ?? 0,
      inviteConversionRate: (() => {
        const c = invConverted ?? 0;
        const t = invTotal ?? 0;
        return t > 0 ? Math.round((c / t) * 100) : 0;
      })(),
    },
  });
}
