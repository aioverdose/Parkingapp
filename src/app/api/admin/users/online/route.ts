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

    const since = new Date(Date.now() - 90_000).toISOString();
    const { data, error } = await supabase
      .from("driver_locations")
      .select("user_id, recorded_at")
      .gt("recorded_at", since)
      .order("recorded_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const online = new Map<string, string>();
    for (const row of data ?? []) {
      if (!online.has(row.user_id)) {
        online.set(row.user_id, row.recorded_at);
      }
    }

    return NextResponse.json({
      online: Object.fromEntries(online),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
