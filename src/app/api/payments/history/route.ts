import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { stripe } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await stripe.checkout.sessions.list({
      limit: 50,
    });

    const userSessions = sessions.data.filter((s) => s.metadata?.userId === user.id);
    const purchases = userSessions.map((s) => ({
      id: s.id,
      amount: s.amount_total ?? 0,
      credits: parseInt(s.metadata?.quantity ?? "1", 10),
      status: s.payment_status,
      created_at: new Date((s.created ?? 0) * 1000).toISOString(),
    }));

    return NextResponse.json({ purchases });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
