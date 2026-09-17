import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { cleanCommunityText } from "@/lib/community";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = await checkRateLimit(`community-report:${user.id}`, 10, 60 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Report limit reached" }, { status: 429 });
  const body = await request.json().catch(() => ({}));
  const postId = typeof body.post_id === "string" ? body.post_id : null;
  const commentId = typeof body.comment_id === "string" ? body.comment_id : null;
  const reason = cleanCommunityText(body.reason, 1_000);
  const category = typeof body.category === "string" && ["harassment", "spam", "threat", "fraud", "privacy", "other"].includes(body.category) ? body.category : "other";
  if ((!postId && !commentId) || (postId && commentId) || !reason) return NextResponse.json({ error: "A target and reason are required" }, { status: 400 });
  const admin = createAdminClient();
  const { error } = await admin.from("community_reports").insert({ post_id: postId, comment_id: commentId, reporter_id: user.id, category, reason });
  if (error) return NextResponse.json({ error: "This item may already be reported" }, { status: 400 });
  return NextResponse.json({ success: true }, { status: 201 });
}
