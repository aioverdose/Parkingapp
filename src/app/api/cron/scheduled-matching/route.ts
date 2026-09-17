import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/logger";

/**
 * POST /api/cron/scheduled-matching
 *
 * Cron job to trigger scheduled matching ("Air Traffic Control").
 * Runs periodically to find matches based on users' recurring schedules.
 *
 * Security: Requires x-cron-secret header matching CRON_SECRET or AGENT_SECRET_KEY
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron authentication
    const expected = process.env.CRON_SECRET || process.env.AGENT_SECRET_KEY;
    const provided = request.headers.get("x-cron-secret");

    if (!expected || provided !== expected) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Get the app URL for internal API call
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    // Call the scheduled matching endpoint
    const response = await fetch(`${appUrl}/api/matches/schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": expected,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      logger.error("cron: scheduled matching failed", {
        route: "/api/cron/scheduled-matching",
        status: response.status,
        error: result.error || "Unknown error",
      });
      return NextResponse.json(
        { error: result.error || "Scheduled matching failed" },
        { status: response.status }
      );
    }

    logger.info("cron: scheduled matching complete", {
      route: "/api/cron/scheduled-matching",
      matches_created: result.matches_created,
      total_candidates: result.total_candidates,
      matches: result.matches?.length ?? 0,
    });

    return NextResponse.json({
      ok: true,
      matches_created: result.matches_created,
      total_candidates: result.total_candidates,
      matches: result.matches,
    });
  } catch (err) {
    logger.error("cron: scheduled matching failed", {
      route: "/api/cron/scheduled-matching",
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}