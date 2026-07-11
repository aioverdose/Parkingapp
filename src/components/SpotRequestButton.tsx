"use client";

import { useState } from "react";
import { createSpotRequest } from "@/actions/social";
import { Loader2, Search } from "lucide-react";

interface SpotRequestButtonProps {
  userId: string;
  latitude: number;
  longitude: number;
  vehicleType?: string | null;
}

export function SpotRequestButton({ userId, latitude, longitude, vehicleType }: SpotRequestButtonProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = async () => {
    if (sent) return;
    setSending(true);
    setError(null);

    const result = await createSpotRequest(userId, latitude, longitude, vehicleType);
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
        onClick={handleRequest}
        disabled={sending || sent}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition w-full justify-center ${
          sent
            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
            : "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30"
        } disabled:cursor-not-allowed`}
      >
        {sending ? (
          <Loader2 size={18} className="animate-spin" />
        ) : sent ? (
          <>
            <Search size={18} />
            Looking!
          </>
        ) : (
          <>
            <Search size={18} />
            I&apos;m Looking for a Spot
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
