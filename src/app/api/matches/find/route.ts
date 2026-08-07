import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { findBestSeeker, createExclusiveOffer, expireStaleOffers, type ExclusiveSpot } from "@/lib/matching/exclusive-matcher";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spot_id } = body;

    if (!spot_id) {
      return NextResponse.json({ error: "spot_id is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Opportunistically expire/reassign any stale offers before matching.
    // A dedicated cron also runs this, but this keeps the system self-healing.
    await expireStaleOffers();

    const { data: spot, error: spotError } = await supabase
      .from("parking_spots")
      .select("*")
      .eq("id", spot_id)
      .single();

    if (spotError || !spot) {
      return NextResponse.json({ error: "Spot not found" }, { status: 404 });
    }

    if (spot.status !== "active") {
      return NextResponse.json({ error: "Spot is not active" }, { status: 400 });
    }

    const exclusiveSpot = spot as unknown as ExclusiveSpot;

    // Exclusive matching: exactly one best-compatible seeker is offered the
    // spot. Nobody else is made aware of it.
    const best = await findBestSeeker(exclusiveSpot);

    if (!best) {
      logger.info("find_match: no compatible seekers", { route: "/api/matches/find", spot_id });
      return NextResponse.json({ matches: 0, reason: "No compatible seekers" });
    }

    const offer = await createExclusiveOffer(exclusiveSpot, best.user_id);

    if (!offer) {
      logger.info("find_match: spot already has active offer", { route: "/api/matches/find", spot_id });
      return NextResponse.json({ matches: 0, reason: "Spot already has an active offer" });
    }

    logger.info("find_match: exclusive offer created", {
      route: "/api/matches/find",
      spot_id,
      match_id: offer.offerId,
      seeker_id: best.user_id,
    });

    return NextResponse.json({
      matches: 1,
      total_candidates: 1,
      match_id: offer.offerId,
      seeker_id: best.user_id,
      distance: best.distance,
    });
  } catch (err) {
    logger.error("find_match: failed", {
      route: "/api/matches/find",
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
