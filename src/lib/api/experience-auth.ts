import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { createAdminClient } from "@/lib/supabaseAdmin";
export type ExperienceAuth = { user: { id: string }; role: "admin" | "moderator" };
export async function requireExperienceAuth(request: NextRequest, permission: "view" | "edit" | "publish" | "delete" = "view") {
  const user = await getAuthenticatedUser(request);
  if (!user) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  const { data } = await createAdminClient().from("users").select("role").eq("id", user.id).maybeSingle();
  const role = data?.role as ExperienceAuth["role"] | undefined;
  if (role !== "admin" && role !== "moderator") return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  if ((permission === "publish" || permission === "delete") && role !== "admin") return { response: NextResponse.json({ error: "Admin role required" }, { status: 403 }) } as const;
  return { auth: { user: { id: user.id }, role } as ExperienceAuth } as const;
}
export async function audit(auth: ExperienceAuth, action: string, targetType: string, targetId: string | null, previousValue: unknown, newValue: unknown, reason?: string) {
  await createAdminClient().from("admin_audit_logs").insert({ actor_id: auth.user.id, action, target_type: targetType, target_id: targetId, previous_value: previousValue, new_value: newValue, reason, status: "success" });
}
