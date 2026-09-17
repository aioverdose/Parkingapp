import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.author_id !== "string" || body.author_id === user.id) return NextResponse.json({ error: "Invalid author" }, { status: 400 });
  const { error } = await createAdminClient().from("community_mutes").upsert({ user_id: user.id, author_id: body.author_id }, { onConflict: "user_id,author_id" });
  if (error) return NextResponse.json({ error: "Could not mute author" }, { status: 400 });
  return NextResponse.json({ success: true });
}
