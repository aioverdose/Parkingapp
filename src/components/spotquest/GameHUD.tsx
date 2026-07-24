"use client";

import { levelProgress, getLevelTier, xpToNextLevel } from "@/lib/spotquest/game-logic";
import { Zap, Flame } from "lucide-react";

interface GameHUDProps {
  totalXp: number;
  level: number;
  streak: number;
  compact?: boolean;
}

export function GameHUD({ totalXp, level, streak, compact = false }: GameHUDProps) {
  const progress = levelProgress(totalXp);
  const tier = getLevelTier(level);
  const remaining = xpToNextLevel(totalXp);

  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border border-zinc-200 dark:border-zinc-800">
        <span className="text-sm">{tier.icon}</span>
        <span className={`text-xs font-bold ${tier.color}`}>Lv.{level}</span>
        <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <Zap size={12} className="text-amber-500" />
        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{totalXp}</span>
        {streak > 1 && (
          <>
            <Flame size={12} className="text-orange-500" />
            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">{streak}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{tier.icon}</span>
          <div>
            <p className={`text-lg font-bold ${tier.color}`}>Level {level}</p>
            <p className="text-[10px] text-zinc-500">{tier.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {streak > 0 && (
            <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 px-2.5 py-1 rounded-full">
              <Flame size={14} className="text-orange-500" />
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{streak}d</span>
            </div>
          )}
          <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full">
            <Zap size={14} className="text-amber-500" />
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{totalXp} XP</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] text-zinc-400 mt-1 text-right">{remaining} XP to next level</p>
      </div>
    </div>
  );
}
