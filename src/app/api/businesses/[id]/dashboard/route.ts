import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { getBusinessMembership } from "@/lib/api/business-helpers";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await getBusinessMembership(user.id, id);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

    const safe = async (p: Promise<any> | any, fallback: any = null): Promise<any> => {
      try {
        return await p;
      } catch {
        return fallback;
      }
    };

    const [
      businessRes,
      members,
      activeSpotsCount,
      spotsTodayCount,
      matchesTodayCount,
      matchesTotalCount,
      recentSpots,
      recentMatches,
      members7d,
      members30d,
      spots7d,
      spots30d,
      acceptedMatches,
      declinedMatches,
      expiredMatches,
      noShowMatches,
      successfulHandoffs,
      qrJoins,
      linkJoins,
      qrVisits,
    ] = await Promise.all([
      safe(
        supabase.from("businesses").select("*").eq("id", id).maybeSingle(),
        { data: null, error: null },
      ),
      safe(
        supabase
          .from("business_members")
          .select("user_id, role, status, created_at, users(name, email, avatar_url)")
          .eq("business_id", id)
          .order("created_at", { ascending: true }),
        { data: [], error: null },
      ),
      safe(
        supabase
          .from("parking_spots")
          .select("*", { count: "exact", head: true })
          .eq("business_id", id)
          .eq("status", "active")
          .gt("expires_at", now.toISOString()),
        { count: 0, error: null },
      ),
      safe(
        supabase
          .from("parking_spots")
          .select("*", { count: "exact", head: true })
          .eq("business_id", id)
          .gte("created_at", todayStart),
        { count: 0, error: null },
      ),
      safe(
        supabase
          .from("spot_matches")
          .select("*", { count: "exact", head: true })
          .eq("business_id", id)
          .gte("created_at", todayStart),
        { count: 0, error: null },
      ),
      safe(
        supabase
          .from("spot_matches")
          .select("*", { count: "exact", head: true })
          .eq("business_id", id),
        { count: 0, error: null },
      ),
      safe(
        supabase
          .from("parking_spots")
          .select("*")
          .eq("business_id", id)
          .order("created_at", { ascending: false })
          .limit(10),
        { data: [], error: null },
      ),
      safe(
        supabase
          .from("spot_matches")
         .select("*, parking_spots(address, latitude, longitude), active_sessions(status)")
          .eq("business_id", id)
          .order("created_at", { ascending: false })
          .limit(10),
        { data: [], error: null },
      ),
      safe(supabase.from("business_members").select("*", { count: "exact", head: true }).eq("business_id", id).gte("created_at", sevenDaysAgo), { count: 0 }),
      safe(supabase.from("business_members").select("*", { count: "exact", head: true }).eq("business_id", id).gte("created_at", thirtyDaysAgo), { count: 0 }),
      safe(supabase.from("parking_spots").select("*", { count: "exact", head: true }).eq("business_id", id).gte("created_at", sevenDaysAgo), { count: 0 }),
      safe(supabase.from("parking_spots").select("*", { count: "exact", head: true }).eq("business_id", id).gte("created_at", thirtyDaysAgo), { count: 0 }),
      safe(supabase.from("spot_matches").select("*", { count: "exact", head: true }).eq("business_id", id).in("status", ["confirmed", "confirmed_by_owner", "confirmed_by_seeker", "completed"]), { count: 0 }),
      safe(supabase.from("spot_matches").select("*", { count: "exact", head: true }).eq("business_id", id).in("status", ["offer_declined", "declined", "rejected"]), { count: 0 }),
      safe(supabase.from("spot_matches").select("*", { count: "exact", head: true }).eq("business_id", id).in("status", ["offer_expired", "expired"]), { count: 0 }),
      safe(supabase.from("spot_matches").select("*", { count: "exact", head: true }).eq("business_id", id).eq("status", "no_show"), { count: 0 }),
      safe(supabase.from("business_handoff_events").select("*", { count: "exact", head: true }).eq("business_id", id).eq("outcome", "completed"), { count: 0 }),
      safe(supabase.from("business_join_events").select("*", { count: "exact", head: true }).eq("business_id", id).eq("event_type", "join").eq("source", "qr"), { count: 0 }),
      safe(supabase.from("business_join_events").select("*", { count: "exact", head: true }).eq("business_id", id).eq("event_type", "join").eq("source", "link"), { count: 0 }),
      safe(supabase.from("business_join_events").select("*", { count: "exact", head: true }).eq("business_id", id).eq("event_type", "visit").eq("source", "qr"), { count: 0 }),
    ]);

    if (businessRes.error || !businessRes.data) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const offersSent = matchesTotalCount.count ?? 0;
    const accepted = acceptedMatches.count ?? 0;
    return NextResponse.json({
      business: businessRes.data,
      role: membership.role,
      network_id: membership.network_id,
      stats: {
        members: (members.data ?? []).length,
        activeMembers: (members.data ?? []).filter((m: { status: string }) => m.status === "active").length,
        activeSpots: activeSpotsCount.count ?? 0,
        spotsToday: spotsTodayCount.count ?? 0,
        matchesToday: matchesTodayCount.count ?? 0,
        matchesTotal: matchesTotalCount.count ?? 0,
        departures7d: spots7d.count ?? 0,
        departures30d: spots30d.count ?? 0,
        newMembers7d: members7d.count ?? 0,
        newMembers30d: members30d.count ?? 0,
        offersSent,
        acceptedOffers: accepted,
        acceptanceRate: offersSent ? Math.round((accepted / offersSent) * 100) : 0,
        declinedOffers: declinedMatches.count ?? 0,
        expiredOffers: expiredMatches.count ?? 0,
        noShows: noShowMatches.count ?? 0,
        successfulHandoffs: successfulHandoffs.count ?? 0,
        qrJoins: qrJoins.count ?? 0,
        linkJoins: linkJoins.count ?? 0,
        qrVisits: qrVisits.count ?? 0,
        pwaInstallsApprox: (members.data ?? []).filter((m: { status: string }) => m.status === "active").length,
        medianResponseMinutes: null,
      },
      joinUrl: `${new URL(request.url).origin}/join/${businessRes.data.slug}?source=qr`,
      recentSpots: recentSpots.data ?? [],
      recentMatches: recentMatches.data ?? [],
      members: members.data ?? [],
    });
  } catch (err) {
    logger.error("businesses: dashboard failed", {
      route: "/api/businesses/[id]/dashboard",
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
