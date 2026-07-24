"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Trophy, RotateCcw } from "lucide-react";
import { perfectParkXp } from "@/lib/spotquest/game-logic";
import type { PerfectParkResult } from "@/lib/spotquest/types";

interface PerfectParkMiniGameProps {
  onComplete: (score: number) => Promise<PerfectParkResult | null>;
  onClose: () => void;
}

type GameState = "ready" | "playing" | "result";

export function PerfectParkMiniGame({ onComplete, onClose }: PerfectParkMiniGameProps) {
  const [gameState, setGameState] = useState<GameState>("ready");
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<PerfectParkResult | null>(null);
  const [carAngle, setCarAngle] = useState(0);
  const [carX, setCarX] = useState(50);
  const [slotX] = useState(50);
  const [isPerfect, setIsPerfect] = useState(false);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const moveDirRef = useRef<1 | -1>(1);
  const speedRef = useRef(2);

  const startGame = useCallback(() => {
    setGameState("playing");
    setScore(0);
    setResult(null);
    setCarX(50);
    setCarAngle(0);
    setIsPerfect(false);
    startTimeRef.current = Date.now();
    speedRef.current = 2;

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;

      // Car moves back and forth with increasing speed
      speedRef.current = 2 + elapsed * 0.0008;
      setCarX((prev) => {
        let next = prev + moveDirRef.current * speedRef.current;
        if (next >= 95) { next = 95; moveDirRef.current = -1; }
        if (next <= 5) { next = 5; moveDirRef.current = 1; }
        return next;
      });

      // Slight rotation wobble
      setCarAngle(Math.sin(elapsed * 0.005) * 5);

      if (elapsed < 3000) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);
  }, []);

  const stopCar = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    const elapsed = Date.now() - startTimeRef.current;

    // Calculate accuracy: how close to the slot center
    const distance = Math.abs(carX - slotX);
    const maxDistance = 50;
    const accuracy = Math.max(0, 100 - (distance / maxDistance) * 100);

    // Time bonus: stopping closer to 2-3 seconds is ideal
    const timeBonus = elapsed > 1500 && elapsed < 3500 ? 10 : 0;

    const finalScore = Math.min(100, Math.round(accuracy + timeBonus));
    const perfect = finalScore >= 80;

    setScore(finalScore);
    setIsPerfect(perfect);
    setGameState("result");

    onComplete(finalScore).then(setResult);
  }, [carX, onComplete]);

  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="text-xl">🎯</span> Perfect Park
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Game Area */}
        <div className="p-6">
          {gameState === "ready" && (
            <div className="text-center space-y-4">
              <div className="text-6xl mb-2">🚗</div>
              <h3 className="text-xl font-bold">Tap to Park!</h3>
              <p className="text-sm text-zinc-500">
                Tap the screen to stop your car as close to the parking spot as possible.
                Timing is everything!
              </p>
              <button
                onClick={startGame}
                className="w-full h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-sm transition-all"
              >
                Start Challenge
              </button>
            </div>
          )}

          {gameState === "playing" && (
            <div
              className="relative h-48 bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 rounded-2xl cursor-pointer select-none overflow-hidden"
              onClick={stopCar}
            >
              {/* Road */}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-zinc-300 dark:bg-zinc-600">
                {/* Lane markings */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-dashed bg-zinc-400/50" style={{
                  backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(255,255,255,0.3) 10px, rgba(255,255,255,0.3) 20px)",
                }} />
              </div>

              {/* Parking slot indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-14 border-2 border-dashed border-green-400 rounded-lg flex items-center justify-center">
                <span className="text-xs font-bold text-green-500">P</span>
              </div>

              {/* Car */}
              <div
                className="absolute bottom-5 transition-none"
                style={{
                  left: `${carX}%`,
                  transform: `translateX(-50%) rotate(${carAngle}deg)`,
                }}
              >
                <div className="text-4xl">🚗</div>
              </div>

              {/* Timer bar */}
              <div className="absolute top-3 left-3 right-3">
                <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full"
                    style={{
                      width: `${Math.max(0, 100 - ((Date.now() - startTimeRef.current) / 3000) * 100)}%`,
                      transition: "width 0.1s linear",
                    }}
                  />
                </div>
              </div>

              {/* Instruction */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <p className="text-sm font-bold text-zinc-600/60 dark:text-zinc-300/60 animate-pulse">
                  TAP TO STOP!
                </p>
              </div>
            </div>
          )}

          {gameState === "result" && (
            <div className="text-center space-y-4">
              <div className={`text-6xl mb-2 ${isPerfect ? "animate-bounce-slow" : ""}`}>
                {isPerfect ? "🎉" : "🅿️"}
              </div>

              <div className={`text-5xl font-black ${isPerfect ? "text-green-500" : score >= 60 ? "text-blue-500" : "text-zinc-400"}`}>
                {score}%
              </div>

              <p className={`text-lg font-bold ${perfectParkXp(score).color}`}>
                {perfectParkXp(score).label}
              </p>

              {result && (
                <div className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-full">
                  <Trophy size={16} className="text-amber-500" />
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    +{result.xp_awarded} XP
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={startGame}
                  className="flex-1 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                >
                  <RotateCcw size={16} />
                  Try Again
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
