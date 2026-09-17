import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { requireVideoAdmin } from "@/lib/video/admin-auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireVideoAdmin(request); if ("response" in auth) return auth.response;
  const { id } = await params;
  const { data, error } = await createAdminClient().from("video_render_jobs").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Render job not found" }, { status: 404 });
  return NextResponse.json({ job: data });
}
