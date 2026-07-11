"use client";

import { useState } from "react";
import { createDeparturePing } from "@/actions/social";
import { Loader2, Bell, BellRing } from "lucide-react";

interface DeparturePingButtonProps {
  userId: string;
  latitude: number;
  longitude: number;
}

export function DeparturePingButton({ userId, latitude, longitude }: DeparturePingButtonProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePing = async () => {
    if (sent) return;
    setSending(true);
    setError(null);

    const result = await createDeparturePing(userId, latitude, longitude, 10);
    if (result.error) {
      setError(result.error);
      setSending(false);
      return;
    }

    setSent(true);
    setSending(false);
    setTimeout(() => setSent(false), 60_000);
  };

  return (
    <div>
      <button
        onClick={handlePing}
        disabled={sending || sent}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition w-full justify-center ${
          sent
            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
            : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30"
        } disabled:cursor-not-allowed`}
      >
        {sending ? (
          <Loader2 size={18} className="animate-spin" />
        ) : sent ? (
          <>
            <BellRing size={18} />
            Ping Sent!
          </>
        ) : (
          <>
            <Bell size={18} />
            Ping: Leaving in 10 min
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
