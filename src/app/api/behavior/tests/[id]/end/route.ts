import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateCheck = checkRateLimit(`behavior-test-end:${user.id}`, 10, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;
    const body = await request.json();
    const status = body.status === "aborted" ? "aborted" : "complete";
    const summary =
      body.summary != null && typeof body.summary === "object" ? body.summary : null;

    const supabase = createAdminClient();

    const { data: test } = await supabase
      .from("behavior_device_tests")
      .select("id, status")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }
    if (test.status !== "running") {
      return NextResponse.json({ error: "Test is not running" }, { status: 409 });
    }

    const { error } = await supabase
      .from("behavior_device_tests")
      .update({ status, ended_at: new Date().toISOString(), summary })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
