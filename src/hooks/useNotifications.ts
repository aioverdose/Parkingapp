"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useNotifications(
  onNotification: (payload: Record<string, unknown>) => void
) {
  const supabase = createBrowserClient();
  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    async function setupSubscription() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`user-notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            const notification = payload.new as Record<string, unknown>;
            if (!notification.match_id) {
              onNotification(notification);
              return;
            }
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) return;
            const response = await fetch(`/api/notifications?id=${encodeURIComponent(String(notification.id))}`, {
              headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
            });
            if (!response.ok) return;
            const body = await response.json() as { notifications?: Record<string, unknown>[] };
            if (body.notifications?.some((item) => item.id === notification.id)) onNotification(notification);
          }
        )
        .subscribe();
    }

    setupSubscription();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [onNotification]);
}
