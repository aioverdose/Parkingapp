import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";

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

    // If confirmed, notify and update spot
    if (newStatus === "confirmed") {
      await supabase
        .from("parking_spots")
        .update({ status: "taken", claimed_by: match.seeker_id })
        .eq("id", match.spot_id);
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
