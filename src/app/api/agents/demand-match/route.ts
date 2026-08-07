import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { runDemandMatch } from "@/lib/agents/demand-match-agent";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const spotId = body.spot_id;

    if (!spotId) {
      return NextResponse.json({ error: "spot_id is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: spot } = await supabase
      .from("parking_spots")
      .select("id, user_id, latitude, longitude, departure_time, address, vehicle_type")
      .eq("id", spotId)
      .single();

    if (!spot) {
      return NextResponse.json({ error: "Spot not found" }, { status: 404 });
    }

    const result = await runDemandMatch(spot);
    return NextResponse.json(result);
  } catch (err) {
    logger.error("demand-match: failed", {
      route: "/api/agents/demand-match",
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
