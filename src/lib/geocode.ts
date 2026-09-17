export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
      { headers: { "User-Agent": "ParkingMeeters/1.0" } },
    );
    const data = await res.json();
    return data?.display_name || null;
  } catch {
    return null;
  }
}

export interface NominatimPlace { display_name: string; type: string; lat: string; lon: string; boundingbox?: string[]; geojson?: { type: string; coordinates: unknown }; address?: Record<string, string>; }
export async function searchNominatim(query: string, global = false): Promise<NominatimPlace[]> {
  const params = new URLSearchParams({ format: "jsonv2", limit: "5", addressdetails: "1", polygon_geojson: "1", q: query });
  if (!global) params.set("countrycodes", "us");
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { "User-Agent": process.env.OSM_USER_AGENT || "ParkingMeeters/1.0" }, cache: "no-store" });
  if (!response.ok) throw new Error("Nominatim unavailable");
  return await response.json() as NominatimPlace[];
}
