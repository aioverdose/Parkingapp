export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
      { headers: { "User-Agent": "SpotMatch/1.0" } },
    );
    const data = await res.json();
    return data?.display_name || null;
  } catch {
    return null;
  }
}
