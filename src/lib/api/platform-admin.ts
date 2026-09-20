import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { getStagingRuntimeMetadata } from "@/lib/matching/matching-observability";

export async function requireStagingPlatformAdmin(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;

  const runtime = getStagingRuntimeMetadata();
  if (!runtime.approved) {
    return { response: NextResponse.json({ error: "Staging context required" }, { status: 403 }) } as const;
  }

  const { data: profile, error } = await createAdminClient()
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error || profile?.role !== "admin") {
    return { response: NextResponse.json({ error: "Admin access required" }, { status: 403 }) } as const;
  }

  return { user, runtime } as const;
}
