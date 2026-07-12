import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase.from("driver_locations").select("id").limit(1);

    if (error && error.message?.includes("relation") && error.message?.includes("does not exist")) {
      return NextResponse.json({
        success: false,
        message: "Migration not applied",
        hint: "Open your Supabase dashboard SQL editor, go to supabase/migrations/00018_control_tower.sql, copy and run the SQL.",
      });
    }

    return NextResponse.json({ success: true, message: "Tables exist" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
