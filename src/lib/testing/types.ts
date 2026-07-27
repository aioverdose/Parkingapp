export interface SimulatedPosition {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  accuracy: number;
  timestamp: string;
}

export interface RouteWaypoint {
  lat: number;
  lng: number;
  speed?: number;
  dwellTimeMs?: number;
  name?: string;
}

export interface ParkingDetectionEvent {
  timestamp: string;
  lat: number;
  lng: number;
  speed: number;
  detected: boolean;
  method: string;
}

export interface GeofenceZone {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number }[];
  color: string;
}

export interface GeofenceEvent {
  timestamp: string;
  geofenceId: string;
  geofenceName: string;
  type: "entry" | "exit";
  lat: number;
  lng: number;
}

export interface TestScenarioStep {
  id: string;
  label: string;
  type: "set_location" | "start_route" | "set_speed" | "wait" | "check_parking" | "check_geofence" | "log";
  params: Record<string, unknown>;
}

export interface TestScenarioResult {
  stepId: string;
  label: string;
  passed: boolean;
  message: string;
  timestamp: string;
}

export type DeviceStatus = "driving" | "parked" | "idle" | "offline";

export type TestingPanel = "gps" | "routes" | "parking" | "tracking" | "eta" | "geofence" | "scenarios";

export interface PlaybackState {
  playing: boolean;
  currentIndex: number;
  totalWaypoints: number;
  speedMultiplier: number;
  percent: number;
}
