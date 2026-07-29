"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const GEOFENCE_RADIUS = 150;
const GEOFENCE_COOLDOWN_MS = 5 * 60_000;

export function usePresencePing(enabled: boolean = true, intervalMs: number = 10_000) {
  const supabase = createBrowserClient();
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [active, setActive] = useState(false);
  const lastGeofenceRef = useRef<Record<string, number>>({});
  const supabaseRef = useRef(supabase);
  supabaseRef.current = supabase;

  const checkGeofences = useCallback(
    async (token: string, lat: number, lng: number) => {
      try {
        const { data: matches } = await supabaseRef.current
          .from("spot_matches")
          .select("id, spot_id, parking_spots!inner(latitude, longitude, address)")
          .in("status", ["pending", "confirmed", "confirmed_by_owner", "confirmed_by_seeker"])
          .or("seeker_id.eq.user_id,spot_owner_id.eq.user_id");

        if (!matches || matches.length === 0) return;

        const now = Date.now();
        for (const m of matches) {
          const spot = (m as any).parking_spots;
          if (!spot) continue;

          const dist = haversine(lat, lng, spot.latitude, spot.longitude);
          if (dist > GEOFENCE_RADIUS) continue;

          const lastNotified = lastGeofenceRef.current[m.id] ?? 0;
          if (now - lastNotified < GEOFENCE_COOLDOWN_MS) continue;

          lastGeofenceRef.current[m.id] = now;

          if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);

          try {
            const audio = new Audio("/sounds/match-alert.mp3");
            audio.play().catch(() => {});
          } catch {}
        }
      } catch {}
    },
    [],
  );

  const checkGeofencesRef = useRef(checkGeofences);
  checkGeofencesRef.current = checkGeofences;

  const sendPing = useCallback(
    async (lat: number, lng: number, heading?: number, speed?: number, accuracy?: number) => {
      try {
        const { data } = await supabaseRef.current.auth.getSession();
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

        checkGeofencesRef.current(token, lat, lng);
      } catch {
        // Silent — presence ping is best-effort
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled || !("geolocation" in navigator)) return;

    let lastPing = 0;

    const startWatch = () => {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, heading, speed, accuracy } = pos.coords;
          const now = Date.now();
          if (now - lastPing >= intervalMs || lastPing === 0) {
            lastPing = now;
            sendPing(latitude, longitude, heading ?? undefined, speed ?? undefined, accuracy);
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
      );
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, heading, speed, accuracy } = pos.coords;
        lastPing = Date.now();
        sendPing(latitude, longitude, heading ?? undefined, speed ?? undefined, accuracy);
        setActive(true);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
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
