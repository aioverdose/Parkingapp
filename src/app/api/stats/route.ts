import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const { count: totalSpotsPosted } = await supabase
      .from("parking_spots")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    const { count: activeSpotsNow } = await supabase
      .from("parking_spots")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .gt("departure_time", now);

    const { count: userSpotsPosted } = await supabase
      .from("parking_spots")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { count: userSpotsClaimed } = await supabase
      .from("parking_spots")
      .select("*", { count: "exact", head: true })
      .eq("claimed_by", user.id);

    return NextResponse.json({
      totalSpotsPosted: totalSpotsPosted ?? 0,
      activeSpotsNow: activeSpotsNow ?? 0,
      userSpotsPosted: userSpotsPosted ?? 0,
      userSpotsClaimed: userSpotsClaimed ?? 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
