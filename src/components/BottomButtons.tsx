"use client";

import { Plus, Search } from "lucide-react";

interface BottomButtonsProps {
  onPostSpot: () => void;
  onLookForSpot: () => void;
  disabled: boolean;
}

export function BottomButtons({ onPostSpot, onLookForSpot, disabled }: BottomButtonsProps) {
  return (
    <div className="flex gap-3 w-full">
      <button
        onClick={onPostSpot}
        disabled={disabled}
        className="flex-1 h-14 rounded-full shadow-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-base font-bold flex items-center justify-center gap-2 transition disabled:cursor-not-allowed"
      >
        <Plus size={22} strokeWidth={3} />
        LEAVING SOON
      </button>
      <button
        onClick={onLookForSpot}
        disabled={disabled}
        className="flex-1 h-14 rounded-full shadow-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-base font-bold flex items-center justify-center gap-2 transition disabled:cursor-not-allowed"
      >
        <Search size={22} strokeWidth={3} />
        LOOK FOR SPOT
      </button>
    </div>
  );
}
