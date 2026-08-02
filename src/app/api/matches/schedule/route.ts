import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { sendPushToUser } from "@/lib/push";

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
}

interface UserScheduleRow {
  id: string;
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

/** Next Date on one of `days` at local time-of-day `time`, strictly after `after`. */
function nextOccurrence(time: string, days: number[], after: Date): Date {
  const target = timeToMinutes(time);
  const start = new Date(after);
  for (let offset = 0; offset < 8; offset++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
    if (!days.includes(d.getDay())) continue;
    d.setHours(Math.floor(target / 60), target % 60, 0, 0);
    if (d.getTime() > after.getTime()) return d;
  }
  throw new Error("No future occurrence for schedule");
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
  vehicleType: string | null;
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
      .select("id, name, vehicle_type, schedule_arrival, schedule_departure, schedule_days")
      .eq("id", user.id)
      .single();

    const { data: mySchedules } = await supabase
      .from("recurring_schedules")
      .select("*")
      .eq("user_id", user.id)
      .eq("active", true);

    if (!mySchedules || mySchedules.length === 0) {
      return NextResponse.json({ matches_created: 0, total_candidates: 0, reason: "No recurring schedules" });
    }

    // Load every other driver's schedule profile + recurring schedules
    const { data: allUsers } = await supabase
      .from("users")
      .select("id, name, vehicle_type, schedule_arrival, schedule_departure, schedule_days")
      .neq("id", user.id);

    const { data: allSchedules } = await supabase
      .from("recurring_schedules")
      .select("*")
      .eq("active", true);

    if (!allUsers || !allSchedules) {
      return NextResponse.json({ matches_created: 0, total_candidates: 0, reason: "No data" });
    }

    const usersById = new Map<string, UserScheduleRow>();
    for (const u of allUsers as UserScheduleRow[]) usersById.set(u.id, u);

    const candidates: MatchCandidate[] = [];
    const seen = new Set<string>();

    const myArrival = (me as UserScheduleRow | null)?.schedule_arrival ?? null;
    const myDays = (me as UserScheduleRow | null)?.schedule_days ?? null;

    // ----- Direction A: I am the departing owner -----
    for (const sched of mySchedules as ScheduleRow[]) {
      const depMinutes = timeToMinutes(sched.departure_time);

      for (const other of allUsers as UserScheduleRow[]) {
        if (!other.schedule_arrival) continue;
        if (!timesClose(sched.departure_time, other.schedule_arrival, TIME_TOLERANCE_MINUTES)) continue;
        if (!daysOverlap(sched.days_of_week, other.schedule_days)) continue;

        // The seeker must actually be parked nearby (has a recurring schedule in the area)
        const seekerNearby = (allSchedules as ScheduleRow[]).some(
          (os) =>
            os.user_id === other.id &&
            haversineDistance(sched.latitude, sched.longitude, os.latitude, os.longitude) <= MATCH_RADIUS_METERS,
        );
        if (!seekerNearby) continue;

        const key = `A:${sched.id}:${other.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        candidates.push({
          ownerId: user.id,
          ownerName: (me as UserScheduleRow | null)?.name ?? "A driver",
          seekerId: other.id,
          latitude: sched.latitude,
          longitude: sched.longitude,
          address: sched.label || "Parking spot",
          days: sched.days_of_week,
          departure: nextOccurrence(sched.departure_time, sched.days_of_week, new Date()),
          returnTime: nextOccurrence(sched.return_time, sched.days_of_week, new Date()),
          vehicleType: sched.vehicle_type || (me as UserScheduleRow | null)?.vehicle_type || null,
        });
      }
    }

    // ----- Direction B: I am the arriving seeker -----
    if (myArrival) {
      for (const mySched of mySchedules as ScheduleRow[]) {
        for (const otherSched of allSchedules as ScheduleRow[]) {
          if (otherSched.user_id === user.id) continue;
          if (!timesClose(myArrival, otherSched.departure_time, TIME_TOLERANCE_MINUTES)) continue;
          if (!daysOverlap(myDays, otherSched.days_of_week)) continue;

          const dist = haversineDistance(mySched.latitude, mySched.longitude, otherSched.latitude, otherSched.longitude);
          if (dist > MATCH_RADIUS_METERS) continue;

          const otherUser = usersById.get(otherSched.user_id);
          if (!otherUser) continue;

          const key = `B:${otherSched.id}:${user.id}`;
          if (seen.has(key)) continue;
          seen.add(key);

          candidates.push({
            ownerId: otherSched.user_id,
            ownerName: otherUser.name ?? "A driver",
            seekerId: user.id,
            latitude: otherSched.latitude,
            longitude: otherSched.longitude,
            address: otherSched.label || "Parking spot",
            days: otherSched.days_of_week,
            departure: nextOccurrence(otherSched.departure_time, otherSched.days_of_week, new Date()),
            returnTime: nextOccurrence(otherSched.return_time, otherSched.days_of_week, new Date()),
            vehicleType: otherSched.vehicle_type || otherUser.vehicle_type || null,
          });
        }
      }
    }

    // ----- Persist scheduled spots + pending matches -----
    let matchesCreated = 0;
    const created: Array<{ match_id: string; spot_id: string; role: string; partner_id: string }> = [];

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

      // Don't duplicate a match for this spot + seeker
      const { data: existingMatch } = await supabase
        .from("spot_matches")
        .select("id")
        .eq("spot_id", spotId)
        .eq("seeker_id", cand.seekerId)
        .neq("status", "rejected")
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

      // Notify both drivers via push so each confirms the handoff
      sendPushToUser(cand.seekerId, {
        type: "match_found",
        title: "Scheduled parking match!",
        body: `${cand.ownerName} is leaving a spot${cand.address !== "Parking spot" ? ` on ${cand.address}` : ""} around ${new Date(cand.departure).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. Confirm to navigate!`,
        match_id: match.id,
        spot_lat: cand.latitude,
        spot_lon: cand.longitude,
        spot_street: cand.address,
        departing_user_name: cand.ownerName,
      });

      sendPushToUser(cand.ownerId, {
        type: "match_found",
        title: "Handoff partner found",
        body: "A driver with a matching schedule wants your spot. Confirm the handoff.",
        match_id: match.id,
        spot_lat: cand.latitude,
        spot_lon: cand.longitude,
        spot_street: cand.address,
      });
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
