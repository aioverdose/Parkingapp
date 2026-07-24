import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { badge_id, action } = await request.json();
    const supabase = createAdminClient();

    if (action === "check") {
      const { data, error } = await supabase.rpc("check_and_award_badges", {
        p_user_id: user.id,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, new_badges: data ?? [] });
    }

    if (action === "seen" && badge_id) {
      const { error } = await supabase
        .from("user_badges" as any)
        .update({ seen: true })
        .eq("user_id", user.id)
        .eq("badge_id", badge_id);

      return NextResponse.json({ success: !error });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
