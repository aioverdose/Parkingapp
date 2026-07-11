import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rated_user_id, rating, comment, spot_id } = await request.json();

    if (!rated_user_id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "rated_user_id and rating (1-5) are required" }, { status: 400 });
    }

    if (rated_user_id === user.id) {
      return NextResponse.json({ error: "Cannot rate yourself" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await (supabase as any)
      .from("user_ratings")
      .insert({
        rated_by_user_id: user.id,
        rated_user_id,
        rating,
        comment: comment || "",
        spot_id: spot_id || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get updated average
    const avg = await (supabase as any).rpc("recalc_average_rating", { rated_user_id });

    return NextResponse.json({ success: true, rating: data, average_rating: avg.data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
