import { getVehicleTypeLabel } from "@/lib/vehicle-types";

export interface MatchFitInput {
  departureTime?: string | null;
  returnTime?: string | null;
  relayMode?: "imminent" | "scheduled" | null;
  spotVehicleType?: string | null;
  participantVehicleType?: string | null;
  distanceMeters?: number | null;
  areaLabel?: string | null;
}

export interface MatchFitSummary {
  schedule: string;
  vehicle: string;
  location: string;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `about ${Math.round(meters)} m away`;
  return `about ${(meters / 1000).toFixed(1)} km away`;
}

export function getMatchFitSummary(input: MatchFitInput): MatchFitSummary {
  const schedule = input.relayMode === "scheduled"
    ? "Scheduled coordination available"
    : input.departureTime
      ? "Departure timing available"
      : "Schedule details unavailable";

  const vehicle = !input.spotVehicleType
    ? "Vehicle compatible: any vehicle"
    : input.participantVehicleType && input.participantVehicleType === input.spotVehicleType
      ? "Vehicle compatible"
      : input.participantVehicleType
        ? `Vehicle requirement: ${getVehicleTypeLabel(input.spotVehicleType)}`
        : `Vehicle fit: ${getVehicleTypeLabel(input.spotVehicleType)}`;

  const location = input.distanceMeters != null && Number.isFinite(input.distanceMeters)
    ? formatDistance(input.distanceMeters)
    : input.areaLabel
      ? `Approximate area: ${input.areaLabel}`
      : "Approximate area only";

  return { schedule, vehicle, location };
}
