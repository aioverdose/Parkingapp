import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { sendPushToUser } from "@/lib/push";
import { isSyntheticAccount } from "@/lib/testing/synthetic-account";
import { appDateKey, nextAppOccurrence } from "@/lib/schedule-time";

/**
 * POST /api/matches/schedule
 *
 * Schedule-based matching ("Air Traffic Control").
 *
 * Uses the recurring schedules + profile schedules of drivers to pair a
 * DEPARTING driver with an ARRIVING driver who wants the same spot at the
 * same time. Creates a scheduled parking spot and a pending match for every
 * compatible pair, then notifies both drivers so each must confirm.
 *
 * Direction A — "I am departing": my recurring spot frees up at
 *   departure_time; find drivers whose schedule_arrival is within ±30 min
 *   (they arrive as I leave) who are parked nearby.
 *
 * Direction B — "I am arriving": my profile schedule_arrival says when I need
 *   to park; find other drivers' recurring spots whose departure_time is
 *   within ±30 min (they leave as I arrive) and are nearby.
 *
 * The pass is idempotent: existing pending/confirmed matches are never
 * duplicated.
 */
const MATCH_RADIUS_METERS = 400;
const TIME_TOLERANCE_MINUTES = 30;
const REUSE_WINDOW_MINUTES = 120;

interface ScheduleRow {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  label: string | null;
  days_of_week: number[];
  departure_time: string;
  return_time: string;
  vehicle_type: string | null;
  active: boolean;
  start_date?: string | null;
  end_date?: string | null;
  vehicle_id?: string | null;
}

interface UserScheduleRow {
  id: string;
  email: string;
  name: string | null;
  vehicle_type: string | null;
  schedule_arrival: string | null;
  schedule_departure: string | null;
  schedule_days: number[];
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function daysOverlap(a: number[] | null | undefined, b: number[] | null | undefined): boolean {
  if (!a || !b || a.length === 0 || b.length === 0) return false;
  return a.some((d) => b.includes(d));
}

function timesClose(a: string, b: string, toleranceMinutes: number): boolean {
  return Math.abs(timeToMinutes(a) - timeToMinutes(b)) <= toleranceMinutes;
}

function scheduleIsInDateWindow(schedule: ScheduleRow, date = new Date()): boolean {
  const day = appDateKey(date);
  return (!schedule.start_date || schedule.start_date <= day) && (!schedule.end_date || schedule.end_date >= day);
}

function vehiclesCompatible(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b || a === "any" || b === "any") return true;
  return a.toLowerCase() === b.toLowerCase();
}

interface MatchCandidate {
  ownerId: string;
  ownerName: string;
  seekerId: string;
  latitude: number;
  longitude: number;
  address: string;
  days: number[];
  departure: Date;
  returnTime: Date;
  departureClock: string;
  vehicleType: string | null;
}

function formatClock(time: string): string {
  const [hourText, minute = "00"] = time.split(":");
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) return time;
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Load my profile + schedules
    const { data: me } = await supabase
      .from("users")
      .select("id, email, name, vehicle_type, schedule_arrival, schedule_departure, schedule_days")
      .eq("id", user.id)
      .single();

    const { data: mySchedules } = await supabase
      .from("recurring_schedules")
      .select("*")
      .eq("user_id", user.id)
      .eq("active", true);

    const today = appDateKey();
    const { data: myDateEntries } = await supabase.from("schedule_date_entries").select("*").eq("user_id", user.id).eq("active", true).gte("schedule_date", today);
    const currentMySchedules = [...(mySchedules ?? []).map((schedule) => ({
      ...schedule,
      // Profile times are the member's canonical commute preference. The
      // planner supplies the location and recurring days.
      departure_time: me?.schedule_departure || schedule.departure_time,
      return_time: me?.schedule_arrival || schedule.return_time,
    })), ...(myDateEntries ?? []).map((entry) => ({ ...entry, days_of_week: [new Date(`${entry.schedule_date}T00:00:00Z`).getUTCDay()], departure_time: entry.departure_time, return_time: entry.arrival_time, vehicle_type: null, start_date: entry.schedule_date, end_date: entry.schedule_date }))];

    if (currentMySchedules.length === 0) {
      return NextResponse.json({ matches_created: 0, total_candidates: 0, reason: "No recurring schedules" });
    }

    // Load every other driver's schedule profile + recurring schedules
    const { data: allUsers } = await supabase
      .from("users")
      .select("id, email, name, vehicle_type, schedule_arrival, schedule_departure, schedule_days")
      .neq("id", user.id);

    const syntheticRequester = isSyntheticAccount((me as UserScheduleRow | null)?.email ?? user.email);
    const allowedUsers = (allUsers ?? []).filter((candidate) =>
      isSyntheticAccount(candidate.email) === syntheticRequester,
    );
    const allowedUserIds = new Set(allowedUsers.map((candidate) => candidate.id));

    const { data: allSchedules } = await supabase
      .from("recurring_schedules")
      .select("*")
      .eq("active", true);
    const { data: allDateEntries } = await supabase.from("schedule_date_entries").select("*").eq("active", true).gte("schedule_date", today);
    const { data: vehicles } = await supabase.from("user_vehicles").select("id, vehicle_type").eq("active", true);
    const vehicleTypes = new Map((vehicles ?? []).map((vehicle) => [vehicle.id, vehicle.vehicle_type]));
    const profileById = new Map((allowedUsers as UserScheduleRow[]).map((candidate) => [candidate.id, candidate]));
    const currentAllSchedules = [...(allSchedules ?? []).filter((schedule) => allowedUserIds.has(schedule.user_id)).map((schedule) => {
      const profile = profileById.get(schedule.user_id);
      return {
        ...schedule,
        departure_time: profile?.schedule_departure || schedule.departure_time,
        return_time: profile?.schedule_arrival || schedule.return_time,
      };
    }), ...(allDateEntries ?? []).filter((entry) => allowedUserIds.has(entry.user_id)).map((entry) => ({ ...entry, days_of_week: [new Date(`${entry.schedule_date}T00:00:00Z`).getUTCDay()], departure_time: entry.departure_time, return_time: entry.arrival_time, vehicle_type: vehicleTypes.get(entry.vehicle_id) ?? null, start_date: entry.schedule_date, end_date: entry.schedule_date }))]
      .map((schedule) => ({ ...schedule, vehicle_type: schedule.vehicle_type || vehicleTypes.get(schedule.vehicle_id) || null }));
    const currentMySchedulesWithVehicleTypes = currentMySchedules.map((schedule) => ({ ...schedule, vehicle_type: schedule.vehicle_type || vehicleTypes.get(schedule.vehicle_id) || null }));

    if (!allUsers || !allSchedules) {
      return NextResponse.json({ matches_created: 0, total_candidates: 0, reason: "No data" });
    }

    // New members can receive their first match after completing their profile.
    // Reliability history affects ranking, not basic eligibility.
    const eligibleDepartureUsers = new Set<string>(allowedUsers.map((candidate) => candidate.id));
    eligibleDepartureUsers.add(user.id);

    const usersById = new Map<string, UserScheduleRow>();
    for (const u of allowedUsers as UserScheduleRow[]) usersById.set(u.id, u);

    const candidates: MatchCandidate[] = [];
    const seen = new Set<string>();
    const seenPairs = new Set<string>();

    const myArrival = (me as UserScheduleRow | null)?.schedule_arrival ?? null;
    const myDays = (me as UserScheduleRow | null)?.schedule_days ?? null;

    // ----- Direction A: I am the departing owner -----
    for (const sched of currentMySchedulesWithVehicleTypes.filter((item) => scheduleIsInDateWindow(item as ScheduleRow)) as ScheduleRow[]) {
      const depMinutes = timeToMinutes(sched.departure_time);

      for (const other of allowedUsers as UserScheduleRow[]) {
        if (!eligibleDepartureUsers.has(other.id)) continue;
        if (!other.schedule_arrival) continue;
        if (!timesClose(sched.departure_time, other.schedule_arrival, TIME_TOLERANCE_MINUTES)) continue;
        if (!daysOverlap(sched.days_of_week, other.schedule_days)) continue;
        if (!vehiclesCompatible(sched.vehicle_type || me?.vehicle_type, other.vehicle_type)) continue;

        // The seeker must actually be parked nearby (has a recurring schedule in the area)
        const seekerNearby = (currentAllSchedules as ScheduleRow[]).some(
          (os) =>
            os.user_id === other.id &&
            haversineDistance(sched.latitude, sched.longitude, os.latitude, os.longitude) <= MATCH_RADIUS_METERS,
        );
        if (!seekerNearby) continue;

        const key = `A:${sched.id}:${other.id}`;
        const pairKey = [user.id, other.id].sort().join(":");
        if (seenPairs.has(pairKey)) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        seenPairs.add(pairKey);

        candidates.push({
          ownerId: user.id,
          ownerName: (me as UserScheduleRow | null)?.name ?? "A driver",
          seekerId: other.id,
          latitude: sched.latitude,
          longitude: sched.longitude,
          address: sched.label || "Parking spot",
          days: sched.days_of_week,
              departure: nextAppOccurrence(sched.departure_time, sched.days_of_week, new Date()),
              returnTime: nextAppOccurrence(sched.return_time, sched.days_of_week, new Date()),
          departureClock: sched.departure_time,
          vehicleType: sched.vehicle_type || (me as UserScheduleRow | null)?.vehicle_type || null,
        });
      }
    }

    // ----- Direction B: I am the arriving seeker -----
    if (myArrival && eligibleDepartureUsers.has(user.id)) {
        for (const mySched of currentMySchedulesWithVehicleTypes.filter((item) => scheduleIsInDateWindow(item as ScheduleRow)) as ScheduleRow[]) {
          for (const otherSched of (currentAllSchedules as ScheduleRow[]).filter((item) => scheduleIsInDateWindow(item))) {
          if (otherSched.user_id === user.id) continue;
           if (!timesClose(myArrival, otherSched.departure_time, TIME_TOLERANCE_MINUTES)) continue;
           if (!daysOverlap(myDays, otherSched.days_of_week)) continue;

          const dist = haversineDistance(mySched.latitude, mySched.longitude, otherSched.latitude, otherSched.longitude);
          if (dist > MATCH_RADIUS_METERS) continue;

          const otherUser = usersById.get(otherSched.user_id);
          if (!otherUser) continue;
          if (!vehiclesCompatible(me?.vehicle_type, otherSched.vehicle_type || otherUser.vehicle_type)) continue;

           const key = `B:${otherSched.id}:${user.id}`;
           const pairKey = [otherSched.user_id, user.id].sort().join(":");
           if (seenPairs.has(pairKey)) continue;
           if (seen.has(key)) continue;
           seen.add(key);
           seenPairs.add(pairKey);

          candidates.push({
            ownerId: otherSched.user_id,
            ownerName: otherUser.name ?? "A driver",
            seekerId: user.id,
            latitude: otherSched.latitude,
            longitude: otherSched.longitude,
            address: otherSched.label || "Parking spot",
            days: otherSched.days_of_week,
              departure: nextAppOccurrence(otherSched.departure_time, otherSched.days_of_week, new Date()),
              returnTime: nextAppOccurrence(otherSched.return_time, otherSched.days_of_week, new Date()),
             departureClock: otherSched.departure_time,
            vehicleType: otherSched.vehicle_type || otherUser.vehicle_type || null,
          });
        }
      }
    }

    // ----- Persist scheduled spots + pending matches -----
    let matchesCreated = 0;
    const created: Array<{ match_id: string; spot_id: string; role: string; partner_id: string; push_sent?: number; push_failed?: number }> = [];

    for (const cand of candidates) {
      // Block check
      const { data: b1 } = await supabase.rpc("is_user_blocked", { check_user_id: cand.seekerId, by_user_id: cand.ownerId });
      const { data: b2 } = await supabase.rpc("is_user_blocked", { check_user_id: cand.ownerId, by_user_id: cand.seekerId });
      if (b1 || b2) continue;

      // Reuse an existing scheduled spot for the same owner/location if within the window
      let spotId: string | null = null;
      const { data: existingSpot } = await supabase
        .from("parking_spots")
        .select("id, departure_time")
        .eq("user_id", cand.ownerId)
        .eq("latitude", cand.latitude)
        .eq("longitude", cand.longitude)
        .eq("relay_mode", "scheduled")
        .eq("status", "active")
        .order("departure_time", { ascending: false })
        .limit(3);

      if (existingSpot && existingSpot.length > 0) {
        const reuse = existingSpot.find((s) => {
          const diffMin = (Math.abs(new Date(s.departure_time).getTime() - cand.departure.getTime())) / 60000;
          return diffMin <= REUSE_WINDOW_MINUTES;
        });
        spotId = reuse?.id ?? null;
        if (spotId) {
          await supabase.from("parking_spots").update({
            departure_time: cand.departure.toISOString(),
            return_time: cand.returnTime.toISOString(),
            address: cand.address,
          }).eq("id", spotId);
        }
      }

      if (!spotId) {
        const { data: spot, error: spotError } = await supabase
          .from("parking_spots")
          .insert({
            user_id: cand.ownerId,
            latitude: cand.latitude,
            longitude: cand.longitude,
            address: cand.address,
            departure_time: cand.departure.toISOString(),
            return_time: cand.returnTime.toISOString(),
            vehicle_type: cand.vehicleType,
            relay_mode: "scheduled",
            status: "active",
          })
          .select("id")
          .single();

        if (spotError || !spot || !spot.id) continue;
        spotId = spot.id;
      }

      if (!spotId) continue;

      // A pair gets one live Match Protocol record, even when either member
      // has multiple overlapping saved locations.
      const { data: existingMatch } = await supabase
        .from("spot_matches")
        .select("id")
        .or(`and(spot_owner_id.eq.${cand.ownerId},seeker_id.eq.${cand.seekerId}),and(spot_owner_id.eq.${cand.seekerId},seeker_id.eq.${cand.ownerId})`)
        .in("status", ["pending", "offered", "confirmed_by_owner", "confirmed_by_seeker", "confirmed"])
        .maybeSingle();
      if (existingMatch) continue;

      const { data: match, error: matchError } = await supabase
        .from("spot_matches")
        .insert({
          spot_id: spotId,
          spot_owner_id: cand.ownerId,
          seeker_id: cand.seekerId,
          status: "pending",
        })
        .select("id")
        .single();

      if (matchError || !match) continue;
      matchesCreated++;

      const role = cand.seekerId === user.id ? "seeker" : "owner";
      created.push({ match_id: match.id, spot_id: spotId, role, partner_id: role === "owner" ? cand.seekerId : cand.ownerId });

       // Await both sends so a serverless request cannot end before delivery starts.
       const [seekerPush, ownerPush] = await Promise.all([
         sendPushToUser(cand.seekerId, {
         type: "match_found",
         title: "Scheduled parking match!",
          body: `${cand.ownerName} is leaving a spot${cand.address !== "Parking spot" ? ` on ${cand.address}` : ""} around ${formatClock(cand.departureClock)}. Confirm to navigate!`,
        match_id: match.id,
        spot_lat: cand.latitude,
        spot_lon: cand.longitude,
         spot_street: cand.address,
         departing_user_name: cand.ownerName,
         }),
         sendPushToUser(cand.ownerId, {
         type: "match_found",
         title: "Handoff partner found",
         body: "A driver with a matching schedule wants your spot. Confirm the handoff.",
        match_id: match.id,
        spot_lat: cand.latitude,
         spot_lon: cand.longitude,
         spot_street: cand.address,
         }),
       ]);
       created[created.length - 1] = { ...created[created.length - 1], push_sent: seekerPush.sent + ownerPush.sent, push_failed: seekerPush.failed + ownerPush.failed };
    }

    return NextResponse.json({
      matches_created: matchesCreated,
      total_candidates: candidates.length,
      matches: created,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
