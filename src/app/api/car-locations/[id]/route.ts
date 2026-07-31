import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateCheck = checkRateLimit(`car-location-update:${user.id}`, 12, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    const { data: existing, error: fetchError } = await supabase
      .from("car_locations")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowed: Record<string, unknown> = {};
    if (body.status !== undefined) allowed.status = body.status;
    if (body.walking_eta_seconds !== undefined) allowed.walking_eta_seconds = body.walking_eta_seconds;
    if (body.walking_back_detected_at !== undefined) allowed.walking_back_detected_at = body.walking_back_detected_at;
    if (body.departed_at !== undefined) allowed.departed_at = body.departed_at;
    if (body.latitude !== undefined) allowed.latitude = body.latitude;
    if (body.longitude !== undefined) allowed.longitude = body.longitude;

    const { data, error } = await supabase
      .from("car_locations")
      .update(allowed)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ carLocation: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    const { data: existing, error: fetchError } = await supabase
      .from("car_locations")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await supabase.from("car_locations").delete().eq("id", id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
