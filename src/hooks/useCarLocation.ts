"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { BehaviorAgent } from "@/lib/behavior/agent";
import { GpsSensor, MotionSensor } from "@/lib/behavior/sensors";
import { postCarLocation, patchCarLocation } from "@/lib/behavior/actions";
import type {
  BehaviorAgentEvent,
  BehaviorAgentState,
} from "@/lib/behavior/types";
import type { Database } from "@/lib/database.types";

type CarLocation = Database["public"]["Tables"]["car_locations"]["Row"];

const WALKING_AVG_SPEED = 1.4;

function formatEta(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}min ${Math.round(seconds % 60)}s`;
}

export interface CarLocationState {
  carLocation: CarLocation | null;
  parkingDetection: "off" | "detecting_park" | "parked" | "walking_back" | "near_car";
  detectionProgress: number;
  walkingEtaSeconds: number | null;
  walkingEtaFormatted: string | null;
  distanceToCar: number | null;
  lastKnownLat: number | null;
  lastKnownLng: number | null;
  agentState: BehaviorAgentState;
  loading: boolean;
}

export interface UseCarLocationOptions {
  motionEnabled?: boolean;
  onCarMoved?: (event: BehaviorAgentEvent) => void;
  onParked?: (event: BehaviorAgentEvent) => void;
}

export function useCarLocation(
  userId: string | null,
  enabled: boolean = true,
  options: UseCarLocationOptions = {},
) {
  const [state, setState] = useState<CarLocationState>({
    carLocation: null,
    parkingDetection: "off",
    detectionProgress: 0,
    walkingEtaSeconds: null,
    walkingEtaFormatted: null,
    distanceToCar: null,
    lastKnownLat: null,
    lastKnownLng: null,
    agentState: "unknown",
    loading: true,
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const agentRef = useRef<BehaviorAgent | null>(null);
  const gpsRef = useRef<GpsSensor | null>(null);
  const motionRef = useRef<MotionSensor | null>(null);
  const tokenRef = useRef<string | null>(null);
  const stoppedRef = useRef(false);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const setFromSnapshot = useCallback(() => {
    const agent = agentRef.current;
    if (!agent) return;
    const snap = agent.getSnapshot();
    setState((prev) => {
      let detection: CarLocationState["parkingDetection"] = prev.parkingDetection;
      if (snap.state === "parking_in_progress") detection = "detecting_park";
      if (prev.carLocation) {
        if (prev.carLocation.status === "walking_back") detection = "walking_back";
        else if (prev.carLocation.status === "parked" && snap.state === "near_car") detection = "near_car";
        else if (prev.carLocation.status === "parked" && detection === "off") detection = "parked";
        if (prev.carLocation.status === "departed") detection = "off";
      }
      return {
        ...prev,
        parkingDetection: detection,
        detectionProgress: snap.parkingProgress,
        distanceToCar: snap.distanceToCarMeters,
        walkingEtaSeconds: snap.walkingEtaSeconds,
        walkingEtaFormatted: snap.walkingEtaSeconds != null ? formatEta(snap.walkingEtaSeconds) : null,
        lastKnownLat: snap.parkedLocation?.lat ?? prev.lastKnownLat,
        lastKnownLng: snap.parkedLocation?.lng ?? prev.lastKnownLng,
        agentState: snap.state,
      };
    });
  }, []);

  const handleEvent = useCallback(
    (event: BehaviorAgentEvent) => {
      const token = tokenRef.current;
      switch (event.type) {
        case "PARK_CONFIRMED": {
          if (event.lat == null || event.lng == null) return;
          const now = new Date().toISOString();
          const cl: CarLocation = {
            id: "local",
            user_id: userId ?? "",
            latitude: event.lat,
            longitude: event.lng,
            parked_at: now,
            status: "parked",
            walking_eta_seconds: null,
            walking_back_detected_at: null,
            departed_at: null,
            created_at: now,
            updated_at: now,
          };
          setState((prev) => ({
            ...prev,
            carLocation: cl,
            parkingDetection: "parked",
            detectionProgress: 1,
            walkingEtaSeconds: null,
            walkingEtaFormatted: null,
            distanceToCar: 0,
            lastKnownLat: event.lat,
            lastKnownLng: event.lng,
          }));
          if (token) {
            void postCarLocation(event.lat, event.lng, token).then((id) => {
              if (id && !stoppedRef.current) {
                setState((prev) => ({
                  ...prev,
                  carLocation: prev.carLocation ? { ...prev.carLocation, id } : prev.carLocation,
                }));
              }
            });
          }
          optionsRef.current.onParked?.(event);
          break;
        }
        case "RETURNING_CONFIRMED": {
          const prev = stateRef.current;
          if (!prev.carLocation || prev.carLocation.status !== "parked") break;
          const eta = prev.distanceToCar != null ? Math.round(prev.distanceToCar / WALKING_AVG_SPEED) : null;
          setState((p) => ({
            ...p,
            carLocation: p.carLocation ? { ...p.carLocation, status: "walking_back" as CarLocation["status"] } : p.carLocation,
            parkingDetection: "walking_back",
            walkingEtaSeconds: eta,
            walkingEtaFormatted: eta != null ? formatEta(eta) : null,
          }));
          if (token && prev.carLocation.id !== "local") {
            void patchCarLocation(prev.carLocation.id, {
              status: "walking_back",
              walking_back_detected_at: new Date().toISOString(),
              walking_eta_seconds: eta,
            }, token);
          }
          break;
        }
        case "NEAR_CAR_CONFIRMED": {
          const prev = stateRef.current;
          if (prev.carLocation && prev.carLocation.status === "parked") {
            setState((p) => ({
              ...p,
              parkingDetection: "near_car",
              distanceToCar: 0,
              walkingEtaSeconds: null,
              walkingEtaFormatted: null,
            }));
          }
          break;
        }
        case "CAR_MOVED_CONFIRMED": {
          const prev = stateRef.current;
          if (prev.carLocation && prev.carLocation.status !== "departed") {
            const departedAt = new Date().toISOString();
            setState((p) => ({
              ...p,
              carLocation: p.carLocation
                ? { ...p.carLocation, status: "departed" as CarLocation["status"], departed_at: departedAt }
                : p.carLocation,
              parkingDetection: "off",
              distanceToCar: null,
              walkingEtaSeconds: null,
              walkingEtaFormatted: null,
            }));
            if (token && prev.carLocation.id !== "local") {
              void patchCarLocation(prev.carLocation.id, {
                status: "departed",
                departed_at: departedAt,
              }, token);
            }
          }
          optionsRef.current.onCarMoved?.(event);
          break;
        }
        default:
          break;
      }
    },
    [userId],
  );

  useEffect(() => {
    if (!enabled) {
      queueMicrotask(() => setState((prev) => ({ ...prev, loading: false })));
      return;
    }

    let stopped = false;
    stoppedRef.current = false;
    const supabase = createBrowserClient();

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (stopped) return;
      tokenRef.current = session?.access_token ?? null;

      if (!session?.user) {
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      try {
        const res = await fetch("/api/car-locations", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (!stopped && data.carLocation) {
          const cl = data.carLocation as CarLocation;
          setState((prev) => ({
            ...prev,
            carLocation: cl,
            parkingDetection: cl.status === "walking_back" ? "walking_back" : cl.status === "departed" ? "off" : "parked",
            walkingEtaSeconds: cl.walking_eta_seconds,
            walkingEtaFormatted: cl.walking_eta_seconds ? formatEta(cl.walking_eta_seconds) : null,
            loading: false,
          }));
        } else if (!stopped) {
          setState((prev) => ({ ...prev, loading: false }));
        }
      } catch {
        if (!stopped) setState((prev) => ({ ...prev, loading: false }));
      }

      if (stopped) return;

      const agent = new BehaviorAgent({}, (event) => {
        if (!stopped) handleEvent(event);
      });
      agentRef.current = agent;

      const gps = new GpsSensor((sample) => {
        if (stopped) return;
        agent.ingest({ timestamp: sample.timestamp, gps: sample, motion: null });
        setFromSnapshot();
      });
      gpsRef.current = gps;
      gps.start();

      if (optionsRef.current.motionEnabled) {
        const motion = new MotionSensor((features) => {
          if (stopped) return;
          agent.ingest({ timestamp: features.timestamp, gps: null, motion: features });
          setFromSnapshot();
        });
        motionRef.current = motion;
        motion.start();
      }
    };

    void setup();

    return () => {
      stopped = true;
      stoppedRef.current = true;
      gpsRef.current?.stop();
      gpsRef.current = null;
      motionRef.current?.stop();
      motionRef.current = null;
      agentRef.current = null;
    };
  }, [enabled, userId, options.motionEnabled, handleEvent, setFromSnapshot]);

  return state;
}
