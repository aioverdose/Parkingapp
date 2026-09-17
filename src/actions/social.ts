"use server";

import { createAdminClient } from "@/lib/supabaseAdmin";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { isChatParticipant, isChatUsable, validateMessengerMessage } from "@/lib/messenger-policy";
import { moderateMessengerMessage, moderationEvidence } from "@/lib/messenger-moderation";

async function getMessengerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key",
    {
      auth: { autoRefreshToken: false, persistSession: false },
      cookies: {
        getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
      },
    },
  );
}

async function getSessionUser() {
  const client = await getMessengerClient();
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
}

export async function createEphemeralChat(spotId: string, receiverId: string) {
  const user = await getSessionUser();
  if (!user) return { error: "You must be signed in" };
  if (!receiverId || receiverId === user.id) return { error: "Cannot chat with yourself" };
  const supabase = await getMessengerClient();

  const { data: spot, error: spotError } = await supabase
    .from("parking_spots")
    .select("user_id")
    .eq("id", spotId)
    .single();

  if (spotError || !spot) return { error: "Spot not found" };
  const spotUserId = (spot as { user_id: string }).user_id;
  if (receiverId !== user.id) return { error: "Chat recipient must be the signed-in user" };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ephemeral_chats")
    .insert({
      spot_id: spotId,
      sender_id: spotUserId,
      receiver_id: user.id,
      status: "active",
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { chat: data };
}

export async function sendChatMessage(chatId: string, _senderId: string, content: string) {
  const user = await getSessionUser();
  if (!user) return { error: "You must be signed in" };
  const policyError = validateMessengerMessage(content);
  if (policyError) return { error: policyError };
  const limit = await checkRateLimit(`messenger-send:${user.id}:${chatId}`, 30, 60_000);
  if (!limit.allowed) return { error: "Too many messages. Try again shortly." };
  const supabase = await getMessengerClient();

  const { data: chat, error: chatError } = await supabase
    .from("ephemeral_chats")
    .select("sender_id, receiver_id, status, expires_at, conversation_ended_at")
    .eq("id", chatId)
    .single();

  if (chatError || !chat) return { error: "Chat not found" };
  if (!isChatParticipant(user.id, chat)) return { error: "You are not a participant in this chat" };
  const chatErrorMessage = isChatUsable(chat);
  if (chatErrorMessage) return { error: chatErrorMessage };
  const { data: settings } = await supabase
    .from("messenger_conversation_settings")
    .select("free_form_enabled, mutual_acceptance_at")
    .eq("conversation_id", chatId)
    .maybeSingle();
  if (!settings?.free_form_enabled || !settings.mutual_acceptance_at) {
    return { error: "Both participants must accept before free-form messaging is enabled" };
  }

  const moderation = moderateMessengerMessage(content.trim());
  const admin = createAdminClient();
  if (moderation.decision === "blocked") {
    await admin.from("messenger_audit_logs").insert({
      actor_id: user.id,
      conversation_id: chatId,
      action: "moderation_blocked",
      details: { labels: moderation.labels, severity: moderation.severity, confidence: moderation.confidence, provider: moderation.provider },
    });
    return { error: moderation.user_facing_warning || "Message cannot be sent", moderation };
  }

  const { data, error } = await supabase
    .from("ephemeral_messages")
    .insert({ chat_id: chatId, sender_id: user.id, content: content.trim(), message_kind: "ordinary" })
    .select()
    .single();

  if (error) return { error: error.message };
  await admin.from("messenger_message_moderation").upsert({
    message_id: data.id,
    status: moderation.decision === "flagged" ? "flagged" : "allowed",
    labels: moderation.labels,
    moderator_reason: moderationEvidence(moderation),
    is_safety_evidence: moderation.requires_human_review,
  });
  if (moderation.decision === "flagged") {
    await admin.from("messenger_audit_logs").insert({
      actor_id: user.id,
      conversation_id: chatId,
      message_id: data.id,
      action: "moderation_flagged",
      details: { labels: moderation.labels, severity: moderation.severity, confidence: moderation.confidence, provider: moderation.provider },
    });
  }
  return { message: data };
}

export async function getChatMessages(chatId: string) {
  const user = await getSessionUser();
  if (!user) return [];
  const supabase = await getMessengerClient();
  const { data: chat } = await supabase.from("ephemeral_chats").select("sender_id, receiver_id").eq("id", chatId).maybeSingle();
  if (!chat || !isChatParticipant(user.id, chat)) return [];
  const { data, error } = await supabase
    .from("ephemeral_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return data ?? [];
}


export async function acceptChat(chatId: string) {
  const user = await getSessionUser();
  if (!user) return { error: "You must be signed in" };
  const supabase = await getMessengerClient();
  const { data, error } = await supabase.rpc("accept_messenger_conversation", { p_conversation_id: chatId });
  if (error) return { error: error.message };
  return data ? { success: true } : { error: "Only the invited participant can accept this conversation" };
}

export async function createDeparturePing(
  userId: string,
  latitude: number,
  longitude: number,
  leavingInMinutes: number,
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("departure_pings")
    .insert({
      user_id: userId,
      latitude,
      longitude,
      radius_meters: 500,
      leaving_in_minutes: leavingInMinutes,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { ping: data };
}

export async function createSpotRequest(
  userId: string,
  latitude: number,
  longitude: number,
  vehicleType?: string | null,
) {
  const supabase = createAdminClient();

  await supabase.rpc("ensure_user_exists", { p_user_id: userId });

  const { data, error } = await supabase
    .from("spot_requests")
    .insert({
      user_id: userId,
      latitude,
      longitude,
      radius_meters: 300,
      vehicle_type: vehicleType || null,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { request: data };
}

export async function cancelSpotRequest(requestId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("spot_requests")
    .update({ status: "expired" })
    .eq("id", requestId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getActiveSpotRequests() {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("spot_requests")
    .select("id, user_id, latitude, longitude, radius_meters, vehicle_type, status, created_at, expires_at")
    .eq("status", "active")
    .gt("expires_at", now)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function getActiveDeparturePings(latitude: number, longitude: number) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("departure_pings")
    .select("id, user_id, latitude, longitude, radius_meters, leaving_in_minutes, created_at")
    .gt("expires_at", now)
    .order("created_at", { ascending: false });

  if (error) return [];

  const nearby = (data ?? []).filter((ping) => {
    const R = 6371e3;
    const lat1 = (latitude * Math.PI) / 180;
    const lat2 = (ping.latitude * Math.PI) / 180;
    const dlat = ((ping.latitude - latitude) * Math.PI) / 180;
    const dlng = ((ping.longitude - longitude) * Math.PI) / 180;
    const a =
      Math.sin(dlat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlng / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return dist <= ping.radius_meters;
  });

  return nearby;
}

export async function getUserChats(userId: string) {
  const user = await getSessionUser();
  if (!user || user.id !== userId) return [];
  const supabase = await getMessengerClient();
  const { data, error } = await supabase
    .from("ephemeral_chats")
    .select("id, spot_id, sender_id, receiver_id, status, created_at, expires_at")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function closeChat(chatId: string) {
  const user = await getSessionUser();
  if (!user) return { error: "You must be signed in" };
  const supabase = await getMessengerClient();
  const { data: chat } = await supabase.from("ephemeral_chats").select("sender_id, receiver_id").eq("id", chatId).maybeSingle();
  if (!chat || !isChatParticipant(user.id, chat)) return { error: "You are not a participant in this chat" };
  const { error } = await supabase
    .from("ephemeral_chats")
    .update({ status: "completed", closed_at: new Date().toISOString(), conversation_ended_at: new Date().toISOString() })
    .eq("id", chatId);

  if (error) return { error: error.message };
  return { success: true };
}
