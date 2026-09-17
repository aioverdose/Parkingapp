import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { audit, requireExperienceAuth } from "@/lib/api/experience-auth";
import { SAFE_PRIVACY_DEFAULTS, validateCategory } from "@/lib/experience-validation";
import { APP_COLOR_PALETTES, EXPERIENCE_APPEARANCE_PRESETS } from "@/lib/experience-appearance";

const singletonResources = new Set(["profile-appearance", "community-settings", "privacy-defaults"]);
const tableFor = (resource: string) => resource === "profile-sections" ? "profile_section_configs" : resource === "feature-flags" ? "feature_flags" : resource === "categories" ? "explore_categories" : resource === "category-images" ? "category_images" : resource === "audit-logs" ? "admin_audit_logs" : resource.replaceAll("-", "_");
const json = (request: NextRequest) => request.json().catch(() => null) as Promise<Record<string, unknown> | null>;

export async function GET(request: NextRequest, context: { params: Promise<{ resource: string }> }) {
  const { resource } = await context.params;
  const auth = await requireExperienceAuth(request, "view");
  if (auth.response) return auth.response;
  const client = createAdminClient();
  if (singletonResources.has(resource)) {
    const { data, error } = await client.from(tableFor(resource)).select("*").eq("key", "default").maybeSingle();
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data });
  }
  let query = client.from(tableFor(resource)).select("*");
  if (resource === "profile-sections" || resource === "categories") query = query.order("sort_order", { ascending: true });
  if (resource === "audit-logs") query = query.order("created_at", { ascending: false }).limit(200);
  const { data, error } = await query;
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest, context: { params: Promise<{ resource: string }> }) {
  const { resource } = await context.params;
  const auth = await requireExperienceAuth(request, "edit");
  if (auth.response) return auth.response;
  if (resource !== "categories" && resource !== "category-images") return NextResponse.json({ error: "Unsupported resource" }, { status: 405 });
  const body = await json(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  if (resource === "categories") { const error = validateCategory(body); if (error) return NextResponse.json({ error }, { status: 400 }); }
  if (resource === "category-images" && typeof body.alt_text !== "string") return NextResponse.json({ error: "alt_text is required" }, { status: 400 });
   const allowed = resource === "categories" ? ["slug","name","description","long_description","icon_name","image_id","theme","badge","status","audience","geographic_scope","geographic_scope_id","featured","followable","notifications_enabled","sort_order","expires_at","content_settings","seo_title","seo_description"] : ["filename","image_url","thumbnail_url","storage_path","thumbnail_path","alt_text","caption","attribution","attribution_url","source","source_url","photographer_name","photographer_url","license_name","license_url","attribution_required","mime_type","file_size","width","height","aspect_ratio","usage_tags","status"];
  const values = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
  const { data, error } = await createAdminClient().from(tableFor(resource)).insert({ ...values, ...(resource === "category-images" ? { created_by: auth.auth.user.id } : {}) }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await audit(auth.auth, "create", resource, data.id, null, data);
  return NextResponse.json({ data }, { status: 201 });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ resource: string }> }) {
  const { resource } = await context.params;
  const body = await json(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const permission = body.action === "publish" || body.action === "archive" || body.action === "delete" ? body.action === "delete" || body.action === "archive" ? "delete" : "publish" : "edit";
  const auth = await requireExperienceAuth(request, permission);
  if (auth.response) return auth.response;
  const client = createAdminClient();
  const table = tableFor(resource);
  const id = typeof body.id === "string" ? body.id : "default";
  if (resource === "categories" && body.action !== "delete") { const error = validateCategory(body); if (error) return NextResponse.json({ error }, { status: 400 }); }
  if (resource === "privacy-defaults" && body.action !== "reset") {
    const values = { ...SAFE_PRIVACY_DEFAULTS, ...(body.draft && typeof body.draft === "object" ? body.draft : {}) };
    if ((values as Record<string, unknown>).address === "public" || (values as Record<string, unknown>).exact_location === "public") return NextResponse.json({ error: "Exact addresses and locations cannot be public" }, { status: 400 });
  }
  if (resource === "profile-appearance") {
    const appearance = (body.draft && typeof body.draft === "object" ? body.draft : body) as Record<string, unknown>;
    if (typeof appearance.preset !== "string" || !EXPERIENCE_APPEARANCE_PRESETS.some((preset) => preset.id === appearance.preset)) return NextResponse.json({ error: "Choose an approved visual preset" }, { status: 400 });
    if (typeof appearance.palette !== "string" || !APP_COLOR_PALETTES.some((palette) => palette.id === appearance.palette)) return NextResponse.json({ error: "Choose an approved app-wide color palette" }, { status: 400 });
  }
  if (body.action === "delete") {
    if (resource === "categories" && (typeof body.reason !== "string" || body.reason.trim().length < 3)) return NextResponse.json({ error: "A reason is required to archive a category" }, { status: 400 });
    const { data: previous } = await client.from(table).select("*").eq("id", id).maybeSingle();
    const { error } = await client.from(table).update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await audit(auth.auth, "archive", resource, id, previous, { status: "archived" }, typeof body.reason === "string" ? body.reason.trim() : undefined); return NextResponse.json({ ok: true });
  }
  if (body.action === "reset") {
    const defaults = resource === "privacy-defaults" ? SAFE_PRIVACY_DEFAULTS : {};
    const { data, error } = await client.from(table).update({ draft: defaults, updated_by: auth.auth.user.id, updated_at: new Date().toISOString() }).eq("key", "default").select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 }); return NextResponse.json({ data });
  }
  if (body.action === "publish") {
    const { data: previous } = await client.from(table).select("*").eq(resource === "profile-sections" || resource === "categories" ? "id" : "key", id).maybeSingle();
    const patch = resource === "profile-sections" ? { status: "published", published_at: new Date().toISOString(), updated_by: auth.auth.user.id } : resource === "categories" ? { status: "published", updated_at: new Date().toISOString() } : { published: body.draft ?? body.published ?? {}, status: "published", updated_by: auth.auth.user.id, updated_at: new Date().toISOString() };
    const { data, error } = await client.from(table).update(patch).eq(resource === "profile-sections" || resource === "categories" ? "id" : "key", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 }); await audit(auth.auth, "publish", resource, id, previous, data); return NextResponse.json({ data });
  }
  const key = resource === "profile-sections" || resource === "categories" || resource === "category-images" ? "id" : "key";
  const { data: previous } = await client.from(table).select("*").eq(key, id).maybeSingle();
  const patch = resource === "profile-sections" || resource === "categories" || resource === "category-images" || resource === "feature-flags" ? Object.fromEntries(Object.entries(body).filter(([k]) => !["id","action"].includes(k))) : { draft: body.draft ?? body, updated_by: auth.auth.user.id };
  const { data, error } = await client.from(table).update({ ...patch, updated_at: new Date().toISOString(), ...(resource === "profile-sections" || resource === "feature-flags" ? { updated_by: auth.auth.user.id } : {}) }).eq(key, id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 }); await audit(auth.auth, "update", resource, id, previous, data); return NextResponse.json({ data });
}

export const PATCH = PUT;
export async function DELETE(request: NextRequest, context: { params: Promise<{ resource: string }> }) {
  const body = await request.json().catch(() => ({}));
  const rewritten = new NextRequest(request.url, { method: "PUT", headers: request.headers, body: JSON.stringify({ ...(body as Record<string, unknown>), action: "delete" }) });
  return PUT(rewritten, context);
}
