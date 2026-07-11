"use client";

import { useEffect, useState } from "react";
import { createBrowserClient, isSupabaseConfigured } from "@/lib/supabaseClient";
import type { Database } from "@/lib/database.types";

export type Spot = Database["public"]["Tables"]["parking_spots"]["Row"];

function isCompatible(spot: Spot, userVehicleType: string | null): boolean {
  if (!userVehicleType) return true;
  if (!spot.vehicle_type) return true;
  return spot.vehicle_type === userVehicleType;
}

export function useRealtimeSpots(userVehicleType?: string | null) {
  const supabase = createBrowserClient();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    async function fetchSpots() {
      const now = new Date().toISOString();
      const { data, error: fetchError } = await supabase
        .from("parking_spots")
        .select("*")
        .eq("status", "active")
        .gt("expires_at", now)
        .gt("departure_time", now)
        .order("departure_time", { ascending: true });

      if (!active) {
        return;
      }

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setSpots((data ?? []).filter((spot) => isCompatible(spot, userVehicleType ?? null)));
      }
      setLoading(false);
    }

    fetchSpots();

    const channel = supabase
      .channel("public:parking_spots")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parking_spots" },
        (payload) => {
          setSpots((current) => {
            const now = new Date().toISOString();
            
            if (payload.eventType === "INSERT") {
              const newSpot = payload.new as Spot;
              if (newSpot.status !== "active") return current;
              if (newSpot.expires_at && newSpot.expires_at <= now) return current;
              if (newSpot.departure_time && newSpot.departure_time <= now) return current;
              if (!isCompatible(newSpot, userVehicleType ?? null)) {
                return current;
              }
              return [...current, newSpot].sort((a, b) => 
                (a.departure_time ?? "").localeCompare(b.departure_time ?? "")
              );
            }
            if (payload.eventType === "UPDATE") {
              const updatedSpot = payload.new as Spot;
              if (
                updatedSpot.status !== "active" ||
                (updatedSpot.expires_at && updatedSpot.expires_at <= now) ||
                (updatedSpot.departure_time && updatedSpot.departure_time <= now)
              ) {
                return current.filter((s) => s.id !== updatedSpot.id);
              }

              if (!isCompatible(updatedSpot, userVehicleType ?? null)) {
                return current.filter((s) => s.id !== updatedSpot.id);
              }

              return current
                .map((spot) => (spot.id === updatedSpot.id ? updatedSpot : spot))
                .sort((a, b) => (a.departure_time ?? "").localeCompare(b.departure_time ?? ""));
            }

            if (payload.eventType === "DELETE") {
              return current.filter((spot) => spot.id !== payload.old.id);
            }

            return current;
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  // Periodic local cleanup for expired spots
  useEffect(() => {
    const interval = setInterval(() => {
      setSpots((current) => {
        const now = new Date().toISOString();
        return current.filter(
          (spot) =>
            (!spot.expires_at || spot.expires_at > now) &&
            (!spot.departure_time || spot.departure_time > now)
        );
      });
    }, 30000); // Run every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    spots,
    loading,
    error,
  };
}
