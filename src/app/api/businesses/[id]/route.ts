import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { getBusinessMembership } from "@/lib/api/business-helpers";
import { isValidCoords } from "@/lib/geo-validation";
import { logger } from "@/lib/logger";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const SAFE_URL_RE = /^https?:\/\/[^\s<>"']+$/i;

async function loadBusiness(supabase: ReturnType<typeof createAdminClient>, id: string) {
  const { data, error } = await supabase
    .from("businesses")
    .select("*, primary_network_id")
    .eq("id", id)
    .maybeSingle();
  return { business: data ?? null, error };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid business id" }, { status: 400 });
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await getBusinessMembership(user.id, id);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { business, error } = await loadBusiness(supabase, id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    return NextResponse.json({ business, membership });
  } catch (err) {
    logger.error("businesses: get failed", {
      route: "/api/businesses/[id]",
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid business id" }, { status: 400 });
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await getBusinessMembership(user.id, id);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (membership.role !== "admin") {
      return NextResponse.json({ error: "Only business admins can update the business" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { business: current } = await loadBusiness(supabase, id);
    if (!current) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
      }
      updates.name = body.name.trim();
    }
    if (body.description !== undefined) updates.description = body.description ?? null;
    if (body.address !== undefined) updates.address = body.address ?? null;
    if (body.phone !== undefined) updates.phone = body.phone ?? null;

    if (body.logo_url !== undefined) {
      if (body.logo_url !== null && (typeof body.logo_url !== "string" || body.logo_url.length > 2048 || !SAFE_URL_RE.test(body.logo_url))) {
        return NextResponse.json({ error: "logo_url must be a string" }, { status: 400 });
      }
      updates.logo_url = body.logo_url || null;
    }
    if (body.app_name !== undefined) {
      if (body.app_name !== null && (typeof body.app_name !== "string" || body.app_name.trim().length === 0 || body.app_name.length > 80)) {
        return NextResponse.json({ error: "app_name must be a non-empty string" }, { status: 400 });
      }
      updates.app_name = body.app_name ? body.app_name.trim() : null;
    }

    for (const field of ["welcome_message", "house_notes", "promo_text"] as const) {
      if (body[field] !== undefined) {
        if (body[field] !== null && (typeof body[field] !== "string" || body[field].length > 2000)) {
          return NextResponse.json({ error: `${field} must be plain text under 2000 characters` }, { status: 400 });
        }
        updates[field] = body[field] || null;
      }
    }
    if (body.info_link !== undefined) {
      if (body.info_link !== null && (typeof body.info_link !== "string" || body.info_link.length > 2048 || !SAFE_URL_RE.test(body.info_link))) {
        return NextResponse.json({ error: "info_link must be a valid https:// or http:// URL" }, { status: 400 });
      }
      updates.info_link = body.info_link || null;
    }
    if (body.onboarding_completed_at !== undefined) updates.onboarding_completed_at = body.onboarding_completed_at || new Date().toISOString();
    for (const field of ["primary_color", "accent_color"] as const) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== "string" || !HEX_COLOR_RE.test(body[field])) {
          return NextResponse.json({ error: `${field} must be a hex color like #3b82f6` }, { status: 400 });
        }
        updates[field] = body[field];
      }
    }

    const hasOperatingArea = body.operating_lat !== undefined || body.operating_lng !== undefined || body.operating_radius_meters !== undefined;
    if (hasOperatingArea) {
      const lat = body.operating_lat ?? current.operating_lat ?? null;
      const lng = body.operating_lng ?? current.operating_lng ?? null;
      if (!isValidCoords(lat, lng)) {
        return NextResponse.json({ error: "operating_lat and operating_lng must be valid coordinates" }, { status: 400 });
      }
      updates.operating_lat = lat;
      updates.operating_lng = lng;
      updates.operating_radius_meters = body.operating_radius_meters ?? current.operating_radius_meters ?? null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("businesses")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ business: data });
  } catch (err) {
    logger.error("businesses: update failed", {
      route: "/api/businesses/[id]",
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
