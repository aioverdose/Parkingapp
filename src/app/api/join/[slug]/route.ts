import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser, createAuthenticatedSupabaseClient } from "@/lib/api/auth-helpers";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) return NextResponse.json({ error: "Invalid business link" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: business, error } = await supabase
    .from("businesses")
    .select("id, name, slug, description, logo_url, app_name, primary_color, accent_color, welcome_message, house_notes, promo_text, info_link, status")
    .eq("slug", slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Unable to load business" }, { status: 500 });
  if (!business || !["active", "trialing"].includes(business.status)) {
    return NextResponse.json({ error: "This business is not accepting members" }, { status: 404 });
  }

  await supabase.from("business_join_events").insert({ business_id: business.id, source: request.nextUrl.searchParams.get("source") === "qr" ? "qr" : "link", event_type: "visit" });
  return NextResponse.json({ business });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAuthenticatedSupabaseClient(request);
  const { data: business } = await supabase.from("businesses").select("id, status").eq("slug", slug).maybeSingle();
  if (!business || !["active", "trialing"].includes(business.status)) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { data, error } = await supabase.rpc("join_business", { p_business_id: business.id });
  if (error && !/already a member/i.test(error.message || "")) return NextResponse.json({ error: error.message }, { status: 400 });

  await createAdminClient().from("business_join_events").insert({
    business_id: business.id,
    user_id: user.id,
    source: request.nextUrl.searchParams.get("source") === "qr" ? "qr" : "link",
    event_type: "join",
  });
  return NextResponse.json({ business_id: business.id, membership: data, alreadyMember: Boolean(error) });
}
