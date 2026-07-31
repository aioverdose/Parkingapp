"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getRoute, buildInstruction, type OSRMStep, type OSRMRoute } from "@/lib/routing";
import { speak, stopSpeech } from "@/lib/speech";

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceToPolyline(point: { lat: number; lng: number }, coords: [number, number][]): number {
  let min = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = { lat: coords[i][1], lng: coords[i][0] };
    const b = { lat: coords[i + 1][1], lng: coords[i + 1][0] };
    const d = pointToSegmentMeters(point, a, b);
    if (d < min) min = d;
  }
  return min;
}

function pointToSegmentMeters(p: { lat: number; lng: number }, a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dAb = haversineMeters(a.lat, a.lng, b.lat, b.lng);
  if (dAb < 1) return haversineMeters(p.lat, p.lng, a.lat, a.lng);
  const t = Math.max(0, Math.min(1, (
    (p.lat - a.lat) * (b.lat - a.lat) + (p.lng - a.lng) * (b.lng - a.lng)
  ) / (dAb * dAb)));
  const proj = { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) };
  return haversineMeters(p.lat, p.lng, proj.lat, proj.lng);
}

function findClosestStepIndex(pos: { lat: number; lng: number }, steps: OSRMStep[], lastIndex: number): number {
  let best = lastIndex;
  let bestDist = Infinity;
  for (let i = lastIndex; i < steps.length; i++) {
    const wp = steps[i].way_points;
    if (!wp) continue;
    const d = haversineMeters(pos.lat, pos.lng, wp[1], wp[0]);
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

export type NavStatus = "idle" | "routing" | "navigating" | "arrived" | "off_route" | "error" | "no_route";

interface UseTurnByTurnOptions {
  destination: { lat: number; lng: number } | null;
  voiceEnabled?: boolean;
  onArrive?: () => void;
}

export function useTurnByTurn({ destination, voiceEnabled = true, onArrive }: UseTurnByTurnOptions) {
  const [status, setStatus] = useState<NavStatus>("idle");
  const [route, setRoute] = useState<OSRMRoute | null>(null);
  const [steps, setSteps] = useState<OSRMStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [nextInstruction, setNextInstruction] = useState("");
  const [remainingDistance, setRemainingDistance] = useState(0);
  const [remainingDuration, setRemainingDuration] = useState(0);
  const [distanceToNext, setDistanceToNext] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);

  const watchRef = useRef<number | null>(null);
  const lastSpokenRef = useRef(-1);
  const statusRef = useRef(status);
  const stepsRef = useRef(steps);
  const announcedArrivalRef = useRef(false);

  statusRef.current = status;
  stepsRef.current = steps;

  const speakText = useCallback((text: string, rate = 0.92) => {
    if (voiceEnabled) speak(text, { rate, pitch: 1 });
  }, [voiceEnabled]);

  const start = useCallback(async (origin: { lat: number; lng: number }) => {
    if (!destination) return;
    setStatus("routing");
    stopSpeech();

    const result = await getRoute(origin, destination);
    if (!result || !result.route) {
      setStatus("no_route");
      return;
    }

    const routeData = result.route;
    setRoute(routeData);
    setSteps(result.steps);
    setCurrentStepIndex(0);
    lastSpokenRef.current = -1;
    announcedArrivalRef.current = false;

    const totalDist = routeData.distance;
    const totalDur = routeData.duration;
    setRemainingDistance(totalDist);
    setRemainingDuration(totalDur);

    if (result.steps.length > 0) {
      const firstInstr = buildInstruction(result.steps[0]);
      setNextInstruction(firstInstr);
      speakText(firstInstr);
      lastSpokenRef.current = 0;
    }

    setStatus("navigating");

    // Start GPS tracking
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (statusRef.current !== "navigating" && statusRef.current !== "off_route") return;

        const userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentPosition(userPos);
        const stepsData = stepsRef.current;

        if (stepsData.length === 0) return;

        // Check arrival
        const destDist = haversineMeters(userPos.lat, userPos.lng, destination.lat, destination.lng);
        if (destDist < 50 && !announcedArrivalRef.current) {
          announcedArrivalRef.current = true;
          setStatus("arrived");
          if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
          speakText("You have arrived at your parking spot. Please confirm you have parked.");
          onArrive?.();
          return;
        }

        // Check off-route
        if (routeData.geometry?.coordinates) {
          const distFromRoute = distanceToPolyline(userPos, routeData.geometry.coordinates);
          if (distFromRoute > 80) {
            setStatus("off_route");
            speakText("You are off the route. Recalculating.");
            return;
          }
        }

        // Find closest step
        const stepIdx = findClosestStepIndex(userPos, stepsData, currentStepIndex);
        setCurrentStepIndex(stepIdx);

        // Calculate remaining distance from current position to destination
        const remainingSteps = stepsData.slice(stepIdx);
        const remDist = remainingSteps.reduce((sum, s) => sum + (s.distance || 0), 0);
        const remDur = remainingSteps.reduce((sum, s) => sum + (s.duration || 0), 0);
        setRemainingDistance(remDist);
        setRemainingDuration(remDur);

        // Distance to next waypoint
        if (stepIdx < stepsData.length) {
          const wp = stepsData[stepIdx].way_points;
          if (wp) {
            const d = haversineMeters(userPos.lat, userPos.lng, wp[1], wp[0]);
            setDistanceToNext(d);
          }
        }

        // Speak new step instruction
        if (stepIdx > lastSpokenRef.current && stepIdx < stepsData.length) {
          lastSpokenRef.current = stepIdx;
          const instr = buildInstruction(stepsData[stepIdx]);
          setNextInstruction(instr);
          speakText(instr);
        }
      },
      (err) => {
        setStatus("error");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );
  }, [destination, speakText, onArrive, currentStepIndex]);

  const stop = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    stopSpeech();
    setStatus("idle");
    setCurrentStepIndex(0);
    lastSpokenRef.current = -1;
  }, []);

  const reroute = useCallback(async () => {
    if (!currentPosition || !destination) return;
    stopSpeech();
    await start(currentPosition);
  }, [currentPosition, destination, start]);

  const dismissOffRoute = useCallback(() => {
    reroute();
  }, [reroute]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, []);

  const nextInstructionText = currentStepIndex < steps.length - 1
    ? buildInstruction(steps[currentStepIndex + 1])
    : "";

  return {
    status,
    route,
    steps,
    currentStepIndex,
    nextInstruction,
    nextInstructionText,
    remainingDistance,
    remainingDuration,
    distanceToNext,
    currentPosition,
    start,
    stop,
    reroute,
    dismissOffRoute,
  };
}
