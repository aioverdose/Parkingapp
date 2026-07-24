import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, match_id, is_owner, speed_minutes, rating } = await request.json();
    const supabase = createAdminClient();

    if (action === "handoff") {
      const { data, error } = await supabase.rpc("award_handoff_xp", {
        p_user_id: user.id,
        p_match_id: match_id || null,
        p_is_owner: is_owner ?? true,
        p_speed_minutes: speed_minutes || null,
        p_reliability_rating: rating || null,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Check and award badges
      const { data: badges } = await supabase.rpc("check_and_award_badges", {
        p_user_id: user.id,
      });

      // Progress quests
      const { data: quests } = await supabase.rpc("progress_quest", {
        p_user_id: user.id,
        p_action_type: "complete_handoff",
      });

      return NextResponse.json({
        success: true,
        xp: data,
        new_badges: badges ?? [],
        completed_quests: quests ?? [],
      });
    }

    if (action === "perfect_park") {
      const { score } = await request.json();
      if (score === undefined || score < 0 || score > 100) {
        return NextResponse.json({ error: "score (0-100) is required" }, { status: 400 });
      }

      const { data, error } = await supabase.rpc("award_perfect_park", {
        p_user_id: user.id,
        p_score: score,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Progress quests
      await supabase.rpc("progress_quest", {
        p_user_id: user.id,
        p_action_type: "perfect_park",
      });

      return NextResponse.json({ success: true, xp: data });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
