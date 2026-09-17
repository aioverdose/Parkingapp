import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getClientIp } from "@/lib/api/request-security";
import { isTwilioConfigured } from "@/lib/twilio";
import { requestOtp, verifyOtp } from "@/lib/otp";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });
  const rateCheck = await checkRateLimit(`admin-sms-test:${user.id}:${getClientIp(request)}`, 3, 60 * 60 * 1000);
  if (!rateCheck.allowed) return NextResponse.json({ error: "SMS test limit reached. Try again later." }, { status: 429 });
  if (!isTwilioConfigured()) return NextResponse.json({ error: "Twilio is not fully configured in production." }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const action = body.action === "verify" ? "verify" : "request";
  const phone = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
  if (phone.length !== 10) return NextResponse.json({ error: "Enter a valid 10-digit US phone number." }, { status: 400 });
  try {
    const e164 = `+1${phone}`;
    if (action === "request") {
      await requestOtp(e164, user.id);
      return NextResponse.json({ success: true, message: "Verification code sent." });
    }
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter the 6-digit verification code." }, { status: 400 });
    await verifyOtp(e164, code, user.id);
    return NextResponse.json({ success: true, message: "Verification code accepted. Twilio OTP is working." });
  } catch {
    return NextResponse.json({ error: action === "request" ? "Could not send the verification code. Check Twilio message logs." : "Invalid or expired verification code." }, { status: 502 });
  }
}
