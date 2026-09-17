import { NextResponse } from "next/server";
import { getCommunityControl } from "@/lib/community-control";

export async function GET() {
  const control = await getCommunityControl();
  return NextResponse.json(control, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } });
}
