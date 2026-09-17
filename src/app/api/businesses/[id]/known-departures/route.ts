import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { getBusinessMembership } from "@/lib/api/business-helpers";
import { validateKnownDeparture } from "@/lib/business-known-departures";
import { logger } from "@/lib/logger";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanPayload(body: Record<string, unknown>, membershipNetworkId: string | null, userId: string) {
  return {
    business_id: "",
    network_id: membershipNetworkId,
    category: body.category,
    title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : null,
    day_of_week: Array.isArray(body.day_of_week) ? body.day_of_week : null,
    specific_date: typeof body.specific_date === "string" && body.specific_date ? body.specific_date : null,
    start_time: body.start_time,
    end_time: typeof body.end_time === "string" && body.end_time ? body.end_time : null,
    lead_minutes: body.lead_minutes === null || body.lead_minutes === undefined ? 10 : body.lead_minutes,
    timezone: typeof body.timezone === "string" && body.timezone ? body.timezone : undefined,
    active: body.active === undefined ? true : body.active,
    notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
    created_by: userId,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!UUID_RE.test(id) || !(await getBusinessMembership(user.id, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await createAdminClient()
      .from("business_known_departures")
      .select("*")
      .eq("business_id", id)
      .order("active", { ascending: false })
      .order("start_time", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ departures: data ?? [] });
  } catch (error) {
    logger.error("businesses: known departures list failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const membership = await getBusinessMembership(user.id, id);
    if (!membership || membership.role !== "admin") return NextResponse.json({ error: "Only business admins can add known departure times" }, { status: 403 });
    if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid business id" }, { status: 400 });
    const body = await request.json();
    const errors = validateKnownDeparture(body);
    if (Object.keys(errors).length) return NextResponse.json({ error: "Invalid known departure", fields: errors }, { status: 400 });
    const payload = cleanPayload(body, membership.network_id, user.id);
    payload.business_id = id;
    const { data, error } = await createAdminClient().from("business_known_departures").insert(payload).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ departure: data }, { status: 201 });
  } catch (error) {
    logger.error("businesses: known departure create failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
