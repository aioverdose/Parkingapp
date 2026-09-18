import { NextRequest, NextResponse } from "next/server";
import { requireClientFileAccess } from "@/lib/api/client-files-auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireClientFileAccess(request, id);
  if (!("clientFile" in auth)) return auth.response;
  const [intake, observations, stakeholders, timeline] = await Promise.all([
    auth.admin.from("client_file_intakes").select("*").eq("client_file_id", id).maybeSingle(),
    auth.admin.from("client_observations").select("*").eq("client_file_id", id).is("deleted_at", null).order("observed_at", { ascending: false }),
    auth.admin.from("client_stakeholders").select("*").eq("client_file_id", id).is("deleted_at", null).order("created_at", { ascending: false }),
    auth.admin.from("client_file_timeline_events").select("*").eq("client_file_id", id).order("created_at", { ascending: false }).limit(100),
  ]);
  return NextResponse.json({ client: auth.clientFile, intake: intake.data, observations: observations.data ?? [], stakeholders: stakeholders.data ?? [], timeline: timeline.data ?? [] });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireClientFileAccess(request, id);
  if (!("clientFile" in auth)) return auth.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  if (body.action === "archive") {
    if (auth.role !== "admin") return NextResponse.json({ error: "Admin role required" }, { status: 403 });
    const { data, error } = await auth.admin.from("client_files").update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await auth.admin.from("client_file_timeline_events").insert({ client_file_id: id, actor_user_id: auth.user.id, event_type: "client_file_archived", summary: `Archived client file ${auth.clientFile.display_name}` });
    return NextResponse.json({ client: data });
  }
  const allowed = ["display_name", "legal_organization_name", "client_type", "relationship_status", "engagement_status", "priority", "confidentiality_level", "city", "region", "country", "primary_time_zone", "study_area_name", "study_area_type", "study_boundary_notes", "address_or_general_location", "latitude", "longitude", "map_privacy_level", "primary_parking_challenge", "initial_problem_statement", "initial_hypothesis", "source_of_lead", "lead_date", "discovery_date", "last_contacted_at", "next_follow_up_at"];
  const values = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
  if (Object.keys(values).length === 0) return NextResponse.json({ error: "No editable fields supplied" }, { status: 400 });
  const { data, error } = await auth.admin.from("client_files").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await auth.admin.from("client_file_timeline_events").insert({ client_file_id: id, actor_user_id: auth.user.id, event_type: "client_file_updated", summary: `Updated client file ${auth.clientFile.display_name}` });
  return NextResponse.json({ client: data });
}
