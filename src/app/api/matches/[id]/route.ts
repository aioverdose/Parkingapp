import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    const { data: match, error } = await supabase
      .from("spot_matches")
      .select("*, spot:spot_id(*), spot_owner:spot_owner_id(id, name, email), seeker:seeker_id(id, name, email)")
      .eq("id", id)
      .single();

    if (error || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const isOwner = match.spot_owner_id === user.id;
    const isSeeker = match.seeker_id === user.id;
    if (!isOwner && !isSeeker) {
      return NextResponse.json({ error: "Not authorized for this match" }, { status: 403 });
    }

    return NextResponse.json({ match });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body; // "confirm" or "reject"

    if (!action || !["confirm", "reject"].includes(action)) {
      return NextResponse.json({ error: "action must be 'confirm' or 'reject'" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: match, error: fetchError } = await supabase
      .from("spot_matches")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Check user is part of this match
    const isOwner = match.spot_owner_id === user.id;
    const isSeeker = match.seeker_id === user.id;
    if (!isOwner && !isSeeker) {
      return NextResponse.json({ error: "Not authorized for this match" }, { status: 403 });
    }

    if (action === "reject") {
      const { error: updateError } = await supabase
        .from("spot_matches")
        .update({ status: "rejected" })
        .eq("id", id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Notify the other party
      const notifyUserId = isOwner ? match.seeker_id : match.spot_owner_id;
      await supabase.from("notifications").insert({
        user_id: notifyUserId,
        title: "Match declined",
        message: "The other party declined the match.",
        type: "match",
      });

      return NextResponse.json({ success: true, status: "rejected" });
    }

    // Confirm action
    let newStatus: "pending" | "confirmed_by_owner" | "confirmed_by_seeker" | "confirmed" | "rejected" | "expired" = "pending";
    if (isOwner && match.status === "pending") {
      newStatus = "confirmed_by_owner";
    } else if (isSeeker && match.status === "pending") {
      newStatus = "confirmed_by_seeker";
    } else if (isOwner && match.status === "confirmed_by_seeker") {
      newStatus = "confirmed";
    } else if (isSeeker && match.status === "confirmed_by_owner") {
      newStatus = "confirmed";
    } else {
      return NextResponse.json({ error: "Cannot confirm in current state" }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("spot_matches")
      .update({ status: newStatus })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // If confirmed, deduct credits and finalize
    if (newStatus === "confirmed") {
      // Check and deduct match credits from both parties
      const { data: ownerCredits } = await supabase
        .from("users")
        .select("match_credits")
        .eq("id", match.spot_owner_id)
        .single();
      const { data: seekerCredits } = await supabase
        .from("users")
        .select("match_credits")
        .eq("id", match.seeker_id)
        .single();

      const ownerHas = (ownerCredits?.match_credits ?? 0) >= 1;
      const seekerHas = (seekerCredits?.match_credits ?? 0) >= 1;

      if (!ownerHas || !seekerHas) {
        // Revert status back since credits are insufficient
        await supabase
          .from("spot_matches")
          .update({ status: "pending" })
          .eq("id", id);

        return NextResponse.json({
          error: "Insufficient match credits. Each party needs at least 1 credit to confirm. Purchase more from your profile.",
          needs_credits: true,
          owner_short: !ownerHas,
          seeker_short: !seekerHas,
        }, { status: 402 });
      }

      // Deduct 1 credit from each party
      await supabase.rpc("deduct_match_credit", { p_user_id: match.spot_owner_id });
      await supabase.rpc("deduct_match_credit", { p_user_id: match.seeker_id });

      await supabase
        .from("parking_spots")
        .update({ status: "taken", claimed_by: match.seeker_id })
        .eq("id", match.spot_id);

      // Award handoff XP, badges, and quest progress for both parties
      try {
        await Promise.all([
          supabase.rpc("award_handoff_xp", {
            p_user_id: match.spot_owner_id,
            p_match_id: id,
            p_is_owner: true,
          }),
          supabase.rpc("award_handoff_xp", {
            p_user_id: match.seeker_id,
            p_match_id: id,
            p_is_owner: false,
          }),
        ]);
        await Promise.all([
          supabase.rpc("check_and_award_badges", { p_user_id: match.spot_owner_id }),
          supabase.rpc("check_and_award_badges", { p_user_id: match.seeker_id }),
          supabase.rpc("progress_quest", { p_user_id: match.spot_owner_id, p_action_type: "complete_handoff" }),
          supabase.rpc("progress_quest", { p_user_id: match.seeker_id, p_action_type: "claim_spot" }),
        ]);
      } catch {
        // Game XP is non-critical; don't fail the confirmation
      }
    } else {
      // Notify the other party that someone confirmed
      const notifyUserId = isOwner ? match.seeker_id : match.spot_owner_id;
      await supabase.from("notifications").insert({
        user_id: notifyUserId,
        title: "Someone confirmed the match",
        message: isOwner
          ? "The spot owner confirmed. Confirm to complete the match!"
          : "The seeker confirmed. Confirm to complete the match!",
        type: "match",
      });
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
