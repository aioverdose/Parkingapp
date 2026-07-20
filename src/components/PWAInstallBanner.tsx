"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedAt = localStorage.getItem("pwa_install_dismissed");
    if (dismissedAt) {
      const hoursSinceDismiss = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60);
      if (hoursSinceDismiss < 24) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [dismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("pwa_install_dismissed", Date.now().toString());
  };

  if (!showBanner || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
          <Download size={20} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Install SpotMatch</p>
          <p className="text-xs text-zinc-500">Add to your home screen for quick access</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button
            onClick={handleInstall}
            className="h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
          >
            Install
          </Button>
          <button onClick={handleDismiss} className="text-zinc-400 hover:text-zinc-600 p-1">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
