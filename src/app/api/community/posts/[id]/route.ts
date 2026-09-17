import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { COMMUNITY_CATEGORIES, cleanCommunityText, moderateCommunityText } from "@/lib/community";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient();
  const { data: previous, error: lookupError } = await admin.from("community_posts").select("id, author_id, category, body, area_label, sponsored, status, created_at, updated_at").eq("id", id).eq("author_id", user.id).maybeSingle();
  if (lookupError) return NextResponse.json({ error: "Could not load post" }, { status: 400 });
  if (!previous) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const update: Record<string, string | null> = {};
  if (body.body !== undefined) {
    const text = cleanCommunityText(body.body, 2_000);
    if (!text) return NextResponse.json({ error: "body must be 1-2,000 characters" }, { status: 400 });
    const moderation = moderateCommunityText(text);
    if (moderation.result.decision === "blocked") return NextResponse.json({ error: moderation.result.user_facing_warning || "This post cannot be published" }, { status: 400 });
    update.body = text;
    update.status = moderation.result.decision === "flagged" ? "held" : previous.status;
    update.moderation_reason = moderation.result.requires_human_review ? moderation.evidence : null;
  }
  if (body.category !== undefined) {
    if (!COMMUNITY_CATEGORIES.includes(body.category)) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    update.category = body.category;
  }
  if (body.area_label !== undefined) {
    const area = cleanCommunityText(body.area_label, 120);
    if (!area) return NextResponse.json({ error: "Invalid area" }, { status: 400 });
    update.area_label = area;
  }
  if (!Object.keys(update).length) return NextResponse.json({ error: "No editable fields supplied" }, { status: 400 });

  const { data, error } = await admin.from("community_posts").update({ ...update, updated_at: new Date().toISOString() }).eq("id", id).eq("author_id", user.id).select("id, author_id, category, body, area_label, sponsored, status, created_at, updated_at").single();
  if (error) return NextResponse.json({ error: "Could not update post" }, { status: 400 });
  return NextResponse.json({ post: data, message: data.status === "held" ? "Your edit is waiting for a quick safety review." : "Post updated" });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin.from("community_posts").update({ status: "deleted", updated_at: new Date().toISOString() }).eq("id", id).eq("author_id", user.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not delete post" }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
