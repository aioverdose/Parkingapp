import type { RouteWaypoint, DeviceStatus } from "@/lib/testing/types";

export type AgentRole = "owner" | "seeker" | "bystander";

export interface VenvAgentState {
  id: string;
  label: string;
  userId: string;
  role: AgentRole;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  accuracy: number;
  status: DeviceStatus;
  color: string;
  route: RouteWaypoint[] | null;
  routeIndex: number;
  routePlaying: boolean;
  routeSpeed: number;
  parkedLocation: { lat: number; lng: number } | null;
  notifications: string[];
  broadcastCount: number;
}

export interface VenvRoute {
  id: string;
  label: string;
  waypoints: RouteWaypoint[];
  color: string;
}

export interface VenvTimelineEvent {
  id: string;
  agentId: string;
  agentLabel: string;
  time: number;
  type: "spawn" | "park" | "depart" | "arrive" | "route_start" | "route_end" | "broadcast" | "match" | "error" | "note";
  message: string;
  lat: number;
  lng: number;
}

export interface VenvEnvironmentConfig {
  timeSpeedMultiplier: number;
  gpsNoiseLevel: number;
  undergroundMode: boolean;
  trafficDensity: number;
  autoBroadcast: boolean;
  broadcastIntervalMs: number;
}

export const DEFAULT_ENV_CONFIG: VenvEnvironmentConfig = {
  timeSpeedMultiplier: 1,
  gpsNoiseLevel: 0,
  undergroundMode: false,
  trafficDensity: 0,
  autoBroadcast: true,
  broadcastIntervalMs: 1000,
};

export const AGENT_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#ca8a04",
];

export const AGENT_LABELS = [
  "Agent Alpha",
  "Agent Beta",
  "Agent Gamma",
  "Agent Delta",
  "Agent Epsilon",
  "Agent Zeta",
  "Agent Eta",
  "Agent Theta",
];
