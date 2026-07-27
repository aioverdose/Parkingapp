import type { RouteWaypoint } from "./types";

export interface TestRoute {
  name: string;
  description: string;
  waypoints: RouteWaypoint[];
}

function makeDwellingEnd(waypoints: RouteWaypoint[]): RouteWaypoint[] {
  const last = waypoints[waypoints.length - 1];
  const dwelling: RouteWaypoint = { ...last, speed: 0, dwellTimeMs: 30_000, name: "Parked (dwell)" };
  return [...waypoints, dwelling, { ...dwelling, name: "Parked (hold)" }];
}

const _downtownLoop: RouteWaypoint[] = [
  { lat: 33.7700, lng: -118.1937, speed: 11.2, name: "Start — Ocean & 1st" },
  { lat: 33.7695, lng: -118.1920, speed: 11.2 },
  { lat: 33.7688, lng: -118.1905, speed: 8.9 },
  { lat: 33.7680, lng: -118.1890, speed: 8.9 },
  { lat: 33.7672, lng: -118.1878, speed: 6.7, name: "Pine Ave — slowing" },
  { lat: 33.7665, lng: -118.1870, speed: 4.5 },
  { lat: 33.7658, lng: -118.1865, speed: 2.2, name: "Approaching spot" },
  { lat: 33.7655, lng: -118.1862, speed: 0, name: "Found spot" },
];

const _garageEntry: RouteWaypoint[] = [
  { lat: 33.7667, lng: -118.1897, speed: 11.2, name: "Start — Pike Outlets" },
  { lat: 33.7670, lng: -118.1905, speed: 11.2 },
  { lat: 33.7675, lng: -118.1912, speed: 8.9 },
  { lat: 33.7680, lng: -118.1918, speed: 6.7, name: "Turning toward garage" },
  { lat: 33.7683, lng: -118.1922, speed: 4.5 },
  { lat: 33.7685, lng: -118.1925, speed: 2.2, name: "Entering garage ramp" },
  { lat: 33.7687, lng: -118.1927, speed: 1.1 },
  { lat: 33.7688, lng: -118.1928, speed: 0, name: "In garage — parked" },
];

const _multiStopErrand: RouteWaypoint[] = [
  { lat: 33.7838, lng: -118.1138, speed: 11.2, name: "Start — CSULB" },
  { lat: 33.7820, lng: -118.1160, speed: 11.2 },
  { lat: 33.7800, lng: -118.1200, speed: 11.2 },
  { lat: 33.7780, lng: -118.1250, speed: 8.9 },
  { lat: 33.7760, lng: -118.1300, speed: 4.5, name: "Approaching Stop 1" },
  { lat: 33.7755, lng: -118.1320, speed: 0, name: "Stop 1 — Coffee shop" },
  { lat: 33.7755, lng: -118.1320, speed: 0, dwellTimeMs: 15_000, name: "Stop 1 — Dwell" },
  { lat: 33.7755, lng: -118.1320, speed: 6.7, name: "Leaving Stop 1" },
  { lat: 33.7730, lng: -118.1340, speed: 11.2 },
  { lat: 33.7700, lng: -118.1360, speed: 8.9 },
  { lat: 33.7680, lng: -118.1370, speed: 4.5, name: "Approaching Stop 2" },
  { lat: 33.7675, lng: -118.1375, speed: 0, name: "Stop 2 — Grocery" },
  { lat: 33.7675, lng: -118.1375, speed: 0, dwellTimeMs: 15_000, name: "Stop 2 — Dwell" },
  { lat: 33.7675, lng: -118.1375, speed: 6.7, name: "Leaving Stop 2" },
  { lat: 33.7660, lng: -118.1400, speed: 11.2 },
  { lat: 33.7650, lng: -118.1420, speed: 8.9 },
  { lat: 33.7640, lng: -118.1430, speed: 4.5, name: "Approaching Stop 3" },
  { lat: 33.7635, lng: -118.1435, speed: 0, name: "Stop 3 — Library" },
  { lat: 33.7635, lng: -118.1435, speed: 0, dwellTimeMs: 15_000, name: "Stop 3 — Dwell" },
];

export const TEST_ROUTES: TestRoute[] = [
  {
    name: "Downtown Loop",
    description: "Drives through downtown Long Beach streets, slows down, and parks at a spot",
    waypoints: makeDwellingEnd(_downtownLoop),
  },
  {
    name: "Garage Entry",
    description: "Drives to a parking garage, speed drops to 0 (simulates parking)",
    waypoints: makeDwellingEnd(_garageEntry),
  },
  {
    name: "Multi-Stop Errand",
    description: "Drives to 3 locations with stops at each — tests repeated parking detection",
    waypoints: _multiStopErrand,
  },
];
