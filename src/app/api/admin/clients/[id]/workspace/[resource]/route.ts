import { NextRequest, NextResponse } from "next/server";
import { requireClientFileAccess } from "@/lib/api/client-files-auth";

const resourceMap = {
  assessments: "client_file_assessments",
  opportunities: "client_file_opportunities",
  pilots: "client_file_pilots",
  meetings: "client_file_meetings",
  tasks: "client_file_tasks",
  resources: "client_file_resources",
} as const;

const fields: Record<keyof typeof resourceMap, string[]> = {
  assessments: ["framework", "section_key", "plain_language_assessment", "evidence_collected", "observations", "stakeholder_input", "known_risks", "opportunity_score", "confidence_level", "recommended_action", "open_questions", "data_sensitivity", "data_needed", "data_not_needed", "retention_proposal", "accessibility_implications", "fairness_implications", "mitigation_notes"],
  opportunities: ["title", "opportunity_type", "problem_addressed", "evidence_supporting", "affected_stakeholders", "client_value", "user_value", "privacy_considerations", "accessibility_considerations", "estimated_effort", "estimated_timeline", "risk_level", "confidence_level", "status", "recommended_next_step"],
  pilots: ["title", "status", "problem", "hypothesis", "target_users", "pilot_geography", "duration_text", "start_at", "end_at", "time_zone", "features_included", "features_excluded", "operating_owner", "participant_communications", "data_collected", "data_not_collected", "accessibility_plan", "safety_plan", "baseline_conditions", "success_metrics", "decision_criteria", "stop_criteria", "risks", "assumptions"],
  meetings: ["title", "meeting_type", "starts_at", "ends_at", "time_zone", "participants", "agenda", "notes", "decisions", "follow_up"],
  tasks: ["title", "description", "status", "priority", "due_at", "assigned_to", "completed_at"],
  resources: ["title", "resource_type", "source_organization", "source_url", "publication_date", "summary", "key_takeaways", "reliability_level", "relevant_framework", "date_accessed", "notes"],
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; resource: string }> }) {
  const { id, resource } = await params;
  const auth = await requireClientFileAccess(request, id);
  if ("response" in auth) return auth.response;
  if (!(resource in resourceMap)) return NextResponse.json({ error: "Unknown workspace section" }, { status: 404 });
  const table = resourceMap[resource as keyof typeof resourceMap];
  const { data, error } = await auth.admin.from(table).select("*").eq("client_file_id", id).order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ records: data ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; resource: string }> }) {
  const { id, resource } = await params;
  const auth = await requireClientFileAccess(request, id);
  if ("response" in auth) return auth.response;
  if (!(resource in resourceMap)) return NextResponse.json({ error: "Unknown workspace section" }, { status: 404 });
  const key = resource as keyof typeof resourceMap;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const values = Object.fromEntries(Object.entries(body).filter(([name]) => fields[key].includes(name)).map(([name, value]) => [name, typeof value === "string" ? value.slice(0, 20000) : value]));
  if (key === "assessments") values.client_file_id = id;
  else values.client_file_id = id;
  values.created_by = auth.user.id;
  const table = resourceMap[key];
  const query = key === "assessments"
    ? auth.admin.from(table).upsert(values, { onConflict: "client_file_id,framework,section_key" })
    : auth.admin.from(table).insert(values);
  const { data, error } = await query.select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await auth.admin.from("client_file_timeline_events").insert({ client_file_id: id, actor_user_id: auth.user.id, event_type: `client_${resource}_updated`, summary: `Updated ${resource.replaceAll("-", " ")}` });
  return NextResponse.json({ record: data }, { status: 201 });
}
