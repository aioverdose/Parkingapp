import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { requestOtp, isPhoneVerificationEnabled } from "@/lib/otp";
import { isTwilioConfigured } from "@/lib/twilio";
import { logger } from "@/lib/logger";
import { getClientIp } from "@/lib/api/request-security";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const loginMode = body.mode === "login";

    if (loginMode && !isTwilioConfigured()) {
      return NextResponse.json({ error: "Phone sign-in is temporarily unavailable." }, { status: 503 });
    }

    if (!isPhoneVerificationEnabled() && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Phone verification is not configured. Please contact support." }, { status: 503 });
    }

    if (!isPhoneVerificationEnabled() && !loginMode) {
      return NextResponse.json({
        success: true,
        method: "simulated",
        warning: "Phone verification is disabled in this environment.",
      });
    }

    const user = loginMode ? null : await getAuthenticatedUser(request);
    if (!user) {
      if (!loginMode) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(request);
    const normalizedPhone = String(body.phone ?? "").replace(/\D/g, "");
    const rateCheck = await checkRateLimit(`phone-request:${ip}`, 5, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    }
    const phoneRateCheck = await checkRateLimit(`phone-request:${ip}:${normalizedPhone}`, 3, 10 * 60_000);
    if (!phoneRateCheck.allowed) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });

    const { phone } = body;
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json({ error: "Valid phone number is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (loginMode) {
      // Keep the response generic so phone sign-in cannot enumerate accounts.
      const { data: account } = await supabase
        .from("users")
        .select("id")
        .eq("phone_number", phone)
        .eq("phone_verified", true)
        .maybeSingle();
      if (account?.id) await requestOtp(phone, account.id);
      return NextResponse.json({ success: true, method: "twilio" });
    }

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Use app Twilio directly when configured (more reliable than Supabase SMS)
    if (isTwilioConfigured()) {
      const result = await requestOtp(phone, user.id);
      await supabase
        .from("users")
        .update({ phone_number: phone })
        .eq("id", user.id);
      return NextResponse.json({ success: true, method: "twilio", expires_at: result.expires_at });
    }

    // Fall back to Supabase phone auth OTP
    const { error: supabaseError } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: false },
    });

    if (!supabaseError) {
      await supabase
        .from("users")
        .update({ phone_number: phone })
        .eq("id", user.id);

      return NextResponse.json({ success: true, method: "supabase" });
    }

    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "SMS verification is temporarily unavailable. Please contact support." }, { status: 503 });
    }

    // No SMS provider configured — local development only
    logger.warn("phone OTP unavailable (no SMS provider configured)", {
      route: "/api/auth/phone-request",
      userId: user.id,
    });
    return NextResponse.json({
      success: true,
      method: "simulated",
      warning: "SMS not configured. Any 6-digit code will work in dev mode.",
    });
  } catch (err) {
    logger.error("phone OTP request failed", {
      route: "/api/auth/phone-request",
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
