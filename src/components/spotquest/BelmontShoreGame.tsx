"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Trophy, RotateCcw, Navigation, Clock, Car, MapPin, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { VehicleType, PerfectParkResult } from "@/lib/spotquest/types";
import { VEHICLE_TYPES } from "@/lib/spotquest/types";

interface BelmontShoreGameProps {
  onComplete: (score: number) => Promise<PerfectParkResult | null>;
  onClose: () => void;
  playerVehicleType: VehicleType | null;
  onSetVehicleType: (type: VehicleType) => void;
}

type GameState = "setup" | "playing" | "navigating" | "result";

interface ParkedCar {
  id: number;
  type: VehicleType;
  street: string;
  x: number;
  y: number;
  departureTime: number;
  icon: string;
  color: string;
  direction: "horizontal" | "vertical";
}

interface GameState2 {
  score: number;
  matches: number;
  missed: number;
  lastMatch: string | null;
}

const STREETS_H = ["Ocean Ave", "Livingston Dr", "Bay Shore Ave", "E 2nd St", "E 1st St", "Seal Beach Blvd"];
const STREETS_V = ["Harbor", "Granada", "Park", "Catalina", "Alameda", "Mira", "Cordova", "St Joseph", "Laurel", "Junipero"];

const CAR_COLORS: Record<VehicleType, string> = {
  sedan: "#3b82f6",
  suv: "#8b5cf6",
  truck: "#f59e0b",
  compact: "#10b981",
  motorcycle: "#ef4444",
  van: "#6366f1",
};

const CAR_ICONS: Record<VehicleType, string> = {
  sedan: "🚗",
  suv: "🚙",
  truck: "🛻",
  compact: "🚘",
  motorcycle: "🏍️",
  van: "🚐",
};

function generateCars(): ParkedCar[] {
  const cars: ParkedCar[] = [];
  const types: VehicleType[] = ["sedan", "suv", "truck", "compact", "motorcycle", "van"];
  let id = 0;

  for (let i = 0; i < 14; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const isHorizontal = Math.random() > 0.4;
    const street = isHorizontal
      ? STREETS_H[Math.floor(Math.random() * STREETS_H.length)]
      : STREETS_V[Math.floor(Math.random() * STREETS_V.length)];

    const departureTime = 20 + Math.floor(Math.random() * 50);

    cars.push({
      id: id++,
      type,
      street,
      x: 8 + Math.floor(Math.random() * 84),
      y: 5 + Math.floor(Math.random() * 80),
      departureTime,
      icon: CAR_ICONS[type],
      color: CAR_COLORS[type],
      direction: isHorizontal ? "horizontal" : "vertical",
    });
  }

  return cars;
}

export function BelmontShoreGame({ onComplete, onClose, playerVehicleType, onSetVehicleType }: BelmontShoreGameProps) {
  const [gameState, setGameState] = useState<GameState>(playerVehicleType ? "playing" : "setup");
  const [cars, setCars] = useState<ParkedCar[]>([]);
  const [selectedCar, setSelectedCar] = useState<ParkedCar | null>(null);
  const [timers, setTimers] = useState<Record<number, number>>({});
  const [playerX, setPlayerX] = useState(50);
  const [playerY, setPlayerY] = useState(50);
  const [targetCar, setTargetCar] = useState<ParkedCar | null>(null);
  const [navigateTimer, setNavigateTimer] = useState(0);
  const [result, setResult] = useState<GameState2 | null>(null);
  const [perfectResult, setPerfectResult] = useState<PerfectParkResult | null>(null);
  const [gameTime, setGameTime] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = useCallback(() => {
    const newCars = generateCars();
    setCars(newCars);
    const initialTimers: Record<number, number> = {};
    newCars.forEach((c) => { initialTimers[c.id] = c.departureTime; });
    setTimers(initialTimers);
    setPlayerX(50);
    setPlayerY(50);
    setSelectedCar(null);
    setTargetCar(null);
    setNavigateTimer(0);
    setGameTime(0);
    setMatchCount(0);
    setResult(null);
    setPerfectResult(null);
    setGameState("playing");
  }, []);

  useEffect(() => {
    if (gameState === "setup" || gameState === "result") return;

    timerRef.current = setInterval(() => {
      setTimers((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          const id = Number(k);
          if (next[id] > 0) next[id] -= 1;
        });
        return next;
      });
    }, 1000);

    gameTimerRef.current = setInterval(() => {
      setGameTime((t) => t + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState !== "navigating" || !targetCar) return;
    if (navigateTimer <= 0) return;

    const interval = setInterval(() => {
      setNavigateTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setGameState("playing");
          setTargetCar(null);
          setResult((prev) => ({
            score: prev?.score ?? 0,
            matches: prev?.matches ?? 0,
            missed: (prev?.missed ?? 0) + 1,
            lastMatch: "Too slow! Car departed.",
          }));
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, targetCar, navigateTimer]);

  const handleCarTap = useCallback((car: ParkedCar) => {
    if (gameState !== "playing") return;
    if ((timers[car.id] ?? 0) <= 0) return;
    setSelectedCar(car);
  }, [gameState, timers]);

  const handleInitiateMatch = useCallback(() => {
    if (!selectedCar || !playerVehicleType) return;
    if (selectedCar.type !== playerVehicleType) return;

    setSelectedCar(null);
    setTargetCar(selectedCar);
    setNavigateTimer(Math.min(timers[selectedCar.id] ?? 30, 30));
    setGameState("navigating");
  }, [selectedCar, playerVehicleType, timers]);

  const handleReachSpot = useCallback(async () => {
    if (!targetCar) return;
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    const timeBonus = navigateTimer >= 10 ? 25 : navigateTimer >= 5 ? 15 : 5;
    const newMatchCount = matchCount + 1;
    const baseScore = 30;
    const totalScore = Math.min(100, baseScore + timeBonus + (newMatchCount - 1) * 10);

    setMatchCount(newMatchCount);
    setResult({
      score: totalScore,
      matches: newMatchCount,
      missed: 0,
      lastMatch: `Matched ${targetCar.icon} ${VEHICLE_TYPES.find(v => v.value === targetCar.type)?.label} on ${targetCar.street}!`,
    });
    setGameState("result");

    const finalScore = Math.min(100, totalScore);
    const res = await onComplete(finalScore);
    setPerfectResult(res);
  }, [targetCar, navigateTimer, matchCount, onComplete]);

  const movePlayer = useCallback((dx: number, dy: number) => {
    setPlayerX((x) => Math.max(2, Math.min(98, x + dx)));
    setPlayerY((y) => Math.max(2, Math.min(98, y + dy)));
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState !== "navigating") return;
      switch (e.key) {
        case "ArrowUp": case "w": movePlayer(0, -3); break;
        case "ArrowDown": case "s": movePlayer(0, 3); break;
        case "ArrowLeft": case "a": movePlayer(-3, 0); break;
        case "ArrowRight": case "d": movePlayer(3, 0); break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, movePlayer]);

  return (
    <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="text-xl">🅿️</span> Belmont Shore
          </h2>
          <div className="flex items-center gap-2">
            {gameState === "playing" && (
              <span className="text-xs font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                {Math.floor(gameTime / 60)}:{String(gameTime % 60).padStart(2, "0")}
              </span>
            )}
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Setup: Choose vehicle type */}
          {gameState === "setup" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-5xl mb-3">🚗</div>
                <h3 className="text-xl font-bold mb-1">Choose Your Vehicle</h3>
                <p className="text-sm text-zinc-500">
                  Select your vehicle type. You&apos;ll need to find matching vehicles leaving their parking spots on the streets of Belmont Shore.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {VEHICLE_TYPES.map((vt) => (
                  <button
                    key={vt.value}
                    onClick={() => onSetVehicleType(vt.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition ${
                      playerVehicleType === vt.value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                    }`}
                  >
                    <span className="text-2xl">{vt.icon}</span>
                    <span className="text-[10px] font-bold">{vt.label}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={startGame}
                disabled={!playerVehicleType}
                className="w-full h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-zinc-300 disabled:to-zinc-300 dark:disabled:from-zinc-700 dark:disabled:to-zinc-700 text-white font-bold text-sm transition-all disabled:cursor-not-allowed"
              >
                Start Scouting
              </button>
            </div>
          )}

          {/* Playing: Map view */}
          {(gameState === "playing" || gameState === "navigating") && (
            <div className="space-y-3">
              {/* Score bar */}
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-green-600 dark:text-green-400">Matches: {matchCount}</span>
                <span className="text-zinc-400">
                  Your vehicle: {playerVehicleType && CAR_ICONS[playerVehicleType]} {VEHICLE_TYPES.find(v => v.value === playerVehicleType)?.label}
                </span>
              </div>

              {/* Map */}
              <div className="relative bg-zinc-100 dark:bg-zinc-800 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700"
                style={{ height: 280 }}
              >
                {/* Streets grid */}
                {STREETS_H.map((name, i) => (
                  <div key={name} className="absolute left-0 right-0" style={{ top: `${5 + i * 16}%` }}>
                    <div className="h-2 bg-zinc-300 dark:bg-zinc-600/80 rounded" />
                    <span className="absolute -top-3.5 left-1 text-[7px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      {name}
                    </span>
                  </div>
                ))}
                {STREETS_V.slice(0, 6).map((name, i) => (
                  <div key={name} className="absolute top-0 bottom-0" style={{ left: `${10 + i * 16}%` }}>
                    <div className="w-1.5 h-full bg-zinc-300 dark:bg-zinc-600/80 rounded" />
                    <span className="absolute top-0.5 left-2 text-[7px] font-bold text-zinc-400 dark:text-zinc-500 rotate-90 origin-left uppercase tracking-wider">
                      {name}
                    </span>
                  </div>
                ))}

                {/* Cars */}
                {cars.map((car) => {
                  const remaining = timers[car.id] ?? 0;
                  if (remaining <= 0) return null;
                  const isTarget = targetCar?.id === car.id;
                  const isMatch = car.type === playerVehicleType;

                  return (
                    <button
                      key={car.id}
                      onClick={() => handleCarTap(car)}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all ${
                        isTarget ? "scale-125 z-20" : "z-10 hover:scale-110"
                      }`}
                      style={{ left: `${car.x}%`, top: `${car.y}%` }}
                    >
                      <div className={`relative ${isTarget ? "animate-pulse" : ""}`}>
                        <span className="text-xl">{car.icon}</span>
                        {isMatch && remaining > 0 && (
                          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" />
                        )}
                        <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 text-[6px] font-bold px-1 rounded ${
                          remaining <= 10 ? "bg-red-500 text-white" : remaining <= 20 ? "bg-amber-500 text-white" : "bg-white/80 dark:bg-zinc-900/80 text-zinc-600"
                        }`}>
                          {remaining}s
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Player marker */}
                <div
                  className="absolute z-30 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-150"
                  style={{ left: `${playerX}%`, top: `${playerY}%` }}
                >
                  <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg">
                    <div className="w-full h-full rounded-full bg-blue-400 animate-ping opacity-50" />
                  </div>
                </div>

                {/* Navigate indicator */}
                {gameState === "navigating" && targetCar && (
                  <div className="absolute top-2 left-2 right-2 z-30 bg-blue-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Navigation size={12} /> Navigate to {targetCar.icon}!
                    </span>
                    <span className={`font-mono ${navigateTimer <= 10 ? "text-red-300" : ""}`}>
                      {navigateTimer}s
                    </span>
                  </div>
                )}

                {/* No match message */}
                {result?.lastMatch && gameState === "playing" && (
                  <div className="absolute bottom-2 left-2 right-2 z-30 bg-zinc-900/80 text-white text-xs font-bold px-3 py-1.5 rounded-full text-center">
                    {result.lastMatch}
                  </div>
                )}
              </div>

              {/* Navigation controls */}
              {gameState === "navigating" && (
                <div className="flex justify-center">
                  <div className="grid grid-cols-3 gap-1 w-28">
                    <div />
                    <button onClick={() => movePlayer(0, -5)} className="h-10 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center active:scale-95 transition">
                      <ChevronUp size={18} />
                    </button>
                    <div />
                    <button onClick={() => movePlayer(-5, 0)} className="h-10 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center active:scale-95 transition">
                      <ChevronLeft size={18} />
                    </button>
                    <button onClick={handleReachSpot} className="h-10 rounded-lg bg-green-600 text-white flex items-center justify-center active:scale-95 transition font-bold text-[10px]">
                      PARK!
                    </button>
                    <button onClick={() => movePlayer(5, 0)} className="h-10 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center active:scale-95 transition">
                      <ChevronRight size={18} />
                    </button>
                    <div />
                    <button onClick={() => movePlayer(0, 5)} className="h-10 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center active:scale-95 transition">
                      <ChevronDown size={18} />
                    </button>
                    <div />
                  </div>
                </div>
              )}

              {/* Legend */}
              {gameState === "playing" && (
                <div className="flex items-center justify-center gap-3 text-[9px] text-zinc-400">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" /> = matches your type
                  </span>
                  <span>Tap a car to inspect</span>
                </div>
              )}
            </div>
          )}

          {/* Car detail popup */}
          {selectedCar && gameState === "playing" && (
            <div className="fixed inset-0 z-[95] bg-black/40 flex items-center justify-center p-4" onClick={() => setSelectedCar(null)}>
              <div
                className="bg-white dark:bg-zinc-900 rounded-2xl p-5 w-full max-w-xs shadow-2xl border border-zinc-200 dark:border-zinc-800"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center space-y-3">
                  <span className="text-4xl">{selectedCar.icon}</span>
                  <div>
                    <p className="font-bold text-sm">{VEHICLE_TYPES.find(v => v.value === selectedCar.type)?.label}</p>
                    <p className="text-xs text-zinc-500">on {selectedCar.street}</p>
                  </div>

                  <div className="flex items-center justify-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-zinc-400" />
                      <span className={`font-bold ${(timers[selectedCar.id] ?? 0) <= 10 ? "text-red-500" : "text-zinc-600 dark:text-zinc-300"}`}>
                        {timers[selectedCar.id] ?? 0}s
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin size={12} className="text-zinc-400" />
                      <span className="text-zinc-600 dark:text-zinc-300">
                        {Math.round(Math.sqrt(Math.pow(selectedCar.x - playerX, 2) + Math.pow(selectedCar.y - playerY, 2)))} units
                      </span>
                    </div>
                  </div>

                  {selectedCar.type === playerVehicleType ? (
                    <div className="space-y-2">
                      <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold py-1.5 rounded-lg">
                        Matches your vehicle!
                      </div>
                      <button
                        onClick={handleInitiateMatch}
                        className="w-full h-10 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition"
                      >
                        <Car size={16} />
                        Initiate Match
                      </button>
                    </div>
                  ) : (
                    <div className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-bold py-1.5 rounded-lg">
                      Different vehicle type — skip this one
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedCar(null)}
                    className="w-full h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold text-xs transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Result */}
          {gameState === "result" && (
            <div className="text-center space-y-4">
              <div className="text-6xl mb-2 animate-bounce-slow">🎉</div>

              <div className="text-5xl font-black text-green-500">
                {result?.score ?? 0}%
              </div>

              <p className="text-lg font-bold text-green-500">
                {(result?.score ?? 0) >= 80 ? "Perfect Handoff!" : (result?.score ?? 0) >= 60 ? "Nice Match!" : "Good Try!"}
              </p>

              {result?.lastMatch && (
                <p className="text-xs text-zinc-500">{result.lastMatch}</p>
              )}

              {perfectResult && (
                <div className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-full">
                  <Trophy size={16} className="text-amber-500" />
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    +{perfectResult.xp_awarded} XP
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={startGame}
                  className="flex-1 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                >
                  <RotateCcw size={16} />
                  Play Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
