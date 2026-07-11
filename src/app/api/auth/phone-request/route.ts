import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    // Save phone to profile immediately
    const supabase = createAdminClient();
    await (supabase as any)
      .from("users")
      .update({ phone_number: phone })
      .eq("id", user.id);

    // Try Supabase phone auth OTP
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: false },
    });

    if (error) {
      // If SMS not configured, still allow (dev mode)
      console.warn("Phone OTP failed (SMS may not be configured):", error.message);
      return NextResponse.json({ success: true, warning: error.message, simulated: true });
    }

    return NextResponse.json({ success: true, simulated: false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
