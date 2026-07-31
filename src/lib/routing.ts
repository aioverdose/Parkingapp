"use client";

const OSRM_BASE = "https://router.project-osrm.org";

export interface OSRMManeuver {
  type: string;
  modifier?: string;
  location: [number, number];
}

export interface OSRMStep {
  distance: number;
  duration: number;
  name: string;
  instruction: string;
  maneuver: OSRMManeuver;
  way_points: [number, number];
}

export interface OSRMLeg {
  distance: number;
  duration: number;
  steps: OSRMStep[];
}

export interface OSRMRoute {
  distance: number;
  duration: number;
  geometry: { coordinates: [number, number][] };
  legs: OSRMLeg[];
}

export interface RouteResult {
  route: OSRMRoute;
  waypoints: { lat: number; lng: number }[];
  steps: OSRMStep[];
}

export async function getRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<RouteResult | null> {
  const url = `${OSRM_BASE}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&steps=true&geometries=geojson&alternatives=false`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.routes?.length) return null;

  const r: OSRMRoute = data.routes[0];
  const steps = r.legs.flatMap((l) => l.steps);

  return {
    route: r,
    waypoints: [
      { lat: origin.lat, lng: origin.lng },
      { lat: destination.lat, lng: destination.lng },
    ],
    steps,
  };
}

export interface NavigationEvent {
  type: "step" | "arrive" | "reroute" | "off_route" | "error";
  step?: OSRMStep;
  stepIndex?: number;
  totalSteps?: number;
  remainingDistance?: number;
  remainingDuration?: number;
  distanceToNext?: number;
}

export function buildInstruction(step: OSRMStep): string {
  const m = step.maneuver;
  const street = step.name || "the road";
  const dist = Math.round(step.distance);
  const distText = dist < 100 ? `${dist} meters` : `${(dist / 1000).toFixed(1)} kilometers`;

  switch (m.type) {
    case "depart":
      return `Head ${m.modifier || "forward"} on ${street}.`;
    case "turn":
      return `Turn ${m.modifier || ""} onto ${street} in ${distText}.`;
    case "new name":
      return `Continue onto ${street}.`;
    case "merge":
      return `Merge ${m.modifier || ""} onto ${street}.`;
    case "ramp":
      return `Take the ramp ${m.modifier || ""} onto ${street}.`;
    case "fork":
      return `Keep ${m.modifier || "straight"} toward ${street}.`;
    case "end of road":
      return `Turn ${m.modifier || ""} onto ${street}.`;
    case "continue":
      return `Continue ${m.modifier || "straight"} on ${street}.`;
    case "roundabout":
    case "rotary":
      return `Enter the roundabout and take the ${m.modifier || "first"} exit onto ${street}.`;
    case "roundabout turn":
      return `At the roundabout, turn ${m.modifier || ""} onto ${street}.`;
    case "exit roundabout":
    case "exit rotary":
      return `Exit the roundabout onto ${street}.`;
    case "arrive":
      return "You have arrived at your destination.";
    default:
      return `${step.instruction} in ${distText}.`;
  }
}
