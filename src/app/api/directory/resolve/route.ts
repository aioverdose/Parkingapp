import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { isInBelmontShoreBounds, normalizeBusinessName } from "@/lib/business-directory";

export async function GET(request: NextRequest) {
  const query = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (query.length < 2 || query.length > 120) return NextResponse.json({ error: "q must be between 2 and 120 characters" }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rate = await checkRateLimit(`directory-resolve:${ip}`, 30, 60_000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many destination searches" }, { status: 429 });

  const normalized = normalizeBusinessName(query);
  const directory = createAdminClient();
  const { data } = await directory
    .from("business_directory")
    .select("id, name, address, latitude, longitude, phone, website, confidence, source, source_url")
    .eq("active", true)
    .gte("confidence", 0.65)
    .or(`normalized_name.ilike.%${normalized}%,name.ilike.%${query}%`)
    .order("verified", { ascending: false })
    .order("confidence", { ascending: false })
    .limit(5);

  if (data && data.length > 0) return NextResponse.json({ source: "business_directory", candidates: data });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&countrycodes=us&q=${encodeURIComponent(`${query}, Belmont Shore, Long Beach, CA`)}`, {
    headers: { "User-Agent": "SpotMatch/1.0 destination resolver (parking pilot)" },
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ source: "nominatim", candidates: [] });
  const results = await response.json() as Array<{ place_id: number; display_name: string; lat: string; lon: string; type?: string; address?: Record<string, string> }>;
  const candidates = results
    .map((item) => ({ ...item, latitude: Number(item.lat), longitude: Number(item.lon) }))
    .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude) && isInBelmontShoreBounds(item.latitude, item.longitude))
    .map((item) => ({ id: `nominatim:${item.place_id}`, name: item.address?.amenity || item.address?.shop || item.display_name.split(",")[0], address: item.display_name, latitude: item.latitude, longitude: item.longitude, confidence: item.type === "amenity" || item.type === "shop" ? 0.8 : 0.65, source: "nominatim", source_url: `https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}` }));

  return NextResponse.json({ source: "nominatim", candidates });
}
