import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { audit, requireExperienceAuth } from "@/lib/api/experience-auth";

export async function GET(request: NextRequest) {
  const checked = await requireExperienceAuth(request); if ("response" in checked) return checked.response;
  const params = new URL(request.url).searchParams, jobId = params.get("job_id"), admin = createAdminClient();
  const { data: jobs, error } = await (admin as any).from("parking_research_jobs").select("*").order("created_at", { ascending: false }).limit(50); if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let recordsQuery = (admin as any).from("parking_research_records").select("*").order("created_at", { ascending: false }).limit(500); if (jobId) recordsQuery = recordsQuery.eq("job_id", jobId);
  const { data: records, error: recordsError } = await recordsQuery; if (recordsError) return NextResponse.json({ error: recordsError.message }, { status: 500 });
  return NextResponse.json({ jobs: jobs ?? [], records: records ?? [] });
}

export async function PATCH(request: NextRequest) {
  const checked = await requireExperienceAuth(request, "edit"); if ("response" in checked) return checked.response;
  const body = await request.json().catch(() => ({})), id = typeof body.id === "string" ? body.id : "", action = body.action, reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!id || !["approve", "archive", "import"].includes(action) || !reason) return NextResponse.json({ error: "id, valid action, and reason are required" }, { status: 400 });
  const admin = createAdminClient(), { data: previous } = await (admin as any).from("parking_research_records").select("*").eq("id", id).maybeSingle(); if (!previous) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  if (action === "import" && checked.auth.role !== "admin") return NextResponse.json({ error: "Admin role required to import" }, { status: 403 });
  const status = action === "archive" ? "archived" : "approved";
  const { data, error } = await (admin as any).from("parking_research_records").update({ status, updated_at: new Date().toISOString(), notes: previous.notes ? `${previous.notes}\nReview: ${reason}` : `Review: ${reason}` }).eq("id", id).select("*").single(); if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (action === "approve" || action === "import") await (admin as any).from("parking_research_jobs").update({ status: action === "import" ? "imported" : "reviewed", updated_at: new Date().toISOString() }).eq("id", previous.job_id);
  if (action === "import") {
    const { data: job } = await (admin as any).from("parking_research_jobs").select("city, state_country").eq("id", previous.job_id).maybeSingle();
    if (!job) return NextResponse.json({ error: "Research job not found" }, { status: 404 });
    const { error: importError } = await (admin as any).from("parking_information").upsert({
      research_record_id: previous.id,
      city: job.city,
      state_country: job.state_country,
      record_type: previous.record_type,
      name: previous.name,
      address_area: previous.address_area,
      latitude: previous.lat,
      longitude: previous.lng,
      hours: previous.hours,
      pricing: previous.pricing,
      restrictions: previous.restrictions,
      source_url: previous.source_url,
      source_name: previous.source_name,
      confidence: previous.confidence,
      verified_at: previous.verified_at || new Date().toISOString(),
      status: "published",
      imported_by: checked.auth.user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "research_record_id" });
    if (importError) return NextResponse.json({ error: "Could not publish imported parking information", detail: importError.message }, { status: 400 });
  }
  await audit(checked.auth, action, "parking_research_record", id, previous, data, reason);
  return NextResponse.json({ record: data, imported: action === "import", message: action === "import" ? "Approved and marked ready for a later city-specific adapter; no public table was changed." : undefined });
}
