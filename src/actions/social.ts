"use server";

import { createAdminClient } from "@/lib/supabaseAdmin";

export async function createEphemeralChat(spotId: string, receiverId: string) {
  const supabase = createAdminClient();

  const { data: spot, error: spotError } = await supabase
    .from("parking_spots")
    .select("user_id")
    .eq("id", spotId)
    .single();

  if (spotError || !spot) return { error: "Spot not found" };
  const spotUserId = (spot as { user_id: string }).user_id;
  if (spotUserId === receiverId) return { error: "Cannot chat with yourself" };

  const { data, error } = await supabase
    .from("ephemeral_chats")
    .insert({
      spot_id: spotId,
      sender_id: spotUserId,
      receiver_id: receiverId,
      status: "active",
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { chat: data };
}

export async function sendChatMessage(chatId: string, senderId: string, content: string) {
  if (!content.trim()) return { error: "Message cannot be empty" };
  if (content.length > 500) return { error: "Message too long (max 500 chars)" };

  const supabase = createAdminClient();

  const { data: chat, error: chatError } = await supabase
    .from("ephemeral_chats")
    .select("status, expires_at")
    .eq("id", chatId)
    .single();

  if (chatError || !chat) return { error: "Chat not found" };
  if (chat.status !== "active") return { error: "Chat is no longer active" };
  if (new Date(chat.expires_at) < new Date()) return { error: "Chat has expired" };

  const { data, error } = await supabase
    .from("ephemeral_messages")
    .insert({ chat_id: chatId, sender_id: senderId, content: content.trim() })
    .select()
    .single();

  if (error) return { error: error.message };
  return { message: data };
}

export async function getChatMessages(chatId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ephemeral_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return data ?? [];
}

export async function getUserChats(userId: string) {
  const supabase = createAdminClient();
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
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("ephemeral_chats")
    .update({ status: "completed", closed_at: new Date().toISOString() })
    .eq("id", chatId);

  if (error) return { error: error.message };
  return { success: true };
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
