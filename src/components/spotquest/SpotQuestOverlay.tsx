"use client";

import { useState, useCallback, useEffect } from "react";
import { useSpotQuest } from "@/hooks/useSpotQuest";
import { useConfetti } from "@/hooks/useConfetti";
import { GameHUD } from "./GameHUD";
import { BadgePopup } from "./BadgePopup";
import { LevelUpAnimation } from "./LevelUpAnimation";
import { QuestTracker } from "./QuestTracker";
import { BelmontShoreGame } from "./BelmontShoreGame";
import { ConfettiEffect } from "./ConfettiEffect";
import { OnboardingTutorial } from "./OnboardingTutorial";
import { BadgeDisplay } from "./BadgeDisplay";
import { LeaderboardWidget } from "./LeaderboardWidget";
import { getSpotQuestLeaderboard } from "@/actions/spotquest";
import type { LeaderboardEntry } from "@/lib/spotquest/types";
import {
  Gamepad2, X, Trophy, Target, ChevronDown, ChevronUp,
  Sparkles, Zap
} from "lucide-react";

export function SpotQuestOverlay() {
  const {
    state, loading, gameMode, toggleGameMode,
    awardPerfectPark,
    completeOnboarding, newBadges, clearNewBadges,
    pendingLevelUp, clearPendingLevelUp,
    vehicleType, setVehicleType,
  } = useSpotQuest();

  const { canvasRef, fire } = useConfetti();
  const [expanded, setExpanded] = useState(false);
  const [showMiniGame, setShowMiniGame] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Get user ID for leaderboard highlighting
  useEffect(() => {
    import("@/lib/supabaseClient").then(({ createBrowserClient }) => {
      const supabase = createBrowserClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUserId(session?.user?.id ?? null);
      });
    });
  }, []);

  // Show tutorial on first game mode enable
  useEffect(() => {
    if (gameMode && state && !state.profile.onboarding_seen) {
      setShowTutorial(true);
    }
  }, [gameMode, state]);

  // Handle confetti on level up
  useEffect(() => {
    if (pendingLevelUp) {
      fire();
    }
  }, [pendingLevelUp, fire]);

  // Fetch leaderboard when toggled
  useEffect(() => {
    if (showLeaderboard) {
      getSpotQuestLeaderboard(10).then(setLeaderboard);
    }
  }, [showLeaderboard]);

  const handleTutorialComplete = useCallback(async () => {
    await completeOnboarding();
    setShowTutorial(false);
  }, [completeOnboarding]);

  const handleMiniGameComplete = useCallback(async (score: number) => {
    return await awardPerfectPark(score);
  }, [awardPerfectPark]);

  // Find un-seen badges for popups
  const unSeenBadge = state?.badges?.find((b) => !b.seen && newBadges.includes(b.id));

  // Don't render anything if loading or no profile
  if (loading || !state) return null;

  return (
    <>
      {/* Confetti canvas */}
      <ConfettiEffect canvasRef={canvasRef} />

      {/* Compact HUD (always visible when game mode on) */}
      {gameMode && (
        <div className="absolute top-4 left-14 z-20 flex flex-col gap-1.5 max-w-[calc(100%-8rem)]">
          <div className="flex items-center gap-1.5">
            <GameHUD
              totalXp={state.profile.total_xp}
              level={state.profile.level}
              streak={state.profile.current_streak}
              compact
            />
            <button
              onClick={() => setExpanded(!expanded)}
              className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-full p-1.5 shadow-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-700 transition"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
          {state.quests.some((q) => !q.completed) && (
            <QuestTracker quests={state.quests} compact />
          )}
        </div>
      )}

      {/* Expanded game panel */}
      {gameMode && expanded && (
        <div className="absolute top-16 left-4 right-4 z-30 max-w-sm mx-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden max-h-[70vh] overflow-y-auto">
            <div className="p-4 space-y-3">
              {/* Full HUD */}
              <GameHUD
                totalXp={state.profile.total_xp}
                level={state.profile.level}
                streak={state.profile.current_streak}
              />

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMiniGame(true)}
                  className="flex-1 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Target size={14} />
                  Belmont Shore
                </button>
                <button
                  onClick={() => setShowLeaderboard(!showLeaderboard)}
                  className="flex-1 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition border border-amber-200 dark:border-amber-800"
                >
                  <Trophy size={14} />
                  Leaderboard
                </button>
              </div>

              {/* Quests */}
              <QuestTracker quests={state.quests} />

              {/* Leaderboard */}
              {showLeaderboard && (
                <LeaderboardWidget entries={leaderboard} currentUserId={userId} />
              )}

              {/* Badges */}
              <BadgeDisplay badges={state.badges} />

              {/* Recent XP */}
              {state.recent_transactions.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-lg">
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
                    <Zap size={16} className="text-amber-500" />
                    Recent XP
                  </h3>
                  <div className="space-y-1.5">
                    {state.recent_transactions.slice(0, 5).map((tx, i) => (
                      <div key={i} className="flex items-center justify-between py-1">
                        <span className="text-xs text-zinc-500 truncate flex-1 mr-2">{tx.description}</span>
                        <span className="text-xs font-bold text-green-600 dark:text-green-400 shrink-0">
                          +{tx.xp_amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Game mode toggle button (when game mode is OFF) */}
      {!gameMode && (
        <button
          onClick={() => toggleGameMode(true)}
          className="absolute top-4 left-14 z-20 flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full px-3 py-1.5 shadow-lg text-xs font-bold transition-all"
        >
          <Gamepad2 size={14} />
          SpotQuest
          <Sparkles size={12} />
        </button>
      )}

      {/* Game mode toggle off (when expanded) */}
      {gameMode && !expanded && (
        <button
          onClick={() => toggleGameMode(false)}
          className="absolute top-4 right-20 z-20 text-zinc-400 hover:text-zinc-600 transition"
          title="Disable SpotQuest"
        >
          <X size={14} />
        </button>
      )}

      {/* Mini-game modal */}
      {showMiniGame && (
        <BelmontShoreGame
          onComplete={handleMiniGameComplete}
          onClose={() => setShowMiniGame(false)}
          playerVehicleType={vehicleType}
          onSetVehicleType={setVehicleType}
        />
      )}

      {/* Badge popup */}
      {unSeenBadge && (
        <BadgePopup
          badge={unSeenBadge}
          onDismiss={clearNewBadges}
        />
      )}

      {/* Level up animation */}
      {pendingLevelUp && (
        <LevelUpAnimation
          newLevel={pendingLevelUp}
          onDismiss={clearPendingLevelUp}
        />
      )}

      {/* Onboarding tutorial */}
      {showTutorial && (
        <OnboardingTutorial onComplete={handleTutorialComplete} />
      )}
    </>
  );
}
