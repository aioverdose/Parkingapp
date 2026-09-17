import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { COMMUNITY_CATEGORIES, cleanCommunityText, moderateCommunityText } from "@/lib/community";
import { getCommunityControl } from "@/lib/community-control";

export async function GET(request: NextRequest) {
  const control = await getCommunityControl();
  if (!control.feed_enabled) return NextResponse.json({ error: "The community feed is currently disabled by the community team." }, { status: 403 });
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const category = new URL(request.url).searchParams.get("category");
  const admin = createAdminClient();
  const { data: muted } = await admin.from("community_mutes").select("author_id").eq("user_id", user.id);
  const mutedIds = (muted ?? []).map((row) => row.author_id);
  let query = admin.from("community_posts").select("id, author_id, category, body, area_label, sponsored, created_at, users:author_id(username, name, avatar_color, avatar_preset, vehicle_type)").eq("status", "published").order("created_at", { ascending: false }).limit(50);
  if (COMMUNITY_CATEGORIES.includes(category as typeof COMMUNITY_CATEGORIES[number])) query = query.eq("category", category);
  const { data: posts, error } = await query;
  if (error) return NextResponse.json({ error: "Could not load the community feed" }, { status: 500 });
  const visible = (posts ?? []).filter((post) => !mutedIds.includes(post.author_id));
  const ids = visible.map((post) => post.id);
  const [{ data: comments }, { data: reactions }, { data: media }] = await Promise.all([
    ids.length ? admin.from("community_comments").select("id, post_id, author_id, body, created_at, users:author_id(username, name, avatar_color, avatar_preset, vehicle_type)").in("post_id", ids).eq("status", "published").order("created_at", { ascending: true }) : Promise.resolve({ data: [] }),
    ids.length ? admin.from("community_reactions").select("post_id, user_id, reaction").in("post_id", ids) : Promise.resolve({ data: [] }),
     ids.length ? admin.from("community_post_media").select("id, post_id, kind, storage_path, media_url, mime_type, size_bytes, created_at").in("post_id", ids).order("created_at", { ascending: true }) : Promise.resolve({ data: [] }),
  ]);
   return NextResponse.json({ posts: visible.map((post) => ({ ...post, comments: (comments ?? []).filter((comment) => comment.post_id === post.id), reactions: (reactions ?? []).filter((reaction) => reaction.post_id === post.id), media: (media ?? []).filter((item) => item.post_id === post.id).map((item) => ({ ...item, url: item.media_url || admin.storage.from("community-media").getPublicUrl(item.storage_path).data.publicUrl })), })) });
}

export async function POST(request: NextRequest) {
  const control = await getCommunityControl();
  if (!control.feed_enabled) return NextResponse.json({ error: "The community feed is currently disabled by the community team." }, { status: 403 });
  if (!control.settings.composer_enabled) return NextResponse.json({ error: "The community composer is currently disabled." }, { status: 403 });
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = await checkRateLimit(`community-post:${user.id}`, 5, 60 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Posting limit reached. Try again later." }, { status: 429 });
  const body = await request.json().catch(() => ({}));
  const text = cleanCommunityText(body.body, 2_000);
  const area = cleanCommunityText(body.area_label, 120);
  const category = body.category as string;
  if (!text || !area || !COMMUNITY_CATEGORIES.includes(category as typeof COMMUNITY_CATEGORIES[number])) return NextResponse.json({ error: "Category, area, and a post up to 2,000 characters are required" }, { status: 400 });
  const moderation = moderateCommunityText(text);
  if (moderation.result.decision === "blocked") return NextResponse.json({ error: moderation.result.user_facing_warning || "This post cannot be published" }, { status: 400 });
  const admin = createAdminClient();
   const { data, error } = await admin.from("community_posts").insert({ author_id: user.id, category, body: text, area_label: area, sponsored: category === "business" && body.sponsored === true, status: control.settings.require_moderation || moderation.result.decision === "flagged" ? "held" : "published", moderation_reason: control.settings.require_moderation || moderation.result.requires_human_review ? moderation.evidence || "Queued for moderation" : null }).select("id, status").single();
  if (error) return NextResponse.json({ error: "Could not create post" }, { status: 400 });
  return NextResponse.json({ post: data, message: moderation.result.decision === "flagged" ? "Your post is waiting for a quick safety review." : "Post published" }, { status: 201 });
}
