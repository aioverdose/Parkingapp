import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { developmentAgentReply, isDevelopmentAgentConfigured } from "@/lib/agents/development-agent";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await createAdminClient().from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "moderator") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isDevelopmentAgentConfigured()) return NextResponse.json({ error: "GitHub development agent is not configured. Add GITHUB_TOKEN to Vercel environment variables." }, { status: 503 });
  try {
    const body = await request.json();
    const messages = Array.isArray(body.messages) ? body.messages.filter((message: any) => (message?.role === "user" || message?.role === "assistant") && typeof message.content === "string").slice(-12) : [];
    if (!messages.length) return NextResponse.json({ error: "messages is required" }, { status: 400 });
    return NextResponse.json(await developmentAgentReply(messages));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Development agent failed" }, { status: 500 });
  }
}
