"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { SimulatedDevice } from "@/lib/testing/simulatedDevice";
import { TEST_USERS, LONG_BEACH_CENTER, MPH_TO_MS, AUTO_BROADCAST_INTERVAL_MS } from "@/lib/testing/constants";
import { TEST_ROUTES } from "@/lib/testing/testRoutes";
import { DualPhoneView } from "./DualPhoneView";
import { createBrowserClient } from "@/lib/supabaseClient";
import { speak, stopSpeech } from "@/lib/speech";
import { Play, Square, Smartphone, Volume2, Navigation, MapPin } from "lucide-react";

const SCENARIO_OWNER_IDX = 0;
const SCENARIO_SEEKER_IDX = 1;

const SCENARIO_OWNER = TEST_USERS[SCENARIO_OWNER_IDX];
const SCENARIO_SEEKER = TEST_USERS[SCENARIO_SEEKER_IDX];

// Match flow positions in Long Beach
const SPOT_LOCATION = { lat: 33.7655, lng: -118.1862 };  // Downtown Long Beach
const SEEKER_START = { lat: 33.7700, lng: -118.1937 };  // ~500m away

export function MatchScenario() {
  const supabase = useRef(createBrowserClient());
  const [running, setRunning] = useState(false);
  const [runningStep, setRunningStep] = useState<string | null>(null);
  const [log, setLog] = useState<{ time: string; text: string; type: "step" | "voice" | "match" | "error" }[]>([]);
  const device1Ref = useRef<SimulatedDevice | null>(null);
  const device2Ref = useRef<SimulatedDevice | null>(null);
  const abortRef = useRef(false);

  const addLog = useCallback((text: string, type: "step" | "voice" | "match" | "error") => {
    setLog(prev => [...prev, { time: new Date().toLocaleTimeString(), text, type }]);
  }, []);

  const sleep = useCallback((ms: number) => new Promise<void>(r => {
    const check = setInterval(() => {
      if (abortRef.current) { clearInterval(check); r(); }
    }, 100);
    setTimeout(() => { clearInterval(check); r(); }, ms);
  }), []);

  useEffect(() => {
    return () => { stopSpeech(); };
  }, []);

  const startScenario = useCallback(async () => {
    if (running) return;
    abortRef.current = false;
    setLog([]);
    setRunning(true);

    const client = supabase.current;

    // Initialize devices
    const d1 = new SimulatedDevice(client, SCENARIO_OWNER.id);
    const d2 = new SimulatedDevice(client, SCENARIO_SEEKER.id);
    device1Ref.current = d1;
    device2Ref.current = d2;

    d1.startAutoBroadcast(AUTO_BROADCAST_INTERVAL_MS);
    d2.startAutoBroadcast(AUTO_BROADCAST_INTERVAL_MS);

    try {
      // Phase 1: Position devices
      setRunningStep("Positioning devices…");
      addLog(`Placing ${SCENARIO_OWNER.label} (owner) at parking spot`, "step");
      d1.setPosition(SPOT_LOCATION.lat, SPOT_LOCATION.lng, 0, 0);
      await d1.broadcast();

      addLog(`Placing ${SCENARIO_SEEKER.label} (driver) nearby`, "step");
      d2.setPosition(SEEKER_START.lat, SEEKER_START.lng, 0, 0);
      await d2.broadcast();

      setRunningStep("Waiting for GPS lock…");
      await sleep(2000);

      // Phase 2: Owner creates a parking spot
      setRunningStep("Owner posts parking spot…");
      addLog("Owner creating parking spot in DB", "match");

      const { error: spotError } = await client
        .from("parking_spots" as any)
        .insert({
          user_id: SCENARIO_OWNER.id,
          latitude: SPOT_LOCATION.lat,
          longitude: SPOT_LOCATION.lng,
          address: "Downtown Long Beach — Pine Ave",
          vehicle_type: "sedan",
        } as any);

      if (spotError) {
        addLog(`Spot creation: ${spotError.message}`, "error");
      } else {
        addLog("Parking spot created ✓", "match");
      }

      // Notify owner that they're about to leave
      await client
        .from("notifications" as any)
        .insert({
          user_id: SCENARIO_OWNER.id,
          title: "You're about to leave!",
          message: "Post your spot so a driver can claim it.",
          type: "departure_reminder",
        } as any);

      await sleep(1500);

      // Phase 3: Seeker starts driving toward area
      setRunningStep("Driver heading toward spot area…");
      addLog("Driver starting route toward spot", "step");
      speak("Navigating to available parking spot. Head southeast on Pine Avenue.");

      // Create a route for the seeker toward the spot
      const approachRoute = [
        { lat: SEEKER_START.lat, lng: SEEKER_START.lng, speed: 0, name: "Starting point" },
        { lat: 33.7690, lng: -118.1910, speed: 11.2, name: "Heading south" },
        { lat: 33.7680, lng: -118.1895, speed: 11.2, name: "Approaching downtown" },
        { lat: 33.7670, lng: -118.1880, speed: 8.9, name: "Slowing down" },
        { lat: 33.7662, lng: -118.1870, speed: 6.7, name: "Near spot area" },
        { lat: 33.7658, lng: -118.1865, speed: 4.5, name: "Almost there" },
        { lat: SPOT_LOCATION.lat, lng: SPOT_LOCATION.lng, speed: 0, name: "Arrived" },
      ];

      d2.loadRoute(approachRoute);
      d2.startPlayback(4); // 4x speed

      // Phase 4: Simulate match notifications
      setRunningStep("Match being created…");
      await sleep(3000);

      addLog("Match found! Notifying both users…", "match");
      speak("Match found. A driver is heading to your spot.");

      await client
        .from("notifications" as any)
        .insert({
          user_id: SCENARIO_SEEKER.id,
          title: "Spot Found!",
          message: `A spot on Pine Ave is available. ETA: ~2 minutes. Tap to accept.`,
          type: "match_found",
        } as any);

      await sleep(1000);

      await client
        .from("notifications" as any)
        .insert({
          user_id: SCENARIO_OWNER.id,
          title: "Driver En Route!",
          message: `${SCENARIO_SEEKER.label} is heading to your spot on Pine Ave. ETA: ~2 min.`,
          type: "driver_en_route",
        } as any);

      await sleep(2000);

      // Phase 5: Seeker confirms match
      setRunningStep("Driver confirming match…");
      addLog("Driver accepts the match ✓", "match");
      speak("Match confirmed. Proceeding to spot.");

      await client
        .from("notifications" as any)
        .insert({
          user_id: SCENARIO_SEEKER.id,
          title: "Match Confirmed!",
          message: "You're on your way. Navigate to Pine Ave & 6th St.",
          type: "match_confirmed",
        } as any);

      await sleep(1500);

      // Phase 6: Owner confirms and departs
      setRunningStep("Owner departing…");
      addLog("Owner confirms and leaves the spot", "match");

      await client
        .from("notifications" as any)
        .insert({
          user_id: SCENARIO_OWNER.id,
          title: "Spot Claimed!",
          message: "Head out — your spot is claimed. Thanks for sharing!",
          type: "spot_claimed",
        } as any);

      await sleep(2000);

      // Phase 7: Seeker is en route with voice nav
      setRunningStep("Driver en route — voice navigation active…");

      addLog("Voice: Turn right onto Pine Avenue", "voice");
      speak("In 500 feet, turn right onto Pine Avenue.");
      await sleep(4000);

      addLog("Voice: Continue straight for 0.3 miles", "voice");
      speak("Continue straight on Pine Avenue for about 0.3 miles.");
      await sleep(4000);

      addLog("Voice: Destination is ahead on the right", "voice");
      speak("Your destination is ahead on the right.");
      await sleep(3000);

      addLog("Voice: You have arrived", "voice");
      speak("You have arrived at the parking spot.");

      // Phase 8: Seeker arrives
      setRunningStep("Driver arriving at spot…");
      await sleep(2000);

      addLog("Driver arrived at spot ✓", "match");
      speak("Arrived. The spot is all yours.");

      await client
        .from("notifications" as any)
        .insert({
          user_id: SCENARIO_SEEKER.id,
          title: "You've Arrived!",
          message: "The owner has left. The spot is ready for you.",
          type: "arrived",
        } as any);

      await client
        .from("notifications" as any)
        .insert({
          user_id: SCENARIO_OWNER.id,
          title: "Driver Arrived!",
          message: "The driver has reached the spot. Handoff complete!",
          type: "handoff_complete",
        } as any);

      await sleep(1500);

      // Phase 9: Complete
      setRunningStep("Match complete!");
      addLog("Match completed successfully! ✓", "match");
      speak("Parking handoff complete. Great teamwork!");

      d2.stopPlayback();

    } catch (err: any) {
      addLog(`Error: ${err?.message || "Unknown error"}`, "error");
    } finally {
      setRunning(false);
      setRunningStep(null);
    }
  }, [running, addLog, sleep]);

  const stopScenario = useCallback(() => {
    abortRef.current = true;
    stopSpeech();
    device1Ref.current?.stopAutoBroadcast();
    device1Ref.current?.stopPlayback();
    device1Ref.current?.destroy();
    device2Ref.current?.stopAutoBroadcast();
    device2Ref.current?.stopPlayback();
    device2Ref.current?.destroy();
    device1Ref.current = null;
    device2Ref.current = null;
    setRunning(false);
    setRunningStep(null);
    addLog("Scenario stopped by user", "step");
  }, [addLog]);

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Control panel */}
      <div className="lg:w-96 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
            <Navigation size={16} className="text-blue-600" />
            Match Scenario
          </h3>

          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
            Simulates a full parking handoff: one user leaves a spot, another driver claims it via match, navigates there, and completes the handoff. Voice navigation is spoken aloud.
          </p>

          {/* Run/Stop */}
          <div className="flex gap-2">
            {running ? (
              <button
                onClick={stopScenario}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                <Square size={16} /> Stop Scenario
              </button>
            ) : (
              <button
                onClick={startScenario}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30"
              >
                <Play size={16} /> Run Match Scenario
              </button>
            )}
          </div>

          {/* Status */}
          {runningStep && (
            <div className="mt-3 flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-2.5">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{runningStep}</span>
            </div>
          )}
        </div>

        {/* Scenario legend */}
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-[10px] font-medium">{SCENARIO_OWNER.label}</span>
            </div>
            <span className="text-[10px] text-zinc-400">— leaving spot (Owner)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-[10px] font-medium">{SCENARIO_SEEKER.label}</span>
            </div>
            <span className="text-[10px] text-zinc-400">— looking for spot (Driver)</span>
          </div>
        </div>

        {/* Event log */}
        <div className="p-3">
          <h4 className="text-[10px] font-bold text-zinc-400 uppercase mb-2">Event Log</h4>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {log.length === 0 && (
              <p className="text-[10px] text-zinc-400 text-center py-4">Run a scenario to see events</p>
            )}
            {log.map((entry, i) => (
              <div key={i} className={`flex items-start gap-1.5 text-[10px] py-1 px-2 rounded ${
                entry.type === "error" ? "bg-red-50 dark:bg-red-900/20 text-red-600" :
                entry.type === "match" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300" :
                entry.type === "voice" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" :
                "text-zinc-600 dark:text-zinc-400"
              }`}>
                <span className="text-zinc-400 w-14 shrink-0">[{entry.time}]</span>
                {entry.type === "voice" && <Volume2 size={10} className="mt-0.5 shrink-0 text-blue-500" />}
                {entry.type === "match" && <MapPin size={10} className="mt-0.5 shrink-0 text-emerald-500" />}
                <span>{entry.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dual Phone View */}
      <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2">
          <Smartphone size={16} className="text-blue-600" />
          <span className="text-sm font-bold">Live Phone Screens</span>
          <span className="text-[10px] text-zinc-400">
            — {SCENARIO_OWNER.label} (Owner) · {SCENARIO_SEEKER.label} (Driver)
          </span>
          {running && (
            <span className="ml-auto flex items-center gap-1.5 text-emerald-600 text-[10px] font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Scenario Running
            </span>
          )}
        </div>
        <DualPhoneView running={running} />
      </div>
    </div>
  );
}
