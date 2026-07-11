"use server";

import { createAdminClient } from "@/lib/supabaseAdmin";
import { TOS_VERSION, TOS_CONTENT, hashTos } from "@/lib/tos";
import { z } from "zod";

const signUpSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  vehicle_type: z.string().optional(),
  tos_accepted: z.boolean().refine((val) => val === true, "You must accept the Terms of Service"),
});

export async function signUpWithTosGate(formData: FormData) {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
    vehicle_type: formData.get("vehicle_type") || undefined,
    tos_accepted: formData.get("tos_accepted") === "true",
  };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((e: { message: string }) => e.message).join(". ") };
  }

  const { email, password, name, vehicle_type } = parsed.data;
  const supabase = createAdminClient();

  const { data, error: signUpError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
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
    vehicle_type: vehicle_type || null,
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
