import { NextRequest, NextResponse } from "next/server";
import { expireStaleOffers, sweepExclusiveSpots } from "@/lib/matching/exclusive-matcher";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/logger";

// Guarded by x-cron-secret. The proxy also requires a Bearer header on /api/*,
// so cron callers must send both:
//   Authorization: Bearer <any>
//   x-cron-secret: <CRON_SECRET or AGENT_SECRET_KEY>
export async function POST(request: NextRequest) {
  try {
    const expected = process.env.CRON_SECRET || process.env.AGENT_SECRET_KEY;
    const provided = request.headers.get("x-cron-secret");

    if (!expected || provided !== expected) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [expired, swept] = await Promise.all([expireStaleOffers(), sweepExclusiveSpots()]);
    const { data: retention, error: retentionError } = await createAdminClient().rpc("cleanup_pilot_retention", {});

    if (retentionError) {
      throw new Error(`Retention cleanup failed: ${retentionError.message}`);
    }

    logger.info("cron: offer sweep complete", {
      route: "/api/cron/expire-offers",
      expired_offers: expired.expired,
      reassigned: expired.reassigned,
      stale_fallback: expired.fallback,
      swept_spots: swept.swept,
      swept_offered: swept.offered,
      swept_fallback: swept.fallback,
      retention,
    });

    return NextResponse.json({
      ok: true,
      expired_offers: expired.expired,
      reassigned: expired.reassigned,
      stale_fallback: expired.fallback,
      swept_spots: swept.swept,
      swept_offered: swept.offered,
      swept_fallback: swept.fallback,
      retention,
    });
  } catch (err) {
    logger.error("cron: offer sweep failed", {
      route: "/api/cron/expire-offers",
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
