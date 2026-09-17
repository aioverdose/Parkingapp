import { NextRequest, NextResponse } from "next/server";
import { requireVideoAdmin } from "@/lib/video/admin-auth";
import { generateFallbackStoryboard } from "@/lib/video/storyboard";
import { createDefaultProject } from "@/lib/video/default-project";
import { aspectRatios, videoProjectPayloadSchema } from "@/lib/video/types";

export async function POST(request: NextRequest) {
  const auth = await requireVideoAdmin(request); if ("response" in auth) return auth.response;
  try {
    const body = await request.json();
    const input = { title: typeof body.title === "string" ? body.title.trim() : "", prompt: typeof body.prompt === "string" ? body.prompt.trim() : "", aspectRatio: aspectRatios.includes(body.aspectRatio) ? body.aspectRatio : "9:16", durationSeconds: [15, 30, 45, 60].includes(body.durationSeconds) ? body.durationSeconds : 30, voice: { ...createDefaultProject().voice, ...(body.voice ?? {}) }, brand: { ...createDefaultProject().brand, ...(body.brand ?? {}) } } as const;
    if (!input.prompt) return NextResponse.json({ error: "Describe the video you want to create" }, { status: 400 });
    const project = generateFallbackStoryboard(input);
    const parsed = videoProjectPayloadSchema.safeParse(project);
    if (!parsed.success) return NextResponse.json({ error: "Generated storyboard failed validation" }, { status: 500 });
    return NextResponse.json({ project: parsed.data, provider: process.env.LLM_API_KEY ? "llm-configured-fallback" : "deterministic-fallback", message: "Storyboard generated with the deterministic parking demo template." });
  } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
}
