"use client";

import { useState, useCallback } from "react";
import { Coins, Loader2, ExternalLink } from "lucide-react";

interface Props {
  credits: number;
  onCreditsUpdated?: () => void;
  compact?: boolean;
}

export function CreditBalance({ credits, onCreditsUpdated, compact }: Props) {
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = useCallback(async (quantity: number) => {
    setPurchasing(true);
    setError(null);
    try {
      const { createBrowserClient } = await import("@/lib/supabaseClient");
      const supabase = createBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const res = await fetch("/api/purchase/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quantity }),
      });
      const data_ = await res.json();
      if (!res.ok) {
        setError(data_.error || "Purchase failed");
        setPurchasing(false);
        return;
      }
      window.location.href = data_.url;
    } catch {
      setError("Failed to initiate purchase");
      setPurchasing(false);
    }
  }, []);

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-zinc-600 dark:text-zinc-400">
        <Coins size={12} className="text-amber-500" />
        {credits}
      </span>
    );
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800 p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Coins size={16} className="text-amber-600" /> Match Credits
        </h3>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-14 h-14 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
          <span className="text-2xl font-extrabold text-amber-800 dark:text-amber-200">{credits}</span>
        </div>
        <div>
          <p className="text-sm font-bold">Credits Remaining</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Each confirmed match uses 1 credit. First 5 are free.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handlePurchase(1)}
          disabled={purchasing}
          className="flex-1 h-11 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white text-sm font-bold transition flex items-center justify-center gap-2"
        >
          {purchasing ? <Loader2 size={16} className="animate-spin" /> : <Coins size={16} />}
          {purchasing ? "Redirecting..." : "Buy 1 Credit — $5.99"}
        </button>
        <button
          onClick={() => handlePurchase(5)}
          disabled={purchasing}
          className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-bold transition flex items-center justify-center gap-2"
        >
          {purchasing ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
          {purchasing ? "Redirecting..." : "Buy 5 — $29.95"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 mt-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{error}</p>
      )}
    </div>
  );
}
