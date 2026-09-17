import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

async function getAdmin(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const supabase = createAdminClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "moderator") return null;
  return supabase;
}

export async function GET(request: NextRequest) {
  const supabase = await getAdmin(request);
  if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: matches, error } = await supabase
    .from("spot_matches")
    .select("id, status, created_at, updated_at, spot_id, spot:spot_id(id, address, departure_time, return_time, relay_mode), spot_owner:spot_owner_id(id, name, email), seeker:seeker_id(id, name, email)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ matches: matches ?? [] });
}

export async function DELETE(request: NextRequest) {
  const supabase = await getAdmin(request);
  if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: matches, error: readError } = await supabase.from("spot_matches").select("id");
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  const ids = (matches ?? []).map((match) => match.id);
  if (ids.length === 0) return NextResponse.json({ cleared: 0 });

  const { error: notificationError } = await supabase.from("notifications").delete().in("match_id", ids);
  if (notificationError) return NextResponse.json({ error: notificationError.message }, { status: 500 });
  const { error: deleteError } = await supabase.from("spot_matches").delete().in("id", ids);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  return NextResponse.json({ cleared: ids.length });
}
