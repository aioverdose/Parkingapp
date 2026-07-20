import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";

/**
 * POST /api/matches/[id]/location/start
 *
 * Enables location sharing for the current user in a confirmed match.
 * This is the explicit consent endpoint — location is NOT shared until
 * the user explicitly taps "Enable Live Location Sharing".
 *
 * Privacy & Security:
 * - Only confirmed match participants can enable sharing
 * - Requires explicit user consent (this endpoint IS the consent)
 * - Sets location_shared = true and records the consent timestamp
 * - User can stop at any time via the stop endpoint
 *
 * CCPA Compliance:
 * - Explicit consent is obtained before any location sharing
 * - Consent timestamp is recorded for audit purposes
 * - Users are informed: "Your precise location is shared only with
 *   your matched driver for this handoff and is automatically deleted afterward."
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

    // Verify the match exists and is confirmed
    const { data: match, error: matchError } = await supabase
      .from("spot_matches")
      .select("id, spot_owner_id, seeker_id, status")
      .eq("id", id)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (match.status !== "confirmed") {
      return NextResponse.json(
        { error: "Location sharing only available for confirmed matches" },
        { status: 400 },
      );
    }

    const isOwner = match.spot_owner_id === user.id;
    const isSeeker = match.seeker_id === user.id;
    if (!isOwner && !isSeeker) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Upsert the active session with consent
    const { error: upsertError } = await supabase
      .from("active_sessions")
      .upsert(
        {
          user_id: user.id,
          match_id: id,
          role: isOwner ? "owner" : "seeker",
          location_shared: true,
          location_shared_at: new Date().toISOString(),
          location_stopped_at: null,
        },
        { onConflict: "user_id,match_id", ignoreDuplicates: false },
      );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
