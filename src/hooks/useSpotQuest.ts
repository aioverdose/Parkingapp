"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { getGameState, toggleGameMode, markOnboardingSeen, setVehicleType } from "@/actions/spotquest";
import type { GameState, HandoffXpResult, PerfectParkResult, VehicleType } from "@/lib/spotquest/types";

interface UseSpotQuestReturn {
  state: GameState | null;
  loading: boolean;
  gameMode: boolean;
  toggleGameMode: (enabled: boolean) => Promise<void>;
  awardHandoffXp: (params: {
    match_id?: string;
    is_owner?: boolean;
    speed_minutes?: number;
    rating?: number;
  }) => Promise<HandoffXpResult | null>;
  awardPerfectPark: (score: number) => Promise<PerfectParkResult | null>;
  refresh: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  vehicleType: VehicleType | null;
  setVehicleType: (type: VehicleType) => Promise<void>;
  newBadges: string[];
  clearNewBadges: () => void;
  pendingLevelUp: number | null;
  clearPendingLevelUp: () => void;
}

export function useSpotQuest(): UseSpotQuestReturn {
  const supabase = createBrowserClient();
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [pendingLevelUp, setPendingLevelUp] = useState<number | null>(null);

  // Get user on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        setUserId(null);
        setState(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch game state when userId changes
  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const gs = await getGameState(userId);
      setState(gs);
    } catch {
      console.error("Failed to load game state");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) refresh();
  }, [userId, refresh]);

  const toggleGameModeHandler = useCallback(async (enabled: boolean) => {
    if (!userId) return;
    await toggleGameMode(userId, enabled);
    setState((prev) =>
      prev ? { ...prev, profile: { ...prev.profile, game_mode_enabled: enabled } } : prev,
    );
  }, [userId]);

  const awardHandoffXp = useCallback(
    async (params: {
      match_id?: string;
      is_owner?: boolean;
      speed_minutes?: number;
      rating?: number;
    }): Promise<HandoffXpResult | null> => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return null;

      try {
        const res = await fetch("/api/spotquest/xp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "handoff", ...params }),
        });
        const data = await res.json();
        if (data.xp) {
          if (data.xp.level_up) {
            setPendingLevelUp(data.xp.new_level);
          }
          if (data.new_badges?.length > 0) {
            setNewBadges(data.new_badges.map((b: { id: string }) => b.id));
          }
          await refresh();
          return data.xp;
        }
        return null;
      } catch {
        return null;
      }
    },
    [supabase, refresh],
  );

  const awardPerfectPark = useCallback(
    async (score: number): Promise<PerfectParkResult | null> => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return null;

      try {
        const res = await fetch("/api/spotquest/xp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "perfect_park", score }),
        });
        const data = await res.json();
        if (data.xp) {
          if (data.xp.level_up) {
            setPendingLevelUp(data.xp.new_level);
          }
          await refresh();
          return data.xp;
        }
        return null;
      } catch {
        return null;
      }
    },
    [supabase, refresh],
  );

  const completeOnboarding = useCallback(async () => {
    if (!userId) return;
    await markOnboardingSeen(userId);
    setState((prev) =>
      prev ? { ...prev, profile: { ...prev.profile, onboarding_seen: true } } : prev,
    );
  }, [userId]);

  const handleSetVehicleType = useCallback(async (type: VehicleType) => {
    if (!userId) return;
    await setVehicleType(userId, type);
    setState((prev) =>
      prev ? { ...prev, profile: { ...prev.profile, vehicle_type: type } } : prev,
    );
  }, [userId]);

  return {
    state,
    loading,
    gameMode: state?.profile?.game_mode_enabled ?? false,
    toggleGameMode: toggleGameModeHandler,
    awardHandoffXp,
    awardPerfectPark,
    refresh,
    completeOnboarding,
    vehicleType: state?.profile?.vehicle_type ?? null,
    setVehicleType: handleSetVehicleType,
    newBadges,
    clearNewBadges: () => setNewBadges([]),
    pendingLevelUp,
    clearPendingLevelUp: () => setPendingLevelUp(null),
  };
}
