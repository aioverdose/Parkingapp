import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { requestOtp } from "@/lib/otp";
import { isTwilioConfigured } from "@/lib/twilio";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateCheck = checkRateLimit(`phone-request:${ip}`, 5, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    }

    const { phone } = await request.json();
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json({ error: "Valid phone number is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Try Supabase phone auth OTP first
    const { error: supabaseError } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: false },
    });

    if (!supabaseError) {
      await (supabase as any)
        .from("users")
        .update({ phone_number: phone })
        .eq("id", user.id);

      return NextResponse.json({ success: true, method: "supabase" });
    }

    // Fall back to Twilio direct SMS
    if (isTwilioConfigured()) {
      const result = await requestOtp(phone, user.id);
      return NextResponse.json({ success: true, method: "twilio", expires_at: result.expires_at });
    }

    // No SMS provider configured — dev mode
    console.warn("Phone OTP unavailable (no SMS provider configured)");
    return NextResponse.json({
      success: true,
      method: "simulated",
      warning: "SMS not configured. Any 6-digit code will work in dev mode.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
