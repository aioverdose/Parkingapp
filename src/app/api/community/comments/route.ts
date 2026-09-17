import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { cleanCommunityText, moderateCommunityText } from "@/lib/community";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = await checkRateLimit(`community-comment:${user.id}`, 20, 60 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Commenting limit reached. Try again later." }, { status: 429 });
  const body = await request.json().catch(() => ({}));
  const postId = cleanCommunityText(body.post_id, 80);
  const text = cleanCommunityText(body.body, 1_000);
  if (!postId || !text) return NextResponse.json({ error: "A post and comment up to 1,000 characters are required" }, { status: 400 });
  const moderation = moderateCommunityText(text);
  if (moderation.result.decision === "blocked") return NextResponse.json({ error: moderation.result.user_facing_warning || "This comment cannot be posted" }, { status: 400 });
  const admin = createAdminClient();
  const { data: post } = await admin.from("community_posts").select("id").eq("id", postId).eq("status", "published").maybeSingle();
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  const { data, error } = await admin.from("community_comments").insert({ post_id: postId, author_id: user.id, body: text, status: moderation.result.decision === "flagged" ? "held" : "published", moderation_reason: moderation.result.requires_human_review ? moderation.evidence : null }).select("id, status").single();
  if (error) return NextResponse.json({ error: "Could not create comment" }, { status: 400 });
  return NextResponse.json({ comment: data, message: moderation.result.decision === "flagged" ? "Your comment is waiting for review." : "Comment posted" }, { status: 201 });
}
