"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, Zap, Target, Flame, Trophy } from "lucide-react";

interface OnboardingTutorialProps {
  onComplete: () => void;
}

const STEPS = [
  {
    icon: <Zap size={32} className="text-amber-500" />,
    title: "Welcome to SpotQuest!",
    description: "Turn your parking handoffs into XP, level up, and earn badges. It's the fun way to help your community.",
    color: "from-blue-500 to-purple-600",
  },
  {
    icon: <Target size={32} className="text-green-500" />,
    title: "Earn XP Every Handoff",
    description: "Complete a handoff to earn base XP. Get bonuses for speed, streaks, and reliability ratings!",
    color: "from-green-500 to-emerald-600",
  },
  {
    icon: <Flame size={32} className="text-orange-500" />,
    title: "Build Streaks & Complete Quests",
    description: "Daily handoffs build your streak for bonus XP. Check your quests for extra challenges and rewards.",
    color: "from-orange-500 to-red-600",
  },
  {
    icon: <Trophy size={32} className="text-amber-400" />,
    title: "Earn Badges & Compete",
    description: "Unlock achievement badges and climb the Belmont Shore leaderboard. Show off your parking skills!",
    color: "from-amber-500 to-orange-600",
  },
];

export function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden">
        {/* Top gradient */}
        <div className={`bg-gradient-to-br ${current.color} p-8 text-center`}>
          <div className="text-5xl mb-3 animate-bounce-slow">{current.icon}</div>
          <div className="flex gap-1.5 justify-center mt-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === step ? "bg-white w-6" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold mb-2">{current.title}</h2>
          <p className="text-sm text-zinc-500 leading-relaxed">{current.description}</p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between p-4 border-t border-zinc-200 dark:border-zinc-800">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 font-bold"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="text-sm text-zinc-400 hover:text-zinc-600 font-bold"
            >
              Skip
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1 h-10 px-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition"
            >
              Next
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="flex items-center gap-1 h-10 px-6 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-sm transition"
            >
              Let&apos;s Go!
              <Zap size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
