import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
export async function GET() {
  const client = createAdminClient();
  const [sections, appearance, categories] = await Promise.all([
    client.from("profile_section_configs").select("key,label,description,enabled,visible_to,sort_order,show_on_mobile,show_on_desktop").eq("status", "published").eq("enabled", true).order("sort_order"),
    client.from("profile_appearance_configs").select("published").eq("key", "default").eq("status", "published").maybeSingle(),
    client.from("explore_categories").select("id,slug,name,description,icon_name,theme,badge,featured,sort_order,image:category_images(id,image_url,thumbnail_url,alt_text,source_url,photographer_name,license_name,license_url,width,height,aspect_ratio)").eq("status", "published").order("sort_order"),
  ]);
  if (sections.error || appearance.error || categories.error) return NextResponse.json({ sections: [], appearance: null, categories: [] }, { status: 200 });
  return NextResponse.json({ sections: sections.data ?? [], appearance: appearance.data?.published ?? null, categories: categories.data ?? [] }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}
