import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { isValidCoords } from "@/lib/geo-validation";
import { aggregateDepartureCells, type DepartureSource } from "@/lib/departure-heatmap";

const MAX_RADIUS_KM = 5;
const EARTH_RADIUS_KM = 6371;

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(bLat - aLat);
  const dLng = radians(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function numberParam(value: string | null) {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const requestedLat = numberParam(params.get("lat"));
  const requestedLng = numberParam(params.get("lng"));
  const requestedRadius = numberParam(params.get("radius"));
  const day = numberParam(params.get("day"));
  const hour = numberParam(params.get("hour"));
  if ((requestedLat !== null && requestedLng === null) || (requestedLat === null && requestedLng !== null) ||
      requestedRadius !== null && (!Number.isFinite(requestedRadius) || requestedRadius < 0 || requestedRadius > MAX_RADIUS_KM) ||
      requestedLat !== null && !isValidCoords(requestedLat, requestedLng!)) {
    return NextResponse.json({ error: "Valid lat/lng and radius (up to 5km) are required" }, { status: 400 });
  }
  if (day !== null && (!Number.isInteger(day) || day < 0 || day > 6) || hour !== null && (!Number.isInteger(hour) || hour < 0 || hour > 23)) {
    return NextResponse.json({ error: "day must be 0-6 and hour must be 0-23" }, { status: 400 });
  }

  const supabase = createAdminClient();
  let centerLat = requestedLat;
  let centerLng = requestedLng;
  if (centerLat === null || centerLng === null) {
    const { data: primary, error } = await supabase.from("user_parking_spots").select("latitude, longitude").eq("user_id", user.id).eq("label", "Primary commute area").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (error) return NextResponse.json({ error: "Unable to load primary area" }, { status: 500 });
    centerLat = primary?.latitude ?? null;
    centerLng = primary?.longitude ?? null;
  }
  if (centerLat === null || centerLng === null || !isValidCoords(centerLat, centerLng)) {
    return NextResponse.json({ cells: [], message: "Set a primary parking area to see departure patterns." });
  }

  const now = new Date();
  const targetDay = day ?? now.getDay();
  const targetHour = hour ?? now.getHours();
  const sources: DepartureSource[] = [];
  const { data: spots, error: spotsError } = await supabase.from("parking_spots").select("latitude, longitude, user_id, departure_time").eq("status", "active").gte("departure_time", now.toISOString());
  if (spotsError) return NextResponse.json({ error: "Unable to load departure data" }, { status: 500 });
  for (const spot of spots ?? []) {
    const departure = new Date(spot.departure_time);
    if (!Number.isFinite(departure.getTime()) || departure.getHours() !== targetHour || distanceKm(centerLat, centerLng, spot.latitude, spot.longitude) > (requestedRadius ?? MAX_RADIUS_KM)) continue;
    sources.push({ latitude: spot.latitude, longitude: spot.longitude, contributorId: spot.user_id });
  }

  // Profile schedules are only converted into coarse cells after the day/hour
  // match and contributor threshold are applied server-side.
  const { data: savedAreas, error: savedAreasError } = await supabase
    .from("user_parking_spots")
    .select("latitude, longitude, user_id")
    .gte("latitude", centerLat - (requestedRadius ?? MAX_RADIUS_KM) / 111)
    .lte("latitude", centerLat + (requestedRadius ?? MAX_RADIUS_KM) / 111)
    .gte("longitude", centerLng - (requestedRadius ?? MAX_RADIUS_KM) / (111 * Math.max(0.2, Math.cos((centerLat * Math.PI) / 180))))
    .lte("longitude", centerLng + (requestedRadius ?? MAX_RADIUS_KM) / (111 * Math.max(0.2, Math.cos((centerLat * Math.PI) / 180))));
  if (savedAreasError) return NextResponse.json({ error: "Unable to load saved area signals" }, { status: 500 });
  const areaUserIds = [...new Set((savedAreas ?? []).map((area) => area.user_id).filter(Boolean))];
  const { data: profiles, error: profilesError } = areaUserIds.length
    ? await supabase.from("users").select("id, schedule_arrival, schedule_days").in("id", areaUserIds)
    : { data: [], error: null };
  if (profilesError) return NextResponse.json({ error: "Unable to load schedule signals" }, { status: 500 });
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  for (const area of savedAreas ?? []) {
    const profile = profileById.get(area.user_id);
    const scheduleHour = profile?.schedule_arrival ? Number(String(profile.schedule_arrival).split(":")[0]) : NaN;
    if (!profile || !Array.isArray(profile.schedule_days) || !profile.schedule_days.includes(targetDay) || scheduleHour !== targetHour || distanceKm(centerLat, centerLng, area.latitude, area.longitude) > (requestedRadius ?? MAX_RADIUS_KM)) continue;
    sources.push({ latitude: area.latitude, longitude: area.longitude, contributorId: area.user_id });
  }

  const { data: schedules, error: schedulesError } = await supabase.from("recurring_schedules").select("latitude, longitude, user_id, days_of_week, departure_time, active, saved_spot_id").eq("active", true);
  if (schedulesError) return NextResponse.json({ error: "Unable to load schedule data" }, { status: 500 });
  const scheduleUserIds = [...new Set((schedules ?? []).map((schedule) => schedule.user_id).filter(Boolean))];
  const { data: scheduleUsers, error: usersError } = scheduleUserIds.length
    ? await supabase.from("users").select("id").in("id", scheduleUserIds)
    : { data: [], error: null };
  if (usersError) return NextResponse.json({ error: "Unable to validate schedule data" }, { status: 500 });
  const validScheduleUsers = new Set((scheduleUsers ?? []).map((record) => record.id));
  for (const schedule of schedules ?? []) {
    const time = String(schedule.departure_time ?? "").split(":");
    if (!validScheduleUsers.has(schedule.user_id) || !Array.isArray(schedule.days_of_week) || !schedule.days_of_week.includes(targetDay) || Number(time[0]) !== targetHour || distanceKm(centerLat, centerLng, schedule.latitude, schedule.longitude) > (requestedRadius ?? MAX_RADIUS_KM)) continue;
    sources.push({ latitude: schedule.latitude, longitude: schedule.longitude, contributorId: schedule.user_id });
  }

  const cells = aggregateDepartureCells(sources);
  return NextResponse.json({ cells, ...(cells.length ? {} : { message: "Not enough aggregated activity is available for this area and time." }) });
}
