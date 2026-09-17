import { bboxFromGeoJSON, safeBbox } from "./boundary";
import type { OSMResponse } from "./types";

const DEFAULT_ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

function endpoints() {
  const values = process.env.OSM_OVERPASS_URL?.trim() ? [process.env.OSM_OVERPASS_URL.trim()] : DEFAULT_ENDPOINTS;
  return values.map((value) => {
    const url = new URL(value);
    if (url.protocol !== "https:" || !["overpass-api.de", "overpass.kumi.systems", "overpass.private.coffee"].includes(url.hostname)) throw new Error("OSM_OVERPASS_URL is not an allowed HTTPS Overpass endpoint");
    return url.toString();
  });
}

export function buildParkingQuery(boundary: unknown): string {
  const [west, south, east, north] = safeBbox(bboxFromGeoJSON(boundary), 250);
  const box = `${south},${west},${north},${east}`;
  return `[out:json][timeout:30];(nwr[amenity~"^(parking|parking_space|motorcycle_parking)$"](${box});nwr[building~"^(garage|garages)$"](${box});way[highway~"^(service|parking_aisle)$"](${box})[parking];way[highway=service][service=parking_aisle](${box});way["parking:lane"](${box});way["parking:condition"](${box}););out body center;`;
}

export async function fetchOSMParking(boundary: unknown, signal?: AbortSignal): Promise<OSMResponse> {
  const errors: string[] = [];
  for (const endpoint of endpoints()) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": process.env.OSM_USER_AGENT || "ParkingMeeters/1.0 (admin import)" }, body: new URLSearchParams({ data: buildParkingQuery(boundary) }), signal: controller.signal, cache: "no-store" });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300).replace(/\s+/g, " ");
        throw new Error(`${endpoint} returned ${response.status}${detail ? `: ${detail}` : ""}`);
      }
      const text = await response.text();
      if (text.length > 20_000_000) throw new Error("Overpass response exceeds the safe limit");
      const payload: unknown = JSON.parse(text);
      if (!payload || typeof payload !== "object" || !Array.isArray((payload as { elements?: unknown }).elements)) {
        throw new Error(`${endpoint} returned JSON without an elements array`);
      }
      return payload as OSMResponse;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
  }
  throw new Error(`All Overpass providers failed: ${errors.join("; ")}`);
}

export function osmEndpoint() { return endpoints()[0]; }
