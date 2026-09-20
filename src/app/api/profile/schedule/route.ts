import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { syncRecurringScheduleWindows } from "@/lib/matching/matching-observability";
import { isSyntheticAccount } from "@/lib/testing/synthetic-account";
import { isValidDays, isValidTime, isVehicleType } from "@/lib/schedule-validation";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const arrival = body?.schedule_arrival;
  const departure = body?.schedule_departure;
  const days = body?.schedule_days;
  const vehicleType = body?.vehicle_type;
  if (!isValidTime(arrival) || !isValidTime(departure) || !isValidDays(days) || (vehicleType !== undefined && !isVehicleType(vehicleType))) {
    return NextResponse.json({ error: "PROFILE_SCHEDULE_INVALID" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existing, error: readError } = await admin
    .from("users")
    .select("schedule_arrival, schedule_departure, schedule_days, vehicle_type")
    .eq("id", user.id)
    .maybeSingle();
  if (readError || !existing) return NextResponse.json({ error: "PROFILE_SCHEDULE_READ_FAILED" }, { status: 500 });

  const update = { schedule_arrival: arrival, schedule_departure: departure, schedule_days: days, ...(vehicleType === undefined ? {} : { vehicle_type: vehicleType }) };
  const { error: updateError } = await admin.from("users").update(update).eq("id", user.id);
  if (updateError) return NextResponse.json({ error: "PROFILE_SCHEDULE_WRITE_FAILED" }, { status: 500 });
  try {
    await syncRecurringScheduleWindows(user.id, "/api/profile/schedule", isSyntheticAccount(user.email) ? "synthetic" : "system");
  } catch {
    await admin.from("users").update(existing).eq("id", user.id);
    return NextResponse.json({ error: "PROFILE_SCHEDULE_SYNC_FAILED" }, { status: 503 });
  }
  return NextResponse.json({ success: true });
}
