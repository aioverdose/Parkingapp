import { createAdminClient } from "@/lib/supabaseAdmin";
import { ollamaChat } from "@/lib/ollama";

export async function runAdInsights() {
  const supabase = createAdminClient();

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();

  const { data: ads } = await supabase.from("ads").select("id, title, business_name");

  if (!ads || ads.length === 0) return { reports: 0 };

  let reportsGenerated = 0;

  for (const ad of ads) {
    const { data: impressions } = await supabase
      .from("ad_analytics" as any)
      .select("id", { count: "exact", head: true })
      .eq("ad_id", ad.id)
      .eq("event_type", "impression")
      .gt("created_at", weekAgo);

    const { data: clicks } = await supabase
      .from("ad_analytics" as any)
      .select("id", { count: "exact", head: true })
      .eq("ad_id", ad.id)
      .eq("event_type", "click")
      .gt("created_at", weekAgo);

    const impressionCount = impressions?.length ?? 0;
    const clickCount = clicks?.length ?? 0;
    const ctr = impressionCount > 0 ? ((clickCount / impressionCount) * 100).toFixed(1) : "0.0";

    const reportBody = await ollamaChat(
      `You are an ad analyst. Write a 2-3 sentence weekly performance report for an advertiser. Include impression count, click count, CTR, and a brief suggestion. Tone: professional and friendly.`,
      `Ad: "${ad.title}" by ${(ad as any).business_name}. Impressions: ${impressionCount}, Clicks: ${clickCount}, CTR: ${ctr}%.`,
    );

    const finalReport =
      reportBody ||
      `Your ad "${ad.title}" had ${impressionCount} views and ${clickCount} clicks this week (${ctr}% CTR).`;

    await supabase.from("notifications").insert({
      user_id: ad.id,
      title: `📊 Weekly Ad Report: ${ad.title}`,
      message: finalReport,
      type: "ad_insight",
    });

    reportsGenerated++;
  }

  return { reports: reportsGenerated };
}
