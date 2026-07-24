"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { useSpotQuest } from "@/hooks/useSpotQuest";
import { useConfetti } from "@/hooks/useConfetti";
import { GameHUD } from "@/components/spotquest/GameHUD";
import { QuestTracker } from "@/components/spotquest/QuestTracker";
import { BadgeDisplay } from "@/components/spotquest/BadgeDisplay";
import { LeaderboardWidget } from "@/components/spotquest/LeaderboardWidget";
import { PerfectParkMiniGame } from "@/components/spotquest/PerfectParkMiniGame";
import { ConfettiEffect } from "@/components/spotquest/ConfettiEffect";
import { getSpotQuestLeaderboard } from "@/actions/spotquest";
import type { LeaderboardEntry } from "@/lib/spotquest/types";
import { ArrowLeft, Loader2, Gamepad2, Sparkles } from "lucide-react";

export default function SpotQuestPage() {
  const router = useRouter();
  const {
    state, loading, awardPerfectPark,
    pendingLevelUp, clearPendingLevelUp,
  } = useSpotQuest();
  const { canvasRef, fire } = useConfetti();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showMiniGame, setShowMiniGame] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.push("/auth/login");
      } else {
        setUserId(session.user.id);
      }
    });
  }, [router]);

  useEffect(() => {
    getSpotQuestLeaderboard(20).then(setLeaderboard);
  }, []);

  useEffect(() => {
    if (pendingLevelUp) fire();
  }, [pendingLevelUp, fire]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (!state) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <ConfettiEffect canvasRef={canvasRef} />

      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white px-6 pt-12 pb-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push("/profile")}
            className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <Gamepad2 size={24} />
              SpotQuest
            </h1>
            <p className="text-sm text-white/70">Your parking adventure</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-5xl">
            {state.profile.level >= 30 ? "👑" :
             state.profile.level >= 20 ? "💎" :
             state.profile.level >= 10 ? "⭐" :
             state.profile.level >= 5 ? "🔥" : "🚗"}
          </div>
          <div>
            <p className="text-3xl font-black">Level {state.profile.level}</p>
            <p className="text-sm text-white/70">{state.profile.total_xp} total XP</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4 -mt-4">
        {/* XP Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xl">
          <GameHUD
            totalXp={state.profile.total_xp}
            level={state.profile.level}
            streak={state.profile.current_streak}
          />
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <p className="text-2xl font-black text-amber-500">{state.profile.current_streak}</p>
              <p className="text-[10px] text-zinc-500">Day Streak</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-green-500">{state.profile.perfect_parks}</p>
              <p className="text-[10px] text-zinc-500">Perfect Parks</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-blue-500">#{state.leaderboard_rank || "-"}</p>
              <p className="text-[10px] text-zinc-500">Leaderboard</p>
            </div>
          </div>
        </div>

        {/* Mini-game button */}
        <button
          onClick={() => setShowMiniGame(true)}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl p-5 shadow-xl text-left transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl animate-bounce-slow">🎯</div>
            <div>
              <h3 className="font-black text-lg">Perfect Park Challenge</h3>
              <p className="text-sm text-white/70">Tap to park for bonus XP!</p>
            </div>
            <Sparkles size={20} className="ml-auto text-white/50" />
          </div>
        </button>

        {/* Quests */}
        <QuestTracker quests={state.quests} />

        {/* Leaderboard */}
        <LeaderboardWidget entries={leaderboard} currentUserId={userId} />

        {/* Badges */}
        <BadgeDisplay badges={state.badges} />

        {/* Recent Activity */}
        {state.recent_transactions.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-lg">
            <h3 className="text-sm font-bold mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {state.recent_transactions.map((tx, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <span className="text-xs text-zinc-500 flex-1 mr-2">{tx.description}</span>
                  <span className="text-xs font-bold text-green-600 dark:text-green-400 shrink-0">+{tx.xp_amount} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mini-game modal */}
      {showMiniGame && (
        <PerfectParkMiniGame
          onComplete={async (score) => await awardPerfectPark(score)}
          onClose={() => setShowMiniGame(false)}
        />
      )}

      {/* Level up animation */}
      {pendingLevelUp && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center"
          onClick={clearPendingLevelUp}
        >
          <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-3xl shadow-2xl border border-zinc-700 p-10 text-center max-w-xs mx-4">
            <div className="text-6xl mb-4 animate-bounce-slow">🎉</div>
            <p className="text-sm font-bold text-green-400 uppercase tracking-widest mb-2">Level Up!</p>
            <p className="text-5xl font-black text-white mb-1">{pendingLevelUp}</p>
            <p className="text-sm text-zinc-400 mt-4">Tap to continue</p>
          </div>
        </div>
      )}
    </div>
  );
}
