import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabaseAdmin";

export const STAGING_PROJECT_REF = "tkrwvxjzrwvfkoqaoxon";
export const NEUTRAL_RADIUS_METERS = 91.44;

export type MatchingOperationsEventName =
  | "schedule_window_sync_started"
  | "schedule_window_sync_completed"
  | "schedule_window_sync_failed"
  | "neutral_scan_completed"
  | "neutral_scan_failed"
  | "legacy_matching_disabled";

type EventInput = {
  eventName: MatchingOperationsEventName;
  correlationId: string;
  routeOrigin: string;
  actorScope: "synthetic" | "system" | "admin";
  outcome: "started" | "success" | "failure" | "blocked";
  durationMs?: number;
  eligibleScheduleCount?: number;
  generatedWindowCount?: number;
  deletedWindowCount?: number;
  scanCount?: number;
  candidateCount?: number;
  potentialMatchCount?: number;
  dedupeSuppressionCount?: number;
  failureCode?: string;
};

export type SyncWindowResult = {
  eligible_schedule_count: number;
  generated_window_count: number;
  deleted_window_count: number;
};

function shortSafeValue(value: string | undefined, maxLength: number): string | null {
  if (!value) return null;
  const valueWithoutSecrets = value.trim().replace(/[^A-Za-z0-9._-]/g, "");
  return valueWithoutSecrets.length > 0 ? valueWithoutSecrets.slice(0, maxLength) : null;
}

export function getStagingRuntimeMetadata() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  let projectRef = "";
  try {
    projectRef = new URL(url).hostname.split(".")[0] || "";
  } catch {
    projectRef = "";
  }
  const approved = projectRef === STAGING_PROJECT_REF;
  const previewHostValue = process.env.VERCEL_URL?.trim() || "";
  const previewHost = process.env.VERCEL_ENV === "production" || !/^(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}$/.test(previewHostValue)
    ? null
    : shortSafeValue(previewHostValue, 200);
  return {
    approved,
    environment: approved ? "staging" : "unknown",
    projectSuffix: approved ? STAGING_PROJECT_REF.slice(-4) : null,
    previewUrl: previewHost ? `https://${previewHost}` : null,
    deploymentId: shortSafeValue(process.env.VERCEL_DEPLOYMENT_ID, 32),
    commitId: shortSafeValue(process.env.VERCEL_GIT_COMMIT_SHA, 16),
  };
}

export function newMatchingCorrelationId(): string {
  return randomUUID();
}

export async function recordMatchingOperationsEvent(input: EventInput): Promise<void> {
  const runtime = getStagingRuntimeMetadata();
  if (!runtime.approved) return;
  try {
    await createAdminClient().rpc("record_matching_operations_event", {
      p_event_name: input.eventName,
      p_correlation_id: input.correlationId,
      p_deployment_id: runtime.deploymentId,
      p_commit_id: runtime.commitId,
      p_route_origin: input.routeOrigin.slice(0, 120),
      p_actor_scope: input.actorScope,
      p_actor_label: null,
      p_outcome: input.outcome,
      p_duration_ms: input.durationMs ?? null,
      p_eligible_schedule_count: input.eligibleScheduleCount ?? null,
      p_generated_window_count: input.generatedWindowCount ?? null,
      p_deleted_window_count: input.deletedWindowCount ?? null,
      p_scan_count: input.scanCount ?? null,
      p_candidate_count: input.candidateCount ?? null,
      p_potential_match_count: input.potentialMatchCount ?? null,
      p_dedupe_suppression_count: input.dedupeSuppressionCount ?? null,
      p_failure_code: input.failureCode ?? null,
    });
  } catch {
    // Observability is best effort and must not affect matching correctness.
  }
}

function safeFailureCode(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("SYNC_UNAUTHORIZED")) return "SYNC_UNAUTHORIZED";
  if (message.includes("SYNC_USER_REQUIRED")) return "SYNC_USER_REQUIRED";
  if (message.includes("PGRST")) return "SYNC_RPC_UNAVAILABLE";
  return "SYNC_FAILED";
}

export async function syncRecurringScheduleWindows(
  userId: string,
  routeOrigin: string,
  actorScope: "synthetic" | "system" | "admin" = "system",
): Promise<{ result: SyncWindowResult; correlationId: string }> {
  const correlationId = newMatchingCorrelationId();
  const startedAt = Date.now();
  void recordMatchingOperationsEvent({
    eventName: "schedule_window_sync_started",
    correlationId,
    routeOrigin,
    actorScope,
    outcome: "started",
  });
  const { data, error } = await createAdminClient().rpc("sync_recurring_schedule_windows", { p_user_id: userId }).single();
  const durationMs = Date.now() - startedAt;
  if (error || !data) {
    void recordMatchingOperationsEvent({
      eventName: "schedule_window_sync_failed",
      correlationId,
      routeOrigin,
      actorScope,
      outcome: "failure",
      durationMs,
      failureCode: safeFailureCode(error),
    });
    const failure = new Error("Recurring schedule window synchronization failed");
    failure.name = safeFailureCode(error);
    throw failure;
  }
  const result = data as SyncWindowResult;
  void recordMatchingOperationsEvent({
    eventName: "schedule_window_sync_completed",
    correlationId,
    routeOrigin,
    actorScope,
    outcome: "success",
    durationMs,
    eligibleScheduleCount: result.eligible_schedule_count,
    generatedWindowCount: result.generated_window_count,
    deletedWindowCount: result.deleted_window_count,
  });
  return { result, correlationId };
}
