import { createAdminClient } from "./supabaseAdmin";
import { sendSms } from "./twilio";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

function sanitizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone;
}

export async function requestOtp(phone: string, userId: string) {
  const supabase = createAdminClient();

  const cleanPhone = sanitizePhone(phone);
  if (!isE164(cleanPhone)) {
    throw new Error("Invalid phone number format. Use E.164 format (e.g. +12125551234).");
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await (supabase as any)
    .from("phone_otps")
    .insert({
      user_id: userId,
      phone: cleanPhone,
      code,
      expires_at: expiresAt,
    });

  const sent = await sendSms(cleanPhone, `Your SpotMatch verification code is: ${code}`);
  if (!sent) {
    throw new Error("Failed to send SMS. Check Twilio configuration.");
  }

  return { phone: cleanPhone, expires_at: expiresAt };
}

export async function verifyOtp(phone: string, code: string, userId: string) {
  const supabase = createAdminClient();
  const cleanPhone = sanitizePhone(phone);

  const { data, error } = await (supabase as any)
    .from("phone_otps")
    .select("*")
    .eq("user_id", userId)
    .eq("phone", cleanPhone)
    .eq("code", code)
    .eq("used", false)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    // Check if code exists but expired
    const { data: expired } = await (supabase as any)
      .from("phone_otps")
      .select("expires_at")
      .eq("user_id", userId)
      .eq("phone", cleanPhone)
      .eq("code", code)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (expired) {
      throw new Error("Verification code expired. Request a new one.");
    }
    throw new Error("Invalid verification code.");
  }

  await (supabase as any)
    .from("phone_otps")
    .update({ used: true })
    .eq("id", data.id);

  await (supabase as any)
    .from("users")
    .update({
      phone_number: cleanPhone,
      phone_verified: true,
      phone_verified_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return { verified: true };
}
