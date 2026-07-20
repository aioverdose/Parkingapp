"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";

/**
 * useLocationSharing — Broadcasts the user's GPS location to a matched partner.
 *
 * This hook manages:
 * - Starting/stopping the browser geolocation watch
 * - Periodic GPS updates (every 20 seconds by default, battery-friendly)
 * - Uploading location to the server (which then broadcasts via Supabase Realtime)
 * - Cleanup on unmount or when sharing is stopped
 *
 * Privacy:
 * - Location is ONLY shared after explicit user consent
 * - Sharing stops automatically when the match ends or the user taps "Stop"
 * - GPS watch is cleared immediately on stop/unmount
 *
 * @param matchId - The confirmed match ID to share location for
 * @param enabled - Whether location sharing is currently active
 * @param updateIntervalMs - How often to send location updates (default: 20000ms = 20s)
 */
export function useLocationSharing(
  matchId: string | null,
  enabled: boolean,
  updateIntervalMs: number = 20_000,
) {
  const supabase = createBrowserClient();
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }, [supabase]);

  const uploadLocation = useCallback(
    async (lat: number, lng: number, heading?: number, speed?: number, accuracy?: number) => {
      if (!matchId) return;
      const token = await getAuthToken();
      if (!token) return;

      try {
        await fetch(`/api/matches/${matchId}/location`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            latitude: lat,
            longitude: lng,
            heading,
            speed,
            accuracy,
          }),
        });
      } catch {
        // Silently fail — the next update will retry
      }
    },
    [matchId, getAuthToken],
  );

  const stopSharing = useCallback(async () => {
    // Clear GPS watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Clear periodic upload interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    lastPositionRef.current = null;
    setSharing(false);

    // Notify server to stop sharing (best-effort, don't block on error)
    if (matchId) {
      const token = await getAuthToken();
      if (token) {
        fetch(`/api/matches/${matchId}/location/stop`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    }
  }, [matchId, getAuthToken]);

  useEffect(() => {
    if (!enabled || !matchId) {
      if (watchIdRef.current !== null) stopSharing();
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setSharing(true);
    setError(null);

    // Watch position continuously but only upload periodically
    // This gives us the most accurate position for the UI while
    // minimizing server calls and battery drain
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading, speed, accuracy } = position.coords;
        lastPositionRef.current = { lat: latitude, lng: longitude };

        // Send the first position immediately
        uploadLocation(latitude, longitude, heading ?? undefined, speed ?? undefined, accuracy ?? undefined);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location access denied. Please enable location permissions.");
          stopSharing();
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError("Location data unavailable.");
        }
        // Timeout errors are non-fatal — keep watching
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 5_000, // Allow 5-second cached positions for efficiency
      },
    );

    // Periodic upload to reduce server load
    // The GPS watch gives us real-time accuracy for the UI,
    // but we don't need to upload every position to the server
    intervalRef.current = setInterval(() => {
      if (lastPositionRef.current) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, heading, speed, accuracy } = pos.coords;
            lastPositionRef.current = { lat: latitude, lng: longitude };
            uploadLocation(latitude, longitude, heading ?? undefined, speed ?? undefined, accuracy ?? undefined);
          },
          () => {},
          { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
        );
      }
    }, updateIntervalMs);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, matchId, updateIntervalMs, uploadLocation, stopSharing]);

  return { sharing, error, stopSharing, lastPosition: lastPositionRef };
}
