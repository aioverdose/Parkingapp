import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city")?.trim().slice(0, 160);
  const type = request.nextUrl.searchParams.get("type");
  if (!city) return NextResponse.json({ error: "city is required" }, { status: 400 });
  const admin = createAdminClient();
  let query = admin.from("parking_information").select("id, city, state_country, record_type, name, address_area, latitude, longitude, hours, pricing, restrictions, source_url, source_name, confidence, verified_at, source_provider, data_confidence").eq("city", city).eq("status", "published").order("name");
  if (["sweeping", "garage", "ev", "meter", "rules"].includes(type || "")) query = query.eq("record_type", type);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Unable to load parking information" }, { status: 500 });
  return NextResponse.json({ records: data ?? [], disclaimer: "Reference data only. OpenStreetMap information may be incomplete or out of date. Parking availability is not guaranteed.", attribution: "Data © OpenStreetMap contributors, available under the Open Database License (ODbL)." }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}
