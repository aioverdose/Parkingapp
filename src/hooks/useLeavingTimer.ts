"use client";

import { useEffect, useState } from "react";

export function useLeavingTimer(leavingAt: string | null | undefined) {
  const [remainingMs, setRemainingMs] = useState(() => {
    if (!leavingAt) return 0;
    return Math.max(0, new Date(leavingAt).getTime() - Date.now());
  });

  useEffect(() => {
    if (!leavingAt) {
      setRemainingMs(0);
      return;
    }

    const interval = window.setInterval(() => {
      const next = Math.max(0, new Date(leavingAt).getTime() - Date.now());
      setRemainingMs(next);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [leavingAt]);

  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  const formatted = `${minutes}m ${seconds.toString().padStart(2, "0")}s`;

  return {
    remainingMs,
    formatted,
    isExpired: remainingMs <= 0,
  };
}
