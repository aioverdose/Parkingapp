"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BehaviorAgent } from "@/lib/behavior/agent";
import { GpsSensor, MotionSensor } from "@/lib/behavior/sensors";
import { postMatchStatus } from "@/lib/behavior/actions";
import { createBrowserClient } from "@/lib/supabaseClient";
import type {
  BehaviorAgentEvent,
  BehaviorAgentState,
} from "@/lib/behavior/types";

const UNDO_WINDOW_MS = 10_000;
const ARRIVAL_PROXIMITY_METERS = 100;

export type HandoffAutomationAction = "arrived" | "departed";

interface UseHandoffAutomationOptions {
  matchId: string | null;
  role: "owner" | "seeker" | null;
  spot: { latitude: number; longitude: number } | null;
  enabled: boolean;
  autoConfirm: boolean;
  motionEnabled: boolean;
  /** For the seeker: whether the owner has pulled out. The driver only
      auto-confirms arrival once the spot is actually free. */
  ownerDeparted?: boolean;
  onApplied?: (action: HandoffAutomationAction) => void;
}

interface HandoffAutomationState {
  pendingAction: HandoffAutomationAction | null;
  undoDeadline: number | null;
  agentState: BehaviorAgentState;
}

export function useHandoffAutomation({
  matchId,
  role,
  spot,
  enabled,
  autoConfirm,
  motionEnabled,
  ownerDeparted = false,
  onApplied,
}: UseHandoffAutomationOptions) {
  const [state, setState] = useState<HandoffAutomationState>({
    pendingAction: null,
    undoDeadline: null,
    agentState: "unknown",
  });
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const agentRef = useRef<BehaviorAgent | null>(null);
  const gpsRef = useRef<GpsSensor | null>(null);
  const motionRef = useRef<MotionSensor | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGpsRef = useRef<{ lat: number; lng: number } | null>(null);
  const optionsRef = useRef({ role, spot, matchId, autoConfirm, ownerDeparted, onApplied });
  useEffect(() => {
    optionsRef.current = { role, spot, matchId, autoConfirm, ownerDeparted, onApplied };
  }, [role, spot, matchId, autoConfirm, ownerDeparted, onApplied]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const applyAction = useCallback(async (action: HandoffAutomationAction) => {
    const { matchId: mid, onApplied: cb } = optionsRef.current;
    if (!mid) return;
    const supabase = createBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    setState((prev) => ({ ...prev, pendingAction: null, undoDeadline: null }));
    if (!token) return;
    const ok = await postMatchStatus({ matchId: mid, status: action, token });
    if (ok) {
      cb?.(action);
    }
  }, []);

  const queueAction = useCallback(
    (action: HandoffAutomationAction) => {
      setState((prev) => {
        if (prev.pendingAction) return prev;
        return { ...prev, pendingAction: action, undoDeadline: Date.now() + UNDO_WINDOW_MS };
      });
    },
    [],
  );

  const cancelPending = useCallback(() => {
    stopTimer();
    setState((prev) => ({ ...prev, pendingAction: null, undoDeadline: null }));
  }, [stopTimer]);

  const applyNow = useCallback(() => {
    stopTimer();
    const action = stateRef.current.pendingAction;
    if (action) {
      void applyAction(action);
    }
  }, [applyAction, stopTimer]);

  useEffect(() => {
    if (state.pendingAction) {
      stopTimer();
      timerRef.current = setTimeout(() => {
        const action = stateRef.current.pendingAction;
        if (action) {
          void applyAction(action);
        }
      }, UNDO_WINDOW_MS);
    }
    return stopTimer;
  }, [state.pendingAction, applyAction, stopTimer]);

  const handleEvent = useCallback(
    (event: BehaviorAgentEvent) => {
      const { role: r, spot: sp, autoConfirm: ac, ownerDeparted: od } = optionsRef.current;
      if (!r || !ac) return;

      if (r === "owner" && event.type === "CAR_MOVED_CONFIRMED") {
        queueAction("departed");
        return;
      }

      // Seeker only auto-confirms once the owner has actually pulled out —
      // otherwise the driver "arrives" before the spot is free.
      if (r === "seeker" && od && event.type === "PARK_CONFIRMED") {
        if (!sp || !event.lat || !event.lng) return;
        const dist = haversine(event.lat, event.lng, sp.latitude, sp.longitude);
        if (dist <= ARRIVAL_PROXIMITY_METERS) {
          queueAction("arrived");
        }
      }
    },
    [queueAction],
  );

  useEffect(() => {
    if (!enabled || !matchId || !role) return;

    const agent = new BehaviorAgent({}, (event) => handleEvent(event));
    agentRef.current = agent;

    const gps = new GpsSensor((sample) => {
      lastGpsRef.current = { lat: sample.lat, lng: sample.lng };
      agent.ingest({ timestamp: sample.timestamp, gps: sample, motion: null });
      setState((prev) => ({ ...prev, agentState: agent.getState() }));
    });
    gpsRef.current = gps;
    gps.start();

    if (motionEnabled) {
      const motion = new MotionSensor((features) => {
        agent.ingest({ timestamp: features.timestamp, gps: null, motion: features });
        setState((prev) => ({ ...prev, agentState: agent.getState() }));
      });
      motionRef.current = motion;
      motion.start();
    }

    return () => {
      gpsRef.current?.stop();
      gpsRef.current = null;
      motionRef.current?.stop();
      motionRef.current = null;
      agentRef.current = null;
      stopTimer();
      setState({ pendingAction: null, undoDeadline: null, agentState: "unknown" });
    };
  }, [enabled, matchId, role, motionEnabled, handleEvent, stopTimer]);

  return {
    pendingAction: state.pendingAction,
    undoDeadline: state.undoDeadline,
    agentState: state.agentState,
    cancelPending,
    applyNow,
  };
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
