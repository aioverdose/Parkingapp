import { NextResponse } from "next/server";
import { runAdInsights } from "@/lib/agents/ad-insights-agent";

export async function POST() {
  try {
    const result = await runAdInsights();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
