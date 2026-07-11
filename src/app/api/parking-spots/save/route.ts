import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { reverseGeocode } from "@/lib/geocode";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { latitude, longitude, accuracy, label } = body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json({ error: "latitude and longitude are required" }, { status: 400 });
    }

    const address = await reverseGeocode(latitude, longitude);

    const supabase = createAdminClient();
    const spotLabel = label || "Current Spot";

    const { data: existing } = await (supabase
      .from("user_parking_spots" as any)
      .select("id")
      .eq("user_id", user.id)
      .eq("label", spotLabel)
      .maybeSingle()) as any;

    if (existing) {
      const { data, error } = await supabase
        .from("user_parking_spots" as any)
        .update({
          latitude,
          longitude,
          accuracy: accuracy ?? null,
          address,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ spot: data });
    }

    const { data, error } = await supabase
      .from("user_parking_spots" as any)
      .insert({
        user_id: user.id,
        label: spotLabel,
        latitude,
        longitude,
        accuracy: accuracy ?? null,
        address,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ spot: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
