import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateCheck = checkRateLimit(`admin-behavior-tests:${user.id}`, 30, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = createAdminClient();

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "moderator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const testId = searchParams.get("test_id");
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 50), 1), 200);

    const { data: tests, error: testsError } = await supabase
      .from("behavior_device_tests")
      .select(`
        *,
        user:users(id, name, email)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (testsError) {
      return NextResponse.json({ error: testsError.message }, { status: 500 });
    }

    let events: unknown[] | null = null;
    if (testId) {
      const { data, error } = await supabase
        .from("behavior_test_events")
        .select("*")
        .eq("test_id", testId)
        .order("created_at", { ascending: true })
        .limit(2000);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      events = data;
    }

    return NextResponse.json({ tests, events });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
