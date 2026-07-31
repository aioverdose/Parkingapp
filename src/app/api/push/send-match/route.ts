import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import webPush from "web-push";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL;

if (vapidPublicKey && vapidPrivateKey && vapidEmail) {
  webPush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

/**
 * POST /api/push/send-match
 *
 * Sends a Web Push notification to a user about a parking match.
 * Called by the match creation flow or the control tower.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createAdminClient();

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "moderator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { target_user_id, match_id, spot_lat, spot_lon, spot_street, eta_minutes, departing_user_name } = await request.json();

    if (!target_user_id || !match_id) {
      return NextResponse.json({ error: "target_user_id and match_id are required" }, { status: 400 });
    }

    // Fetch target user's push subscriptions
    const { data: subscriptions } = await supabase
      .from("device_push_subscriptions")
      .select("endpoint, p256dh, auth_key")
      .eq("user_id", target_user_id);

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, note: "No push subscriptions for user" });
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
    }

    const payload = JSON.stringify({
      type: "match_found",
      title: "Parking Match Found!",
      body: departing_user_name
        ? `${departing_user_name} is leaving a spot${spot_street ? ` on ${spot_street}` : ""}${eta_minutes ? `, ~${eta_minutes} min away` : ""}. Accept to navigate!`
        : `A parking spot is available${spot_street ? ` on ${spot_street}` : ""}${eta_minutes ? `, ~${eta_minutes} min away` : ""}. Accept to navigate!`,
      match_id,
      spot_lat,
      spot_lon,
      spot_street,
      eta_minutes,
      departing_user_name,
    });

    let sent = 0;
    const staleEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payload,
        );
        sent++;
      } catch (err: any) {
        // 410 Gone = subscription expired, 404 = invalid
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          staleEndpoints.push(sub.endpoint);
        }
      }
    }

    // Prune stale subscriptions
    if (staleEndpoints.length > 0) {
      await supabase
        .from("device_push_subscriptions")
        .delete()
        .in("endpoint", staleEndpoints);
    }

    return NextResponse.json({ ok: true, sent, pruned: staleEndpoints.length });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
