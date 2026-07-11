import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) {
      return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    // Reverse geocode to street name + city
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=18&addressdetails=1`,
      { headers: { "User-Agent": "SpotMatch/1.0" } },
    );
    const geoData = await geoRes.json();
    const addr = geoData?.address || {};
    const street = addr.road || addr.street || addr.pedestrian || null;
    const city = addr.city || addr.town || addr.village || addr.county || null;

    if (!street) {
      return NextResponse.json({ street: null, sweeping: null });
    }

    const supabase = createAdminClient();
    const { data: sweeping } = await (supabase as any)
      .from("street_sweeping")
      .select("*")
      .eq("street_name", street)
      .eq("city", city || "")
      .maybeSingle();

    return NextResponse.json({
      street,
      city,
      sweeping: sweeping || null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
