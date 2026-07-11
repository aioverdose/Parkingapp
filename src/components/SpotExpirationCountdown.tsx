"use client";

import { useState, useEffect } from "react";
import { Clock, X, AlertTriangle } from "lucide-react";

interface SpotExpirationCountdownProps {
  expiresAt: string | null;
  onExpired: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

export function SpotExpirationCountdown({ expiresAt, onExpired, onCancel, showCancel }: SpotExpirationCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;

    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setExpired(true);
        setTimeLeft("Expired");
        onExpired();
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  if (!expiresAt) return null;

  if (expired) {
    return (
      <div className="flex items-center gap-2 text-red-500 text-xs font-bold">
        <AlertTriangle size={12} />
        Spot expired
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-bold">
        <Clock size={12} />
        Expires in {timeLeft}
      </div>
      {showCancel && onCancel && (
        <button
          onClick={onCancel}
          className="text-zinc-400 hover:text-red-500 transition"
          title="Cancel this alert"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
