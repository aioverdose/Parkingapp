import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { endpoint, p256dh, auth } = await request.json();
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Missing push subscription fields" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Upsert: delete old subscription for same endpoint, insert new
    await supabase.from("device_push_subscriptions").delete().eq("endpoint", endpoint);

    const { error } = await supabase.from("device_push_subscriptions").insert({
      user_id: user.id,
      endpoint,
      p256dh,
      auth_key: auth,
      user_agent: request.headers.get("user-agent"),
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
