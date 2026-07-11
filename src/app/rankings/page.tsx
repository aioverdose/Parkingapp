"use client";

import { useState, useEffect } from "react";
import { getNeighborhoodLeaderboard, getAllNeighborhoods } from "@/actions/rankings";
import { RankingList } from "@/components/RankingList";
import { Loader2, Trophy, Flame, Clock, MapPin } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  spots_posted: number;
  spots_claimed: number;
  hours_saved: number;
  streak_7d: number;
  streak_30d: number;
  neighborhood: string | null;
}

export default function RankingsPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [data, hoods] = await Promise.all([
        getNeighborhoodLeaderboard(selectedNeighborhood || undefined),
        getAllNeighborhoods(),
      ]);
      setLeaderboard(data);
      setNeighborhoods(hoods);
      setLoading(false);
    }
    load();
  }, [selectedNeighborhood]);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Trophy size={20} className="text-amber-500" /> Rankings
            </h1>
            <p className="text-xs text-zinc-500">Top contributors &middot; anonymous</p>
          </div>
          <a href="/" className="text-sm text-blue-600 hover:underline">Back to map</a>
        </div>
      </header>

      <div className="max-w-3xl mx-auto w-full px-6 py-6 flex flex-col gap-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 rounded-xl">
            <Flame size={16} className="text-orange-500" />
            <span>7-day streaks</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 rounded-xl">
            <Clock size={16} className="text-blue-500" />
            <span>Hours saved</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 rounded-xl">
            <MapPin size={16} className="text-green-500" />
            <span>Block-level only</span>
          </div>
        </div>

        {neighborhoods.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedNeighborhood("")}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                !selectedNeighborhood
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              All
            </button>
            {neighborhoods.map((hood) => (
              <button
                key={hood}
                onClick={() => setSelectedNeighborhood(hood)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedNeighborhood === hood
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {hood}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <Trophy size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-medium">No data yet</p>
            <p className="text-sm">Post and claim spots to see rankings here</p>
          </div>
        ) : (
          <RankingList entries={leaderboard} />
        )}
      </div>
    </div>
  );
}
