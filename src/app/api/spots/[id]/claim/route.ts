import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rateCheck = checkRateLimit(`claim-spot:${ip}`, 20, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "X-RateLimit-Reset": String(rateCheck.resetAt) } }
      );
    }

    const { id } = await params;

    const supabase = createAdminClient();

    const { data: existingSpot } = await supabase
      .from("parking_spots")
      .select("user_id, status")
      .eq("id", id)
      .single();

    if (!existingSpot) {
      return NextResponse.json({ error: "Spot not found" }, { status: 404 });
    }

    if (existingSpot.user_id === user.id) {
      return NextResponse.json({ error: "You cannot claim your own spot" }, { status: 400 });
    }

    // Atomic claim: only succeeds if spot is still active
    const { data: updatedSpot, error: updateError } = await supabase
      .from("parking_spots")
      .update({ status: "taken", claimed_by: user.id })
      .eq("id", id)
      .eq("status", "active")
      .select()
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedSpot) {
      return NextResponse.json(
        { error: "This spot has already been taken by someone else" },
        { status: 409 }
      );
    }

    await supabase.from("notifications").insert({
      user_id: existingSpot.user_id,
      title: "Spot Claimed!",
      message: `Your parking spot has been claimed by another user.`,
      type: "claim",
      read: false,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
