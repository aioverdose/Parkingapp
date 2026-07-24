"use client";

import { useState, useCallback } from "react";
import type { LeaderboardEntry } from "@/lib/spotquest/types";
import { Trophy, Flame, Zap, Crown } from "lucide-react";

interface LeaderboardWidgetProps {
  entries: LeaderboardEntry[];
  currentUserId?: string | null;
  compact?: boolean;
}

export function LeaderboardWidget({ entries, currentUserId, compact = false }: LeaderboardWidgetProps) {
  if (entries.length === 0) return null;

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3, 10);

  if (compact) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-lg">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
          <Trophy size={16} className="text-amber-500" />
          Top Parkers
        </h3>
        <div className="space-y-2">
          {topThree.map((entry, i) => (
            <div
              key={entry.user_id}
              className={`flex items-center gap-2 p-2 rounded-xl ${
                entry.user_id === currentUserId
                  ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                  : "bg-zinc-50 dark:bg-zinc-800/50"
              }`}
            >
              <span className="text-lg">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{entry.display_name || "Anonymous"}</p>
                <p className="text-[10px] text-zinc-400">Lv.{entry.level}</p>
              </div>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{entry.total_xp} XP</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-lg">
      <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
        <Trophy size={16} className="text-amber-500" />
        Belmont Shore Leaderboard
      </h3>

      {/* Top 3 podium */}
      <div className="flex items-end justify-center gap-2 mb-4">
        {topThree.map((entry, i) => {
          const heights = ["h-20", "h-24", "h-16"];
          const medals = ["🥇", "🥈", "🥉"];
          const widths = ["flex-1", "flex-[1.2]", "flex-1"];
          const isYou = entry.user_id === currentUserId;

          return (
            <div key={entry.user_id} className={`${widths[i]} flex flex-col items-center`}>
              <span className="text-lg mb-1">{entry.display_name?.[0]?.toUpperCase() || "?"}</span>
              <span className="text-xl mb-1">{medals[i]}</span>
              <div
                className={`${heights[i]} w-full rounded-t-xl flex flex-col items-center justify-end pb-2 ${
                  i === 0 ? "bg-gradient-to-b from-amber-400 to-amber-500" :
                  i === 1 ? "bg-gradient-to-b from-zinc-300 to-zinc-400" :
                  "bg-gradient-to-b from-orange-300 to-orange-400"
                } ${isYou ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-zinc-900" : ""}`}
              >
                <p className="text-[10px] font-bold text-white/90 truncate px-1">
                  {entry.display_name?.split(" ")[0] || "Anon"}
                </p>
                <p className="text-[9px] text-white/70">{entry.total_xp} XP</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rest of leaderboard */}
      {rest.length > 0 && (
        <div className="space-y-1.5">
          {rest.map((entry, i) => {
            const isYou = entry.user_id === currentUserId;
            return (
              <div
                key={entry.user_id}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition ${
                  isYou
                    ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }`}
              >
                <span className="text-xs font-bold text-zinc-400 w-5 text-center">{i + 4}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold truncate ${isYou ? "text-blue-600 dark:text-blue-400" : ""}`}>
                    {entry.display_name || "Anonymous"}
                    {isYou && <span className="text-[9px] ml-1 text-blue-500">(you)</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    <Flame size={10} className="text-orange-500" />
                    <span className="text-[10px] text-zinc-500">{entry.current_streak}</span>
                  </div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    {entry.total_xp}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
