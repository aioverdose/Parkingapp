"use client";

import { BADGE_TIER_STYLES } from "@/lib/spotquest/game-logic";
import type { UserBadge } from "@/lib/spotquest/types";
import { Award } from "lucide-react";

interface BadgeDisplayProps {
  badges: UserBadge[];
}

export function BadgeDisplay({ badges }: BadgeDisplayProps) {
  if (badges.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-lg">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
          <Award size={16} className="text-zinc-400" />
          Badges
        </h3>
        <p className="text-xs text-zinc-400 text-center py-4">
          Complete handoffs and challenges to earn badges!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-lg">
      <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
        <Award size={16} className="text-amber-500" />
        Badges
        <span className="text-[10px] text-zinc-400 font-normal ml-auto">{badges.length} earned</span>
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {badges.map((badge) => {
          const tierStyle = BADGE_TIER_STYLES[badge.tier] ?? BADGE_TIER_STYLES.bronze;
          return (
            <div
              key={badge.id}
              className={`relative flex flex-col items-center p-2.5 rounded-xl ${tierStyle.bg} border ${tierStyle.border} text-center group`}
            >
              <span className="text-2xl mb-1">{badge.icon_emoji}</span>
              <p className={`text-[9px] font-bold leading-tight ${tierStyle.text}`}>
                {badge.name}
              </p>
              {/* Tooltip on hover */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                {badge.description}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
