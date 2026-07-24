// Game logic utilities — pure functions, no DB calls

import { LEVEL_CONFIG } from "./types";

/** Calculate level from total XP using a logarithmic curve */
export function calculateLevel(totalXp: number): number {
  let level = 1;
  let xpNeeded: number = LEVEL_CONFIG.base_xp;
  let accumulated = 0;

  while (totalXp >= accumulated + xpNeeded) {
    accumulated += xpNeeded;
    level++;
    xpNeeded = Math.max(LEVEL_CONFIG.min_xp, Math.floor(xpNeeded * LEVEL_CONFIG.growth_rate));
  }

  return level;
}

/** XP remaining to reach next level */
export function xpToNextLevel(totalXp: number): number {
  let level = 1;
  let xpNeeded: number = LEVEL_CONFIG.base_xp;
  let accumulated = 0;

  while (totalXp >= accumulated + xpNeeded) {
    accumulated += xpNeeded;
    level++;
    xpNeeded = Math.max(LEVEL_CONFIG.min_xp, Math.floor(xpNeeded * LEVEL_CONFIG.growth_rate));
  }

  return xpNeeded - (totalXp - accumulated);
}

/** XP accumulated at the start of the current level */
export function xpForCurrentLevel(totalXp: number): number {
  let level = 1;
  let xpNeeded: number = LEVEL_CONFIG.base_xp;
  let accumulated = 0;

  while (totalXp >= accumulated + xpNeeded) {
    accumulated += xpNeeded;
    level++;
    xpNeeded = Math.max(LEVEL_CONFIG.min_xp, Math.floor(xpNeeded * LEVEL_CONFIG.growth_rate));
  }

  return accumulated;
}

/** Progress percentage within the current level (0–100) */
export function levelProgress(totalXp: number): number {
  const currentLevelXp = xpForCurrentLevel(totalXp);
  const nextLevelXp = xpToNextLevel(totalXp);
  if (nextLevelXp === 0) return 100;
  return Math.round(((totalXp - currentLevelXp) / (currentLevelXp + nextLevelXp - currentLevelXp)) * 100);
}

/** Get the game tier title for a level */
export function getLevelTier(level: number): { title: string; color: string; icon: string } {
  if (level >= 50) return { title: "Parking Legend", color: "text-purple-400", icon: "👑" };
  if (level >= 30) return { title: "Spot Master", color: "text-amber-400", icon: "💎" };
  if (level >= 20) return { title: "Street Pro", color: "text-blue-400", icon: "⭐" };
  if (level >= 10) return { title: "Road Warrior", color: "text-green-400", icon: "🔥" };
  if (level >= 5)  return { title: "Cruiser", color: "text-orange-400", icon: "🚗" };
  return { title: "Rookie Parker", color: "text-zinc-400", icon: "🚙" };
}

/** Calculate speed bonus XP based on handoff time in minutes */
export function calculateSpeedBonus(minutesElapsed: number): number {
  if (minutesElapsed <= 5) return 30;
  if (minutesElapsed <= 10) return 15;
  return 0;
}

/** Calculate streak bonus XP */
export function calculateStreakBonus(streak: number): number {
  return Math.min(streak * 10, 50);
}

/** Calculate reliability bonus XP from rating */
export function calculateReliabilityBonus(rating: number): number {
  if (rating >= 4.5) return 20;
  return 0;
}

/** Total XP breakdown for a handoff */
export function calculateHandoffXp(params: {
  minutesElapsed?: number;
  streak: number;
  rating?: number;
}): { total: number; base: number; speed: number; streak: number; reliable: number } {
  const base = 50;
  const speed = params.minutesElapsed ? calculateSpeedBonus(params.minutesElapsed) : 0;
  const streak = calculateStreakBonus(params.streak);
  const reliable = params.rating ? calculateReliabilityBonus(params.rating) : 0;

  return {
    total: base + speed + streak + reliable,
    base,
    speed,
    streak,
    reliable,
  };
}

/** Perfect park score to XP */
export function perfectParkXp(score: number): { xp: number; label: string; color: string } {
  if (score >= 80) return { xp: 25, label: "Perfect!", color: "text-green-400" };
  if (score >= 60) return { xp: 15, label: "Great!", color: "text-blue-400" };
  return { xp: 5, label: "Nice try!", color: "text-zinc-400" };
}

/** Badge tier colors and background */
export const BADGE_TIER_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  bronze:   { bg: "bg-amber-50 dark:bg-amber-900/20",   border: "border-amber-200 dark:border-amber-800",   text: "text-amber-700 dark:text-amber-400" },
  silver:   { bg: "bg-zinc-50 dark:bg-zinc-800/50",      border: "border-zinc-200 dark:border-zinc-700",    text: "text-zinc-600 dark:text-zinc-300" },
  gold:     { bg: "bg-amber-50 dark:bg-amber-900/20",    border: "border-amber-300 dark:border-amber-700",  text: "text-amber-600 dark:text-amber-300" },
  legendary:{ bg: "bg-purple-50 dark:bg-purple-900/20",  border: "border-purple-300 dark:border-purple-700",text: "text-purple-600 dark:text-purple-300" },
};
