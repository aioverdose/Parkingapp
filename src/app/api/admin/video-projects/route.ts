import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { requireVideoAdmin } from "@/lib/video/admin-auth";
import { videoProjectPayloadSchema } from "@/lib/video/types";
import { createDefaultProject } from "@/lib/video/default-project";

function toProject(row: any) {
  return { id: row.id, title: row.title, prompt: row.prompt, status: row.status, aspectRatio: row.aspect_ratio, fps: row.fps, durationInFrames: row.duration_in_frames, voice: row.voice, music: row.music, brand: row.brand, scenes: row.scenes, outputUrl: row.output_url ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function GET(request: NextRequest) {
  const auth = await requireVideoAdmin(request); if ("response" in auth) return auth.response;
  const { data, error } = await createAdminClient().from("video_projects").select("*").order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: (data ?? []).map(toProject) });
}

export async function POST(request: NextRequest) {
  const auth = await requireVideoAdmin(request); if ("response" in auth) return auth.response;
  try {
    const body = await request.json();
    const defaults = createDefaultProject();
    const parsed = videoProjectPayloadSchema.safeParse({ ...defaults, ...body, voice: { ...defaults.voice, ...(body.voice ?? {}) }, music: { ...defaults.music, ...(body.music ?? {}) }, brand: { ...defaults.brand, ...(body.brand ?? {}) }, scenes: body.scenes ?? defaults.scenes });
    if (!parsed.success) return NextResponse.json({ error: "Invalid video project", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    const p = parsed.data;
    const { data, error } = await createAdminClient().from("video_projects").insert({ created_by: auth.user.id, title: p.title, prompt: p.prompt, status: p.status ?? "draft", aspect_ratio: p.aspectRatio, fps: p.fps, duration_in_frames: p.durationInFrames, voice: p.voice, music: p.music, brand: p.brand, scenes: p.scenes }).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ project: toProject(data) }, { status: 201 });
  } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
}
