import { NextRequest, NextResponse } from "next/server";
import { requireClientFileAccess } from "@/lib/api/client-files-auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireClientFileAccess(request, id);
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Observation title is required" }, { status: 400 });
  const { data, error } = await auth.admin.from("client_observations").insert({ client_file_id: id, title, observer_user_id: auth.user.id, observed_at: typeof body?.observed_at === "string" ? body.observed_at : new Date().toISOString(), time_zone: typeof body?.time_zone === "string" ? body.time_zone : "America/Los_Angeles", study_area: body?.study_area ?? null, conditions: body?.conditions ?? null, raw_notes: typeof body?.raw_notes === "string" ? body.raw_notes.slice(0, 20000) : "", finding_summary: body?.finding_summary ?? null, evidence_label: body?.evidence_label ?? "Observed", confidence_level: body?.confidence_level ?? "Medium", follow_up_question: body?.follow_up_question ?? null }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await auth.admin.from("client_file_timeline_events").insert({ client_file_id: id, actor_user_id: auth.user.id, event_type: "observation_created", summary: `Added observation: ${title}` });
  return NextResponse.json({ observation: data }, { status: 201 });
}
