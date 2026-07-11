"use server";

import { createAdminClient } from "@/lib/supabaseAdmin";

export interface SavedParkingSpot {
  id: string;
  user_id: string;
  label: string;
  latitude: number;
  longitude: number;
  address: string | null;
  accuracy: number | null;
  saved_at: string;
  updated_at: string;
}

export async function saveParkingSpot(
  userId: string,
  latitude: number,
  longitude: number,
  accuracy: number,
  label?: string,
  address?: string,
) {
  const supabase = createAdminClient();

  const spotLabel = label || "Current Spot";

  const { data: existing } = await (supabase
    .from("user_parking_spots" as any)
    .select("id")
    .eq("user_id", userId)
    .eq("label", spotLabel)
    .maybeSingle()) as any;

  if (existing) {
    const { data, error } = await supabase
      .from("user_parking_spots" as any)
      .update({
        latitude,
        longitude,
        accuracy,
        address: address || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) return { error: error.message };
    return { spot: data as unknown as SavedParkingSpot };
  }

  const { data, error } = await supabase
    .from("user_parking_spots" as any)
    .insert({
      user_id: userId,
      label: spotLabel,
      latitude,
      longitude,
      accuracy,
      address: address || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { spot: data as unknown as SavedParkingSpot };
}

export async function getParkingSpots(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("user_parking_spots" as any)
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) return { error: error.message, spots: [] };
  return { spots: (data || []) as unknown as SavedParkingSpot[] };
}

export async function deleteParkingSpot(spotId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("user_parking_spots" as any)
    .delete()
    .eq("id", spotId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateParkingSpotLabel(spotId: string, label: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("user_parking_spots" as any)
    .update({ label, updated_at: new Date().toISOString() })
    .eq("id", spotId);

  if (error) return { error: error.message };
  return { success: true };
}
