import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { runUserGrowth } from "@/lib/agents/user-growth-agent";

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
      .select("id, user_id, latitude, longitude, address")
      .eq("id", spotId)
      .single();

    if (!spot) {
      return NextResponse.json({ error: "Spot not found" }, { status: 404 });
    }

    const result = await runUserGrowth(spot);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
