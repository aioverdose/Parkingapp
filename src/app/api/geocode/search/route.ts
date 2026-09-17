import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getClientIp } from "@/lib/api/request-security";
import { reverseGeocode } from "@/lib/geocode";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = await checkRateLimit(`geocode:${user.id}:${getClientIp(request)}`, 20, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many address searches" }, { status: 429 });

  const query = request.nextUrl.searchParams.get("q")?.trim();
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return NextResponse.json({ results: [{ display_name: await reverseGeocode(lat, lng), lat, lon: lng }] });
  }
  if (!query || query.length < 3) return NextResponse.json({ results: [] });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=us&q=${encodeURIComponent(query)}`, { headers: { "User-Agent": "ParkingMeeters/1.0" } });
  if (!response.ok) return NextResponse.json({ error: "Address search unavailable" }, { status: 502 });
  const results = await response.json() as Array<{ display_name: string; lat: string; lon: string }>;
  return NextResponse.json({ results: results.map((result) => ({ display_name: result.display_name, lat: Number(result.lat), lon: Number(result.lon) })) });
}
