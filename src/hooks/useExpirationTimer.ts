"use client";

import { useState, useEffect } from "react";

export function useExpirationTimer(expiresAt: string | null) {
  const [timeLeft, setTimeLeft] = useState(() => {
    if (!expiresAt) return "";
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    return `${Math.floor(diff / 60000)}:${Math.floor((diff % 60000) / 1000).toString().padStart(2, "0")}`;
  });
  const [isExpired, setIsExpired] = useState(() =>
    Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now()),
  );
  const [fraction, setFraction] = useState(() => {
    if (!expiresAt) return 1;
    return Math.max(0, Math.min((new Date(expiresAt).getTime() - Date.now()) / (15 * 60 * 1000), 1));
  });

  useEffect(() => {
    if (!expiresAt) {
      const reset = window.setTimeout(() => {
        setTimeLeft("");
        setIsExpired(false);
        setFraction(1);
      }, 0);
      return () => window.clearTimeout(reset);
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

    const initialUpdate = window.setTimeout(update, 0);
    const interval = setInterval(update, 1000);
    return () => {
      window.clearTimeout(initialUpdate);
      clearInterval(interval);
    };
  }, [expiresAt]);

  return { timeLeft, isExpired, fraction };
}
