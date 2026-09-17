import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.post_id !== "string" || !["support", "helpful"].includes(body.reaction)) return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
  const admin = createAdminClient();
  const { error } = await admin.from("community_reactions").upsert({ post_id: body.post_id, user_id: user.id, reaction: body.reaction }, { onConflict: "post_id,user_id" });
  if (error) return NextResponse.json({ error: "Could not save reaction" }, { status: 400 });
  return NextResponse.json({ success: true });
}
