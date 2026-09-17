import { NextRequest, NextResponse } from "next/server";
import { requireExperienceAuth } from "@/lib/api/experience-auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getClientIp } from "@/lib/api/request-security";
import { searchNominatim } from "@/lib/geocode";
export async function GET(request: NextRequest) { const checked = await requireExperienceAuth(request); if ("response" in checked) return checked.response; const limit = await checkRateLimit(`osm-location:${checked.auth.user.id}:${getClientIp(request)}`, 10, 60_000); if (!limit.allowed) return NextResponse.json({ error: "Too many location searches" }, { status: 429 }); const q = request.nextUrl.searchParams.get("q")?.trim(); if (!q || q.length < 3) return NextResponse.json({ candidates: [] }); try { const places = await searchNominatim(q, true); return NextResponse.json({ candidates: places.map((p) => ({ display_name: p.display_name, type: p.type, bbox: p.boundingbox?.map(Number), geojson: p.geojson, lat: Number(p.lat), lon: Number(p.lon), address: p.address })) }); } catch { return NextResponse.json({ error: "Location search unavailable" }, { status: 502 }); } }
