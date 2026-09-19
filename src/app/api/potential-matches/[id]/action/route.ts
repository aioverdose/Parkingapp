import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";

type Action = "end_conversation" | "cancel_coordination" | "block" | "report";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { action?: Action; category?: string; reason?: string } | null;
  const action = body?.action;
  if (!action || !["end_conversation", "cancel_coordination", "block", "report"].includes(action)) return NextResponse.json({ error: "Invalid conversation action" }, { status: 400 });
  const limit = await checkRateLimit(`potential-action:${user.id}:${id}`, 10, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Action rate limit reached" }, { status: 429 });
  const admin = createAdminClient();
  await admin.rpc("expire_potential_matches");
  const { data: match } = await admin.from("potential_matches").select("id, status, arriving_user_id, departing_user_id, messenger_conversation_id").eq("id", id).maybeSingle();
  if (!match || (match.arriving_user_id !== user.id && match.departing_user_id !== user.id)) return NextResponse.json({ error: "Potential match not found" }, { status: 404 });
  if (action === "report") {
    const reason = body?.reason?.trim() ?? "";
    if (!reason || reason.length > 2000) return NextResponse.json({ error: "A report reason is required" }, { status: 400 });
    const { error } = await admin.from("potential_match_reports").insert({ potential_match_id: id, conversation_id: match.messenger_conversation_id, reporter_id: user.id, category: body?.category || "other", reason });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await admin.from("potential_match_conversations").update({ status: "closed", closed_at: new Date().toISOString(), safety_hold_until: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() }).eq("id", match.messenger_conversation_id ?? "00000000-0000-0000-0000-000000000000");
  }
  if (action === "block") {
    const other = match.arriving_user_id === user.id ? match.departing_user_id : match.arriving_user_id;
    await admin.from("user_blocks").upsert({ blocker_id: user.id, blocked_id: other }, { onConflict: "blocker_id,blocked_id" });
  }
  if (action === "cancel_coordination" || action === "block" || action === "report") {
    await admin.from("potential_matches").update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancellation_reason: action, updated_at: new Date().toISOString() }).eq("id", id);
  }
  if (action === "end_conversation") {
    await admin.from("potential_match_conversations").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", match.messenger_conversation_id ?? "00000000-0000-0000-0000-000000000000");
  }
  await admin.from("potential_match_audit_events").insert({ potential_match_id: id, conversation_id: match.messenger_conversation_id, actor_id: user.id, action, metadata: { category: body?.category ?? null } });
  return NextResponse.json({ ok: true, action });
}
