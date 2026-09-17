import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { createAdminClient } from "@/lib/supabaseAdmin";

const variants = ["classic", "readiness", "network"] as const;
type ProfileVariant = (typeof variants)[number];

async function authorized(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: profile } = await createAdminClient().from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "moderator") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}

export async function GET(request: NextRequest) {
  const auth = await authorized(request);
  if (auth.error) return auth.error;
  const { data } = await createAdminClient().from("platform_settings").select("value").eq("key", "profile_variant").maybeSingle();
  const value = data?.value;
  const variant = typeof value === "string" && variants.includes(value as ProfileVariant) ? value : "classic";
  return NextResponse.json({ variant });
}

export async function PUT(request: NextRequest) {
  const auth = await authorized(request);
  if (auth.error) return auth.error;
  let body: { variant?: unknown };
  try { body = await request.json() as { variant?: unknown }; } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (typeof body.variant !== "string" || !variants.includes(body.variant as ProfileVariant)) {
    return NextResponse.json({ error: "variant must be classic, readiness, or network" }, { status: 400 });
  }
  const { error } = await createAdminClient().from("platform_settings").upsert({ key: "profile_variant", value: body.variant, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ variant: body.variant });
}
