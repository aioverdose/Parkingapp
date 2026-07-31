"use client";

import { useState, useEffect } from "react";
import { Bell, X, Check, Loader2, Smartphone } from "lucide-react";
import { usePushSubscription } from "@/hooks/usePushSubscription";

interface NotificationConsentProps {
  open: boolean;
  onDismiss: () => void;
}

export function NotificationConsent({ open, onDismiss }: NotificationConsentProps) {
  const { subscribe, permission, requestPermission } = usePushSubscription();
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isSupported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

  useEffect(() => {
    if (open && (permission === "granted" || permission === "denied" || dismissed)) {
      onDismiss();
    }
  }, [open, permission, dismissed, onDismiss]);

  if (!open || !isSupported || permission === "granted" || permission === "denied" || dismissed) {
    return null;
  }

  const handleEnable = async () => {
    setLoading(true);
    try {
      await requestPermission();
    } finally {
      setLoading(false);
      setDismissed(true);
      onDismiss();
    }
  };

  const handleSkip = () => {
    setDismissed(true);
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Bell size={28} className="text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white mb-2">
            Stay Notified
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4">
            Get instant alerts when someone accepts your parking spot or when a match is found nearby.
          </p>

          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-4 mb-6 text-left">
            <div className="flex items-start gap-3 mb-2">
              <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-bold text-zinc-900 dark:text-white">Match alerts</span> — Know instantly when a spot is found
              </p>
            </div>
            <div className="flex items-start gap-3 mb-2">
              <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-bold text-zinc-900 dark:text-white">Arrival reminders</span> — Reminds you when you reach your spot
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-bold text-zinc-900 dark:text-white">One-tap navigation</span> — Jump straight to the parking spot
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-2">
          <button
            onClick={handleEnable}
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all duration-150 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Smartphone size={18} />
            )}
            {loading ? "Enabling..." : "Enable Notifications"}
          </button>

          <button
            onClick={handleSkip}
            className="w-full h-10 rounded-2xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 font-medium text-xs transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
