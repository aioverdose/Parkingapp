import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { requireVideoAdmin } from "@/lib/video/admin-auth";
import { mockRenderProvider } from "@/lib/video/render-provider";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireVideoAdmin(request); if ("response" in auth) return auth.response;
  const { id } = await params; const db = createAdminClient();
  const { data: row, error: projectError } = await db.from("video_projects").select("*").eq("id", id).maybeSingle();
  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const { data: job, error } = await db.from("video_render_jobs").insert({ project_id: id, requested_by: auth.user.id, provider: mockRenderProvider.name, status: "queued", metadata: { configured: mockRenderProvider.configured } }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const result = await mockRenderProvider.enqueue({ id, title: row.title, prompt: row.prompt, status: row.status, aspectRatio: row.aspect_ratio, fps: row.fps, durationInFrames: row.duration_in_frames, voice: row.voice, music: row.music, brand: row.brand, scenes: row.scenes, createdAt: row.created_at, updatedAt: row.updated_at }, job.id);
  const { data: updated, error: updateError } = await db.from("video_render_jobs").update({ ...result, updated_at: new Date().toISOString() }).eq("id", job.id).select("*").single();
  await db.from("video_projects").update({ status: result.status === "completed" ? "completed" : "rendering", output_url: result.outputUrl ?? null, updated_at: new Date().toISOString() }).eq("id", id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ job: updated, configured: mockRenderProvider.configured, message: "Mock render job completed without producing an MP4. Configure a production renderer to generate downloadable video files." }, { status: 201 });
}
