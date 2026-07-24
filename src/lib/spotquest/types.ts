// SpotQuest Game Types

export interface GameProfile {
  user_id: string;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_handoff_date: string | null;
  perfect_parks: number;
  total_handoffs_xp: number;
  total_bonus_xp: number;
  onboarding_seen: boolean;
  game_mode_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type BadgeCategory = "handoff" | "streak" | "community" | "special" | "quest" | "perfect_park";
export type BadgeTier = "bronze" | "silver" | "gold" | "legendary";

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon_emoji: string;
  category: BadgeCategory;
  tier: BadgeTier;
  xp_reward: number;
}

export interface UserBadge extends Badge {
  earned_at: string;
  seen: boolean;
}

export type QuestType = "daily" | "weekly" | "milestone";
export type QuestAction =
  | "complete_handoff"
  | "claim_spot"
  | "post_spot"
  | "rate_user"
  | "perfect_park"
  | "chat_sent"
  | "help_driver";

export interface Quest {
  id: string;
  name: string;
  description: string;
  quest_type: QuestType;
  icon_emoji: string;
  target_count: number;
  action_type: QuestAction;
  xp_reward: number;
}

export interface UserQuest extends Quest {
  current_count: number;
  completed: boolean;
  completed_at: string | null;
  period_start: string;
  period_end: string;
}

export type XpType =
  | "handoff_base"
  | "handoff_speed"
  | "handoff_streak"
  | "handoff_reliable"
  | "perfect_park"
  | "quest_complete"
  | "badge_earn"
  | "daily_login";

export interface GameTransaction {
  xp_amount: number;
  xp_type: XpType;
  description: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface HandoffXpResult {
  xp_awarded: number;
  base_xp: number;
  speed_bonus: number;
  streak_bonus: number;
  reliable_bonus: number;
  new_total_xp: number;
  new_level: number;
  old_level: number;
  level_up: boolean;
  new_streak: number;
}

export interface PerfectParkResult {
  xp_awarded: number;
  score: number;
  new_total_xp: number;
  new_level: number;
  old_level: number;
  level_up: boolean;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  perfect_parks: number;
  rank_tier: string;
  successful_handoffs: number;
  rank_position: number;
}

export interface GameState {
  profile: {
    total_xp: number;
    level: number;
    current_streak: number;
    longest_streak: number;
    perfect_parks: number;
    onboarding_seen: boolean;
    game_mode_enabled: boolean;
    xp_to_next_level: number;
    xp_for_current_level: number;
  };
  badges: UserBadge[];
  quests: UserQuest[];
  recent_transactions: GameTransaction[];
  leaderboard_rank: number;
}

// Level progression config (matches DB function)
export const LEVEL_CONFIG = {
  base_xp: 100,
  growth_rate: 1.15,
  min_xp: 100,
} as const;

// XP reward tiers for handoff speed
export const SPEED_BONUS_TIERS = {
  ultra_fast: { max_minutes: 5, xp: 30, label: "Lightning Fast!" },
  fast: { max_minutes: 10, xp: 15, label: "Quick!" },
} as const;

// XP for perfect park scores
export const PERFECT_PARK_TIERS = {
  perfect: { min_score: 80, xp: 25, label: "Perfect!" },
  great: { min_score: 60, xp: 15, label: "Great!" },
  good: { min_score: 0, xp: 5, label: "Nice try!" },
} as const;
