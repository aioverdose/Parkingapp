import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { audit, requireExperienceAuth } from "@/lib/api/experience-auth";
import { DEFAULT_COMMUNITY_SETTINGS, CommunitySettings } from "@/lib/community-control";

export function validateCommunitySettings(input: unknown): CommunitySettings | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  if (!["feed_enabled", "composer_enabled", "require_moderation", "allow_media"].every((key) => typeof value[key] === "boolean")) return null;
  const max = Number(value.max_media_mb);
  if (!Number.isFinite(max) || max < 1 || max > 100) return null;
  return { feed_enabled: value.feed_enabled as boolean, composer_enabled: value.composer_enabled as boolean, require_moderation: value.require_moderation as boolean, allow_media: value.allow_media as boolean, max_media_mb: max };
}

export async function GET(request: NextRequest) {
  const checked = await requireExperienceAuth(request);
  if ("response" in checked) return checked.response;
  const client = createAdminClient();
  const [{ data: row }, { data: flag }] = await Promise.all([
    client.from("community_settings").select("draft,published,status").eq("key", "default").maybeSingle(),
    client.from("feature_flags").select("enabled").eq("name", "community_feed").maybeSingle(),
  ]);
  return NextResponse.json({ draft: { ...DEFAULT_COMMUNITY_SETTINGS, ...(row?.draft || {}) }, published: { ...DEFAULT_COMMUNITY_SETTINGS, ...(row?.published || {}) }, feed_enabled: flag?.enabled !== false, status: row?.status || "draft" });
}

export async function PATCH(request: NextRequest) {
  const checked = await requireExperienceAuth(request, "edit");
  if ("response" in checked) return checked.response;
  const body = await request.json().catch(() => ({}));
  const settings = validateCommunitySettings(body.settings);
  if (!settings) return NextResponse.json({ error: "Settings must include four boolean controls and max_media_mb from 1 to 100" }, { status: 400 });
  const action = body.action === "publish" ? "publish" : "draft";
  const client = createAdminClient();
  const { data: previous } = await client.from("community_settings").select("*").eq("key", "default").maybeSingle();
  const patch = action === "publish" ? { draft: settings, published: settings, status: "published", updated_by: checked.auth.user.id, updated_at: new Date().toISOString() } : { draft: settings, updated_by: checked.auth.user.id, updated_at: new Date().toISOString() };
  const { data, error } = await client.from("community_settings").upsert({ key: "default", ...patch }, { onConflict: "key" }).select("draft,published,status").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { data: previousFlag } = await client.from("feature_flags").select("*").eq("name", "community_feed").maybeSingle();
  const { data: flag, error: flagError } = action === "publish" ? await client.from("feature_flags").upsert({ name: "community_feed", enabled: settings.feed_enabled, updated_by: checked.auth.user.id, updated_at: new Date().toISOString() }, { onConflict: "name" }).select("enabled").single() : { data: previousFlag || { enabled: true }, error: null };
  if (flagError) return NextResponse.json({ error: flagError.message }, { status: 400 });
  await audit(checked.auth, action === "publish" ? "publish" : "update", "community_settings", "default", { settings: previous, feature_flag: previousFlag }, { settings: data, feature_flag: flag });
  return NextResponse.json({ draft: data.draft, published: data.published, status: data.status, feed_enabled: flag.enabled });
}
