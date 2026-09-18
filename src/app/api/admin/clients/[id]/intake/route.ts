import { NextRequest, NextResponse } from "next/server";
import { requireClientFileAccess } from "@/lib/api/client-files-auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireClientFileAccess(request, id);
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const allowed = ["primary_contact_name", "primary_contact_role", "primary_contact_email", "primary_contact_phone", "decision_maker_contact", "operational_contact", "known_peak_periods", "known_upcoming_events", "existing_solutions", "known_stakeholders", "known_constraints", "known_data_sources", "why_relevant", "validation_questions", "potential_first_engagement", "budget_signal", "procurement_signal", "client_urgency", "decision_timeline", "success_definition", "internal_notes", "evidence_label"];
  const values = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)).map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 10000) : value]));
  const { data, error } = await auth.admin.from("client_file_intakes").upsert({ client_file_id: id, ...values, updated_by: auth.user.id, updated_at: new Date().toISOString() }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ intake: data });
}
