"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";

export interface TrackedLocation {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  recorded_at: string;
  distance_meters: number | null;
  eta_seconds: number | null;
}

export interface UseLiveTrackingResult {
  /** The matched partner's current location (null if not sharing) */
  partnerLocation: TrackedLocation | null;
  /** Whether the partner is currently sharing their location */
  partnerSharing: boolean;
  /** Whether we are currently receiving updates */
  isTracking: boolean;
  /** Any error encountered */
  error: string | null;
}

/**
 * useLiveTracking — Receives real-time location updates from a matched partner.
 *
 * This hook subscribes to Supabase Realtime on the driver_locations table,
 * filtered to only receive updates for the specified match that were NOT
 * posted by the current user.
 *
 * Privacy:
 * - RLS ensures we only receive data for confirmed matches
 * - Only receives updates when the partner has explicitly consented to share
 * - Auto-cleans up subscription on unmount or when tracking stops
 *
 * @param matchId - The confirmed match ID to track
 * @param myUserId - The current user's ID (to filter out own locations)
 * @param spotLat - The parking spot latitude (for ETA calculation)
 * @param spotLng - The parking spot longitude (for ETA calculation)
 */
export function useLiveTracking(
  matchId: string | null,
  myUserId: string | null,
  spotLat?: number,
  spotLng?: number,
): UseLiveTrackingResult {
  const supabase = createBrowserClient();
  const [partnerLocation, setPartnerLocation] = useState<TrackedLocation | null>(null);
  const [partnerSharing, setPartnerSharing] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Calculate distance between two points
  const haversine = useCallback(
    (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371e3;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dlat = toRad(lat2 - lat1);
      const dlng = toRad(lng2 - lng1);
      const a =
        Math.sin(dlat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dlng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },
    [],
  );

  // Process a new location update from the partner
  const processLocationUpdate = useCallback(
    (loc: { latitude: number; longitude: number; heading: number | null; speed: number | null; accuracy: number | null; recorded_at: string; user_id: string }) => {
      if (loc.user_id === myUserId) return; // Ignore own locations

      const distance = spotLat != null && spotLng != null
        ? haversine(loc.latitude, loc.longitude, spotLat, spotLng)
        : null;

      const effectiveSpeed = loc.speed && loc.speed > 0 ? loc.speed : 11.2;
      const eta = distance != null ? Math.round(distance / effectiveSpeed) : null;

      setPartnerLocation({
        latitude: loc.latitude,
        longitude: loc.longitude,
        heading: loc.heading,
        speed: loc.speed,
        accuracy: loc.accuracy,
        recorded_at: loc.recorded_at,
        distance_meters: distance != null ? Math.round(distance) : null,
        eta_seconds: eta,
      });
    },
    [myUserId, spotLat, spotLng, haversine],
  );

  useEffect(() => {
    if (!matchId || !myUserId) {
      setPartnerLocation(null);
      setPartnerSharing(false);
      setIsTracking(false);
      return;
    }

    setIsTracking(true);
    setError(null);

    // Subscribe to realtime location updates for this match
    // RLS on driver_locations ensures we only receive data for confirmed matches
    const channel = supabase
      .channel(`live-tracking:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "driver_locations",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const loc = payload.new as {
            latitude: number;
            longitude: number;
            heading: number | null;
            speed: number | null;
            accuracy: number | null;
            recorded_at: string;
            user_id: string;
          };
          setPartnerSharing(true);
          processLocationUpdate(loc);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "driver_locations",
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          // Partner stopped sharing or records were cleaned up
          setPartnerLocation(null);
          setPartnerSharing(false);
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setError("Connection lost. Location updates may be delayed.");
          setIsTracking(false);
        }
      });

    channelRef.current = channel;

    // Also subscribe to active_sessions changes to detect if partner stops sharing
    const sessionChannel = supabase
      .channel(`session-tracking:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "active_sessions",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const session = payload.new as {
            location_shared: boolean;
            location_stopped_at: string | null;
            user_id: string;
          };
          // If the partner stopped sharing, clear their location
          if (!session.location_shared || session.location_stopped_at) {
            if (session.user_id !== myUserId) {
              setPartnerLocation(null);
              setPartnerSharing(false);
            }
          }
        },
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      supabase.removeChannel(sessionChannel);
      setIsTracking(false);
    };
  }, [matchId, myUserId, supabase, processLocationUpdate]);

  return { partnerLocation, partnerSharing, isTracking, error };
}
