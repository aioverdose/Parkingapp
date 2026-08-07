import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { appAgentReply, type AppSnapshot } from "@/lib/agents/app-agent";

const MAX_MESSAGES = 20;

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "moderator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { messages?: { role: string; content: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
  if (rawMessages.length === 0) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
  }

  const messages = rawMessages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
    .slice(-MAX_MESSAGES);

  if (messages.length === 0) {
    return NextResponse.json({ error: "No valid messages" }, { status: 400 });
  }

  try {
    const result = await appAgentReply(messages);
    return NextResponse.json({
      reply: result.reply,
      engine: result.engine,
      snapshot: result.snapshot satisfies AppSnapshot,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
