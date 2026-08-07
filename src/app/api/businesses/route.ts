import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { getMyBusinesses } from "@/lib/api/business-helpers";
import { isValidCoords } from "@/lib/geo-validation";
import { logger } from "@/lib/logger";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businesses = await getMyBusinesses(user.id);

    return NextResponse.json({ businesses });
  } catch (err) {
    logger.error("businesses: list failed", {
      route: "/api/businesses",
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      slug,
      description,
      address,
      phone,
      operating_lat,
      operating_lng,
      operating_radius_meters,
    } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!slug || typeof slug !== "string" || !SLUG_RE.test(slug)) {
      return NextResponse.json({ error: "slug must be lowercase letters, numbers, and dashes" }, { status: 400 });
    }

    const hasOperatingArea = operating_lat != null || operating_lng != null || operating_radius_meters != null;
    if (hasOperatingArea) {
      if (!isValidCoords(operating_lat, operating_lng)) {
        return NextResponse.json({ error: "operating_lat and operating_lng must be valid coordinates" }, { status: 400 });
      }
      if (operating_radius_meters != null && (typeof operating_radius_meters !== "number" || operating_radius_meters < 10 || operating_radius_meters > 5000)) {
        return NextResponse.json({ error: "operating_radius_meters must be between 10 and 5000" }, { status: 400 });
      }
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("create_business", {
      p_name: name.trim(),
      p_slug: slug.trim(),
      p_description: description ?? null,
      p_address: address ?? null,
      p_phone: phone ?? null,
      p_operating_lat: operating_lat ?? null,
      p_operating_lng: operating_lng ?? null,
      p_operating_radius_meters: operating_radius_meters ?? null,
    });

    if (error) {
      const message = error.message || "";
      if (/already exists|duplicate key/i.test(message)) {
        return NextResponse.json({ error: "That slug is already taken" }, { status: 409 });
      }
      return NextResponse.json({ error: message }, { status: 400 });
    }

    logger.info("businesses: created", {
      route: "/api/businesses",
      user_id: user.id,
      business_id: (data as { id?: string } | null)?.id,
    });

    return NextResponse.json({ business: data }, { status: 201 });
  } catch (err) {
    logger.error("businesses: create failed", {
      route: "/api/businesses",
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
