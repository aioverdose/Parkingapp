"use server";

import { createAdminClient } from "@/lib/supabaseAdmin";
import type { GameState, LeaderboardEntry, VehicleType } from "@/lib/spotquest/types";

/** Fetch full game state for a user */
export async function getGameState(userId: string): Promise<GameState | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_game_state", {
    p_user_id: userId,
  });

  if (error || !data) {
    console.error("Failed to fetch game state:", error?.message);
    return null;
  }

  return data as GameState;
}

/** Fetch SpotQuest leaderboard */
export async function getSpotQuestLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("spotquest_leaderboard" as any)
    .select("*")
    .order("total_xp", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch leaderboard:", error.message);
    return [];
  }

  return (data ?? []) as unknown as LeaderboardEntry[];
}

/** Mark onboarding as seen */
export async function markOnboardingSeen(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("user_game_profile" as any)
    .update({ onboarding_seen: true, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  return !error;
}

/** Toggle game mode on/off */
export async function toggleGameMode(userId: string, enabled: boolean): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("user_game_profile" as any)
    .update({ game_mode_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  return !error;
}

/** Mark a badge as seen */
export async function markBadgeSeen(userId: string, badgeId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("user_badges" as any)
    .update({ seen: true })
    .eq("user_id", userId)
    .eq("badge_id", badgeId);

  return !error;
}

/** Set player vehicle type */
export async function setVehicleType(userId: string, vehicleType: VehicleType): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("user_game_profile" as any)
    .update({ vehicle_type: vehicleType, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  return !error;
}
