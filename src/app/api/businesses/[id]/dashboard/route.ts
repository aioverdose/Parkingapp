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
    ]);

    if (businessRes.error || !businessRes.data) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

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
      },
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
