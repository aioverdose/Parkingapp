import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { isSyntheticAccount } from "@/lib/testing/synthetic-account";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    const supabase = createAdminClient();
    const { data: me } = await supabase.from("users").select("email").eq("id", user.id).maybeSingle();
    const syntheticRequester = isSyntheticAccount(me?.email ?? user.email);

    const statusFilter =
      status === "all"
        ? ["pending", "offered", "confirmed_by_owner", "confirmed_by_seeker", "confirmed"]
        : status === "pending"
          ? ["pending", "offered"]
          : [status];

    const { data: matches, error } = await supabase
      .from("spot_matches")
      .select(`
        *,
        spot:spot_id(*),
        spot_owner:spot_owner_id(id, email, name, vehicle_type, schedule_arrival, schedule_departure),
        seeker:seeker_id(id, email, name, vehicle_type, schedule_arrival, schedule_departure)
      `)
      .or(`spot_owner_id.eq.${user.id},seeker_id.eq.${user.id}`)
      .in("status", statusFilter as ("pending" | "offered" | "confirmed_by_owner" | "confirmed_by_seeker" | "confirmed" | "rejected" | "offer_declined" | "offer_expired" | "expired")[])
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const uniqueByPair = new Map<string, (typeof matches)[number]>();
    for (const match of matches ?? []) {
      const counterpart = match.spot_owner_id === user.id ? match.seeker : match.spot_owner;
      if (isSyntheticAccount(counterpart?.email) !== syntheticRequester) continue;
      const pair = [match.spot_owner_id, match.seeker_id].sort().join(":");
      if (!uniqueByPair.has(pair)) uniqueByPair.set(pair, match);
    }
    return NextResponse.json({ matches: [...uniqueByPair.values()] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
