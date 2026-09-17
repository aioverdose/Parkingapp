import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { validateScheduleFields } from "@/lib/schedule-validation";

async function auth(request: NextRequest) { const user = await getAuthenticatedUser(request); return user ? { user, db: createAdminClient() } : null; }
async function owner(db: ReturnType<typeof createAdminClient>, userId: string, body: Record<string, unknown>) {
  if (body.vehicle_id) { const { data } = await db.from("user_vehicles").select("id").eq("id", body.vehicle_id).eq("user_id", userId).eq("active", true).maybeSingle(); if (!data) return "Vehicle does not belong to you or is inactive"; }
  if (body.saved_spot_id) { const { data } = await db.from("user_parking_spots").select("id").eq("id", body.saved_spot_id).eq("user_id", userId).maybeSingle(); if (!data) return "Saved spot does not belong to you"; }
  return null;
}
export async function GET(request: NextRequest) {
  const a = await auth(request); if (!a) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await a.db.from("schedule_date_entries").select("*").eq("user_id", a.user.id).order("schedule_date").order("arrival_time");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 }); return NextResponse.json({ entries: data ?? [] });
}
export async function POST(request: NextRequest) {
  const a = await auth(request); if (!a) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { const body = await request.json() as Record<string, unknown>; const invalid = validateScheduleFields(body, true); if (invalid) return NextResponse.json({ error: invalid }, { status: 400 }); const forbidden = await owner(a.db, a.user.id, body); if (forbidden) return NextResponse.json({ error: forbidden }, { status: 403 });
    const { data, error } = await a.db.from("schedule_date_entries").insert({ user_id: a.user.id, vehicle_id: body.vehicle_id ?? null, saved_spot_id: body.saved_spot_id ?? null, latitude: body.latitude, longitude: body.longitude, label: body.label ?? "One-off schedule", schedule_date: body.schedule_date, arrival_time: body.arrival_time, departure_time: body.departure_time }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 }); return NextResponse.json({ entry: data }, { status: 201 });
  } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
}
export async function PATCH(request: NextRequest) {
  const a = await auth(request); if (!a) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const id = new URL(request.url).searchParams.get("id"); if (!id) return NextResponse.json({ error: "Entry ID is required" }, { status: 400 });
  try { const body = await request.json() as Record<string, unknown>; const { data: old } = await a.db.from("schedule_date_entries").select("*").eq("id", id).eq("user_id", a.user.id).maybeSingle(); if (!old) return NextResponse.json({ error: "Entry not found" }, { status: 404 }); const merged = { ...old, ...body }; const invalid = validateScheduleFields(merged, true); if (invalid) return NextResponse.json({ error: invalid }, { status: 400 }); const forbidden = await owner(a.db, a.user.id, merged); if (forbidden) return NextResponse.json({ error: forbidden }, { status: 403 }); const allowed = ["vehicle_id", "saved_spot_id", "latitude", "longitude", "label", "schedule_date", "arrival_time", "departure_time", "active"]; const update = Object.fromEntries(allowed.filter((key) => key in body).map((key) => [key, body[key]])); const { data, error } = await a.db.from("schedule_date_entries").update(update).eq("id", id).eq("user_id", a.user.id).select().single(); if (error) return NextResponse.json({ error: error.message }, { status: 500 }); return NextResponse.json({ entry: data });
  } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
}
export async function DELETE(request: NextRequest) { const a = await auth(request); if (!a) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const id = new URL(request.url).searchParams.get("id"); if (!id) return NextResponse.json({ error: "Entry ID is required" }, { status: 400 }); const { error } = await a.db.from("schedule_date_entries").delete().eq("id", id).eq("user_id", a.user.id); if (error) return NextResponse.json({ error: error.message }, { status: 500 }); return NextResponse.json({ success: true }); }
