import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { haversineDistance } from "@/lib/haversine";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateCheck = checkRateLimit(`location:${user.id}`, 60, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const { latitude, longitude, heading, speed, accuracy, match_id } = body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json({ error: "latitude and longitude are required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    await supabase.from("driver_locations").insert({
      user_id: user.id,
      match_id: match_id || null,
      latitude,
      longitude,
      heading: heading != null ? heading : null,
      speed: speed != null ? speed : null,
      accuracy: accuracy != null ? accuracy : null,
    });

    if (match_id) {
      const { data: match } = await supabase
        .from("spot_matches")
        .select("spot_id")
        .eq("id", match_id)
        .single();

      if (match) {
        const { data: spot } = await supabase
          .from("parking_spots")
          .select("latitude, longitude")
          .eq("id", match.spot_id)
          .single();

        if (spot) {
          const dist = haversineDistance(latitude, longitude, spot.latitude, spot.longitude);
          const estimatedSpeed = speed != null && speed > 0 ? speed : 5.0;
          const etaSeconds = estimatedSpeed > 0 ? Math.round(dist / estimatedSpeed) : null;

          await supabase.from("active_sessions").upsert(
            {
              user_id: user.id,
              match_id,
              role: "seeker",
              status: dist < 50 ? "arrived" : "en_route",
              eta_seconds: etaSeconds,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,match_id", ignoreDuplicates: false },
          );
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
