"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { getParkingSpots } from "@/lib/parking-spot";
import type { SavedParkingSpot } from "@/lib/parking-spot";
import { ProfileVariants, type ProfileData, type ProfileVariant, type ProfileSectionConfig, type ProfileAppearance } from "@/components/ProfileVariants";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [primarySpot, setPrimarySpot] = useState<SavedParkingSpot | null>(null);
  const [variant, setVariant] = useState<ProfileVariant>("classic");
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<ProfileSectionConfig[]>([]);
  const [appearance, setAppearance] = useState<ProfileAppearance | null>(null);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.replace("/"); return; }
      const [{ data }, spots, variantResponse, experienceResponse] = await Promise.all([
        supabase.from("users").select("name, username, email, vehicle_type, schedule_arrival, schedule_departure, schedule_days, avatar_color").eq("id", session.user.id).single(),
        getParkingSpots(session.user.id),
        fetch("/api/profile/variant", { headers: { Authorization: `Bearer ${session.access_token}` } }).catch(() => null),
        fetch("/api/experience/profile").catch(() => null),
      ]);
      let selected: ProfileVariant = "classic";
      if (variantResponse?.ok) { const body = await variantResponse.json() as { variant?: string }; if (body.variant === "readiness" || body.variant === "network") selected = body.variant; }
       if (experienceResponse?.ok) { const body = await experienceResponse.json() as { sections?: ProfileSectionConfig[]; appearance?: ProfileAppearance | null }; if (Array.isArray(body.sections)) setSections(body.sections); if (body.appearance) setAppearance(body.appearance); }
      if (!active) return;
      setProfile(data as ProfileData | null);
      setPrimarySpot(spots.spots?.find((spot) => spot.label === "Primary commute area") ?? spots.spots?.[0] ?? null);
      setVariant(selected);
      setLoading(false);
    }
    void loadProfile();
    return () => { active = false; };
  }, [router, supabase]);

  if (loading || !profile) return <div className="flex min-h-screen items-center justify-center bg-[#f6f8f6] text-sm text-[#71807b]">Loading your profile...</div>;
  return <ProfileVariants appearance={appearance} sections={sections} variant={variant} profile={profile} primarySpot={primarySpot} onLogout={async () => { await supabase.auth.signOut(); router.push("/"); }} />;
}
