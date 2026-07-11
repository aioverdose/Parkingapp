import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    const supabase = createAdminClient();

    const { data: matches, error } = await supabase
      .from("spot_matches")
      .select(`
        *,
        spot:spot_id(*),
        spot_owner:spot_owner_id(id, name, vehicle_type),
        seeker:seeker_id(id, name, vehicle_type)
      `)
      .or(`spot_owner_id.eq.${user.id},seeker_id.eq.${user.id}`)
      .in("status", (status === "all" ? ["pending", "confirmed_by_owner", "confirmed_by_seeker", "confirmed"] : [status]) as ("pending" | "confirmed_by_owner" | "confirmed_by_seeker" | "confirmed" | "rejected" | "expired")[])
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ matches: matches ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
