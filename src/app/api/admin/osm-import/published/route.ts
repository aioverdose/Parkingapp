import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { requireExperienceAuth } from "@/lib/api/experience-auth";

export async function GET(request: NextRequest) {
  const checked = await requireExperienceAuth(request);
  if ("response" in checked) return checked.response;
  const { data, error } = await (createAdminClient() as any).from("parking_information").select("id, city, state_country, record_type, name, address_area, latitude, longitude, hours, pricing, source_url, source_name, confidence, verified_at, source_provider, data_confidence, status").eq("status", "published").eq("source_provider", "osm").order("verified_at", { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: "Unable to load published records" }, { status: 500 });
  return NextResponse.json({ records: data || [] });
}
