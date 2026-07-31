"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import type { Database } from "@/lib/database.types";

type CarLocation = Database["public"]["Tables"]["car_locations"]["Row"];

const PARKING_SPEED_THRESHOLD = 1.0;
const PARKING_WINDOW_SECONDS = 30;
const WALKING_SPEED_MIN = 0.5;
const WALKING_SPEED_MAX = 3.0;
const WALKING_CONFIRM_SECONDS = 15;
const WALKING_AVG_SPEED = 1.4;
const NEAR_CAR_METERS = 15;
const GPS_WATCH_INTERVAL_MS = 2000;

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

export interface CarLocationState {
  carLocation: CarLocation | null;
  parkingDetection: "off" | "detecting_park" | "parked" | "walking_back" | "near_car";
  detectionProgress: number;
  walkingEtaSeconds: number | null;
  walkingEtaFormatted: string | null;
  distanceToCar: number | null;
  lastKnownLat: number | null;
  lastKnownLng: number | null;
  loading: boolean;
}

export function useCarLocation(userId: string | null, enabled: boolean = true) {
  const [state, setState] = useState<CarLocationState>({
    carLocation: null,
    parkingDetection: "off",
    detectionProgress: 0,
    walkingEtaSeconds: null,
    walkingEtaFormatted: null,
    distanceToCar: null,
    lastKnownLat: null,
    lastKnownLng: null,
    loading: true,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const speedBufferRef = useRef<number[]>([]);
  const walkBufferRef = useRef<number[]>([]);
  const prevDistanceRef = useRef<number | null>(null);
  const walkingDetectedRef = useRef(false);
  const supabaseRef = useRef(createBrowserClient());

  const formatEta = useCallback((seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    return `${Math.floor(seconds / 60)}min ${Math.round(seconds % 60)}s`;
  }, []);

  const handleParkingDetection = useCallback(
    (speed: number | null, lat: number, lng: number) => {
      const buf = speedBufferRef.current;
      buf.push(speed !== null && speed !== undefined ? speed : 99);
      if (buf.length > PARKING_WINDOW_SECONDS) buf.shift();

      if (buf.length >= 10) {
        const allSlow = buf.every((s) => s < PARKING_SPEED_THRESHOLD);
        const progress = buf.length / PARKING_WINDOW_SECONDS;

        if (allSlow && buf.length >= PARKING_WINDOW_SECONDS) {
          if (stateRef.current.parkingDetection !== "parked" && stateRef.current.parkingDetection !== "walking_back") {
            setState((prev) => ({
              ...prev,
              carLocation: {
                ...(prev.carLocation as CarLocation) ?? { id: "", user_id: userId ?? "", created_at: new Date().toISOString(), updated_at: new Date().toISOString(), parked_at: new Date().toISOString(), walking_eta_seconds: null, walking_back_detected_at: null, departed_at: null },
                latitude: lat,
                longitude: lng,
                status: "parked",
                parked_at: new Date().toISOString(),
              },
              parkingDetection: "parked",
              detectionProgress: 1,
              walkingEtaSeconds: null,
              walkingEtaFormatted: null,
              distanceToCar: 0,
              lastKnownLat: lat,
              lastKnownLng: lng,
            }));
            walkingDetectedRef.current = false;
            walkBufferRef.current = [];

            if (userId) {
              fetch("/api/car-locations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ latitude: lat, longitude: lng }),
              }).catch(() => {});
            }
          }
        } else {
          setState((prev) => {
            if (prev.parkingDetection === "detecting_park" || prev.parkingDetection === "off") {
              return { ...prev, parkingDetection: "detecting_park" as const, detectionProgress: progress };
            }
            return prev;
          });
        }
      }
    },
    [userId],
  );

  const handleWalkingDetection = useCallback(
    (speed: number | null, lat: number, lng: number, car: CarLocation) => {
      const dist = haversine(lat, lng, car.latitude, car.longitude);

      const isWalking =
        speed !== null &&
        speed !== undefined &&
        speed >= WALKING_SPEED_MIN &&
        speed <= WALKING_SPEED_MAX;

      const prevDist = prevDistanceRef.current;
      prevDistanceRef.current = dist;

      const movingTowardCar = prevDist !== null && dist < prevDist && isWalking;

      if (dist < NEAR_CAR_METERS && stateRef.current.parkingDetection === "parked") {
        setState((prev) => ({
          ...prev,
          parkingDetection: "near_car",
          distanceToCar: dist,
        }));
        return;
      }

      if (movingTowardCar) {
        walkBufferRef.current.push(Date.now());
        if (walkBufferRef.current.length > WALKING_CONFIRM_SECONDS) {
          walkBufferRef.current.shift();
        }

        const oldest = walkBufferRef.current[0];
        const elapsed = Date.now() - oldest;
        const walkingConfirmed = walkBufferRef.current.length >= WALKING_CONFIRM_SECONDS && elapsed >= WALKING_CONFIRM_SECONDS * 1000;

        if (walkingConfirmed && !walkingDetectedRef.current) {
          walkingDetectedRef.current = true;
          const etaSeconds = Math.round(dist / WALKING_AVG_SPEED);

          setState((prev) => ({
            ...prev,
            parkingDetection: "walking_back",
            walkingEtaSeconds: etaSeconds,
            walkingEtaFormatted: formatEta(etaSeconds),
            distanceToCar: dist,
            lastKnownLat: lat,
            lastKnownLng: lng,
            carLocation: prev.carLocation ? {
              ...prev.carLocation,
              status: "walking_back",
              walking_eta_seconds: etaSeconds,
              walking_back_detected_at: new Date().toISOString(),
            } : null,
          }));

          if (userId && car.id) {
            fetch(`/api/car-locations/${car.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status: "walking_back",
                walking_eta_seconds: etaSeconds,
                walking_back_detected_at: new Date().toISOString(),
              }),
            }).catch(() => {});
          }
        } else if (walkingDetectedRef.current) {
          const etaSeconds = Math.round(dist / WALKING_AVG_SPEED);
          setState((prev) => ({
            ...prev,
            walkingEtaSeconds: etaSeconds,
            walkingEtaFormatted: formatEta(etaSeconds),
            distanceToCar: dist,
            lastKnownLat: lat,
            lastKnownLng: lng,
          }));
        }
      } else {
        if (walkBufferRef.current.length > 0 && !movingTowardCar) {
          walkBufferRef.current = [];
        }
        if (walkingDetectedRef.current && !movingTowardCar) {
          walkingDetectedRef.current = false;
        }
      }
    },
    [userId, formatEta],
  );

  useEffect(() => {
    if (!enabled) return;
    setState((prev) => ({ ...prev, loading: true }));

    let stopped = false;
    const supabase = supabaseRef.current;

    if (userId) {
      fetch("/api/car-locations")
        .then((r) => r.json())
        .then((data) => {
          if (stopped) return;
          if (data.carLocation) {
            const cl = data.carLocation as CarLocation;
            setState((prev) => ({
              ...prev,
              carLocation: cl,
              parkingDetection: cl.status === "walking_back" ? "walking_back" : "parked",
              walkingEtaSeconds: cl.walking_eta_seconds,
              walkingEtaFormatted: cl.walking_eta_seconds ? formatEta(cl.walking_eta_seconds) : null,
              loading: false,
            }));
          } else {
            setState((prev) => ({ ...prev, loading: false }));
          }
        })
        .catch(() => {
          if (!stopped) setState((prev) => ({ ...prev, loading: false }));
        });
    } else {
      setState((prev) => ({ ...prev, loading: false }));
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (stopped) return;
        const { latitude, longitude, speed, accuracy } = pos.coords;

        setState((prev) => ({
          ...prev,
          lastKnownLat: latitude,
          lastKnownLng: longitude,
        }));

        const speedMs = speed !== null && speed !== undefined ? speed : null;

        handleParkingDetection(speedMs, latitude, longitude);

        const car = stateRef.current.carLocation;
        if (car && (car.status === "parked" || car.status === "walking_back")) {
          handleWalkingDetection(speedMs, latitude, longitude, car);
        }

        if (!userId) return;

        const now = new Date().toISOString();
        const existingCar = stateRef.current.carLocation;
        if (existingCar && existingCar.id) {
          fetch(`/api/car-locations/${existingCar.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude,
              longitude,
              walking_eta_seconds: stateRef.current.walkingEtaSeconds,
            }),
          }).catch(() => {});
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: GPS_WATCH_INTERVAL_MS, timeout: 15000 },
    );

    return () => {
      stopped = true;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [userId, enabled, handleParkingDetection, handleWalkingDetection, formatEta]);

  return state;
}
