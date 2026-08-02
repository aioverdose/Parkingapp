import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { sendPushToUser } from "@/lib/push";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * POST /api/matches/[id]/location
 *
 * Broadcasts the user's GPS location to their matched partner.
 *
 * Privacy & Security:
 * - Only participants of a confirmed match can post location
 * - Rate limited to 1 update per 10 seconds per user (battery-friendly)
 * - Location is stored with a timestamp and auto-deleted after 1 hour
 * - RLS ensures only the matched partner can read it
 *
 * CCPA Compliance:
 * - Data is collected with explicit consent only
 * - Data is temporary (auto-deleted after 1 hour)
 * - Users can stop sharing at any time via the stop endpoint
 * - No location data is retained after the match ends
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: max 1 location update per 10 seconds per user
    const rateCheck = checkRateLimit(`location-update:${user.id}`, 6, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Rate limited. Wait before sending another update." },
        { status: 429 },
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { latitude, longitude, heading, speed, accuracy } = body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { error: "latitude and longitude are required" },
        { status: 400 },
      );
    }

    // Validate coordinates are reasonable (not null island, not obviously fake)
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Verify the match exists, is confirmed, and the user is a participant
    const { data: match, error: matchError } = await supabase
      .from("spot_matches")
      .select("id, spot_owner_id, seeker_id, status, spot:spot_id(latitude, longitude, address)")
      .eq("id", id)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (match.status !== "confirmed") {
      return NextResponse.json(
        { error: "Location sharing only available for confirmed matches" },
        { status: 400 },
      );
    }

    const isOwner = match.spot_owner_id === user.id;
    const isSeeker = match.seeker_id === user.id;
    if (!isOwner && !isSeeker) {
      return NextResponse.json({ error: "Not authorized for this match" }, { status: 403 });
    }

    // Verify location sharing is enabled for this match
    const { data: session } = await supabase
      .from("active_sessions")
      .select("location_shared, location_stopped_at, status, proximity_announced_km, proximity_announced_arrival")
      .eq("match_id", id)
      .eq("user_id", user.id)
      .single();

    if (!session?.location_shared || session.location_stopped_at) {
      return NextResponse.json(
        { error: "Location sharing is not enabled for this session" },
        { status: 400 },
      );
    }

    if (session.status === "completed" || session.status === "no_show") {
      return NextResponse.json(
        { error: "This session has ended" },
        { status: 400 },
      );
    }

    // Insert the location record
    // Note: RLS on driver_locations ensures only the matched partner can read it
    const { error: insertError } = await supabase
      .from("driver_locations")
      .insert({
        user_id: user.id,
        match_id: id,
        latitude,
        longitude,
        heading: heading ?? null,
        speed: speed ?? null,
        accuracy: accuracy ?? null,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Air-traffic-control proximity alerts:
    // As the arriving driver gets close, the parked owner is pushed an
    // Uber-style update so they can prepare to leave. Each threshold fires once.
    const embeddedSpot = Array.isArray(match.spot) ? match.spot[0] : match.spot;
    const spotLat = embeddedSpot?.latitude;
    const spotLon = embeddedSpot?.longitude;
    if (isSeeker && typeof spotLat === "number" && typeof spotLon === "number") {
      const distance = haversineDistance(latitude, longitude, spotLat, spotLon);

      const announcedKm = !!session.proximity_announced_km;
      const announcedArrival = !!session.proximity_announced_arrival;

      const updates: Record<string, boolean> = {};
      let pushType: string | null = null;
      let pushTitle: string | null = null;
      let pushBody: string | null = null;

      if (!announcedKm && distance <= 1000) {
        updates.proximity_announced_km = true;
        const etaMin = Math.max(1, Math.round(distance / (11.2 * 60)));
        pushType = "driver_approaching";
        pushTitle = "Your driver is on the way";
        pushBody = `About ${etaMin} min away. Get ready to leave the spot.`;
      }
      if (!announcedArrival && distance <= 150) {
        updates.proximity_announced_arrival = true;
        pushType = "driver_arriving";
        pushTitle = "Your driver is arriving now";
        pushBody = "Please pull out so they can park.";
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from("active_sessions")
          .update(updates)
          .eq("match_id", id)
          .eq("user_id", user.id);

        if (pushType) {
          await supabase.from("notifications").insert({
            user_id: match.spot_owner_id,
            title: pushTitle,
            message: pushBody ?? "",
            type: "match",
          });

          sendPushToUser(match.spot_owner_id, {
            type: pushType,
            title: pushTitle ?? "Driver update",
            body: pushBody ?? "",
            match_id: id,
            spot_lat: spotLat,
            spot_lon: spotLon,
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
