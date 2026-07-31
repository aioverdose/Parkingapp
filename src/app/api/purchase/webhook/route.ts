import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const buf = await request.text();
    const sig = request.headers.get("stripe-signature");

    if (!sig) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const quantity = parseInt(session.metadata?.quantity || "1", 10);

      if (!userId) {
        return NextResponse.json({ error: "Missing userId in session metadata" }, { status: 400 });
      }

      const supabase = createAdminClient();

      // Update purchase record
      await supabase
        .from("credit_purchases")
        .update({
          status: "completed",
          stripe_payment_intent_id: session.payment_intent as string,
          completed_at: new Date().toISOString(),
        })
        .eq("stripe_session_id", session.id);

      // Credit the user's match_credits
      const { data: user } = await supabase
        .from("users")
        .select("match_credits")
        .eq("id", userId)
        .single();

      const currentCredits = user?.match_credits ?? 0;
      await supabase
        .from("users")
        .update({ match_credits: currentCredits + quantity })
        .eq("id", userId);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
