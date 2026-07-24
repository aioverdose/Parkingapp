"use client";

import type { UserQuest } from "@/lib/spotquest/types";
import { CheckCircle2, Clock } from "lucide-react";

interface QuestTrackerProps {
  quests: UserQuest[];
  compact?: boolean;
}

export function QuestTracker({ quests, compact = false }: QuestTrackerProps) {
  const active = quests.filter((q) => !q.completed);
  const completed = quests.filter((q) => q.completed);

  if (quests.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border border-zinc-200 dark:border-zinc-800">
        <span className="text-xs">📋</span>
        <span className="text-[10px] font-bold text-zinc-500">
          {completed.length}/{quests.length} quests
        </span>
        {active.length > 0 && (
          <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <span>📋</span> Active Quests
        </h3>
        <span className="text-[10px] text-zinc-400">
          {completed.length}/{quests.length}
        </span>
      </div>

      <div className="space-y-2">
        {active.map((quest) => {
          const progress = Math.min(100, (quest.current_count / quest.target_count) * 100);
          const timeLeft = getTimeLeft(quest.period_end);

          return (
            <div key={quest.id} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{quest.icon_emoji}</span>
                  <span className="text-xs font-bold">{quest.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-amber-500 font-bold">+{quest.xp_reward} XP</span>
                  <div className="flex items-center gap-0.5 text-[10px] text-zinc-400">
                    <Clock size={10} />
                    {timeLeft}
                  </div>
                </div>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">
                {quest.current_count}/{quest.target_count} — {quest.description}
              </p>
            </div>
          );
        })}

        {completed.map((quest) => (
          <div
            key={quest.id}
            className="flex items-center gap-2 bg-green-50 dark:bg-green-900/10 rounded-xl p-3 opacity-70"
          >
            <CheckCircle2 size={16} className="text-green-500 shrink-0" />
            <span className="text-xs font-bold text-green-700 dark:text-green-400 line-through">
              {quest.icon_emoji} {quest.name}
            </span>
            <span className="text-[10px] text-green-500 ml-auto">+{quest.xp_reward} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getTimeLeft(periodEnd: string): string {
  const end = new Date(periodEnd);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return "now";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}d`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}
