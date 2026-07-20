import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";

/**
 * POST /api/matches/[id]/location/stop
 *
 * Stops location sharing for the current user in a match.
 *
 * Privacy & Security:
 * - Only match participants can stop their own sharing
 * - Sets location_shared = false and records the stop timestamp
 * - Existing location records are cleaned up by the cleanup function
 *
 * CCPA Compliance:
 * - This is the "easy opt-out" mechanism required by CCPA
 * - Users can stop sharing at any time with a single tap
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Verify the user is a participant in this match
    const { data: match, error: matchError } = await supabase
      .from("spot_matches")
      .select("id, spot_owner_id, seeker_id")
      .eq("id", id)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const isOwner = match.spot_owner_id === user.id;
    const isSeeker = match.seeker_id === user.id;
    if (!isOwner && !isSeeker) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Stop location sharing for this user
    const { error: updateError } = await supabase
      .from("active_sessions")
      .update({
        location_shared: false,
        location_stopped_at: new Date().toISOString(),
      })
      .eq("match_id", id)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Best-effort: delete the user's recent location records for this match
    // This is an immediate privacy action — don't wait for the cron cleanup
    await supabase
      .from("driver_locations")
      .delete()
      .eq("match_id", id)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
