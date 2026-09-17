"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getLocationAccuracyBand, isInsideSpotArrivalGeofence } from "@/lib/spot-protocol";
import { MotionSensor, requestMotionPermission as requestDeviceMotionPermission } from "@/lib/behavior/sensors";
import type { MotionFeatures, MotionPermissionState } from "@/lib/behavior/types";

export type ArrivalStatus = "inactive" | "requesting" | "outside" | "inside" | "low_accuracy" | "paused" | "denied" | "unavailable";

export interface ArrivalPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  updatedAt: number;
}

interface WakeLockSentinelLike {
  release: () => Promise<void>;
  addEventListener?: (type: "release", listener: () => void) => void;
}

export function useSpotProtocolArrival(active: boolean) {
  const [status, setStatus] = useState<ArrivalStatus>("inactive");
  const [position, setPosition] = useState<ArrivalPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [motionFeatures, setMotionFeatures] = useState<MotionFeatures | null>(null);
  const [motionPermission, setMotionPermission] = useState<MotionPermissionState>("unknown");
  const insideRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const motionRef = useRef<MotionSensor | null>(null);

  const requestMotionPermission = useCallback(async () => {
    const permission = await requestDeviceMotionPermission();
    setMotionPermission(permission);
    return permission;
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
    setWakeLockActive(false);
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      const lock = await (navigator as Navigator & {
        wakeLock: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
      }).wakeLock.request("screen");
      wakeLockRef.current = lock;
      setWakeLockActive(true);
      lock.addEventListener?.("release", () => setWakeLockActive(false));
    } catch {
      // Wake lock is an enhancement; location tracking remains available.
    }
  }, []);

  useEffect(() => {
    if (!active) {
      if (watchIdRef.current !== null) navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      insideRef.current = false;
      motionRef.current?.stop();
      motionRef.current = null;
      queueMicrotask(() => setMotionFeatures(null));
      queueMicrotask(() => setStatus("inactive"));
      queueMicrotask(() => { void releaseWakeLock(); });
      return;
    }

    if (!navigator.geolocation) {
      queueMicrotask(() => {
        setStatus("unavailable");
        setError("This browser does not provide location services.");
      });
      return;
    }

    queueMicrotask(() => {
    queueMicrotask(() => setStatus("requesting"));
      setError(null);
    });
    queueMicrotask(() => { void requestWakeLock(); });

    if (motionPermission === "granted") {
      const motion = new MotionSensor((features) => setMotionFeatures(features));
      motionRef.current = motion;
      motion.start();
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (next) => {
        const nextPosition: ArrivalPosition = {
          latitude: next.coords.latitude,
          longitude: next.coords.longitude,
          accuracy: next.coords.accuracy,
          speed: next.coords.speed,
          heading: next.coords.heading,
          updatedAt: Date.now(),
        };
        setPosition(nextPosition);
        const accuracyBand = getLocationAccuracyBand(nextPosition.accuracy);
        if (accuracyBand === "poor") {
          setStatus("low_accuracy");
          return;
        }
        insideRef.current = isInsideSpotArrivalGeofence(nextPosition, insideRef.current, nextPosition.accuracy);
        setStatus(insideRef.current ? "inside" : "outside");
      },
      (locationError) => {
        if (locationError.code === locationError.PERMISSION_DENIED) {
          setStatus("denied");
          setError("Location permission is required for SPOT Arrival Mode.");
        } else {
          setStatus("unavailable");
          setError("Location is temporarily unavailable. Keep the app open and try again.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    );

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      motionRef.current?.stop();
      motionRef.current = null;
      queueMicrotask(() => { void releaseWakeLock(); });
    };
  }, [active, motionPermission, releaseWakeLock, requestWakeLock]);

  useEffect(() => {
    if (!active) return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setStatus((current) => current === "paused" ? (insideRef.current ? "inside" : "outside") : current);
        void requestWakeLock();
      } else {
        setStatus("paused");
        void releaseWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [active, releaseWakeLock, requestWakeLock]);

  return { status, position, error, wakeLockActive, motionFeatures, motionPermission, requestMotionPermission };
}
