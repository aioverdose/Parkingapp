"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { X, Trophy, RotateCcw, Navigation, Clock, Car, MapPin, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
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

interface Hydrant {
  id: number;
  x: number;
  y: number;
}

interface RedZone {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

interface GameState2 {
  score: number;
  matches: number;
  missed: number;
  lastMatch: string | null;
}

const STREETS_H = ["Ocean Ave", "Livingston Dr", "Bay Shore Ave", "E 2nd St", "E 1st St", "Seal Beach Blvd"];
const STREETS_V = ["Harbor", "Granada", "Park", "Catalina", "Alameda", "Mira", "Cordova", "St Joseph", "Laurel", "Junipero"];

const CAR_ICONS: Record<VehicleType, string> = {
  sedan: "🚗",
  suv: "🚙",
  truck: "🛻",
  compact: "🚘",
  motorcycle: "🏍️",
  van: "🚐",
};

const RED_ZONE_LABELS = [
  "No Parking – Fire Lane",
  "No Parking – Loading Zone",
  "No Parking – Hydrant Zone",
  "No Parking – Crosswalk",
  "Tow Away Zone",
  "No Parking – Driveway",
];

function isInsideRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

function rectsOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function generateMapElements() {
  const redZones: RedZone[] = [];
  let rzId = 0;

  const rzCount = 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < rzCount; i++) {
    const w = 8 + Math.floor(Math.random() * 8);
    const h = 6 + Math.floor(Math.random() * 6);
    let x: number, y: number;
    let attempts = 0;
    do {
      x = 5 + Math.floor(Math.random() * 80);
      y = 3 + Math.floor(Math.random() * 80);
      attempts++;
    } while (
      attempts < 50 &&
      redZones.some((rz) => rectsOverlap(x, y, w, h, rz.x, rz.y, rz.w, rz.h))
    );
    redZones.push({
      id: rzId++,
      x,
      y,
      w,
      h,
      label: RED_ZONE_LABELS[Math.floor(Math.random() * RED_ZONE_LABELS.length)],
    });
  }

  const hydrants: Hydrant[] = [];
  let hId = 0;
  const hydrantCount = 6 + Math.floor(Math.random() * 4);
  for (let i = 0; i < hydrantCount; i++) {
    let x: number, y: number;
    let attempts = 0;
    do {
      x = 5 + Math.floor(Math.random() * 88);
      y = 3 + Math.floor(Math.random() * 85);
      attempts++;
    } while (
      attempts < 50 &&
      redZones.some((rz) => isInsideRect(x, y, rz.x, rz.y, rz.w, rz.h))
    );
    hydrants.push({ id: hId++, x, y });
  }

  return { redZones, hydrants };
}

function generateCars(redZones: RedZone[]): ParkedCar[] {
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

    let x: number, y: number;
    let attempts = 0;
    do {
      x = 8 + Math.floor(Math.random() * 84);
      y = 5 + Math.floor(Math.random() * 80);
      attempts++;
    } while (
      attempts < 50 &&
      redZones.some((rz) => isInsideRect(x, y, rz.x - 2, rz.y - 2, rz.w + 4, rz.h + 4))
    );

    cars.push({
      id: id++,
      type,
      street,
      x,
      y,
      departureTime,
      icon: CAR_ICONS[type],
      color: "var(--tw-prose-body, #18181b)",
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

  const mapElements = useMemo(() => generateMapElements(), []);

  const playerInRedZone = useMemo(() => {
    if (gameState !== "playing" && gameState !== "navigating") return false;
    return mapElements.redZones.some((rz) =>
      isInsideRect(playerX, playerY, rz.x - 1, rz.y - 1, rz.w + 2, rz.h + 2)
    );
  }, [playerX, playerY, mapElements.redZones, gameState]);

  const startGame = useCallback(() => {
    const newCars = generateCars(mapElements.redZones);
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
  }, [mapElements]);

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

  const movePlayer = useCallback((dx: number, dy: number) => {
    setPlayerX((x) => {
      const nx = Math.max(2, Math.min(98, x + dx));
      return nx;
    });
    setPlayerY((y) => {
      const ny = Math.max(2, Math.min(98, y + dy));
      return ny;
    });
  }, []);

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
    <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center">
      {/* Setup screen - centered card */}
      {gameState === "setup" && (
        <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="text-xl">🅿️</span> Belmont Shore
            </h2>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1">
              <X size={20} />
            </button>
          </div>

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
        </div>
      )}

      {/* Full-screen map */}
      {(gameState === "playing" || gameState === "navigating") && (
        <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-900 flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Top HUD bar */}
          <div className="shrink-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center justify-between z-30">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold flex items-center gap-1.5">
                <span>🅿️</span> Belmont Shore
              </h2>
              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                {Math.floor(gameTime / 60)}:{String(gameTime % 60).padStart(2, "0")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-green-600 dark:text-green-400">
                {matchCount} match{matchCount !== 1 ? "es" : ""}
              </span>
              <span className="text-[10px] text-zinc-400">
                {playerVehicleType && CAR_ICONS[playerVehicleType]} {VEHICLE_TYPES.find(v => v.value === playerVehicleType)?.label}
              </span>
              <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Map area - fills remaining space */}
          <div className="flex-1 relative overflow-hidden">
            {/* Red zones */}
            {mapElements.redZones.map((rz) => (
              <div
                key={rz.id}
                className="absolute border-2 border-dashed border-red-400/70 bg-red-400/10 rounded-sm z-[1]"
                style={{
                  left: `${rz.x}%`,
                  top: `${rz.y}%`,
                  width: `${rz.w}%`,
                  height: `${rz.h}%`,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                  <span className="text-[6px] sm:text-[7px] font-black text-red-400/60 uppercase tracking-wider whitespace-nowrap rotate-[-25deg] select-none">
                    {rz.label}
                  </span>
                </div>
                {/* Cross-hatch pattern */}
                <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
                  style={{
                    backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 3px, #ef4444 3px, #ef4444 4px), repeating-linear-gradient(-45deg, transparent, transparent 3px, #ef4444 3px, #ef4444 4px)",
                  }}
                />
              </div>
            ))}

            {/* Streets horizontal */}
            {STREETS_H.map((name, i) => (
              <div key={name} className="absolute left-0 right-0 z-[2]" style={{ top: `${5 + i * 16}%` }}>
                <div className="h-2.5 bg-zinc-300 dark:bg-zinc-600/80 rounded" />
                <span className="absolute -top-4 left-1 text-[7px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider select-none">
                  {name}
                </span>
              </div>
            ))}

            {/* Streets vertical */}
            {STREETS_V.slice(0, 6).map((name, i) => (
              <div key={name} className="absolute top-0 bottom-0 z-[2]" style={{ left: `${10 + i * 16}%` }}>
                <div className="w-1.5 h-full bg-zinc-300 dark:bg-zinc-600/80 rounded" />
                <span className="absolute top-0.5 left-2 text-[7px] font-bold text-zinc-400 dark:text-zinc-500 rotate-90 origin-left uppercase tracking-wider select-none">
                  {name}
                </span>
              </div>
            ))}

            {/* Fire hydrants */}
            {mapElements.hydrants.map((h) => (
              <div
                key={h.id}
                className="absolute z-[4] transform -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none"
                style={{ left: `${h.x}%`, top: `${h.y}%` }}
                title="Fire hydrant – no parking within 15ft"
              >
                <span className="text-sm drop-shadow-md">🧯</span>
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
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all z-[5] ${
                    isTarget ? "scale-125 z-[15]" : "hover:scale-110"
                  }`}
                  style={{ left: `${car.x}%`, top: `${car.y}%` }}
                >
                  <div className={`relative ${isTarget ? "animate-pulse" : ""}`}>
                    <span className="text-lg sm:text-xl">{car.icon}</span>
                    {isMatch && remaining > 0 && (
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white shadow" />
                    )}
                    <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[6px] font-bold px-1 rounded whitespace-nowrap ${
                      remaining <= 10 ? "bg-red-500 text-white" : remaining <= 20 ? "bg-amber-500 text-white" : "bg-white/90 dark:bg-zinc-900/90 text-zinc-600"
                    }`}>
                      {remaining}s
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Player marker */}
            <div
              className="absolute z-[20] transform -translate-x-1/2 -translate-y-1/2 transition-all duration-150 pointer-events-none"
              style={{ left: `${playerX}%`, top: `${playerY}%` }}
            >
              <div className={`w-5 h-5 rounded-full border-2 border-white shadow-lg ${playerInRedZone ? "bg-red-500" : "bg-blue-600"}`}>
                <div className={`w-full h-full rounded-full animate-ping opacity-50 ${playerInRedZone ? "bg-red-400" : "bg-blue-400"}`} />
              </div>
              {playerInRedZone && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-500 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full shadow flex items-center gap-0.5">
                  <AlertTriangle size={8} /> No Parking!
                </div>
              )}
            </div>

            {/* Navigate indicator */}
            {gameState === "navigating" && targetCar && (
              <div className="absolute top-2 left-2 right-2 z-[25] bg-blue-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center justify-between shadow-lg">
                <span className="flex items-center gap-1">
                  <Navigation size={12} /> Navigate to {targetCar.icon}!
                </span>
                <span className={`font-mono ${navigateTimer <= 10 ? "text-red-300" : ""}`}>
                  {navigateTimer}s
                </span>
              </div>
            )}

            {/* Toast messages */}
            {result?.lastMatch && gameState === "playing" && (
              <div className="absolute bottom-2 left-2 right-2 z-[25] bg-zinc-900/80 text-white text-xs font-bold px-3 py-1.5 rounded-full text-center shadow-lg">
                {result.lastMatch}
              </div>
            )}
          </div>

          {/* Bottom controls */}
          <div className="shrink-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 z-30">
            {gameState === "navigating" ? (
              <div className="flex items-center justify-center gap-4">
                <div className="grid grid-cols-3 gap-1.5 w-32">
                  <div />
                  <button onClick={() => movePlayer(0, -5)} className="h-11 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center active:scale-95 transition shadow-sm">
                    <ChevronUp size={20} />
                  </button>
                  <div />
                  <button onClick={() => movePlayer(-5, 0)} className="h-11 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center active:scale-95 transition shadow-sm">
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={handleReachSpot} className="h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white flex items-center justify-center active:scale-95 transition font-bold text-xs shadow-md">
                    PARK!
                  </button>
                  <button onClick={() => movePlayer(5, 0)} className="h-11 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center active:scale-95 transition shadow-sm">
                    <ChevronRight size={20} />
                  </button>
                  <div />
                  <button onClick={() => movePlayer(0, 5)} className="h-11 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center active:scale-95 transition shadow-sm">
                    <ChevronDown size={20} />
                  </button>
                  <div />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-4 text-[9px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" /> matches your type
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-xs">🧯</span> hydrant = no parking
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-400/40 border border-dashed border-red-400 rounded-sm" /> red zone
                </span>
                <span>Tap a car to inspect</span>
              </div>
            )}
          </div>
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

      {/* Result screen - centered card */}
      {gameState === "result" && (
        <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="text-xl">🅿️</span> Belmont Shore
            </h2>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1">
              <X size={20} />
            </button>
          </div>

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
        </div>
      )}
    </div>
  );
}
