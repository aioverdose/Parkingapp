import { OSRM_BASE_URL, URBAN_SPEED_FACTOR } from "./constants";

interface OsmResult {
  durationSeconds: number;
  distanceMeters: number;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Stubbed ETA calculation — returns estimate based on straight-line distance × urban speed factor.
 * TODO: Replace with real OSRM call (see commented-out function below).
 */
export async function calculateEta(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<OsmResult> {
  const distance = haversineMeters(originLat, originLng, destLat, destLng);
  const urbanSpeedMps = 11.17; // ~25 mph
  const durationSeconds = (distance / urbanSpeedMps) * URBAN_SPEED_FACTOR;
  return { durationSeconds, distanceMeters: distance };
}

/**
 * Batch ETA calculation — returns ETAs from one origin to multiple destinations.
 * Stubbed: same haversine approach.
 * TODO: Replace with real OSRM table API call.
 */
export async function calculateBatchEta(
  originLat: number,
  originLng: number,
  destinations: { lat: number; lng: number; name?: string }[],
): Promise<{ name: string; distanceMeters: number; durationSeconds: number }[]> {
  const results = await Promise.all(
    destinations.map(async (d) => {
      const { durationSeconds, distanceMeters } = await calculateEta(originLat, originLng, d.lat, d.lng);
      return { name: d.name ?? `${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}`, distanceMeters, durationSeconds };
    }),
  );
  return results.sort((a, b) => a.durationSeconds - b.durationSeconds);
}

/**
 * Check if OSRM server is reachable.
 * TODO: Replace with real health check when OSRM is deployed.
 */
export async function checkOsmConnection(): Promise<boolean> {
  // TODO: Replace with real OSRM health check
  // try {
  //   const res = await fetch(`${OSRM_BASE_URL}/status`, { signal: AbortSignal.timeout(3000) });
  //   return res.ok;
  // } catch {
  //   return false;
  // }
  return false;
}

/*
 * === COMMENTED-OUT REAL OSRM IMPLEMENTATION ===
 * Uncomment and replace the stubbed functions above when OSRM is deployed.
 *
 * export async function calculateEta(
 *   originLat: number, originLng: number,
 *   destLat: number, destLng: number,
 * ): Promise<OsmResult> {
 *   const url = `${OSRM_BASE_URL}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;
 *   const res = await fetch(url);
 *   if (!res.ok) throw new Error(`OSRM error: ${res.status}`);
 *   const data = await res.json();
 *   if (!data.routes?.length) throw new Error("No route found");
 *   return { durationSeconds: data.routes[0].duration, distanceMeters: data.routes[0].distance };
 * }
 *
 * export async function calculateBatchEta(
 *   originLat: number, originLng: number,
 *   destinations: { lat: number; lng: number; name?: string }[],
 * ): Promise<{ name: string; distanceMeters: number; durationSeconds: number }[]> {
 *   const coords = `${originLng},${originLat};` + destinations.map(d => `${d.lng},${d.lat}`).join(";");
 *   const url = `${OSRM_BASE_URL}/table/v1/driving/${coords}?sources=0`;
 *   const res = await fetch(url);
 *   if (!res.ok) throw new Error(`OSRM table error: ${res.status}`);
 *   const data = await res.json();
 *   if (!data.durations?.length) throw new Error("No routes found");
 *   return destinations.map((d, i) => ({
 *     name: d.name ?? `${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}`,
 *     distanceMeters: data.distances?.[0]?.[i] ?? 0,
 *     durationSeconds: data.durations[0][i],
 *   })).sort((a, b) => a.durationSeconds - b.durationSeconds);
 * }
 *
 * export async function checkOsmConnection(): Promise<boolean> {
 *   try {
 *     const res = await fetch(`${OSRM_BASE_URL}/status`, { signal: AbortSignal.timeout(3000) });
 *     return res.ok;
 *   } catch { return false; }
 * }
 */
