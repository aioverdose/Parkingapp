export const SPOT_PROTOCOL = {
  name: "SPOT Protocol",
  acronym: "Safe Proximity Offer Transfer",
  summary: "A private, hands-free parking handoff between one departing driver and one arriving member.",
  stages: [
    "Private offer",
    "Safe acceptance",
    "Hands-free approach",
    "Nearby verification",
    "Owner-ready handoff",
  ],
} as const;

export const SPOT_ARRIVAL_GEOFENCE = {
  latitude: 33.7601,
  longitude: -118.1342,
  radiusMeters: 1000,
  exitRadiusMeters: 1200,
} as const;

export type LocationAccuracyBand = "excellent" | "good" | "fair" | "poor";

export function getLocationAccuracyBand(accuracy: number): LocationAccuracyBand {
  if (accuracy <= 20) return "excellent";
  if (accuracy <= 50) return "good";
  if (accuracy <= 100) return "fair";
  return "poor";
}

export function distanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const earthRadius = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const latitude1 = toRadians(from.latitude);
  const latitude2 = toRadians(to.latitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isInsideSpotArrivalGeofence(
  position: { latitude: number; longitude: number },
  wasInside = false,
  accuracy = 0,
): boolean {
  const distance = distanceMeters(position, SPOT_ARRIVAL_GEOFENCE);
  const boundary = wasInside ? SPOT_ARRIVAL_GEOFENCE.exitRadiusMeters : SPOT_ARRIVAL_GEOFENCE.radiusMeters;
  // Require the whole reported uncertainty circle to be inside on entry, and
  // keep a member inside until the uncertainty circle clears the exit boundary.
  return wasInside ? distance - accuracy <= boundary : distance + accuracy <= boundary;
}

export type SpotProtocolStage = (typeof SPOT_PROTOCOL.stages)[number];
