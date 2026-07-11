import { NextResponse } from "next/server";
import { runCongestionCheck } from "@/lib/agents/congestion-alert-agent";

export async function POST() {
  try {
    const result = await runCongestionCheck();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
