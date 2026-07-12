import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/api/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateCheck = checkRateLimit(`flag:${user.id}`, 5, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { spot_id, flag_type, comment } = await request.json();

    if (!spot_id || !flag_type) {
      return NextResponse.json({ error: "spot_id and flag_type are required" }, { status: 400 });
    }

    const validTypes = ["wrong_location", "fake_spot", "misleading_alert", "rude_user", "dangerous_behavior", "other"];
    if (!validTypes.includes(flag_type)) {
      return NextResponse.json({ error: "Invalid flag type" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await (supabase as any)
      .from("spot_flags")
      .insert({
        spot_id,
        flagged_by_user_id: user.id,
        flag_type,
        comment: comment || "",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Increment flag_count on the spot
    const { data: currentSpot } = await (supabase as any)
      .from("parking_spots")
      .select("flag_count")
      .eq("id", spot_id)
      .single();

    const newCount = (currentSpot?.flag_count ?? 0) + 1;
    await (supabase as any)
      .from("parking_spots")
      .update({ flag_count: newCount })
      .eq("id", spot_id);

    return NextResponse.json({
      success: true,
      flag: data,
      flag_count: newCount,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
