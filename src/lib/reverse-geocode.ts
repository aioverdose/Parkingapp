export interface ReverseGeoResult {
  street: string | null;
  city: string | null;
  displayName: string | null;
}

export async function reverseGeocodeStreet(lat: number, lng: number): Promise<ReverseGeoResult> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
      { headers: { "User-Agent": "SpotMatch/1.0" } },
    );
    const data = await res.json();
    const addr = data?.address || {};
    return {
      street: addr.road || addr.street || addr.pedestrian || null,
      city: addr.city || addr.town || addr.village || addr.county || null,
      displayName: data?.display_name || null,
    };
  } catch {
    return { street: null, city: null, displayName: null };
  }
}
