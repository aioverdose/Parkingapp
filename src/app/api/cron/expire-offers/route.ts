import { NextRequest, NextResponse } from "next/server";
import { expireStaleOffers, sweepExclusiveSpots } from "@/lib/matching/exclusive-matcher";

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

    return NextResponse.json({
      ok: true,
      expired_offers: expired.expired,
      reassigned: expired.reassigned,
      stale_fallback: expired.fallback,
      swept_spots: swept.swept,
      swept_offered: swept.offered,
      swept_fallback: swept.fallback,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
