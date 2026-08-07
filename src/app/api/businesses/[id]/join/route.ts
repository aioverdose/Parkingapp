import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("join_business", {
      p_business_id: id,
    });

    if (error) {
      const message = error.message || "";
      if (/not found/i.test(message)) {
        return NextResponse.json({ error: message }, { status: 404 });
      }
      if (/already a member/i.test(message)) {
        return NextResponse.json({ error: message }, { status: 409 });
      }
      return NextResponse.json({ error: message }, { status: 400 });
    }

    logger.info("businesses: member joined", {
      route: "/api/businesses/[id]/join",
      user_id: user.id,
      business_id: id,
    });

    return NextResponse.json({ membership: data }, { status: 201 });
  } catch (err) {
    logger.error("businesses: join failed", {
      route: "/api/businesses/[id]/join",
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
