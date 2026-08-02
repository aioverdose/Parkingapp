import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";

/**
 * POST /api/user/location
 *
 * Lightweight location ping for admin visibility.
 * Stores the user's position in driver_locations with match_id = null
 * so the control tower can display all active users on the map.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateCheck = checkRateLimit(`presence:${user.id}`, 12, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const body = await request.json();
    const { latitude, longitude, heading, speed, accuracy, device_id } = body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { error: "latitude and longitude are required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    await supabase.rpc("ensure_user_exists", { p_user_id: user.id });
    if (device_id && typeof device_id === "string" && device_id.length <= 200) {
      await supabase.from("users").update({ device_id }).eq("id", user.id);
    }
    const { error } = await supabase.from("driver_locations").insert({
      user_id: user.id,
      match_id: null,
      latitude,
      longitude,
      heading: heading ?? null,
      speed: speed ?? null,
      accuracy: accuracy ?? null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
