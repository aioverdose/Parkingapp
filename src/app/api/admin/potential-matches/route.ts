import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin" && profile?.role !== "moderator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const { data: spots, error: spotsError } = await supabase
      .from("parking_spots")
      .select("id, user_id, latitude, longitude, address, departure_time, return_time, relay_mode, created_at")
      .eq("status", "active")
      .gt("expires_at", now)
      .order("departure_time", { ascending: true });

    if (spotsError) {
      return NextResponse.json({ error: spotsError.message }, { status: 500 });
    }

    const userIds = [...new Set(spots?.map((s: any) => s.user_id) ?? [])];

    const { data: userProfiles } = await supabase
      .from("users")
      .select("id, name, email, phone")
      .in("id", userIds);

    const userMap = new Map((userProfiles ?? []).map((u: any) => [u.id, u]));

    const enriched = (spots ?? []).map((s: any) => {
      const profile = userMap.get(s.user_id);
      return {
        user_id: s.user_id,
        user_name: profile?.name ?? null,
        user_email: profile?.email ?? null,
        user_phone: profile?.phone ?? null,
        spot_id: s.id,
        address: s.address,
        latitude: s.latitude,
        longitude: s.longitude,
        departure_time: s.departure_time,
        return_time: s.return_time,
        relay_mode: s.relay_mode,
        created_at: s.created_at,
      };
    });

    return NextResponse.json({ spots: enriched });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
