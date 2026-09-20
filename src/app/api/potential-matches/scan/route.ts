import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { reconcilePotentialMatches } from "@/lib/matching/potential-matcher";
import { isSyntheticAccount } from "@/lib/testing/synthetic-account";
import { newMatchingCorrelationId, recordMatchingOperationsEvent } from "@/lib/matching/matching-observability";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const correlationId = newMatchingCorrelationId();
  const startedAt = Date.now();
  const actorScope = isSyntheticAccount(user.email) ? "synthetic" : "system";
  try {
    const result = await reconcilePotentialMatches(user.id);
    void recordMatchingOperationsEvent({
      eventName: "neutral_scan_completed",
      correlationId,
      routeOrigin: "/api/potential-matches/scan",
      actorScope,
      outcome: "success",
      durationMs: Date.now() - startedAt,
      scanCount: 1,
      candidateCount: result.candidateCount,
      potentialMatchCount: result.matches.length,
      dedupeSuppressionCount: result.dedupeSuppressionCount,
    });
    return NextResponse.json({ matches: result.matches });
  } catch {
    void recordMatchingOperationsEvent({
      eventName: "neutral_scan_failed",
      correlationId,
      routeOrigin: "/api/potential-matches/scan",
      actorScope,
      outcome: "failure",
      durationMs: Date.now() - startedAt,
      failureCode: "NEUTRAL_SCAN_FAILED",
    });
    return NextResponse.json({ error: "NEUTRAL_SCAN_SYNC_FAILED", correlation_suffix: correlationId.slice(-8) }, { status: 503 });
  }
}
