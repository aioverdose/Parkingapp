import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { isSyntheticAccount } from "@/lib/testing/synthetic-account";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data: profile } = await supabase.from("users").select("email").eq("id", user.id).maybeSingle();
  const syntheticRequester = isSyntheticAccount(profile?.email ?? user.email);
  const notificationId = new URL(request.url).searchParams.get("id");
  let notificationQuery = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (notificationId) notificationQuery = notificationQuery.eq("id", notificationId);
  const { data: notifications, error } = await notificationQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const matchIds = [...new Set((notifications ?? []).map((notification) => notification.match_id).filter((id): id is string => Boolean(id)))];
  if (matchIds.length === 0) return NextResponse.json({ notifications: notifications ?? [] });

  const { data: matches } = await supabase.from("spot_matches").select("id, spot_owner_id, seeker_id").in("id", matchIds);
  const counterpartIds = [...new Set((matches ?? []).flatMap((match) => [match.spot_owner_id, match.seeker_id]).filter((id) => id !== user.id))];
  const { data: counterpartUsers } = counterpartIds.length
    ? await supabase.from("users").select("id, email").in("id", counterpartIds)
    : { data: [] as Array<{ id: string; email: string }> };
  const syntheticById = new Map((counterpartUsers ?? []).map((candidate) => [candidate.id, isSyntheticAccount(candidate.email)]));
  const allowedMatchIds = new Set((matches ?? []).filter((match) => {
    const counterpartId = match.spot_owner_id === user.id ? match.seeker_id : match.spot_owner_id;
    return syntheticById.get(counterpartId) === syntheticRequester;
  }).map((match) => match.id));

  return NextResponse.json({
    notifications: (notifications ?? []).filter((notification) => !notification.match_id || allowedMatchIds.has(notification.match_id)),
  });
}
