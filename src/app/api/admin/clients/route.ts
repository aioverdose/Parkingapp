import { NextRequest, NextResponse } from "next/server";
import { requireClientFilesAdmin } from "@/lib/api/client-files-auth";

export async function GET(request: NextRequest) {
  const auth = await requireClientFilesAdmin(request);
  if ("response" in auth) return auth.response;
  const search = request.nextUrl.searchParams.get("search")?.trim();
  let query = auth.admin.from("client_files").select("*").is("deleted_at", null).order("updated_at", { ascending: false });
  if (search) query = query.or(`display_name.ilike.%${search.slice(0, 80)}%,internal_reference.ilike.%${search.slice(0, 80)}%,city.ilike.%${search.slice(0, 80)}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireClientFilesAdmin(request);
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const displayName = typeof body?.display_name === "string" ? body.display_name.trim() : "";
  if (!displayName || displayName.length > 160) return NextResponse.json({ error: "A client name between 1 and 160 characters is required" }, { status: 400 });
  const values = {
    display_name: displayName,
    client_type: typeof body?.client_type === "string" ? body.client_type : "Other",
    relationship_status: typeof body?.relationship_status === "string" ? body.relationship_status : "Researching",
    priority: typeof body?.priority === "string" ? body.priority : "Medium",
    confidentiality_level: typeof body?.confidentiality_level === "string" ? body.confidentiality_level : "Confidential",
    city: typeof body?.city === "string" ? body.city.trim() || null : null,
    region: typeof body?.region === "string" ? body.region.trim() || null : null,
    study_area_name: typeof body?.study_area_name === "string" ? body.study_area_name.trim() || null : null,
    primary_parking_challenge: typeof body?.primary_parking_challenge === "string" ? body.primary_parking_challenge.trim() || null : null,
    next_follow_up_at: typeof body?.next_follow_up_at === "string" ? body.next_follow_up_at : null,
    owner_user_id: auth.user.id,
    created_by: auth.user.id,
  };
  const { data, error } = await auth.admin.from("client_files").insert(values).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await auth.admin.from("client_file_access").insert({ client_file_id: data.id, user_id: auth.user.id, access_role: "owner" });
  await auth.admin.from("client_file_timeline_events").insert({ client_file_id: data.id, actor_user_id: auth.user.id, event_type: "client_file_created", summary: `Created client file ${data.display_name}` });
  return NextResponse.json({ client: data }, { status: 201 });
}
