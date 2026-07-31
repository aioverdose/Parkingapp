import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { createCreditCheckoutSession, getCreditPriceCents } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = user.email || "";
    if (!userEmail) {
      return NextResponse.json({ error: "Email required for payment" }, { status: 400 });
    }

    const body = await request.json();
    const quantity = Math.max(1, Math.min(100, body.quantity || 1));

    const origin = request.headers.get("origin") || "http://localhost:3000";

    const result = await createCreditCheckoutSession({
      userId: user.id,
      userEmail,
      quantity,
      origin,
    });

    // Create pending purchase record
    const supabase = createAdminClient();
    await supabase.from("credit_purchases").insert({
      user_id: user.id,
      quantity,
      unit_price: getCreditPriceCents(),
      total_cents: getCreditPriceCents() * quantity,
      stripe_session_id: result.sessionId,
      status: "pending",
    });

    return NextResponse.json({ url: result.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
