import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { getBusinessOperationalState } from "@/lib/api/business-helpers";
import { sendPushToUser } from "@/lib/push";
import { reassignOffer } from "@/lib/matching/exclusive-matcher";
import { logger } from "@/lib/logger";

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
      .select("*, spot:spot_id(*), spot_owner:spot_owner_id(id, name, email, vehicle_type), seeker:seeker_id(id, name, email, vehicle_type)")
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

    if (match.business_id) {
      const business = await getBusinessOperationalState(match.business_id);
      if (!business || !["active", "trialing"].includes(business.status)) {
        return NextResponse.json({ error: "This business is not operational" }, { status: 409 });
      }
    }

    // Check user is part of this match
    const isOwner = match.spot_owner_id === user.id;
    const isSeeker = match.seeker_id === user.id;
    if (!isOwner && !isSeeker) {
      return NextResponse.json({ error: "Not authorized for this match" }, { status: 403 });
    }

    // Exclusive offer: only the offered seeker can accept or decline it.
    if (match.status === "offered") {
      if (isOwner) {
        return NextResponse.json(
          { error: "Waiting for the offered driver to respond" },
          { status: 400 },
        );
      }

      if (action === "reject") {
        // Seeker declines -> automatically reassign to the next-best seeker,
        // or fall back to a public claimable alert after attempts run out.
        const { reassigned, fallback } = await reassignOffer(match.spot_id, id, "declined");
        logger.info("match: offer declined by seeker", {
          route: "/api/matches/[id]",
          userId: user.id,
          match_id: id,
          reassigned,
          fallback,
        });
        return NextResponse.json({
          success: true,
          status: "offer_declined",
          reassigned,
          fallback,
        });
      }

      if (action === "confirm") {
        const { error: updateError } = await supabase
          .from("spot_matches")
          .update({ status: "confirmed_by_seeker" })
          .eq("id", id);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        await supabase.from("notifications").insert({
          user_id: match.spot_owner_id,
          title: "A driver accepted your exclusive offer!",
          message: "Confirm the match to proceed with the handoff.",
          type: "match",
        });

        sendPushToUser(match.spot_owner_id, {
          type: "offer_accepted",
          title: "Driver accepted your spot!",
          body: "Confirm the match to proceed.",
          match_id: id,
        });

        logger.info("match: exclusive offer accepted", {
          route: "/api/matches/[id]",
          userId: user.id,
          match_id: id,
          spot_id: match.spot_id,
        });

        return NextResponse.json({ success: true, status: "confirmed_by_seeker" });
      }
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

    // Accept atomically so simultaneous confirmations cannot overwrite the
    // other participant's acceptance.
    const { data: acceptedMatch, error: updateError } = await supabase.rpc("accept_match_atomically", {
      p_match_id: id,
      p_user_id: user.id,
    });

    if (updateError || !acceptedMatch) {
      return NextResponse.json({ error: updateError?.message || "Cannot confirm in current state" }, { status: 400 });
    }

    const newStatus = acceptedMatch.status as "pending" | "confirmed_by_owner" | "confirmed_by_seeker" | "confirmed" | "rejected" | "expired";

    // If confirmed, finalize without paywall or prior-handoff requirements.
    if (newStatus === "confirmed") {
      await supabase
        .from("parking_spots")
        .update({ status: "taken", claimed_by: match.seeker_id })
        .eq("id", match.spot_id);

      const { data: existingChat } = await supabase
        .from("ephemeral_chats")
        .select("id")
        .eq("spot_id", match.spot_id)
        .eq("sender_id", match.spot_owner_id)
        .eq("receiver_id", match.seeker_id)
        .eq("status", "active")
        .maybeSingle();
      if (!existingChat) {
        await supabase.from("ephemeral_chats").insert({
          spot_id: match.spot_id,
          sender_id: match.spot_owner_id,
          receiver_id: match.seeker_id,
          status: "active",
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      await Promise.all([
        sendPushToUser(match.spot_owner_id, {
          type: "match_confirmed",
          title: "Match confirmed",
          body: "Both members accepted. Open Messages to coordinate safely before the exchange.",
          match_id: id,
        }),
        sendPushToUser(match.seeker_id, {
          type: "match_confirmed",
          title: "Match confirmed",
          body: "Both members accepted. Open Messages to coordinate safely before the exchange.",
          match_id: id,
        }),
      ]);

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
      sendPushToUser(notifyUserId, {
        type: "match_acceptance_needed",
        title: "Match acceptance needed",
        body: "The other member accepted. Review and accept to start coordination.",
        match_id: id,
      });
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    logger.error("match: action failed", {
      route: "/api/matches/[id]",
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
