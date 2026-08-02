import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { sendPushToUser } from "@/lib/push";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateCheck = checkRateLimit(`match-status:${user.id}`, 30, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const validStatuses = ["en_route", "arrived", "departed", "no_show", "completed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 },
      );
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

    const isOwner = match.spot_owner_id === user.id;
    const isSeeker = match.seeker_id === user.id;
    if (!isOwner && !isSeeker) {
      return NextResponse.json({ error: "Not authorized for this match" }, { status: 403 });
    }

    const role = isOwner ? "owner" : "seeker";

    const now = new Date().toISOString();
    const updateFields: Record<string, string | null> = {
      status,
      updated_at: now,
    };

    if (status === "arrived") updateFields.arrived_at = now;
    if (status === "departed") updateFields.departed_at = now;

    const { error: upsertError } = await supabase.from("active_sessions").upsert(
      {
        user_id: user.id,
        match_id: id,
        role,
        ...updateFields,
      },
      { onConflict: "user_id,match_id", ignoreDuplicates: false },
    );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    if (status === "departed" && isOwner) {
      await supabase
        .from("parking_spots")
        .update({ status: "taken" })
        .eq("id", match.spot_id);

      await supabase.from("notifications").insert({
        user_id: match.seeker_id,
        title: "Spot is ready!",
        message: "The owner has departed. The spot is waiting for you!",
        type: "match",
      });

      sendPushToUser(match.seeker_id, {
        type: "spot_ready",
        title: "Spot is ready!",
        body: "The owner has pulled out. Park in the spot now.",
        match_id: id,
      });
    }

    if (status === "arrived" && isSeeker) {
      await supabase
        .from("parking_spots")
        .update({ status: "expired" })
        .eq("id", match.spot_id);

      await supabase.from("notifications").insert({
        user_id: match.spot_owner_id,
        title: "Driver arrived",
        message: "The matched driver has arrived at your spot.",
        type: "match",
      });

      sendPushToUser(match.spot_owner_id, {
        type: "partner_arrived",
        title: "They have arrived!",
        body: "The driver has arrived at your parking spot. You can now leave.",
        match_id: id,
      });
    }

    // Auto-complete the handoff once BOTH parties have acted:
    // the owner has pulled out AND the arriving driver has parked.
    const { data: sessions } = await supabase
      .from("active_sessions")
      .select("role, status")
      .eq("match_id", id);

    const ownerDeparted = !!sessions?.some((s) => s.role === "owner" && s.status === "departed");
    const seekerArrived = !!sessions?.some((s) => s.role === "seeker" && s.status === "arrived");

    if (ownerDeparted && seekerArrived && match.status !== "completed") {
      await supabase
        .from("spot_matches")
        .update({ status: "completed" })
        .eq("id", id);

      await supabase.from("notifications").insert({
        user_id: match.spot_owner_id,
        title: "Handoff complete!",
        message: "The driver parked in your spot. Seamless exchange complete.",
        type: "match",
      });
      await supabase.from("notifications").insert({
        user_id: match.seeker_id,
        title: "Handoff complete!",
        message: "You parked in the spot. Thanks for a smooth handoff.",
        type: "match",
      });

      // Handoff fully complete — award XP, badges, and quest progress for both parties
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
        // Game XP is non-critical; don't fail the status update
      }
    }

    if (status === "no_show") {
      const notifyUserId = isOwner ? match.seeker_id : match.spot_owner_id;
      await supabase.from("notifications").insert({
        user_id: notifyUserId,
        title: "No-show reported",
        message: `${isOwner ? "The driver" : "The spot owner"} was marked as a no-show. The match has been released.`,
        type: "match",
      });

      await supabase
        .from("spot_matches")
        .update({ status: "expired" })
        .eq("id", id);

      if (isOwner) {
        await supabase
          .from("parking_spots")
          .update({ status: "active", claimed_by: null })
          .eq("id", match.spot_id);
      }
    }

    if (status === "completed") {
      // Handoff fully complete — award XP, badges, and quest progress for both parties
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
        // Game XP is non-critical; don't fail the status update
      }
    }

    return NextResponse.json({ success: true, status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
