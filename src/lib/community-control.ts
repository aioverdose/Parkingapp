import { createAdminClient } from "@/lib/supabaseAdmin";

export type CommunitySettings = {
  feed_enabled: boolean;
  composer_enabled: boolean;
  require_moderation: boolean;
  allow_media: boolean;
  max_media_mb: number;
};

export const DEFAULT_COMMUNITY_SETTINGS: CommunitySettings = {
  feed_enabled: true,
  composer_enabled: true,
  require_moderation: false,
  allow_media: true,
  max_media_mb: 10,
};

export async function getCommunityControl() {
  const client = createAdminClient();
  const [{ data: settings }, { data: flag }] = await Promise.all([
    client.from("community_settings").select("published").eq("key", "default").eq("status", "published").maybeSingle(),
    client.from("feature_flags").select("enabled").eq("name", "community_feed").maybeSingle(),
  ]);
  return {
    settings: { ...DEFAULT_COMMUNITY_SETTINGS, ...(settings?.published && typeof settings.published === "object" ? settings.published : {}) },
    feed_enabled: flag?.enabled !== false,
  };
}
