import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { createAdminClient } from "@/lib/supabaseAdmin";

const variants = ["classic", "readiness", "network"] as const;
type ProfileVariant = (typeof variants)[number];

export async function GET(request: NextRequest) {
  if (!(await getAuthenticatedUser(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data } = await createAdminClient().from("platform_settings").select("value").eq("key", "profile_variant").maybeSingle();
  const value = data?.value;
  const variant = typeof value === "string" && variants.includes(value as ProfileVariant) ? value : "classic";
  return NextResponse.json({ variant });
}
