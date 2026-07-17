import { createAdminClient } from "@/lib/supabaseAdmin";

interface NewSpot {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  address: string;
}

export async function runUserGrowth(spot: NewSpot) {
  const supabase = createAdminClient();

  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 500 });
  if (!authUsers?.users) return { invited: 0 };

  const { data: existingUserIds } = await supabase
    .from("users")
    .select("id");

  const existingSet = new Set((existingUserIds || []).map((u: { id: string }) => u.id));
  const nonUserProfiles = authUsers.users.filter((u) => !existingSet.has(u.id));

  const nearbyNonUsers = nonUserProfiles.filter((u) => u.phone);

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
