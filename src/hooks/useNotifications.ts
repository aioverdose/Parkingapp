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
          (payload) => {
            onNotification(payload.new as Record<string, unknown>);
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