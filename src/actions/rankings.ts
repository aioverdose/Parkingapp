"use server";

import { createAdminClient } from "@/lib/supabaseAdmin";

export async function getNeighborhoodLeaderboard(neighborhood?: string) {
  const supabase = createAdminClient();
  let query = supabase
    .from("contribution_stats")
    .select("user_id, spots_posted, spots_claimed, hours_saved, streak_7d, streak_30d, neighborhood")
    .order("hours_saved", { ascending: false })
    .limit(50);

  if (neighborhood) {
    query = query.eq("neighborhood", neighborhood);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch leaderboard:", error.message);
    return [];
  }

  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    ...row,
  }));
}

export async function getUserContributionStats(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contribution_stats")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return {
      spots_posted: 0,
      spots_claimed: 0,
      hours_saved: 0,
      streak_7d: 0,
      streak_30d: 0,
      neighborhood: null,
    };
  }

  return data;
}

export async function getAllNeighborhoods() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("contribution_stats")
    .select("neighborhood")
    .not("neighborhood", "is", null)
    .order("neighborhood");

  const rows = (data ?? []) as { neighborhood: string | null }[];
  const unique = new Set(rows.map((r) => r.neighborhood).filter(Boolean) as string[]);
  return Array.from(unique).sort();
}
