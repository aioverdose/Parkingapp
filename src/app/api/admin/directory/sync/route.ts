import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { BELMONT_SHORE_BOUNDS, directoryConfidence, normalizeBusinessName } from "@/lib/business-directory";

type OverpassElement = { type: "node" | "way" | "relation"; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "moderator"].includes(profile.role)) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const bbox = `${BELMONT_SHORE_BOUNDS.south},${BELMONT_SHORE_BOUNDS.west},${BELMONT_SHORE_BOUNDS.north},${BELMONT_SHORE_BOUNDS.east}`;
  const overpassQuery = `[out:json][timeout:30];nwr["name"](${bbox});out center tags;`;
  const response = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "SpotMatch/1.0 directory sync" }, body: new URLSearchParams({ data: overpassQuery }), cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: `OpenStreetMap sync failed (${response.status})` }, { status: 502 });

  const payload = await response.json() as { elements?: OverpassElement[] };
  const records = (payload.elements || []).flatMap((element) => {
    const tags = element.tags || {};
    const point = element.lat != null && element.lon != null ? { lat: element.lat, lon: element.lon } : element.center;
    if (!point || !tags.name) return [];
    const address = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]].filter(Boolean).join(" ") || null;
    return [{ source: "openstreetmap", source_id: `${element.type}/${element.id}`, name: tags.name, normalized_name: normalizeBusinessName(tags.name), address, latitude: point.lat, longitude: point.lon, phone: tags.phone || null, website: tags.website || null, confidence: directoryConfidence(tags), verified: false, active: true, source_url: `https://www.openstreetmap.org/${element.type}/${element.id}`, metadata: tags, last_verified_at: new Date().toISOString() }];
  });

  if (records.length === 0) return NextResponse.json({ synced: 0 });
  const { error } = await admin.from("business_directory").upsert(records, { onConflict: "source,source_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ synced: records.length, source: "openstreetmap", bounds: BELMONT_SHORE_BOUNDS });
}
