"use client";

import { useEffect, useState } from "react";
import { getLevelTier } from "@/lib/spotquest/game-logic";
import { ArrowUp } from "lucide-react";

interface LevelUpAnimationProps {
  newLevel: number;
  onDismiss: () => void;
}

export function LevelUpAnimation({ newLevel, onDismiss }: LevelUpAnimationProps) {
  const [visible, setVisible] = useState(false);
  const tier = getLevelTier(newLevel);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      onClick={onDismiss}
    >
      <div
        className={`bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-3xl shadow-2xl border border-zinc-700 p-10 text-center max-w-xs mx-4 transform transition-all duration-500 ${visible ? "scale-100 translate-y-0" : "scale-50 translate-y-12"}`}
      >
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 animate-ping-slow" />
          </div>
          <div className="relative text-7xl">{tier.icon}</div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <ArrowUp size={18} className="text-green-400" />
          <p className="text-sm font-bold text-green-400 uppercase tracking-widest">Level Up!</p>
        </div>

        <p className="text-4xl font-black text-white mb-1">{newLevel}</p>
        <p className={`text-sm font-bold ${tier.color}`}>{tier.title}</p>

        <div className="mt-6 w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full w-0 animate-fill-right" />
        </div>
        <p className="text-[10px] text-zinc-500 mt-2">Keep going!</p>
      </div>
    </div>
  );
}
