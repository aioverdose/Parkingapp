import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { MAX_POTENTIAL_MESSAGE_LENGTH, sanitizePotentialMessage } from "@/lib/potential-messenger";

async function authorized(request: NextRequest, id: string) {
  const user = await getAuthenticatedUser(request);
  if (!user) return null;
  const admin = createAdminClient();
  await admin.rpc("expire_potential_matches");
  const { data: match } = await admin.from("potential_matches").select("id, status, arriving_user_id, departing_user_id, messenger_conversation_id").eq("id", id).maybeSingle();
  if (!match || match.status !== "mutually_accepted" || (match.arriving_user_id !== user.id && match.departing_user_id !== user.id) || !match.messenger_conversation_id) return null;
  return { user, admin, conversationId: match.messenger_conversation_id };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorized(request, id);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await auth.admin.from("potential_match_messages").select("id, sender_id, content, created_at, read_at").eq("conversation_id", auth.conversationId).order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [], conversation_id: auth.conversationId });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorized(request, id);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { content?: string } | null;
  const limit = await checkRateLimit(`potential-message:${auth.user.id}:${id}`, 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Message rate limit reached. Try again shortly." }, { status: 429 });
  const content = sanitizePotentialMessage(body?.content ?? "");
  if (!content || content.length > MAX_POTENTIAL_MESSAGE_LENGTH) return NextResponse.json({ error: "Message must contain safe text between 1 and 500 characters" }, { status: 400 });
  const { data, error } = await auth.admin.from("potential_match_messages").insert({ conversation_id: auth.conversationId, sender_id: auth.user.id, content }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: data }, { status: 201 });
}
