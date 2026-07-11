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

    const supabase = createAdminClient();
    const tosHash = await hashTos(TOS_CONTENT);

    const { error } = await (supabase as any)
      .from("users")
      .update({
        tos_accepted: true,
        tos_accepted_date: new Date().toISOString(),
        tos_version: TOS_VERSION,
        tos_hash: tosHash,
        tos_signed_at: new Date().toISOString(),
      })
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
