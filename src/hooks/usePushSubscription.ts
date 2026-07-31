"use client";

import { useEffect, useCallback, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * usePushSubscription — Manages Web Push subscription lifecycle.
 * Subscribes the user to push notifications on login, stores the
 * subscription in Supabase, and cleans up on logout.
 */
export function usePushSubscription() {
  const supabase = createBrowserClient();
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  const subscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    try {
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;

      let pushSubscription = await reg.pushManager.getSubscription();

      if (!pushSubscription) {
        pushSubscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      const { endpoint } = pushSubscription;
      const key = pushSubscription.toJSON().keys;
      if (!key) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          endpoint,
          p256dh: key.p256dh,
          auth: key.auth,
        }),
      });

      setSubscribed(true);
    } catch {
      // Push subscription failed silently
    }
  }, [supabase]);

  const unsubscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const { endpoint } = sub;
        await sub.unsubscribe();

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ endpoint }),
          });
        }
      }
      setSubscribed(false);
    } catch {
      // Unsubscribe failed silently
    }
  }, [supabase]);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return "denied";
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      await subscribe();
    }
    return result;
  }, [subscribe]);

  // Auto-subscribe on mount if permission already granted
  useEffect(() => {
    if (!("Notification" in window)) return;
    setPermission(Notification.permission);
    if (Notification.permission === "granted") {
      subscribe();
    }
  }, [subscribe]);

  return { subscribed, permission, subscribe, unsubscribe, requestPermission };
}
