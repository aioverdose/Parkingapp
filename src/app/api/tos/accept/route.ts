import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { TOS_VERSION, TOS_CONTENT, hashTos } from "@/lib/tos";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const includeSafety = body.safety_acknowledged === true;

    const supabase = createAdminClient();
    const tosHash = await hashTos(TOS_CONTENT);

    const update: Record<string, unknown> = {
      tos_accepted: true,
      tos_accepted_date: new Date().toISOString(),
      tos_version: TOS_VERSION,
      tos_hash: tosHash,
      tos_signed_at: new Date().toISOString(),
    };

    if (includeSafety) {
      update.safety_acknowledged = true;
      update.safety_acknowledged_at = new Date().toISOString();
    }

    const { error } = await (supabase as any)
      .from("users")
      .update(update)
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
