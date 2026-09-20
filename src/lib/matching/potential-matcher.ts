import { createAdminClient } from "@/lib/supabaseAdmin";
import { distanceMeters } from "@/lib/matching/area-distance";
import { DEFAULT_MATCH_RADIUS_METERS, MATCH_EXPIRY_MINUTES, MINIMUM_TIME_OVERLAP_MINUTES } from "@/lib/matching/match-config";
import { windowsAreCompatible, windowOverlapMinutes } from "@/lib/matching/time-window";
import { vehiclesCompatible } from "@/lib/matching/vehicle-compatibility";
import type { MatchingWindow, PotentialMatch } from "@/lib/matching/match-types";

const MAX_CANDIDATES = 250;

function expandWindow(value: string): { start: string; end: string } {
  const [hour, minute] = value.split(":").map(Number);
  const center = hour * 60 + minute;
  const format = (total: number) => {
    const normalized = (total + 24 * 60) % (24 * 60);
    return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
  };
  return { start: format(center - 5), end: format(center + 5) };
}

async function isNeutralMatchingEnabled(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const [{ data: flag }, { data: user }] = await Promise.all([
    admin.from("feature_flags").select("enabled, rollout").eq("name", "neutral_matching_v1").maybeSingle(),
    admin.from("users").select("role").eq("id", userId).maybeSingle(),
  ]);
  if (flag?.enabled !== true) return false;
  const rollout = (flag.rollout ?? {}) as { mode?: string; user_ids?: string[]; roles?: string[] };
  if (rollout.mode !== "allowlist") return true;
  return Boolean(rollout.user_ids?.includes(userId) || (user?.role && rollout.roles?.includes(user.role)));
}

async function materializeWindows(userId: string): Promise<MatchingWindow[]> {
  const admin = createAdminClient();
  const [{ data: user }, { data: schedules }] = await Promise.all([
    admin.from("users").select("vehicle_type, schedule_arrival, schedule_departure, schedule_days").eq("id", userId).maybeSingle(),
    admin.from("recurring_schedules").select("id, latitude, longitude, days_of_week, active, start_date, end_date, timezone, vehicle_type, departure_time, return_time").eq("user_id", userId).eq("active", true),
  ]);
  if (!user) return [];
  const windows: Array<Record<string, unknown>> = [];
  for (const schedule of schedules ?? []) {
    const days = Array.isArray(schedule.days_of_week) ? schedule.days_of_week : [];
    const departure = user.schedule_departure || schedule.departure_time;
    const arrival = user.schedule_arrival || schedule.return_time;
    if (!departure || !arrival || !days.length) continue;
    const location = { area_latitude: schedule.latitude, area_longitude: schedule.longitude };
    const departureWindow = expandWindow(departure);
    const arrivalWindow = expandWindow(arrival);
    for (const day of days) {
      windows.push({ user_id: userId, role: "departing", day_of_week: day, window_start: departureWindow.start, window_end: departureWindow.end, time_zone: schedule.timezone || "America/Los_Angeles", ...location, vehicle_type: schedule.vehicle_type || user.vehicle_type, matching_enabled: true, active: true, source_type: "recurring_schedule", source_id: schedule.id, expires_at: schedule.end_date ? `${schedule.end_date}T23:59:59Z` : null });
      windows.push({ user_id: userId, role: "arriving", day_of_week: day, window_start: arrivalWindow.start, window_end: arrivalWindow.end, time_zone: schedule.timezone || "America/Los_Angeles", ...location, vehicle_type: schedule.vehicle_type || user.vehicle_type, matching_enabled: true, active: true, source_type: "recurring_schedule", source_id: schedule.id, expires_at: schedule.end_date ? `${schedule.end_date}T23:59:59Z` : null });
    }
  }
  if (!windows.length) return [];
  // Windows are replaced as a batch so profile/schedule edits cannot leave stale candidates active.
  await admin.from("matching_schedule_windows").delete().eq("user_id", userId).eq("source_type", "recurring_schedule");
  const { data } = await admin.from("matching_schedule_windows").insert(windows).select("*");
  return (data ?? []) as MatchingWindow[];
}

export async function reconcilePotentialMatches(userId: string): Promise<PotentialMatch[]> {
  if (!(await isNeutralMatchingEnabled(userId))) return [];
  const ownWindows = await materializeWindows(userId);
  if (!ownWindows.length) return [];
  const admin = createAdminClient();
  const { data: candidateUsers } = await admin.from("matching_schedule_windows").select("user_id").eq("active", true).eq("matching_enabled", true).neq("user_id", userId).limit(MAX_CANDIDATES);
  const candidateUserIds = [...new Set((candidateUsers ?? []).map((candidate) => candidate.user_id))];
  // Refresh only users with active matching windows so stale schedule rows do
  // not create duplicate potential matches.
  await Promise.all(candidateUserIds.map((candidateUserId) => materializeWindows(candidateUserId)));
  const { data: candidates } = await admin.from("matching_schedule_windows").select("*").eq("active", true).eq("matching_enabled", true).neq("user_id", userId).limit(MAX_CANDIDATES);
  const candidateWindows = (candidates ?? []) as MatchingWindow[];
  const result: PotentialMatch[] = [];
  const seenKeys = new Set<string>();
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
      const { data: blocked } = await admin.from("user_blocks").select("id").or(`and(blocker_id.eq.${pair[0]},blocked_id.eq.${pair[1]}),and(blocker_id.eq.${pair[1]},blocked_id.eq.${pair[0]})`).maybeSingle();
      if (blocked) continue;
      const dedupeKey = `${pair[0]}:${pair[1]}:${arriving.day_of_week}`;
      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);
      const overlap = windowOverlapMinutes(arriving.window_start, arriving.window_end, departing.window_start, departing.window_end);
      const expiresAt = new Date(Date.now() + MATCH_EXPIRY_MINUTES * 60_000).toISOString();
      const confidence = Math.max(0, Math.min(100, Math.round(100 - (distance / DEFAULT_MATCH_RADIUS_METERS) * 50 + Math.min(overlap, 60) / 2)));
      const { data: match, error } = await admin.from("potential_matches").insert({ dedupe_key: dedupeKey, arriving_user_id: arriving.user_id, departing_user_id: departing.user_id, arriving_window_id: arriving.id, departing_window_id: departing.id, distance_meters: distance, match_radius_snapshot_meters: Math.round(DEFAULT_MATCH_RADIUS_METERS), time_overlap_minutes: overlap, minimum_overlap_snapshot_minutes: MINIMUM_TIME_OVERLAP_MINUTES, arriving_vehicle_type: arriving.vehicle_type, departing_vehicle_type: departing.vehicle_type, vehicle_compatible: true, privacy_eligible: true, eligibility_snapshot: { source: "neutral_reconciliation" }, match_confidence: confidence, expires_at: expiresAt }).select("*").single();
      if (error || !match) continue;
      await admin.from("notifications").insert([
        { user_id: arriving.user_id, potential_match_id: match.id, title: "Potential match", message: "A compatible arrival and departure window overlap nearby.", type: "potential_match" },
        { user_id: departing.user_id, potential_match_id: match.id, title: "Potential match", message: "A compatible arrival and departure window overlap nearby.", type: "potential_match" },
      ]);
      result.push(match as PotentialMatch);
    }
  }
  return result;
}
