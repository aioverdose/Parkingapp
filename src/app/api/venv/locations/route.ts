import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { isValidCoords, isValidAccuracy, isValidHeading, isValidSpeed } from "@/lib/geo-validation";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createAdminClient();
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "moderator") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const limit = await checkRateLimit(`venv-locations:${user.id}`, 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await request.json();
  const { updates } = body as {
    updates: {
      userId: string;
      latitude: number;
      longitude: number;
      heading: number | null;
      speed: number | null;
      accuracy: number | null;
    }[];
  };

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  if (updates.length > 50) {
    return NextResponse.json({ error: "Max 50 updates per request" }, { status: 400 });
  }

  const rows = updates.map((u) => ({
    user_id: u.userId,
    latitude: u.latitude,
    longitude: u.longitude,
    heading: u.heading ?? null,
    speed: u.speed ?? null,
    accuracy: u.accuracy ?? null,
    recorded_at: new Date().toISOString(),
  }));

  if (rows.some((row) => !isValidCoords(row.latitude, row.longitude) || !isValidSpeed(row.speed) || !isValidAccuracy(row.accuracy) || !isValidHeading(row.heading))) {
    return NextResponse.json({ error: "Invalid telemetry values" }, { status: 400 });
  }

  const { error } = await supabase.from("driver_locations").insert(rows);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: rows.length });
}
