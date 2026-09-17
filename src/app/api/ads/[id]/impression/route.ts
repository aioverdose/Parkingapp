import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getClientIp } from "@/lib/api/request-security";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rateCheck = await checkRateLimit(`ad-impression:${getClientIp(_request)}:${id}`, 30, 60_000);
    if (!rateCheck.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const supabase = createAdminClient();

    const { data: ad, error: fetchError } = await supabase
      .from("ads")
      .select("impressions")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const current = ad?.impressions ?? 0;

    const { error: updateError } = await supabase
      .from("ads")
      .update({ impressions: current + 1 })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, impressions: current + 1 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
