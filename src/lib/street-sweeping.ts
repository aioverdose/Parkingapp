import { createAdminClient } from "@/lib/supabaseAdmin";

export interface SweepingSchedule {
  id: string;
  street_name: string;
  city: string;
  day_of_week: string;
  time_start: string;
  time_end: string;
  zone: string;
  holiday_exemptions: string[];
}

export async function getStreetSweeping(street: string, city: string | null): Promise<SweepingSchedule | null> {
  const supabase = createAdminClient();

  const { data } = await (supabase as any)
    .from("street_sweeping")
    .select("*")
    .eq("street_name", street)
    .eq("city", city || "")
    .maybeSingle();

  return data as SweepingSchedule | null;
}

export async function getNextSweepingForUser(userId: string): Promise<SweepingSchedule | null> {
  const supabase = createAdminClient();

  const { data: alert } = await (supabase as any)
    .from("street_sweeping_alerts")
    .select("street_name")
    .eq("user_id", userId)
    .eq("notified", false)
    .order("alert_time", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!alert) return null;

  const { data } = await (supabase as any)
    .from("street_sweeping")
    .select("*")
    .eq("street_name", alert.street_name)
    .maybeSingle();

  return data as SweepingSchedule | null;
}
