"use server";

import { createAdminClient } from "@/lib/supabaseAdmin";
import { TOS_VERSION, TOS_CONTENT, hashTos } from "@/lib/tos";
import { z } from "zod";
import { checkRateLimit } from "@/lib/api/rate-limit";

const signUpSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  username: z.string().regex(/^[a-z0-9_]{3,20}$/, "Username must be 3-20 characters using lowercase letters, numbers, or underscores"),
  vehicle_type: z.string().optional(),
  phone: z.string().regex(/^\+1\d{10}$/, "A valid 10-digit phone number is required"),
  age_confirmed: z.boolean().refine((val) => val === true, "You must confirm that you meet the minimum age requirement"),
  tos_accepted: z.boolean().refine((val) => val === true, "You must accept the Terms of Service"),
});

export async function signUpWithTosGate(formData: FormData) {
  if (String(formData.get("website") ?? "").trim()) {
    return { error: "Unable to create account" };
  }

  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
    username: String(formData.get("username") ?? "").trim().toLowerCase(),
    vehicle_type: formData.get("vehicle_type") || undefined,
    phone: formData.get("phone") || undefined,
    age_confirmed: formData.get("age_confirmed") === "true",
    tos_accepted: formData.get("tos_accepted") === "true",
  };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((e: { message: string }) => e.message).join(". ") };
  }

  const { email, password, name, username, vehicle_type, phone } = parsed.data;
  const supabase = createAdminClient();
  const signupLimit = await checkRateLimit(`signup:${email.toLowerCase()}`, 3, 60 * 60 * 1000);
  if (!signupLimit.allowed) return { error: "Too many signup attempts. Please try again later." };

  const { data: existingUsername } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (existingUsername) return { error: "That username is already in use" };

  const { data, error: signUpError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, username },
  });

  if (signUpError) {
    if (signUpError.message.includes("already")) {
      return { error: "An account with this email already exists" };
    }
    return { error: signUpError.message };
  }

  if (!data.user) {
    return { error: "Failed to create user" };
  }

  const tosHash = await hashTos(TOS_CONTENT);

  const { error: profileError } = await supabase.from("users").insert({
    id: data.user.id,
    email,
    name,
    username,
    vehicle_type: vehicle_type || null,
    phone_number: phone || null,
    age_confirmed_at: new Date().toISOString(),
    tos_version: TOS_VERSION,
    tos_hash: tosHash,
    tos_signed_at: new Date().toISOString(),
  });

  if (profileError) {
    return { error: profileError.message };
  }

  return { success: true, userId: data.user.id };
}

export async function checkTosAcceptance(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("tos_version, tos_hash")
    .eq("id", userId)
    .single();

  if (!data) return { needsReview: false };
  return { needsReview: data.tos_version !== TOS_VERSION, currentTos: TOS_VERSION };
}

export async function acceptUpdatedTos(userId: string) {
  const supabase = createAdminClient();
  const tosHash = await hashTos(TOS_CONTENT);
  const { error } = await supabase
    .from("users")
    .update({
      tos_version: TOS_VERSION,
      tos_hash: tosHash,
      tos_signed_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { error: error.message };
  return { success: true };
}
