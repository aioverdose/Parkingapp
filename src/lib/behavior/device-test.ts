import type { BehaviorAgentConfig } from "./types";

export const FAST_BEHAVIOR_AGENT_CONFIG: BehaviorAgentConfig = {
  parkingSpeedThresholdMs: 1.0,
  parkingWindowMs: 15_000,
  parkingMinSamples: 5,
  walkingSpeedMinMs: 0.5,
  walkingSpeedMaxMs: 3.0,
  walkingConfirmMs: 6_000,
  nearCarMeters: 15,
  leavingDistanceMeters: 30,
  vehicleMovedSpeedMs: 5.0,
  vehicleMovedWindowMs: 5_000,
};

export type DeviceTestEventType =
  | "state"
  | "agent_event"
  | "sensor"
  | "permission"
  | "note"
  | "error";

export interface DeviceTestEventPayload {
  eventType: DeviceTestEventType;
  agentState?: string | null;
  agentEventType?: string | null;
  confidence?: number | null;
  lat?: number | null;
  lng?: number | null;
  speedMs?: number | null;
  accuracy?: number | null;
  vibrationEnergy?: number | null;
  stepCadence?: number | null;
  detail?: Record<string, unknown> | null;
  timestamp?: number;
}

export interface DeviceTestSummary {
  durationSeconds: number;
  statesObserved: string[];
  agentEvents: { type: string; confidence: number; at: number }[];
  gpsFixes: number;
  motionSamples: number;
  peakVibration: number;
  parkedLocation: { lat: number; lng: number } | null;
  motionPermission: string;
  fastMode: boolean;
}
