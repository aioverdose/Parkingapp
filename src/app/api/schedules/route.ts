import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { validateScheduleFields } from "@/lib/schedule-validation";

async function context(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  return user ? { user, supabase: createAdminClient() } : null;
}

async function validateOwnership(supabase: ReturnType<typeof createAdminClient>, userId: string, body: Record<string, unknown>) {
  if (body.vehicle_id) {
    const { data } = await supabase.from("user_vehicles").select("id").eq("id", body.vehicle_id).eq("user_id", userId).eq("active", true).maybeSingle();
    if (!data) return "Vehicle does not belong to you or is inactive";
  }
  if (body.saved_spot_id) {
    const { data } = await supabase.from("user_parking_spots").select("id").eq("id", body.saved_spot_id).eq("user_id", userId).maybeSingle();
    if (!data) return "Saved spot does not belong to you";
  }
  return null;
}

export async function GET(request: NextRequest) {
  const auth = await context(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await auth.supabase.from("recurring_schedules").select("*").eq("user_id", auth.user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedules: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await context(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const validation = validateScheduleFields(body);
    if (validation) return NextResponse.json({ error: validation }, { status: 400 });
    const ownership = await validateOwnership(auth.supabase, auth.user.id, body);
    if (ownership) return NextResponse.json({ error: ownership }, { status: 403 });
    const { data, error } = await auth.supabase.from("recurring_schedules").insert({
      user_id: auth.user.id, saved_spot_id: body.saved_spot_id ?? null, latitude: body.latitude, longitude: body.longitude,
      label: body.label ?? "Recurring Spot", days_of_week: body.days_of_week ?? [1, 2, 3, 4, 5],
      departure_time: body.departure_time, return_time: body.return_time, vehicle_type: body.vehicle_type ?? null,
      start_date: body.start_date ?? null, end_date: body.end_date ?? null, timezone: body.timezone ?? "UTC", vehicle_id: body.vehicle_id ?? null,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ schedule: data }, { status: 201 });
  } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
}

export async function PATCH(request: NextRequest) {
  const auth = await context(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Schedule ID is required" }, { status: 400 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const { data: existing } = await auth.supabase.from("recurring_schedules").select("*").eq("id", id).eq("user_id", auth.user.id).maybeSingle();
    if (!existing) return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    const merged = { ...existing, ...body } as Record<string, unknown>;
    const validation = validateScheduleFields(merged);
    if (validation) return NextResponse.json({ error: validation }, { status: 400 });
    const ownership = await validateOwnership(auth.supabase, auth.user.id, merged);
    if (ownership) return NextResponse.json({ error: ownership }, { status: 403 });
    const allowed = ["saved_spot_id", "latitude", "longitude", "label", "days_of_week", "departure_time", "return_time", "vehicle_type", "active", "start_date", "end_date", "timezone", "vehicle_id"];
    const update = Object.fromEntries(allowed.filter((key) => key in body).map((key) => [key, body[key]]));
    const { data, error } = await auth.supabase.from("recurring_schedules").update(update).eq("id", id).eq("user_id", auth.user.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ schedule: data });
  } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
}

export async function DELETE(request: NextRequest) {
  const auth = await context(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Schedule ID is required" }, { status: 400 });
  const { error } = await auth.supabase.from("recurring_schedules").delete().eq("id", id).eq("user_id", auth.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
