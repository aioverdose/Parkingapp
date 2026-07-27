import type { RouteWaypoint } from "./types";

export function parseGpx(xmlString: string): RouteWaypoint[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid GPX XML: " + parseError.textContent?.slice(0, 100));
  }

  const waypoints: RouteWaypoint[] = [];
  const trackpoints = doc.querySelectorAll("trkpt");

  if (trackpoints.length === 0) {
    const rtepts = doc.querySelectorAll("rte rtept");
    if (rtepts.length > 0) {
      for (const pt of rtepts) {
        const lat = parseFloat(pt.getAttribute("lat") || "0");
        const lon = parseFloat(pt.getAttribute("lon") || "0");
        const speedEl = pt.querySelector("speed");
        const speed = speedEl ? parseFloat(speedEl.textContent || "0") : undefined;
        const nameEl = pt.querySelector("name");
        const name = nameEl?.textContent || undefined;
        waypoints.push({ lat, lng: lon, speed, name });
      }
      return waypoints;
    }
    throw new Error("No track points found in GPX file");
  }

  for (const pt of trackpoints) {
    const lat = parseFloat(pt.getAttribute("lat") || "0");
    const lon = parseFloat(pt.getAttribute("lon") || "0");
    const speedEl = pt.querySelector("speed");
    const speed = speedEl ? parseFloat(speedEl.textContent || "0") : undefined;
    const timeEl = pt.querySelector("time");
    const name = timeEl?.textContent || undefined;
    waypoints.push({ lat, lng: lon, speed, name });
  }

  return waypoints;
}

export function waypointsToGeoJson(waypoints: RouteWaypoint[]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: waypoints.map((w) => [w.lng, w.lat]),
    },
    properties: {},
  };
}

export function waypointsToFeatures(waypoints: RouteWaypoint[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      waypointsToGeoJson(waypoints),
      ...waypoints.map((w, i) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [w.lng, w.lat] as [number, number] },
        properties: { index: i, name: w.name || `Waypoint ${i}` },
      })),
    ],
  };
}
