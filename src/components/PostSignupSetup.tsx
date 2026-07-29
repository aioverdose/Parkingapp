"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Download, Check, SkipForward } from "lucide-react";

type Step = "location" | "install" | "done";

export function PostSignupSetup({ verifyPhone }: { verifyPhone?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("location");
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installPrompted, setInstallPrompted] = useState(false);
  const [installAccepted, setInstallAccepted] = useState(false);
  const [installSkipped, setInstallSkipped] = useState(false);
  const installPromptRef = useRef<boolean>(false);

  useEffect(() => {
    if (installPromptRef.current) return;
    installPromptRef.current = true;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleRequestLocation = async () => {
    if (!("geolocation" in navigator)) {
      setLocationDenied(true);
      return;
    }

    setLocationLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15_000,
        });
      });
      if (pos) {
        setLocationGranted(true);
        setStep("install");
      }
    } catch {
      setLocationDenied(true);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setInstallSkipped(true);
      setStep("done");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstallAccepted(true);
    }
    setDeferredPrompt(null);
    setInstallPrompted(true);
    setStep("done");
  };

  const handleSkipInstall = () => {
    setInstallSkipped(true);
    setStep("done");
  };

  const handleFinish = () => {
    if (verifyPhone) {
      router.replace("/?signup=success&verify_phone=true");
    } else {
      router.replace("/?signup=success");
    }
  };

  const handleSkipAll = () => {
    handleFinish();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-6 space-y-6">

        {step === "location" && (
          <>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto">
                <MapPin size={32} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-bold">Enable Location</h2>
              <p className="text-sm text-zinc-500">
                See available parking spots near you and get notified when you're nearby.
              </p>
            </div>

            {locationGranted ? (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 text-center">
                <Check size={24} className="text-green-600 mx-auto mb-1" />
                <p className="text-sm font-semibold text-green-700">Location Enabled</p>
              </div>
            ) : (
              <button
                onClick={handleRequestLocation}
                disabled={locationLoading}
                className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 text-white font-bold text-lg transition flex items-center justify-center gap-2"
              >
                {locationLoading ? (
                  <><Loader2 size={20} className="animate-spin" /> Getting location...</>
                ) : (
                  <><MapPin size={20} /> Enable Location</>
                )}
              </button>
            )}

            {locationDenied && (
              <p className="text-xs text-amber-600 text-center">
                Location was denied. You can enable it later in browser settings.
              </p>
            )}

            <div className="flex justify-center">
              {locationGranted ? (
                <button
                  onClick={() => setStep("install")}
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={() => { setStep("install"); setLocationDenied(false); }}
                  className="text-sm text-zinc-400 hover:text-zinc-600 font-medium"
                >
                  Skip for now
                </button>
              )}
            </div>
          </>
        )}

        {step === "install" && (
          <>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto">
                <Download size={32} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-bold">Install the App</h2>
              <p className="text-sm text-zinc-500">
                Add ParkingMeeters to your home screen for the fastest experience with GPS tracking.
              </p>
            </div>

            {installAccepted ? (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 text-center">
                <Check size={24} className="text-green-600 mx-auto mb-1" />
                <p className="text-sm font-semibold text-green-700">Installed!</p>
              </div>
            ) : installPrompted || installSkipped ? null : (
              <>
                {deferredPrompt ? (
                  <button
                    onClick={handleInstall}
                    className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg transition flex items-center justify-center gap-2"
                  >
                    <Download size={20} /> Install App
                  </button>
                ) : (
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-4 text-sm text-zinc-600 space-y-2">
                    <p className="font-medium">To install manually:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Open your browser menu (three dots)</li>
                      <li>Tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong></li>
                      <li>Follow the prompts</li>
                    </ol>
                  </div>
                )}

                <div className="flex justify-center">
                  <button
                    onClick={handleSkipInstall}
                    className="text-sm text-zinc-400 hover:text-zinc-600 font-medium"
                  >
                    Skip
                  </button>
                </div>
              </>
            )}

            {(installAccepted || installPrompted || installSkipped) && (
              <button
                onClick={() => { setStep("done"); }}
                className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg transition"
              >
                Continue
              </button>
            )}
          </>
        )}

        {step === "done" && (
          <>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto">
                <Check size={32} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold">You're All Set!</h2>
              <p className="text-sm text-zinc-500">
                {locationGranted
                  ? "Location sharing is active. You'll see nearby spots and match notifications."
                  : "You can enable location sharing anytime from your browser settings."}
                {installAccepted ? " The app is installed on your device." : ""}
              </p>
            </div>

            <button
              onClick={handleFinish}
              className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg transition flex items-center justify-center gap-2"
            >
              Start Parking
            </button>
          </>
        )}

        <div className="flex items-center gap-1 justify-center">
          <div className={`h-1.5 w-6 rounded-full ${step === "location" ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-600"}`} />
          <div className={`h-1.5 w-6 rounded-full ${step === "install" ? "bg-blue-600" : step === "done" ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-600"}`} />
          <div className={`h-1.5 w-6 rounded-full ${step === "done" ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-600"}`} />
        </div>

        <div className="text-center">
          <button onClick={handleSkipAll} className="text-xs text-zinc-400 hover:text-zinc-600">
            Skip all setup
          </button>
        </div>

      </div>
    </div>
  );
}
