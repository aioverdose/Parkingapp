import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { getBusinessMembership } from "@/lib/api/business-helpers";

type OSMWay = { tags?: { name?: string; highway?: string }; center?: { lat: number; lon: number } };

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const lat = (aLat + bLat) / 2 * Math.PI / 180;
  const dLat = (bLat - aLat) * 111_000;
  const dLng = (bLng - aLng) * 111_000 * Math.cos(lat);
  return Math.hypot(dLat, dLng);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await getBusinessMembership(user.id, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: business } = await createAdminClient().from("businesses").select("operating_lat, operating_lng").eq("id", id).maybeSingle();
  const latitude = Number(business?.operating_lat);
  const longitude = Number(business?.operating_lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return NextResponse.json({ primaryStreet: "2nd Street", sideStreets: [] });

  try {
    const query = `[out:json][timeout:8];way(around:700,${latitude},${longitude})[highway][name];out tags center;`;
    const response = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "SpotMatch/1.0 parking recommendations" }, body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(9000), next: { revalidate: 3600 } });
    if (!response.ok) throw new Error("Street lookup failed");
    const body = await response.json() as { elements?: OSMWay[] };
    const eligible = new Set(["primary", "secondary", "tertiary", "unclassified", "residential", "living_street"]);
    const streets = (body.elements ?? []).filter((way) => {
      const name = way.tags?.name?.trim();
      return Boolean(name && way.center && eligible.has(way.tags?.highway || "") && !/2nd|second/i.test(name));
    }).map((way) => ({ name: way.tags!.name!.trim(), distance: distanceMeters(latitude, longitude, way.center!.lat, way.center!.lon) })).sort((a, b) => a.distance - b.distance);
    const sideStreets = [...new Map(streets.map((street) => [street.name.toLowerCase(), street.name])).values()].slice(0, 2);
    return NextResponse.json({ primaryStreet: "2nd Street", sideStreets });
  } catch {
    return NextResponse.json({ primaryStreet: "2nd Street", sideStreets: [] });
  }
}
