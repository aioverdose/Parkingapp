import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin.from("potential_matches").select("id, status, arriving_user_id, departing_user_id, distance_meters, time_overlap_minutes, match_confidence, expires_at, messenger_conversation_id, created_at, updated_at").or(`arriving_user_id.eq.${user.id},departing_user_id.eq.${user.id}`).in("status", ["potential", "accepted_by_arriving", "accepted_by_departing", "mutually_accepted"]).gt("expires_at", new Date().toISOString()).order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ matches: data ?? [] });
}
