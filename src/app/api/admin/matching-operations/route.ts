import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { requireStagingPlatformAdmin } from "@/lib/api/platform-admin";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getClientIp } from "@/lib/api/request-security";
import { NEUTRAL_RADIUS_METERS } from "@/lib/matching/matching-observability";

const MAX_HOURS = 168;

export async function GET(request: NextRequest) {
  const auth = await requireStagingPlatformAdmin(request);
  if ("response" in auth) return auth.response;

  const limit = await checkRateLimit(`matching-operations:${auth.user.id}:${getClientIp(request)}`, 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

  const params = new URL(request.url).searchParams;
  const requestedHours = Number(params.get("hours") || "24");
  const requestedLimit = Number(params.get("limit") || "50");
  const hours = Number.isInteger(requestedHours) ? Math.min(Math.max(requestedHours, 1), MAX_HOURS) : 24;
  const eventLimit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 50;
  const before = params.get("before");
  const beforeDate = before ? new Date(before) : null;
  if (before && (!beforeDate || Number.isNaN(beforeDate.getTime()))) {
    return NextResponse.json({ error: "INVALID_CURSOR" }, { status: 400 });
  }

  const admin = createAdminClient();
  const [{ data: health, error: healthError }, { data: events, error: eventsError }] = await Promise.all([
    admin.rpc("get_matching_operations_health", { p_window_hours: hours }),
    admin.rpc("list_matching_operations_events", { p_limit: eventLimit, p_before: beforeDate?.toISOString() ?? null }),
  ]);
  if (healthError || eventsError || !health) {
    return NextResponse.json({ error: "MATCHING_OPERATIONS_UNAVAILABLE" }, { status: 503 });
  }

  const typedHealth = health as Record<string, unknown>;
  const legacyEnabled = typedHealth.legacy_matching_enabled === true;
  return NextResponse.json({
    environment: {
      label: "STAGING ONLY — synthetic data",
      project_suffix: auth.runtime.projectSuffix,
      preview_url: auth.runtime.previewUrl,
      deployment_id: auth.runtime.deploymentId,
      commit_id: auth.runtime.commitId,
    },
    flags: {
      neutral_matching_enabled: typedHealth.neutral_matching_enabled === true,
      legacy_matching_enabled: legacyEnabled,
    },
    neutral_radius_meters: NEUTRAL_RADIUS_METERS,
    legacy_guard_state: legacyEnabled ? "risk" : "blocked",
    health,
    events: events ?? [],
    bounds: { max_event_limit: 50, max_window_hours: MAX_HOURS },
  });
}
