import { NextRequest, NextResponse } from "next/server";
import { requireClientFileAccess } from "@/lib/api/client-files-auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireClientFileAccess(request, id);
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Stakeholder name is required" }, { status: 400 });
  const { data, error } = await auth.admin.from("client_stakeholders").insert({ client_file_id: id, name, organization: body?.organization ?? null, stakeholder_group: body?.stakeholder_group ?? null, role: body?.role ?? null, interest_level: body?.interest_level ?? null, influence_level: body?.influence_level ?? null, decision_maker: body?.decision_maker === true, needs: body?.needs ?? null, concerns: body?.concerns ?? null, known_position: body?.known_position ?? null, project_role: body?.project_role ?? null, evidence_label: body?.evidence_label ?? "Reported", created_by: auth.user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await auth.admin.from("client_file_timeline_events").insert({ client_file_id: id, actor_user_id: auth.user.id, event_type: "stakeholder_created", summary: `Added stakeholder: ${name}` });
  return NextResponse.json({ stakeholder: data }, { status: 201 });
}
