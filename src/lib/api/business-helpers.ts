import { createAdminClient } from "@/lib/supabaseAdmin";

export interface BusinessProfile {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  plan: string;
  status: string;
  seats_limit: number;
  address: string | null;
  phone: string | null;
  operating_lat: number | null;
  operating_lng: number | null;
  operating_radius_meters: number | null;
  timezone: string;
  primary_network_id: string | null;
  created_at: string;
}

export interface BusinessMembership {
  business: BusinessProfile;
  role: "admin" | "staff" | "member";
  network_id: string | null;
}

export async function getMyBusinesses(userId: string): Promise<BusinessMembership[]> {
  const supabase = createAdminClient();

  const { data: memberships } = await supabase
    .from("business_members")
    .select("business_id, role, status, businesses(*)")
    .eq("user_id", userId);

  if (!memberships) return [];

  return (memberships as unknown as Array<{
    role: "admin" | "staff" | "member";
    businesses: BusinessProfile | null;
  }>)
    .filter((m) => m.businesses)
    .map((m) => ({
      business: m.businesses!,
      role: m.role,
      network_id: m.businesses!.primary_network_id,
    }));
}

export async function getBusinessMembership(
  userId: string,
  businessId: string,
): Promise<{ role: "admin" | "staff" | "member"; network_id: string | null } | null> {
  const supabase = createAdminClient();

  const { data: membership } = await supabase
    .from("business_members")
    .select("role, businesses(primary_network_id)")
    .eq("user_id", userId)
    .eq("business_id", businessId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) return null;

  return {
    role: (membership as { role: "admin" | "staff" | "member" }).role,
    network_id: ((membership as { businesses?: { primary_network_id?: string | null } | null }).businesses?.primary_network_id ?? null),
  };
}

export async function getUserNetworkIds(userId: string): Promise<string[]> {
  const supabase = createAdminClient();

  const { data: memberships } = await supabase
    .from("business_members")
    .select("businesses(primary_network_id, network_businesses(network_id))")
    .eq("user_id", userId)
    .eq("status", "active");

  const ids = new Set<string>();
  for (const m of memberships ?? []) {
    const biz = (m as { businesses?: { primary_network_id?: string | null; network_businesses?: Array<{ network_id: string }> | null } | null }).businesses;
    if (!biz) continue;
    if (biz.primary_network_id) ids.add(biz.primary_network_id);
    for (const nb of biz.network_businesses ?? []) ids.add(nb.network_id);
  }
  return [...ids];
}
