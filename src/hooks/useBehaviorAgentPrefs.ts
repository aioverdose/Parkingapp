"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import {
  isMotionSensorSupported,
  requestMotionPermission,
} from "@/lib/behavior/sensors";
import type {
  BehaviorAgentPreferences,
  MotionPermissionState,
} from "@/lib/behavior/types";

const DEFAULT_PREFS: BehaviorAgentPreferences = {
  enabled: true,
  autoPost: false,
  autoConfirm: true,
  thresholds: null,
};

export function useBehaviorAgentPrefs() {
  const supabase = createBrowserClient();
  const [prefs, setPrefs] = useState<BehaviorAgentPreferences>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);
  const [motionPermission, setMotionPermission] = useState<MotionPermissionState>("unknown");
  const [motionSupported] = useState(() => isMotionSensorSupported());

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled || !session?.user) {
        setLoaded(true);
        return;
      }
      const { data, error } = await supabase
        .from("behavior_agent_config")
        .select("enabled, auto_post, auto_confirm, thresholds")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!cancelled) {
        if (data && !error) {
          setPrefs({
            enabled: data.enabled,
            autoPost: data.auto_post,
            autoConfirm: data.auto_confirm,
            thresholds: (data.thresholds as Partial<BehaviorAgentPreferences["thresholds"]> & Record<string, unknown>) ?? null,
          });
        }
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const persistPrefs = useCallback(
    async (next: BehaviorAgentPreferences) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      await supabase
        .from("behavior_agent_config")
        .upsert(
          {
            user_id: session.user.id,
            enabled: next.enabled,
            auto_post: next.autoPost,
            auto_confirm: next.autoConfirm,
            thresholds: next.thresholds ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
    },
    [supabase],
  );

  const updatePrefs = useCallback(
    (patch: Partial<BehaviorAgentPreferences>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
        void persistPrefs(next);
        return next;
      });
    },
    [persistPrefs],
  );

  const askForMotionPermission = useCallback(async (): Promise<MotionPermissionState> => {
    const result = await requestMotionPermission();
    setMotionPermission(result);
    return result;
  }, []);

  return {
    prefs,
    loaded,
    setEnabled: (enabled: boolean) => updatePrefs({ enabled }),
    setAutoPost: (autoPost: boolean) => updatePrefs({ autoPost }),
    setAutoConfirm: (autoConfirm: boolean) => updatePrefs({ autoConfirm }),
    updatePrefs,
    motionPermission,
    askForMotionPermission,
    motionSupported,
  };
}
