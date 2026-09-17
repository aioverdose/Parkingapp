import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/api/rate-limit";

const categories = new Set(["harassment", "spam", "threat", "fraud", "privacy", "other"]);

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = await checkRateLimit(`messenger-report:${user.id}`, 5, 60 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Report limit reached" }, { status: 429 });
  const body = await request.json().catch(() => ({}));
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
  const category = typeof body.category === "string" ? body.category : "other";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!conversationId || !categories.has(category) || !reason || reason.length > 1_000) {
    return NextResponse.json({ error: "A valid category and reason are required" }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: chat } = await admin.from("ephemeral_chats").select("sender_id, receiver_id").eq("id", conversationId).maybeSingle();
  if (!chat || ![chat.sender_id, chat.receiver_id].includes(user.id)) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
   const messageId = typeof body.messageId === "string" ? body.messageId : null;
   if (messageId) {
     const { data: message } = await admin.from("ephemeral_messages").select("id").eq("id", messageId).eq("chat_id", conversationId).maybeSingle();
     if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });
   }
   const { data, error } = await admin.from("messenger_reports").insert({
     conversation_id: conversationId,
     message_id: messageId,
    reporter_id: user.id,
    category,
    reason,
  }).select("id, status").single();
   if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (messageId) {
      await admin.from("messenger_message_moderation").upsert({
        message_id: messageId,
        status: "flagged",
        is_safety_evidence: true,
        moderator_reason: `User report ${data.id}`,
      });
      await admin.from("messenger_audit_logs").insert({
        actor_id: user.id,
        conversation_id: conversationId,
        message_id: messageId,
        action: "message_reported",
        details: { category, has_reason: true },
      });
    }
  return NextResponse.json({ report: data }, { status: 201 });
}
