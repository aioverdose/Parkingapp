export type MotionPermissionState = "unknown" | "granted" | "denied" | "prompt";

export interface GpsSample {
  lat: number;
  lng: number;
  speedMs: number | null;
  heading: number | null;
  accuracy: number | null;
  timestamp: number;
}

export interface MotionFeatures {
  timestamp: number;
  vibrationEnergy: number;
  stepCadence: number;
  hasMotion: boolean;
}

export interface SensorFeatures {
  timestamp: number;
  gps: GpsSample | null;
  motion: MotionFeatures | null;
}

export type BehaviorAgentState =
  | "unknown"
  | "driving"
  | "parking_in_progress"
  | "parked"
  | "walking_away"
  | "away"
  | "returning"
  | "near_car"
  | "vehicle_moved";

export type BehaviorAgentEventType =
  | "PARK_CONFIRMED"
  | "WALKING_AWAY_CONFIRMED"
  | "RETURNING_CONFIRMED"
  | "NEAR_CAR_CONFIRMED"
  | "CAR_MOVED_CONFIRMED";

export interface BehaviorAgentEvent {
  type: BehaviorAgentEventType;
  timestamp: number;
  state: BehaviorAgentState;
  lat: number | null;
  lng: number | null;
  confidence: number;
}

export interface BehaviorAgentConfig {
  parkingSpeedThresholdMs: number;
  parkingWindowMs: number;
  parkingMinSamples: number;
  walkingSpeedMinMs: number;
  walkingSpeedMaxMs: number;
  walkingConfirmMs: number;
  nearCarMeters: number;
  leavingDistanceMeters: number;
  vehicleMovedSpeedMs: number;
  vehicleMovedWindowMs: number;
}

export const DEFAULT_BEHAVIOR_AGENT_CONFIG: BehaviorAgentConfig = {
  parkingSpeedThresholdMs: 1.0,
  parkingWindowMs: 30_000,
  parkingMinSamples: 10,
  walkingSpeedMinMs: 0.5,
  walkingSpeedMaxMs: 3.0,
  walkingConfirmMs: 15_000,
  nearCarMeters: 15,
  leavingDistanceMeters: 30,
  vehicleMovedSpeedMs: 5.0,
  vehicleMovedWindowMs: 10_000,
};

export interface BehaviorAgentSnapshot {
  state: BehaviorAgentState;
  parkedLocation: { lat: number; lng: number } | null;
  parkedAt: number | null;
  speedMs: number | null;
  distanceToCarMeters: number | null;
  walkingEtaSeconds: number | null;
  parkingProgress: number;
  lastEvent: BehaviorAgentEvent | null;
  motionAvailable: boolean;
  gpsAvailable: boolean;
}

export interface BehaviorAgentPreferences {
  enabled: boolean;
  autoPost: boolean;
  autoConfirm: boolean;
  thresholds: Partial<BehaviorAgentConfig> | null;
}
