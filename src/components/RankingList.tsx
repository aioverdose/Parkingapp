"use client";

import { Trophy, Flame, Clock, Award, Hash } from "lucide-react";

interface RankingEntry {
  rank: number;
  user_id: string;
  spots_posted: number;
  spots_claimed: number;
  hours_saved: number;
  streak_7d: number;
  streak_30d: number;
  neighborhood: string | null;
}

interface RankingListProps {
  entries: RankingEntry[];
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy size={20} className="text-amber-400" />;
  if (rank === 2) return <Award size={20} className="text-zinc-400" />;
  if (rank === 3) return <Award size={20} className="text-amber-700" />;
  return <Hash size={16} className="text-zinc-300 dark:text-zinc-600" />;
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = Math.floor(hours / 24);
  const remainder = hours % 24;
  return `${days}d ${remainder.toFixed(0)}h`;
}

export function RankingList({ entries }: RankingListProps) {
  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => (
        <div
          key={entry.user_id}
          className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <div className="w-8 flex justify-center shrink-0">
            {getRankIcon(entry.rank)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                Parker #{entry.rank}
              </span>
              {entry.streak_7d >= 3 && (
                <span className="flex items-center gap-0.5 text-xs text-orange-500 font-medium">
                  <Flame size={12} /> {entry.streak_7d}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
              {entry.neighborhood && <span>{entry.neighborhood}</span>}
              <span>{entry.spots_posted} posted</span>
              <span>{entry.spots_claimed} claimed</span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 text-sm font-bold text-blue-600">
              <Clock size={14} />
              {formatHours(entry.hours_saved)}
            </div>
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider">saved</div>
          </div>
        </div>
      ))}
    </div>
  );
}
