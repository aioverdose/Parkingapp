export async function checkPilotArea(lat: number, lng: number): Promise<{ allowed: boolean; areaName: string }> {
  try {
    const { createAdminClient } = await import("@/lib/supabaseAdmin");
    const supabase = createAdminClient();

    const { data } = await (supabase as any)
      .from("pilot_areas")
      .select("*")
      .eq("active", true)
      .maybeSingle();

    if (!data) return { allowed: true, areaName: "Global" };

    const allowed =
      lat >= parseFloat(data.min_lat) &&
      lat <= parseFloat(data.max_lat) &&
      lng >= parseFloat(data.min_lng) &&
      lng <= parseFloat(data.max_lng);

    return { allowed, areaName: data.name };
  } catch {
    return { allowed: true, areaName: "Global" };
  }
}

export async function getPilotArea(): Promise<{ name: string; minLat: number; maxLat: number; minLng: number; maxLng: number } | null> {
  try {
    const { createAdminClient } = await import("@/lib/supabaseAdmin");
    const supabase = createAdminClient();

    const { data } = await (supabase as any)
      .from("pilot_areas")
      .select("*")
      .eq("active", true)
      .maybeSingle();

    if (!data) return null;

    return {
      name: data.name,
      minLat: parseFloat(data.min_lat),
      maxLat: parseFloat(data.max_lat),
      minLng: parseFloat(data.min_lng),
      maxLng: parseFloat(data.max_lng),
    };
  } catch {
    return null;
  }
}
