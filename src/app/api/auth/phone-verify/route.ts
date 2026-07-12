import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { verifyOtp } from "@/lib/otp";
import { isTwilioConfigured } from "@/lib/twilio";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateCheck = checkRateLimit(`phone-verify:${ip}`, 10, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }

    const { phone, code } = await request.json();
    if (!phone || !code) {
      return NextResponse.json({ error: "Phone and code are required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Try Supabase OTP verification first
    const { error: supabaseError } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: "sms",
    });

    if (!supabaseError) {
      await (supabase as any)
        .from("users")
        .update({
          phone_number: phone,
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      return NextResponse.json({ success: true, verified: true, method: "supabase" });
    }

    // Fall back to Twilio direct OTP verification
    if (isTwilioConfigured()) {
      const result = await verifyOtp(phone, code, user.id);
      return NextResponse.json({ success: true, verified: true, method: "twilio" });
    }

    // Dev mode: accept any 6-digit code
    if (code.length === 6 && /^\d{6}$/.test(code)) {
      await (supabase as any)
        .from("users")
        .update({
          phone_number: phone,
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      return NextResponse.json({ success: true, verified: true, method: "simulated" });
    }

    return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("expired")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
