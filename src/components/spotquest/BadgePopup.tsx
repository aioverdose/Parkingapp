"use client";

import { useEffect, useState } from "react";
import { BADGE_TIER_STYLES } from "@/lib/spotquest/game-logic";
import type { UserBadge } from "@/lib/spotquest/types";

interface BadgePopupProps {
  badge: UserBadge;
  onDismiss: () => void;
}

export function BadgePopup({ badge, onDismiss }: BadgePopupProps) {
  const [visible, setVisible] = useState(false);
  const tierStyle = BADGE_TIER_STYLES[badge.tier] ?? BADGE_TIER_STYLES.bronze;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center pointer-events-none transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      onClick={onDismiss}
    >
      <div
        className={`pointer-events-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border-2 ${tierStyle.border} p-8 text-center max-w-xs mx-4 transform transition-all duration-500 ${visible ? "scale-100 translate-y-0" : "scale-75 translate-y-8"}`}
      >
        <div className="text-6xl mb-4 animate-bounce-slow">{badge.icon_emoji}</div>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Badge Earned!</p>
        <h3 className="text-xl font-bold mb-2">{badge.name}</h3>
        <p className="text-sm text-zinc-500 mb-3">{badge.description}</p>
        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${tierStyle.bg} ${tierStyle.text}`}>
          +{badge.xp_reward} XP
        </div>
        <p className="text-[10px] text-zinc-400 mt-4">Tap to dismiss</p>
      </div>
    </div>
  );
}
