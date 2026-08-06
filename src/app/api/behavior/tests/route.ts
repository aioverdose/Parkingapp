import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateCheck = checkRateLimit(`behavior-test-create:${user.id}`, 10, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const testName =
      typeof body.testName === "string" && body.testName.trim()
        ? body.testName.trim().slice(0, 100)
        : "hardware sensor run";
    const deviceLabel =
      typeof body.deviceLabel === "string" && body.deviceLabel.trim()
        ? body.deviceLabel.trim().slice(0, 100)
        : null;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("behavior_device_tests")
      .insert({ user_id: user.id, test_name: testName, device_label: deviceLabel })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ test: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
