import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { runAiTestCampaign, getAiTestProgress, getAiTestReport } from "@/lib/testing/ai-test-engine";
import type { AiTestConfig } from "@/lib/testing/ai-test-engine";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateCheck = checkRateLimit(`ai-test:${user.id}`, 3, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const body = await request.json();
    const config: AiTestConfig = {
      routeIndices: body.routeIndices ?? [0, 1, 2],
      speedMultipliers: body.speedMultipliers ?? [2, 5, 10],
      gpsNoiseEnabled: body.gpsNoiseEnabled ?? false,
      undergroundModeEnabled: body.undergroundModeEnabled ?? false,
      iterations: body.iterations ?? 1,
      checkParkingDetection: body.checkParkingDetection ?? true,
      checkMatchFlow: body.checkMatchFlow ?? false,
    };

    const supabase = createAdminClient();
    const { runId } = await runAiTestCampaign(supabase, config);

    return NextResponse.json({ runId, status: "started" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");

    if (!runId) {
      return NextResponse.json({ error: "runId query parameter required" }, { status: 400 });
    }

    const progress = getAiTestProgress(runId);
    if (!progress) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const report = getAiTestReport(runId);

    return NextResponse.json({ progress, report });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
