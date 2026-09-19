import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET || process.env.AGENT_SECRET_KEY;
  if (!expected || request.headers.get("x-cron-secret") !== expected) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data, error } = await createAdminClient().rpc("expire_potential_matches");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, expired: data ?? 0 });
}
