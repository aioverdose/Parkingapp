import { createAdminClient } from "@/lib/supabaseAdmin";
import { distanceMeters } from "@/lib/matching/area-distance";
import { DEFAULT_MATCH_RADIUS_METERS, MATCH_EXPIRY_MINUTES, MINIMUM_TIME_OVERLAP_MINUTES } from "@/lib/matching/match-config";
import { windowsAreCompatible, windowOverlapMinutes } from "@/lib/matching/time-window";
import { vehiclesCompatible } from "@/lib/matching/vehicle-compatibility";
import { syncRecurringScheduleWindows } from "@/lib/matching/matching-observability";
import type { MatchingWindow, PotentialMatch } from "@/lib/matching/match-types";

const MAX_CANDIDATES = 250;

async function isNeutralMatchingEnabled(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const [{ data: flag, error: flagError }, { data: user, error: userError }] = await Promise.all([
    admin.from("feature_flags").select("enabled, rollout").eq("name", "neutral_matching_v1").maybeSingle(),
    admin.from("users").select("role").eq("id", userId).maybeSingle(),
  ]);
  if (flagError || userError) throw new Error("NEUTRAL_CONFIG_READ_FAILED");
  if (flag?.enabled !== true) return false;
  const rollout = (flag.rollout ?? {}) as { mode?: string; user_ids?: string[]; roles?: string[] };
  if (rollout.mode !== "allowlist") return true;
  return Boolean(rollout.user_ids?.includes(userId) || (user?.role && rollout.roles?.includes(user.role)));
}

async function materializeWindows(userId: string): Promise<MatchingWindow[]> {
  await syncRecurringScheduleWindows(userId, "/api/potential-matches/scan");
  const { data, error } = await createAdminClient()
    .from("matching_schedule_windows")
    .select("*")
    .eq("user_id", userId)
    .eq("source_type", "recurring_schedule")
    .eq("active", true)
    .eq("matching_enabled", true);
  if (error) throw new Error("SYNC_WINDOW_READ_FAILED");
  return (data ?? []) as MatchingWindow[];
}

export type ReconcileResult = {
  matches: PotentialMatch[];
  candidateCount: number;
  dedupeSuppressionCount: number;
};

export async function reconcilePotentialMatches(userId: string): Promise<ReconcileResult> {
  if (!(await isNeutralMatchingEnabled(userId))) return { matches: [], candidateCount: 0, dedupeSuppressionCount: 0 };
  const ownWindows = await materializeWindows(userId);
  if (!ownWindows.length) return { matches: [], candidateCount: 0, dedupeSuppressionCount: 0 };
  const admin = createAdminClient();
  const { data: candidates, error: candidateError } = await admin.from("matching_schedule_windows").select("*").eq("active", true).eq("matching_enabled", true).neq("user_id", userId).limit(MAX_CANDIDATES);
  if (candidateError) throw new Error("CANDIDATE_WINDOW_READ_FAILED");
  const candidateWindows = (candidates ?? []) as MatchingWindow[];
  const result: PotentialMatch[] = [];
  const seenKeys = new Set<string>();
  let dedupeSuppressionCount = 0;
  for (const own of ownWindows) {
    for (const other of candidateWindows) {
      const arriving = own.role === "arriving" ? own : other;
      const departing = own.role === "departing" ? own : other;
      if (arriving.role !== "arriving" || departing.role !== "departing" || arriving.day_of_week !== departing.day_of_week) continue;
      if (!windowsAreCompatible({ window_start: arriving.window_start, window_end: arriving.window_end }, { window_start: departing.window_start, window_end: departing.window_end }, MINIMUM_TIME_OVERLAP_MINUTES)) continue;
      if (!vehiclesCompatible(arriving.vehicle_type, departing.vehicle_type)) continue;
      const distance = Math.round(distanceMeters(arriving.area_latitude, arriving.area_longitude, departing.area_latitude, departing.area_longitude));
      if (distance > DEFAULT_MATCH_RADIUS_METERS) continue;
      const pair = [arriving.user_id, departing.user_id].sort();
      const { data: blocked, error: blockError } = await admin.from("user_blocks").select("id").or(`and(blocker_id.eq.${pair[0]},blocked_id.eq.${pair[1]}),and(blocker_id.eq.${pair[1]},blocked_id.eq.${pair[0]})`).maybeSingle();
      if (blockError) throw new Error("BLOCK_READ_FAILED");
      if (blocked) continue;
      const dedupeKey = `${pair[0]}:${pair[1]}:${arriving.day_of_week}`;
      if (seenKeys.has(dedupeKey)) {
        dedupeSuppressionCount++;
        continue;
      }
      seenKeys.add(dedupeKey);
      const overlap = windowOverlapMinutes(arriving.window_start, arriving.window_end, departing.window_start, departing.window_end);
      const expiresAt = new Date(Date.now() + MATCH_EXPIRY_MINUTES * 60_000).toISOString();
      const confidence = Math.max(0, Math.min(100, Math.round(100 - (distance / DEFAULT_MATCH_RADIUS_METERS) * 50 + Math.min(overlap, 60) / 2)));
      const { data: match, error } = await admin.from("potential_matches").insert({ dedupe_key: dedupeKey, arriving_user_id: arriving.user_id, departing_user_id: departing.user_id, arriving_window_id: arriving.id, departing_window_id: departing.id, distance_meters: distance, match_radius_snapshot_meters: Math.round(DEFAULT_MATCH_RADIUS_METERS), time_overlap_minutes: overlap, minimum_overlap_snapshot_minutes: MINIMUM_TIME_OVERLAP_MINUTES, arriving_vehicle_type: arriving.vehicle_type, departing_vehicle_type: departing.vehicle_type, vehicle_compatible: true, privacy_eligible: true, eligibility_snapshot: { source: "neutral_reconciliation" }, match_confidence: confidence, expires_at: expiresAt }).select("*").single();
       if (error || !match) {
         if (error?.code === "23505") dedupeSuppressionCount++;
         continue;
       }
      await admin.from("notifications").insert([
        { user_id: arriving.user_id, potential_match_id: match.id, title: "Potential match", message: "A compatible arrival and departure window overlap nearby.", type: "potential_match" },
        { user_id: departing.user_id, potential_match_id: match.id, title: "Potential match", message: "A compatible arrival and departure window overlap nearby.", type: "potential_match" },
      ]);
      result.push(match as PotentialMatch);
    }
  }
  return { matches: result, candidateCount: candidateWindows.length, dedupeSuppressionCount };
}
