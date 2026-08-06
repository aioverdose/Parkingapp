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

// Arrival-departure alignment constants. The goal is that the arriving driver
// pulls in the moment the parked owner pulls out, so the spot is never left
// unoccupied and the driver never circles the block.
const SPEED_EMA_ALPHA = 0.5; // smoothing for seeker ETA
const WALKING_SPEED_MPS = 1.4; // typical walking pace
const PULL_OUT_BUFFER_SECONDS = 30; // unlock car + drive out
const AT_CAR_RADIUS_METERS = 30; // owner is considered "at the car" within this
const MAX_OWNER_DEPART_ETA_SECONDS = 900; // sanity cap (15 min lead limit)

/** Moving average over recent GPS speeds so the ETA stops jumping per update. */
function smoothSpeed(speeds: number[]): number | null {
  if (speeds.length === 0) return null;
  let ema = speeds[0];
  for (let i = 1; i < speeds.length; i++) {
    ema = SPEED_EMA_ALPHA * speeds[i] + (1 - SPEED_EMA_ALPHA) * ema;
  }
  return ema;
}

/**
 * How long until the owner can pull out: 30s if already at the car, otherwise
 * walking time back plus the pull-out buffer. Returns null while the owner is
 * driving (no reliable "time to car" estimate).
 */
function computeOwnerDepartEta(speed: number | null, distanceToSpot: number): number | null {
  if (distanceToSpot <= AT_CAR_RADIUS_METERS) return PULL_OUT_BUFFER_SECONDS;
  if (speed != null && speed > 4.5) return null; // driving, not walking back
  const eta = Math.round(distanceToSpot / WALKING_SPEED_MPS) + PULL_OUT_BUFFER_SECONDS;
  return Math.min(eta, MAX_OWNER_DEPART_ETA_SECONDS);
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
      .select("location_shared, location_stopped_at, status, proximity_announced_km, proximity_announced_arrival, align_hold_fired")
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

    // Air-traffic-control proximity + alignment logic. As the arriving driver
    // gets close, the parked owner is pushed an Uber-style update so they can
    // prepare to leave. Each threshold fires once.
    const embeddedSpot = Array.isArray(match.spot) ? match.spot[0] : match.spot;
    const spotLat = embeddedSpot?.latitude;
    const spotLon = embeddedSpot?.longitude;

    // Owner side: track how long until they can pull out (walk back + leave).
    if (isOwner && typeof spotLat === "number" && typeof spotLon === "number") {
      const distanceToSpot = haversineDistance(latitude, longitude, spotLat, spotLon);
      const departEta = computeOwnerDepartEta(typeof speed === "number" ? speed : null, distanceToSpot);
      await supabase
        .from("active_sessions")
        .update({ owner_depart_eta_seconds: departEta })
        .eq("match_id", id)
        .eq("user_id", user.id);
    }

    if (isSeeker && typeof spotLat === "number" && typeof spotLon === "number") {
      const distance = haversineDistance(latitude, longitude, spotLat, spotLon);

      // Smoothed seeker ETA (moving average over recent GPS speeds instead of a
      // single instantaneous reading) so the owner's GO countdown stops jumping.
      const { data: recentLocs } = await supabase
        .from("driver_locations")
        .select("speed")
        .eq("match_id", id)
        .eq("user_id", user.id)
        .order("recorded_at", { ascending: false })
        .limit(5);
      const speeds = (recentLocs ?? [])
        .map((l) => (typeof l.speed === "number" && l.speed > 0 ? l.speed : null))
        .filter((s): s is number => s != null)
        .reverse();
      const effectiveSpeed = smoothSpeed(speeds) ?? 11.2;
      const seekerEta = Math.round(distance / effectiveSpeed);

      // The owner's readiness so we can time the pull-out to the arrival.
      const { data: ownerSession } = await supabase
        .from("active_sessions")
        .select("status, owner_depart_eta_seconds, align_get_ready_fired, align_go_fired")
        .eq("match_id", id)
        .eq("role", "owner")
        .single();
      const ownerDeparted = ownerSession?.status === "departed";

      const announcedKm = !!session.proximity_announced_km;
      const announcedArrival = !!session.proximity_announced_arrival;
      const holdFired = !!session.align_hold_fired;

      const updates: Record<string, unknown> = { eta_seconds: seekerEta };
      let pushType: string | null = null;
      let pushTitle: string | null = null;
      let pushBody: string | null = null;

      if (!announcedKm && distance <= 1000) {
        updates.proximity_announced_km = true;
        const etaMin = Math.max(1, Math.round(seekerEta / 60));
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

      // Arrival-departure alignment: fire each cue exactly once.
      const ownerDepartEta = ownerSession?.owner_depart_eta_seconds;
      if (!ownerDeparted && typeof ownerDepartEta === "number") {
        const alignment = seekerEta - ownerDepartEta;

        if (!ownerSession?.align_get_ready_fired && ownerDepartEta > PULL_OUT_BUFFER_SECONDS + 30 && alignment <= 120) {
          await supabase
            .from("active_sessions")
            .update({ align_get_ready_fired: true })
            .eq("match_id", id)
            .eq("role", "owner");
          await supabase.from("notifications").insert({
            user_id: match.spot_owner_id,
            title: "Time to head to your car",
            message: `Driver arrives in about ${Math.max(1, Math.round(alignment / 60))} min. Get to your car so you can pull out the moment they arrive.`,
            type: "match",
          });
          sendPushToUser(match.spot_owner_id, {
            type: "align_get_ready",
            title: "Time to head to your car",
            body: `Driver arrives in about ${Math.max(1, Math.round(alignment / 60))} min. Get to your car so you can pull out the moment they arrive.`,
            match_id: id,
            spot_lat: spotLat,
            spot_lon: spotLon,
          });
        }

        if (!ownerSession?.align_go_fired && alignment <= 0) {
          await supabase
            .from("active_sessions")
            .update({ align_go_fired: true })
            .eq("match_id", id)
            .eq("role", "owner");
          await supabase.from("notifications").insert({
            user_id: match.spot_owner_id,
            title: "Pull out now",
            message: "The driver is arriving. Pull out now so they can park the moment you leave.",
            type: "match",
          });
          sendPushToUser(match.spot_owner_id, {
            type: "align_go",
            title: "Pull out now",
            body: "The driver is arriving. Pull out now so they can park the moment you leave.",
            match_id: id,
            spot_lat: spotLat,
            spot_lon: spotLon,
          });
        }

        if (!holdFired && alignment < -60) {
          updates.align_hold_fired = true;
          const waitMin = Math.max(1, Math.round(ownerDepartEta / 60));
          await supabase.from("notifications").insert({
            user_id: match.seeker_id,
            title: "You're a little early",
            message: `The owner needs about ${waitMin} min to pull out. Wait nearby — the spot opens the moment they leave.`,
            type: "match",
          });
          sendPushToUser(match.seeker_id, {
            type: "hold_back",
            title: "You're a little early",
            body: `The owner needs about ${waitMin} min to pull out. Wait nearby — the spot opens the moment they leave.`,
            match_id: id,
            spot_lat: spotLat,
            spot_lon: spotLon,
          });
        }
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from("active_sessions")
          .update(updates)
          .eq("match_id", id)
          .eq("user_id", user.id);
      }

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

      // Auto-confirm arrival only once the spot is actually free. Otherwise the
      // driver arriving early would resolve the handoff before the owner pulls
      // out — the spot would sit unoccupied and the driver would have to wait.
      if (distance <= 50 && session.status === "en_route" && ownerDeparted) {
        await supabase
          .from("active_sessions")
          .update({
            status: "arrived",
            eta_seconds: 0,
            updated_at: new Date().toISOString(),
          })
          .eq("match_id", id)
          .eq("user_id", user.id);
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
