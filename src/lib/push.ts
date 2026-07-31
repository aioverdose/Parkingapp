import { createAdminClient } from "./supabaseAdmin";
import webPush from "web-push";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL;

if (vapidPublicKey && vapidPrivateKey && vapidEmail) {
  webPush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

export interface PushPayload {
  type: string;
  title: string;
  body: string;
  [key: string]: unknown;
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; pruned: number }> {
  if (!vapidPublicKey || !vapidPrivateKey) return { sent: 0, pruned: 0 };

  const supabase = createAdminClient();

  const { data: subscriptions } = await supabase
    .from("device_push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .eq("user_id", userId);

  if (!subscriptions || subscriptions.length === 0) return { sent: 0, pruned: 0 };

  const payloadStr = JSON.stringify(payload);
  const staleEndpoints: string[] = [];
  let sent = 0;

  for (const sub of subscriptions) {
    try {
      await webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        payloadStr,
      );
      sent++;
    } catch (err: any) {
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        staleEndpoints.push(sub.endpoint);
      }
    }
  }

  if (staleEndpoints.length > 0) {
    await supabase.from("device_push_subscriptions").delete().in("endpoint", staleEndpoints);
  }

  return { sent, pruned: staleEndpoints.length };
}
