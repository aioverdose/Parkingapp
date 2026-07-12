"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseLocationTrackingOptions {
  enabled: boolean;
  matchId?: string | null;
  intervalMs?: number;
}

export function useLocationTracking({
  enabled,
  matchId,
  intervalMs = 15000,
}: UseLocationTrackingOptions) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const sendLocation = useCallback(async () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await fetch("/api/location/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
              accuracy: pos.coords.accuracy,
              match_id: matchId || null,
            }),
          });
        } catch {
          // silent fail
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  }, [matchId]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          await fetch("/api/location/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
              accuracy: pos.coords.accuracy,
              match_id: matchId || null,
            }),
          });
        } catch {
          // silent fail
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );

    sendLocation();
    intervalRef.current = setInterval(sendLocation, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, matchId, intervalMs, sendLocation]);
}
