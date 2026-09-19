import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { data: match, error } = await createAdminClient()
    .from("potential_matches")
    .select("id, status, arriving_user_id, departing_user_id, distance_meters, time_overlap_minutes, match_confidence, expires_at, messenger_conversation_id, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!match || (match.arriving_user_id !== user.id && match.departing_user_id !== user.id)) {
    return NextResponse.json({ error: "Potential match not found" }, { status: 404 });
  }
  if (match.status === "expired" || match.status === "declined" || match.status === "cancelled" || new Date(match.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "This potential match is no longer available or has expired." }, { status: 410 });
  }

  return NextResponse.json({ match });
}
