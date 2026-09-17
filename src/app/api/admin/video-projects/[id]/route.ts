import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { requireVideoAdmin } from "@/lib/video/admin-auth";
import { videoProjectPayloadSchema } from "@/lib/video/types";

function toProject(row: any) { return { id: row.id, title: row.title, prompt: row.prompt, status: row.status, aspectRatio: row.aspect_ratio, fps: row.fps, durationInFrames: row.duration_in_frames, voice: row.voice, music: row.music, brand: row.brand, scenes: row.scenes, outputUrl: row.output_url ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at }; }

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireVideoAdmin(request); if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = videoProjectPayloadSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid video project", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    const p = parsed.data;
    const { data, error } = await createAdminClient().from("video_projects").update({ title: p.title, prompt: p.prompt, status: p.status ?? "draft", aspect_ratio: p.aspectRatio, fps: p.fps, duration_in_frames: p.durationInFrames, voice: p.voice, music: p.music, brand: p.brand, scenes: p.scenes, updated_at: new Date().toISOString() }).eq("id", id).select("*").maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json({ project: toProject(data) });
  } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireVideoAdmin(request); if ("response" in auth) return auth.response;
  const { id } = await params;
  const { error } = await createAdminClient().from("video_projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
