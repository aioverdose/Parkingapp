import { createAdminClient } from "@/lib/supabaseAdmin";

const INVITE_RADIUS_METERS = 322; // ~0.2 mile

interface NewSpot {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  address: string;
}

export async function runUserGrowth(spot: NewSpot) {
  const supabase = createAdminClient();

  const { data: allProfiles } = await (supabase.from("auth.users" as any) as any).select("id, email, phone").limit(500);

  if (!allProfiles) return { invited: 0 };

  const { data: existingUserIds } = await supabase
    .from("users")
    .select("id");

  const existingSet = new Set((existingUserIds || []).map((u: any) => u.id));
  const nonUserProfiles = ((allProfiles || []) as any[]).filter((p: any) => !existingSet.has(p.id));

  const spotLat = spot.latitude;
  const spotLng = spot.longitude;

  const nearbyNonUsers = nonUserProfiles.filter((p: any) => {
    if (!p.phone) return false;
    return true;
  });

  if (nearbyNonUsers.length === 0) return { invited: 0 };

  let invited = 0;

  for (const nonUser of nearbyNonUsers.slice(0, 10)) {
    await supabase.from("invite_conversions" as any).insert({
      inviter_id: spot.user_id,
      invitee_phone: nonUser.phone,
      invited_via: "sms",
      converted: false,
    });

    invited++;
  }

  return { invited };
}
