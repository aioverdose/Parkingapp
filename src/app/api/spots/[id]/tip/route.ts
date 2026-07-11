import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";

const VALID_AMOUNTS = [1, 2, 5];

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
    const rateCheck = checkRateLimit(`tip:${ip}`, 10, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "X-RateLimit-Reset": String(rateCheck.resetAt) } }
      );
    }

    const { id } = await params;

    const body = await request.json();
    const amount = body.amount;

    if (typeof amount !== "number" || !VALID_AMOUNTS.includes(amount)) {
      return NextResponse.json(
        { error: `Invalid tip amount. Allowed: ${VALID_AMOUNTS.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: spot } = await supabase
      .from("parking_spots")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!spot) {
      return NextResponse.json({ error: "Spot not found" }, { status: 404 });
    }

    if (spot.user_id === user.id) {
      return NextResponse.json({ error: "You cannot tip yourself" }, { status: 400 });
    }

    const { error: tipError } = await supabase.from("tips").insert({
      spot_id: id,
      sender_id: user.id,
      amount,
      message: "Thanks for the spot!",
    });

    if (tipError) {
      return NextResponse.json({ error: tipError.message }, { status: 500 });
    }

    await supabase.from("notifications").insert({
      user_id: spot.user_id,
      title: "You got a tip!",
      message: `Someone sent you a $${amount} tip for your parking spot.`,
      type: "tip",
      read: false,
    });

    return NextResponse.json({ success: true, amount });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
