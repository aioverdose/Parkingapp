import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { verifyOtp } from "@/lib/otp";
import { isTwilioConfigured } from "@/lib/twilio";
import { logger } from "@/lib/logger";
import { getClientIp } from "@/lib/api/request-security";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const loginMode = body.mode === "login";
    const user = loginMode ? null : await getAuthenticatedUser(request);
    if (!user && !loginMode) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ip = getClientIp(request);
    const normalizedPhone = String(body.phone ?? "").replace(/\D/g, "");
    const rateCheck = await checkRateLimit(`phone-verify:${ip}`, 10, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
    const phoneRateCheck = await checkRateLimit(`phone-verify:${ip}:${normalizedPhone}`, 6, 10 * 60_000);
    if (!phoneRateCheck.allowed) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

    const { phone, code } = body;
    if (!phone || !code) {
      return NextResponse.json({ error: "Phone and code are required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (loginMode) {
      const { data: account } = await supabase
        .from("users")
        .select("id, email")
        .eq("phone_number", phone)
        .eq("phone_verified", true)
        .maybeSingle();
      if (!account?.id || !account.email) return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
      try {
        await verifyOtp(phone, code, account.id);
      } catch {
        return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
      }
      const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: account.email,
        options: { redirectTo: new URL("/", request.url).toString() },
      });
      if (linkError || !link.properties?.action_link) return NextResponse.json({ error: "Unable to create sign-in session" }, { status: 500 });
      return NextResponse.json({ success: true, verified: true, method: "twilio", action_link: link.properties.action_link });
    }

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Use app Twilio OTP verification when configured
    if (isTwilioConfigured()) {
      await verifyOtp(phone, code, user.id);
      await supabase
        .from("users")
        .update({
          phone_number: phone,
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      return NextResponse.json({ success: true, verified: true, method: "twilio" });
    }

    // Fall back to Supabase OTP verification
    const { error: supabaseError } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: "sms",
    });

    if (!supabaseError) {
      await supabase
        .from("users")
        .update({
          phone_number: phone,
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      return NextResponse.json({ success: true, verified: true, method: "supabase" });
    }

    // Development-only fallback. Never accept arbitrary codes in production.
    if (process.env.NODE_ENV !== "production" && code.length === 6 && /^\d{6}$/.test(code)) {
      await supabase
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
    logger.error("phone OTP verification failed", {
      route: "/api/auth/phone-verify",
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
