"use client";

import type { RankTier } from "@/lib/ranking";
import { getRankLabel, getRankColor } from "@/lib/ranking";
import { Shield, ShieldCheck, Award, Trophy } from "lucide-react";

interface RankBadgeProps {
  tier: RankTier;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const sizeMap = {
  sm: { icon: 14, text: "text-[10px]", padding: "px-2 py-0.5" },
  md: { icon: 18, text: "text-xs", padding: "px-3 py-1" },
  lg: { icon: 24, text: "text-sm", padding: "px-4 py-2" },
};

const tierIcon = {
  bronze: Shield,
  silver: ShieldCheck,
  gold: Award,
  community_partner: Trophy,
};

const tierBg = {
  bronze: "bg-amber-100 dark:bg-amber-900/30",
  silver: "bg-zinc-100 dark:bg-zinc-800",
  gold: "bg-amber-100 dark:bg-amber-900/30",
  community_partner: "bg-purple-100 dark:bg-purple-900/30",
};

export function RankBadge({ tier, size = "md", showLabel = true }: RankBadgeProps) {
  const Icon = tierIcon[tier];
  const s = sizeMap[size];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold ${s.padding} ${s.text} ${getRankColor(tier)} ${tierBg[tier]}`}>
      <Icon size={s.icon} />
      {showLabel && getRankLabel(tier)}
    </span>
  );
}
