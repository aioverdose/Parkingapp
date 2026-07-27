"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";

/**
 * usePresencePing — Periodically sends the user's GPS location to the server
 * so the admin control tower can display all active users on the map.
 *
 * - Pings once immediately, then every 60 seconds
 * - Uses high-accuracy GPS when available, falls back to low accuracy
 * - Cleans up the geolocation watch on unmount
 * - Requires the user to be authenticated
 *
 * @param enabled - Whether to actively ping (default true)
 * @param intervalMs - Ping interval (default 60000ms = 60s)
 */
export function usePresencePing(enabled: boolean = true, intervalMs: number = 60_000) {
  const supabase = createBrowserClient();
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [active, setActive] = useState(false);

  const sendPing = useCallback(
    async (lat: number, lng: number, heading?: number, speed?: number, accuracy?: number) => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;

        await fetch("/api/user/location", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ latitude: lat, longitude: lng, heading, speed, accuracy }),
        });
      } catch {
        // Silent — presence ping is best-effort
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (!enabled || !("geolocation" in navigator)) return;

    let lastPing = 0;

    const startWatch = () => {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, heading, speed, accuracy } = pos.coords;
          const now = Date.now();
          // Only send if interval has elapsed or this is the first fix
          if (now - lastPing >= intervalMs || lastPing === 0) {
            lastPing = now;
            sendPing(latitude, longitude, heading ?? undefined, speed ?? undefined, accuracy);
          }
        },
        () => {},
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
      );
    };

    // Send an immediate ping on first GPS fix
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, heading, speed, accuracy } = pos.coords;
        lastPing = Date.now();
        sendPing(latitude, longitude, heading ?? undefined, speed ?? undefined, accuracy);
        setActive(true);
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    );

    startWatch();

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
      setActive(false);
    };
  }, [enabled, intervalMs, sendPing]);

  return active;
}
