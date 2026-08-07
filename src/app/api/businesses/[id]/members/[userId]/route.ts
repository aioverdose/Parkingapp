import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { getBusinessMembership } from "@/lib/api/business-helpers";
import { logger } from "@/lib/logger";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  try {
    const { id, userId } = await params;

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await getBusinessMembership(user.id, id);
    if (!membership || membership.role !== "admin") {
      return NextResponse.json({ error: "Only business admins can update members" }, { status: 403 });
    }

    const body = await request.json();
    const { role, status } = body;

    if (role !== undefined && !["admin", "staff", "member"].includes(role)) {
      return NextResponse.json({ error: "role must be admin, staff, or member" }, { status: 400 });
    }
    if (status !== undefined && !["active", "invited", "disabled"].includes(status)) {
      return NextResponse.json({ error: "status must be active, invited, or disabled" }, { status: 400 });
    }
    if (role === undefined && status === undefined) {
      return NextResponse.json({ error: "Provide role and/or status" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.rpc("update_business_member", {
      p_business_id: id,
      p_user_id: userId,
      p_role: role ?? null,
      p_status: status ?? null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("businesses: update member failed", {
      route: "/api/businesses/[id]/members/[userId]",
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  try {
    const { id, userId } = await params;

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await getBusinessMembership(user.id, id);
    if (!membership || membership.role !== "admin") {
      return NextResponse.json({ error: "Only business admins can remove members" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.rpc("remove_business_member", {
      p_business_id: id,
      p_user_id: userId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("businesses: remove member failed", {
      route: "/api/businesses/[id]/members/[userId]",
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
