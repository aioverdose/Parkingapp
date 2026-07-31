import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

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

  const { error } = await supabase.from("driver_locations").insert(rows);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: rows.length });
}
