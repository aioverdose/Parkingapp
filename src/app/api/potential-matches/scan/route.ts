import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { reconcilePotentialMatches } from "@/lib/matching/potential-matcher";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const matches = await reconcilePotentialMatches(user.id);
  return NextResponse.json({ matches });
}
