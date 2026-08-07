import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { getBusinessMembership } from "@/lib/api/business-helpers";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await getBusinessMembership(user.id, id);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("business_members")
      .select("user_id, role, status, created_at, users(name, email, avatar_url)")
      .eq("business_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ members: data ?? [] });
  } catch (err) {
    logger.error("businesses: roster failed", {
      route: "/api/businesses/[id]/members",
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await getBusinessMembership(user.id, id);
    if (!membership || membership.role !== "admin") {
      return NextResponse.json({ error: "Only business admins can add members" }, { status: 403 });
    }

    const body = await request.json();
    const { user_id, role } = body;

    if (!user_id || typeof user_id !== "string") {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }
    if (role !== undefined && !["admin", "staff", "member"].includes(role)) {
      return NextResponse.json({ error: "role must be admin, staff, or member" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("add_business_member", {
      p_business_id: id,
      p_user_id: user_id,
      p_role: role ?? "member",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    logger.info("businesses: member added", {
      route: "/api/businesses/[id]/members",
      admin_user_id: user.id,
      business_id: id,
      added_user_id: user_id,
    });

    return NextResponse.json({ membership: data }, { status: 201 });
  } catch (err) {
    logger.error("businesses: add member failed", {
      route: "/api/businesses/[id]/members",
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
