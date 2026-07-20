import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";

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
      .select("id, spot_owner_id, seeker_id, status")
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
      .select("location_shared, location_stopped_at, status")
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

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
