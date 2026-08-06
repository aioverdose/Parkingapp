import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") ?? "active";
    const status: "active" | "taken" | "expired" = statusParam === "active" || statusParam === "taken" || statusParam === "expired"
      ? statusParam
      : "active";
    const now = new Date().toISOString();

    const supabase = createAdminClient();
    let query = supabase
      .from("parking_spots")
      .select("*");

    if (status === "active") {
      query = query
        .eq("status", "active")
        .gt("expires_at", now)
        .gt("departure_time", now);
    } else {
      query = query.eq("status", status);
    }

    const { data, error } = await query.order("departure_time", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ spots: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rateCheck = checkRateLimit(`create-spot:${ip}`, 10, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before posting again." },
        { status: 429, headers: { "X-RateLimit-Reset": String(rateCheck.resetAt) } }
      );
    }

    // Check for active spots already posted by user
    const supabaseRank = createAdminClient();
    const { count: activeSpotCount } = await supabaseRank
      .from("parking_spots")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString());

    if (activeSpotCount && activeSpotCount >= 3) {
      return NextResponse.json(
        { error: "You can have at most 3 active spot alerts at a time." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { latitude, longitude, address, departure_time, return_time, tip_message, vehicle_type, relay_mode } = body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json({ error: "latitude and longitude are required" }, { status: 400 });
    }
    if (!departure_time || typeof departure_time !== "string") {
      return NextResponse.json({ error: "departure_time is required" }, { status: 400 });
    }

    const departDate = new Date(departure_time);
    if (departDate.getTime() <= Date.now()) {
      return NextResponse.json({ error: "departure_time must be in the future" }, { status: 400 });
    }

    let returnDate: Date | null = null;
    if (return_time) {
      returnDate = new Date(return_time);
      if (returnDate.getTime() <= departDate.getTime()) {
        return NextResponse.json({ error: "return_time must be after departure_time" }, { status: 400 });
      }
    }

    const mode: "imminent" | "scheduled" = relay_mode === "scheduled" ? "scheduled" : "imminent";

    // Scheduled relays: expires_at = departure_time (valid until departure)
    // Imminent alerts: expires_at = return_time or departure + 2h
    const expiresAt = mode === "scheduled"
      ? departDate.toISOString()
      : returnDate
        ? returnDate.toISOString()
        : new Date(departDate.getTime() + 2 * 60 * 60 * 1000).toISOString();

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("parking_spots")
      .insert({
        user_id: user.id,
        latitude,
        longitude,
        address: address || "Current Location",
        departure_time: departDate.toISOString(),
        return_time: returnDate?.toISOString() ?? null,
        status: "active",
        tip_message: tip_message ?? null,
        vehicle_type: vehicle_type ?? null,
        expires_at: expiresAt,
        flag_count: 0,
        relay_mode: mode,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Trigger matching engine asynchronously
    fetch(new URL("/api/matches/find", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spot_id: data.id }),
    }).catch(() => {});

    // SpotQuest: Progress post_spot quest (fire-and-forget)
    try {
      const adminClient = createAdminClient();
      await adminClient.rpc("progress_quest", {
        p_user_id: user.id,
        p_action_type: "post_spot",
      });
    } catch { /* non-critical */ }

    return NextResponse.json({ spot: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
