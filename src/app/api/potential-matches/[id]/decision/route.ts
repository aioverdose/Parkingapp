import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { decision?: string } | null;
  if (body?.decision !== "accept" && body?.decision !== "decline") return NextResponse.json({ error: "Decision must be accept or decline" }, { status: 400 });
  const functionName = body.decision === "accept" ? "accept_potential_match" : "decline_potential_match";
  const { data, error } = await createAdminClient().rpc(functionName, { p_match_id: id, p_user_id: user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ match: data });
}
