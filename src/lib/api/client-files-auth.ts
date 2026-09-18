import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";

export async function requireClientFilesAdmin(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "moderator") {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }
  return { admin, user, role: profile.role as "admin" | "moderator" } as const;
}

export async function requireClientFileAccess(request: NextRequest, clientFileId: string) {
  const auth = await requireClientFilesAdmin(request);
  if ("response" in auth) return auth;
  const { data: clientFile, error } = await auth.admin
    .from("client_files")
    .select("*")
    .eq("id", clientFileId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !clientFile) return { response: NextResponse.json({ error: "Client file not found" }, { status: 404 }) } as const;
  return { ...auth, clientFile } as const;
}
