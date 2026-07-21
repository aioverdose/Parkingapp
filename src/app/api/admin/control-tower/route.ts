import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateCheck = checkRateLimit(`control-tower:${user.id}`, 30, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = createAdminClient();

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "moderator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: matches, error: matchesError } = await supabase
      .from("spot_matches")
      .select(`
        *,
        spot:parking_spots(*),
        owner:users!spot_owner_id(id, name, email),
        seeker:users!seeker_id(id, name, email)
      `)
      .in("status", ["confirmed", "confirmed_by_owner", "confirmed_by_seeker"])
      .order("created_at", { ascending: false });

    if (matchesError) {
      return NextResponse.json({ error: matchesError.message }, { status: 500 });
    }

    const matchIds = matches.map((m) => m.id);

    const [locationsResult, sessionsResult] = await Promise.all([
      supabase
        .from("driver_locations")
        .select("*")
        .in("match_id", matchIds)
        .order("recorded_at", { ascending: false }),
      supabase
        .from("active_sessions")
        .select("*")
        .in("match_id", matchIds),
    ]);

    const latestLocations = new Map<string, any>();
    for (const loc of locationsResult.data ?? []) {
      const key = `${loc.user_id}:${loc.match_id}`;
      if (!latestLocations.has(key)) {
        latestLocations.set(key, loc);
      }
    }

    const sessionsByKey = new Map<string, any>();
    for (const ses of sessionsResult.data ?? []) {
      sessionsByKey.set(`${ses.user_id}:${ses.match_id}`, ses);
    }

    const enriched = matches.map((match) => {
      const ownerSession = sessionsByKey.get(`${match.spot_owner_id}:${match.id}`);
      const seekerSession = sessionsByKey.get(`${match.seeker_id}:${match.id}`);
      return {
        ...match,
        owner_location: latestLocations.get(`${match.spot_owner_id}:${match.id}`) || null,
        seeker_location: latestLocations.get(`${match.seeker_id}:${match.id}`) || null,
        owner_session: ownerSession || null,
        seeker_session: seekerSession || null,
      };
    });

    const { data: recentLocations } = await supabase
      .from("driver_locations")
      .select("id, user_id, latitude, longitude, heading, speed, accuracy, recorded_at")
      .is("match_id", null)
      .gte("recorded_at", new Date(Date.now() - 30 * 60_000).toISOString())
      .order("recorded_at", { ascending: false });

    const latestUserLocs = new Map<string, any>();
    for (const loc of recentLocations ?? []) {
      if (!latestUserLocs.has(loc.user_id)) {
        latestUserLocs.set(loc.user_id, loc);
      }
    }

    const matchUserIds = new Set(
      matches.flatMap((m) => [m.spot_owner_id, m.seeker_id]),
    );

    const uniqueUserIds = [...latestUserLocs.keys()].filter((id) => !matchUserIds.has(id));

    let userProfileMap = new Map<string, { name: string | null; email: string | null }>();
    if (uniqueUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", uniqueUserIds);
      for (const p of profiles ?? []) {
        userProfileMap.set(p.id, { name: p.name, email: p.email });
      }
    }

    const userLocations = uniqueUserIds.map((id) => {
      const loc = latestUserLocs.get(id);
      const profile = userProfileMap.get(id);
      return {
        ...loc,
        user_name: profile?.name || null,
        user_email: profile?.email || null,
      };
    });

    return NextResponse.json({ matches: enriched, userLocations });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
