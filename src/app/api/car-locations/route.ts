import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logger } from "@/lib/logger";
import { isValidCoords } from "@/lib/geo-validation";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("car_locations")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["parked", "walking_back"])
      .order("parked_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ carLocation: data ?? null });
  } catch (err) {
    logger.error("car-locations: get failed", {
      route: "/api/car-locations",
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateCheck = await checkRateLimit(`car-location:${user.id}`, 6, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const body = await request.json();
    const { latitude, longitude, parked_at } = body;

    if (!isValidCoords(latitude, longitude)) {
      return NextResponse.json(
        { error: "latitude and longitude are required and must be valid coordinates" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("car_locations")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["parked", "walking_back"])
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("car_locations")
        .update({
          latitude,
          longitude,
          status: "parked",
          parked_at: parked_at ?? new Date().toISOString(),
          walking_eta_seconds: null,
          walking_back_detected_at: null,
          departed_at: null,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ carLocation: data });
    }

    const { data, error } = await supabase
      .from("car_locations")
      .insert({
        user_id: user.id,
        latitude,
        longitude,
        parked_at: parked_at ?? new Date().toISOString(),
        status: "parked",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ carLocation: data }, { status: 201 });
  } catch (err) {
    logger.error("car-locations: save failed", {
      route: "/api/car-locations",
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
