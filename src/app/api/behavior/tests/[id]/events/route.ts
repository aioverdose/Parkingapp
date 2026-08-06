import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";

const EVENT_TYPES = new Set(["state", "agent_event", "sensor", "permission", "note", "error"]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateCheck = checkRateLimit(`behavior-test-events:${user.id}`, 120, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;
    const body = await request.json();
    const { events } = body as { events: Record<string, unknown>[] };

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: "No events provided" }, { status: 400 });
    }
    if (events.length > 100) {
      return NextResponse.json({ error: "Max 100 events per request" }, { status: 400 });
    }

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

    const rows = events
      .filter((e) => EVENT_TYPES.has(String(e.eventType ?? "")))
      .map((e) => ({
        test_id: id,
        user_id: user.id,
        event_type: String(e.eventType),
        agent_state: typeof e.agentState === "string" ? e.agentState : null,
        agent_event_type: typeof e.agentEventType === "string" ? e.agentEventType : null,
        confidence: typeof e.confidence === "number" ? e.confidence : null,
        latitude: typeof e.lat === "number" ? e.lat : null,
        longitude: typeof e.lng === "number" ? e.lng : null,
        speed_ms: typeof e.speedMs === "number" ? e.speedMs : null,
        accuracy: typeof e.accuracy === "number" ? e.accuracy : null,
        vibration_energy: typeof e.vibrationEnergy === "number" ? e.vibrationEnergy : null,
        step_cadence: typeof e.stepCadence === "number" ? e.stepCadence : null,
        detail: e.detail != null ? e.detail : null,
        created_at: typeof e.timestamp === "number" ? new Date(e.timestamp).toISOString() : new Date().toISOString(),
      }));

    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid events" }, { status: 400 });
    }

    const { error } = await supabase.from("behavior_test_events").insert(rows);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: rows.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
