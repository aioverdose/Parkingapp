import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/logger";
import { parsePurchaseMetadata } from "@/lib/purchase";

interface CheckoutSessionShape {
  id?: string;
  livemode?: boolean;
  payment_intent?: string | null;
  metadata?: Record<string, string> | null;
}

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

    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as unknown as CheckoutSessionShape;

    // Reject events from the wrong environment (test vs live) so a leaked
    // test-mode secret can never grant production credits.
    const expectedLiveMode = process.env.NODE_ENV === "production";
    if (session.livemode !== expectedLiveMode) {
      logger.warn("stripe webhook: livemode mismatch rejected", {
        route: "/api/purchase/webhook",
        event_id: event.id,
        livemode: session.livemode,
      });
      return NextResponse.json({ error: "Livemode mismatch" }, { status: 400 });
    }

    const parsed = parsePurchaseMetadata(session.metadata);
    if (!parsed) {
      logger.error("stripe webhook: invalid session metadata", {
        route: "/api/purchase/webhook",
        event_id: event.id,
        session_id: session.id,
        metadata: session.metadata,
      });
      return NextResponse.json({ error: "Invalid session metadata" }, { status: 400 });
    }
    const { userId, quantity } = parsed;

    const supabase = createAdminClient();

    // Replay guard: if this exact event was already fully processed, skip.
    const { data: existingEvent } = await supabase
      .from("webhook_events")
      .select("event_id")
      .eq("event_id", event.id)
      .maybeSingle();

    if (existingEvent) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Atomic, idempotent credit grant: only completes a 'pending' purchase and
    // returns 0 if this session was already completed.
    const { data: granted, error: grantError } = await supabase.rpc("complete_credit_purchase", {
      p_user_id: userId,
      p_quantity: quantity,
      p_session_id: session.id,
      p_payment_intent: session.payment_intent ?? null,
    });

    if (grantError) {
      logger.error("stripe webhook: credit grant failed", {
        route: "/api/purchase/webhook",
        event_id: event.id,
        session_id: session.id,
        userId,
        quantity,
        error: grantError.message,
      });
      return NextResponse.json({ error: "Failed to grant credits" }, { status: 500 });
    }

    // Record the event only AFTER a successful grant, so a failure below lets
    // Stripe retry and still grants exactly once (the RPC is idempotent).
    try {
      await supabase.from("webhook_events").insert({
        event_id: event.id,
        event_type: event.type,
      });
    } catch {
      // Best-effort; the idempotent grant RPC already prevents double credits.
    }

    logger.info("stripe webhook: credits granted", {
      route: "/api/purchase/webhook",
      event_id: event.id,
      session_id: session.id,
      userId,
      quantity: granted ?? 0,
    });

    return NextResponse.json({ received: true, credits_granted: granted ?? 0 });
  } catch (err) {
    logger.error("stripe webhook: failed", {
      route: "/api/purchase/webhook",
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
