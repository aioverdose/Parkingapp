import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("notification_prefs")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const defaults: Record<string, boolean> = {
    match: true,
    claim: true,
    tip: true,
    agent: true,
    waitlist: true,
    promotional: false,
  };

  return NextResponse.json({
    preferences: { ...defaults, ...(data?.notification_prefs || {}) },
  });
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { preferences } = body as { preferences: Record<string, boolean> };

  if (!preferences || typeof preferences !== "object") {
    return NextResponse.json({ error: "preferences object is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("users")
    .update({ notification_prefs: preferences })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
