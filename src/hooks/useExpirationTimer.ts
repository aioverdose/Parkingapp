"use client";

import { useState, useEffect } from "react";

export function useExpirationTimer(expiresAt: string | null) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);
  const [fraction, setFraction] = useState(1);

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft("");
      setIsExpired(false);
      return;
    }

    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("Expired");
        setFraction(0);
        return;
      }

      const total = 15 * 60 * 1000;
      const remaining = Math.max(diff, 0);
      setFraction(Math.min(remaining / total, 1));

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return { timeLeft, isExpired, fraction };
}
