export type RankTier = "bronze" | "silver" | "gold" | "community_partner";

export interface UserRanking {
  id: string;
  user_id: string;
  rank_tier: RankTier;
  rank_points: number;
  trust_score: number;
  courses_completed: number;
  successful_handoffs: number;
  flags_received: number;
  updated_at: string;
}

export const RANK_THRESHOLDS = {
  bronze: { label: "Bronze", minCourses: 0, color: "text-amber-700" },
  silver: { label: "Silver", minCourses: 2, color: "text-zinc-400" },
  gold: { label: "Gold", minCourses: 4, color: "text-amber-400" },
  community_partner: { label: "Community Partner", minCourses: 4, color: "text-purple-400" },
} as const;

export function getRankLabel(tier: RankTier): string {
  return RANK_THRESHOLDS[tier].label;
}

export function getRankColor(tier: RankTier): string {
  return RANK_THRESHOLDS[tier].color;
}
