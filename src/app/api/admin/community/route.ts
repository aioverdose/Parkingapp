import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { audit, requireExperienceAuth } from "@/lib/api/experience-auth";
import { COMMUNITY_CATEGORIES, cleanCommunityText, moderateCommunityText, redactCommunityArea } from "@/lib/community";

export async function GET(request: NextRequest) {
  const checked = await requireExperienceAuth(request); if ("response" in checked) return checked.response;
  const params = new URL(request.url).searchParams, page = Math.max(1, Number(params.get("page") || 1)), limit = Math.min(50, Math.max(1, Number(params.get("limit") || 20))), search = params.get("search")?.trim(), status = params.get("status"), category = params.get("category");
  const admin = createAdminClient(); let query = (admin as any).from("community_posts").select("id, author_id, category, body, area_label, sponsored, status, moderation_reason, created_at, updated_at, users:author_id(username, name, avatar_color, avatar_preset)", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * limit, page * limit - 1);
  if (search) query = query.or(`body.ilike.%${search.replace(/[,()]/g, " ")}%,area_label.ilike.%${search.replace(/[,()]/g, " ")}%`);
  if (["published", "held", "deleted", "archived"].includes(status || "")) query = query.eq("status", status);
  if (COMMUNITY_CATEGORIES.includes(category as any)) query = query.eq("category", category);
  const { data, error, count } = await query; if (error) return NextResponse.json({ error: "Could not load community posts" }, { status: 500 });
  const ids = (data ?? []).map((post: any) => post.id);
  const [{ data: comments }, { data: media }] = await Promise.all([ids.length ? (admin as any).from("community_comments").select("post_id").in("post_id", ids) : Promise.resolve({ data: [] }), ids.length ? (admin as any).from("community_post_media").select("id, post_id, kind, storage_path, media_url, mime_type").in("post_id", ids) : Promise.resolve({ data: [] })]);
  return NextResponse.json({ posts: (data ?? []).map((post: any) => ({ id: post.id, author: post.users, category: post.category, body: post.body, area_label: redactCommunityArea(post.area_label), sponsored: post.sponsored, status: post.status, moderation_reason: post.moderation_reason, created_at: post.created_at, updated_at: post.updated_at, comments_count: (comments ?? []).filter((c: any) => c.post_id === post.id).length, media: (media ?? []).filter((m: any) => m.post_id === post.id).map((m: any) => ({ id: m.id, kind: m.kind, mime_type: m.mime_type, url: m.media_url || admin.storage.from("community-media").getPublicUrl(m.storage_path).data.publicUrl })) })), page, limit, total: count ?? 0 });
}

export async function POST(request: NextRequest) {
  const checked = await requireExperienceAuth(request, "edit"); if ("response" in checked) return checked.response;
  const body = await request.json().catch(() => ({}));
  const text = cleanCommunityText(body.body, 2_000), area = cleanCommunityText(body.area_label, 120), category = body.category;
  if (!text || !area || !COMMUNITY_CATEGORIES.includes(category)) return NextResponse.json({ error: "Category, area_label, and body are required" }, { status: 400 });
  const status = body.status || "draft";
  if (!["draft", "published"].includes(status)) return NextResponse.json({ error: "Admin create status must be draft or published" }, { status: 400 });
  const reason = cleanCommunityText(body.reason, 500);
  if (status === "published" && !reason) return NextResponse.json({ error: "A reason is required when publishing an admin post" }, { status: 400 });
  const moderation = moderateCommunityText(text);
  if (moderation.result.decision === "blocked") return NextResponse.json({ error: moderation.result.user_facing_warning || "Body failed moderation" }, { status: 400 });
  const admin = createAdminClient();
  let authorId = checked.auth.user.id;
  if (body.author_id !== undefined) {
    if (checked.auth.role !== "admin") return NextResponse.json({ error: "Only admins may choose an explicit author" }, { status: 403 });
    if (typeof body.author_id !== "string") return NextResponse.json({ error: "author_id must be a user id" }, { status: 400 });
    const { data: author } = await admin.from("users").select("id").eq("id", body.author_id).maybeSingle();
    if (!author) return NextResponse.json({ error: "Author user not found" }, { status: 400 });
    authorId = body.author_id;
  }
  const finalStatus = moderation.result.decision === "flagged" ? "held" : status;
  const { data, error } = await admin.from("community_posts").insert({ author_id: authorId, category, body: text, area_label: area, sponsored: body.sponsored === true, status: finalStatus, moderation_reason: moderation.result.requires_human_review ? moderation.evidence : reason }).select("id, author_id, category, body, area_label, sponsored, status, moderation_reason, created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await audit(checked.auth, "create", "community_post", data.id, null, data, reason || undefined);
  return NextResponse.json({ post: data, message: finalStatus === "held" ? "Post created and held for moderation." : "Post created." }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const checked = await requireExperienceAuth(request, "edit"); if ("response" in checked) return checked.response;
  const body = await request.json().catch(() => ({})), id = cleanCommunityText(body.id, 80), admin = createAdminClient(); if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const { data: previous } = await (admin as any).from("community_posts").select("*").eq("id", id).maybeSingle(); if (!previous) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  const update: Record<string, string> = {};
  if (body.body !== undefined) { const text = cleanCommunityText(body.body, 2_000); if (!text) return NextResponse.json({ error: "body must be 1-2,000 characters" }, { status: 400 }); const moderation = moderateCommunityText(text); if (moderation.result.decision === "blocked") return NextResponse.json({ error: "Body failed moderation" }, { status: 400 }); update.body = text; update.moderation_reason = moderation.result.requires_human_review ? moderation.evidence : ""; }
  if (body.category !== undefined) { if (!COMMUNITY_CATEGORIES.includes(body.category)) return NextResponse.json({ error: "Invalid category" }, { status: 400 }); update.category = body.category; }
  if (body.area_label !== undefined) { const area = cleanCommunityText(body.area_label, 120); if (!area) return NextResponse.json({ error: "Invalid area" }, { status: 400 }); update.area_label = area; }
  if (body.status !== undefined) { if (!["published", "held", "archived"].includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 }); if (body.status !== previous.status && !cleanCommunityText(body.reason, 500)) return NextResponse.json({ error: "A reason is required for status changes" }, { status: 400 }); update.status = body.status; }
  if (!Object.keys(update).length) return NextResponse.json({ error: "No editable fields supplied" }, { status: 400 });
  const { data, error } = await (admin as any).from("community_posts").update({ ...update, updated_at: new Date().toISOString() }).eq("id", id).select("id, category, body, area_label, status, updated_at").single(); if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await audit(checked.auth, update.status ? "moderate" : "update", "community_post", id, previous, data, update.status ? body.reason : undefined); return NextResponse.json({ post: data });
}

export async function DELETE(request: NextRequest) {
  const checked = await requireExperienceAuth(request, "delete"); if ("response" in checked) return checked.response;
  const body = await request.json().catch(() => ({})), id = cleanCommunityText(body.id, 80), reason = cleanCommunityText(body.reason, 500); if (!id || !reason) return NextResponse.json({ error: "id and reason are required" }, { status: 400 });
  const admin = createAdminClient(), { data: previous } = await (admin as any).from("community_posts").select("*").eq("id", id).maybeSingle(); if (!previous) return NextResponse.json({ error: "Post not found" }, { status: 404 });
   const { error } = await (admin as any).from("community_posts").update({ status: "deleted", updated_at: new Date().toISOString() }).eq("id", id); if (error) return NextResponse.json({ error: error.message }, { status: 400 }); await audit(checked.auth, "delete", "community_post", id, previous, { status: "deleted" }, reason); return NextResponse.json({ ok: true });
}
