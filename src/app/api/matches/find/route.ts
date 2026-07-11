import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

const MATCH_RADIUS_METERS = 200;

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

function schedulesOverlap(
  spotDeparture: string,
  spotReturn: string | null,
  seekerDesiredFrom: string,
  seekerDesiredTo: string
): boolean {
  const sd = new Date(spotDeparture).getTime();
  const sr = spotReturn ? new Date(spotReturn).getTime() : sd + 2 * 60 * 60 * 1000;
  const sf = new Date(seekerDesiredFrom).getTime();
  const st = new Date(seekerDesiredTo).getTime();

  // Spot is available from sd to sr. Seeker wants from sf to st.
  // Overlap exists if seeker's window starts before spot's window ends
  // AND seeker's window ends after spot's window starts
  return sf < sr && st > sd;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spot_id } = body;

    if (!spot_id) {
      return NextResponse.json({ error: "spot_id is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get the spot
    const { data: spot, error: spotError } = await supabase
      .from("parking_spots")
      .select("*")
      .eq("id", spot_id)
      .single();

    if (spotError || !spot) {
      return NextResponse.json({ error: "Spot not found" }, { status: 404 });
    }

    if (spot.status !== "active") {
      return NextResponse.json({ error: "Spot is not active" }, { status: 400 });
    }

    // Find active spot requests in the area
    const { data: requests } = await supabase
      .from("spot_requests")
      .select("*")
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString());

    if (!requests || requests.length === 0) {
      return NextResponse.json({ matches: 0, reason: "No active seekers" });
    }

    const matches: Array<{ request_id: string; seeker_id: string; distance: number }> = [];

    for (const req of requests) {
      // Skip if same user
      if (req.user_id === spot.user_id) continue;

      // Check distance
      const distance = haversineDistance(
        spot.latitude, spot.longitude,
        req.latitude, req.longitude
      );
      if (distance > MATCH_RADIUS_METERS) continue;

      // Check vehicle type compatibility
      if (spot.vehicle_type && req.vehicle_type && spot.vehicle_type !== req.vehicle_type) continue;

      // Check schedule overlap
      // Spot is available during departure_time to return_time
      // Seeker wants a spot (we'll assume their request window is from now to +2 hours)
      const seekerFrom = new Date(req.created_at).toISOString();
      const seekerTo = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

      if (!schedulesOverlap(spot.departure_time, spot.return_time, seekerFrom, seekerTo)) continue;

      matches.push({
        request_id: req.id,
        seeker_id: req.user_id,
        distance: Math.round(distance),
      });
    }

    // Create match records
    let matchesCreated = 0;
    for (const match of matches) {
      // Check if match already exists
      const { data: existing } = await supabase
        .from("spot_matches")
        .select("id")
        .eq("spot_id", spot_id)
        .eq("seeker_id", match.seeker_id)
        .neq("status", "rejected")
        .maybeSingle();

      if (existing) continue;

      const { error: insertError } = await supabase
        .from("spot_matches")
        .insert({
          spot_id,
          spot_owner_id: spot.user_id,
          seeker_id: match.seeker_id,
          status: "pending",
        });

      if (!insertError) matchesCreated++;
    }

    return NextResponse.json({
      matches: matchesCreated,
      total_candidates: matches.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
