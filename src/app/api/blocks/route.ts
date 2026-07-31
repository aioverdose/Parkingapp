import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get("target_id");

  const supabase = createAdminClient();

  if (targetId) {
    const { data } = await supabase
      .rpc("is_user_blocked", { check_user_id: targetId, by_user_id: user.id });
    return NextResponse.json({ blocked: !!data });
  }

  const { data } = await supabase
    .from("user_blocks")
    .select("blocked_id, created_at")
    .eq("blocker_id", user.id);

  return NextResponse.json({ blocks: data || [] });
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { blocked_id } = await request.json();
  if (!blocked_id || blocked_id === user.id) {
    return NextResponse.json({ error: "Invalid user to block" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("user_blocks")
    .insert({ blocker_id: user.id, blocked_id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const blocked_id = searchParams.get("blocked_id");

  if (!blocked_id) {
    return NextResponse.json({ error: "blocked_id is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", blocked_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
