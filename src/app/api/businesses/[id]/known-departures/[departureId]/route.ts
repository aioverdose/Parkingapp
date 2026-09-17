import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { getBusinessMembership } from "@/lib/api/business-helpers";
import { validateKnownDeparture } from "@/lib/business-known-departures";
import { logger } from "@/lib/logger";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; departureId: string }> }) {
  try {
    const { id, departureId } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const membership = await getBusinessMembership(user.id, id);
    if (!membership || membership.role !== "admin") return NextResponse.json({ error: "Only business admins can edit known departure times" }, { status: 403 });
    const body = await request.json();
    const errors = validateKnownDeparture(body, true);
    if (Object.keys(errors).length) return NextResponse.json({ error: "Invalid known departure", fields: errors }, { status: 400 });
    const allowed = ["category", "title", "day_of_week", "specific_date", "start_time", "end_time", "lead_minutes", "timezone", "active", "notes"];
    const updates = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
    if (typeof updates.title === "string") updates.title = updates.title.trim() || null;
    if (typeof updates.notes === "string") updates.notes = updates.notes.trim() || null;
    updates.updated_at = new Date().toISOString();
    const { data, error } = await createAdminClient().from("business_known_departures").update(updates).eq("id", departureId).eq("business_id", id).select("*").maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Known departure not found" }, { status: 404 });
    return NextResponse.json({ departure: data });
  } catch (error) {
    logger.error("businesses: known departure update failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; departureId: string }> }) {
  try {
    const { id, departureId } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const membership = await getBusinessMembership(user.id, id);
    if (!membership || membership.role !== "admin") return NextResponse.json({ error: "Only business admins can delete known departure times" }, { status: 403 });
    const { error, count } = await createAdminClient().from("business_known_departures").delete({ count: "exact" }).eq("id", departureId).eq("business_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!count) return NextResponse.json({ error: "Known departure not found" }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error("businesses: known departure delete failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
