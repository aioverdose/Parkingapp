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

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateCheck = checkRateLimit(`cancel-spot:${user.id}`, 10, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
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

    if (existingSpot.user_id !== user.id) {
      return NextResponse.json({ error: "You can only cancel your own spots" }, { status: 403 });
    }

    if (existingSpot.status !== "active") {
      return NextResponse.json({ error: "Spot is no longer active" }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("parking_spots")
      .update({ status: "expired" })
      .eq("id", id)
      .eq("status", "active");

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
