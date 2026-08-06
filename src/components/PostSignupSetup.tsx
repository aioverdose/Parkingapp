"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Loader2, MapPin, Download, Check, Phone, AlertCircle, RefreshCw } from "lucide-react";

type Step = "phone" | "location" | "install" | "done";

const COOLDOWN_SECONDS = 60;

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function PostSignupSetup({ phone: initialPhone }: { phone?: string }) {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [step, setStep] = useState<Step>(initialPhone ? "phone" : "location");

  // Phone verification state
  const [phone, setPhone] = useState(initialPhone || "");
  const [code, setCode] = useState("");
  const [phoneStep, setPhoneStep] = useState<"phone" | "code">(initialPhone ? "code" : "phone");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Location state
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installAccepted, setInstallAccepted] = useState(false);
  const [installSkipped, setInstallSkipped] = useState(false);
  const installPromptRef = useRef<boolean>(false);

  // Auto-send code when phone step mounts with pre-filled phone
  const sentRef = useRef(false);
  useEffect(() => {
    if (initialPhone && !sentRef.current) {
      sentRef.current = true;
      handleSendCode();
    }
  }, [initialPhone]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((p) => (p <= 1 ? 0 : p - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Listen for beforeinstallprompt
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

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }, [supabase]);

  const handleSendCode = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return;
    setSending(true);
    setPhoneError(null);
    setSimulated(false);

    const token = await getToken();
    if (!token) { setSending(false); return; }

    const e164 = `+1${digits}`;
    try {
      const res = await fetch("/api/auth/phone-request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: e164 }),
      });
      const data = await res.json();
      if (data.error) { setPhoneError(data.error); setSending(false); return; }
      setSimulated(data.method === "simulated");
      setPhoneStep("code");
      setCooldown(COOLDOWN_SECONDS);
    } catch { setPhoneError("Failed to send code"); }
    setSending(false);
  };

  const handleVerify = async () => {
    if (code.length < 6) return;
    setVerifying(true);
    setPhoneError(null);

    const token = await getToken();
    if (!token) { setVerifying(false); return; }

    const digits = phone.replace(/\D/g, "");
    const e164 = `+1${digits}`;
    try {
      const res = await fetch("/api/auth/phone-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: e164, code }),
      });
      const data = await res.json();
      if (data.error) { setPhoneError(data.error); setVerifying(false); return; }
      setPhoneVerified(true);
      setTimeout(() => setStep("location"), 1000);
    } catch { setPhoneError("Failed to verify code"); }
    setVerifying(false);
  };

  const handleRequestLocation = async () => {
    if (!("geolocation" in navigator)) { setLocationDenied(true); return; }
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
    }
    setLocationLoading(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setInstallSkipped(true);
      setStep("done");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstallAccepted(true);
    setDeferredPrompt(null);
    setStep("done");
  };

  const handleSkipInstall = () => {
    setInstallSkipped(true);
    setStep("done");
  };

  const handleFinish = () => {
    router.replace("/");
  };

  const handleSkipAll = () => {
    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-6 space-y-6">

        {/* STEP 1: PHONE VERIFICATION */}
        {step === "phone" && (
          <>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto">
                <Phone size={32} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-bold">Verify Your Phone</h2>
              <p className="text-sm text-zinc-500">Required to share parking spots and receive match notifications.</p>
            </div>

            {phoneVerified ? (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 text-center">
                <Check size={24} className="text-green-600 mx-auto mb-1" />
                <p className="text-sm font-semibold text-green-700">Phone Verified!</p>
              </div>
            ) : phoneStep === "phone" ? (
              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-medium">+1</span>
                  <Phone className="absolute left-9 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formatPhone(phone)}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="w-full pl-16 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
                {phoneError && <p className="text-red-500 text-xs">{phoneError}</p>}
                <button
                  onClick={handleSendCode}
                  disabled={sending || phone.replace(/\D/g, "").length < 10}
                  className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 text-white font-bold transition flex items-center justify-center gap-2"
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : "Send Code"}
                </button>
                <button
                  onClick={() => setStep("location")}
                  className="w-full text-sm text-zinc-400 hover:text-zinc-600 font-medium"
                >
                  Skip
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-zinc-500 text-center">
                  Code sent to <span className="font-medium">{formatPhone(phone)}</span>
                </p>
                {simulated && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 text-center">
                    Any 6-digit code works (SMS not configured).
                  </div>
                )}
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
                {phoneError && <p className="text-red-500 text-xs text-center">{phoneError}</p>}
                <button
                  onClick={handleVerify}
                  disabled={verifying || code.length < 6}
                  className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 text-white font-bold transition flex items-center justify-center gap-2"
                >
                  {verifying ? <Loader2 size={18} className="animate-spin" /> : "Verify Code"}
                </button>
                <div className="flex justify-center">
                  {cooldown > 0 ? (
                    <span className="text-xs text-zinc-400">Resend in {cooldown}s</span>
                  ) : (
                    <button onClick={handleSendCode} disabled={sending}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <RefreshCw size={12} /> Resend code
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setStep("location")}
                  className="w-full text-sm text-zinc-400 hover:text-zinc-600 font-medium"
                >
                  Skip phone verification
                </button>
              </div>
            )}
          </>
        )}

        {/* STEP 2: LOCATION */}
        {step === "location" && (
          <>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto">
                <MapPin size={32} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-bold">Enable Location</h2>
              <p className="text-sm text-zinc-500">See nearby spots and get notified when you're close to a match.</p>
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
              <p className="text-xs text-amber-600 text-center">Denied. Enable later in browser settings.</p>
            )}

            <div className="flex justify-center">
              <button
                onClick={() => setStep("install")}
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                {locationGranted ? "Continue" : "Skip"}
              </button>
            </div>
          </>
        )}

        {/* STEP 3: INSTALL */}
        {step === "install" && (
          <>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto">
                <Download size={32} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-bold">Install the App</h2>
              <p className="text-sm text-zinc-500">Get the best experience with GPS tracking and quick access.</p>
            </div>

            {installAccepted ? (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 text-center">
                <Check size={24} className="text-green-600 mx-auto mb-1" />
                <p className="text-sm font-semibold text-green-700">Installed!</p>
              </div>
            ) : deferredPrompt ? (
              <button
                onClick={handleInstall}
                className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg transition flex items-center justify-center gap-2"
              >
                <Download size={20} /> Install App
              </button>
            ) : (
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-4 text-sm text-zinc-600 space-y-2">
                <p className="font-medium">Not installable from this browser.</p>
                <p className="text-xs">Open in Chrome or Samsung Internet and look for "Add to Home Screen" in the menu.</p>
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

            {(installAccepted || installSkipped) && (
              <button
                onClick={() => setStep("done")}
                className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition"
              >
                Continue
              </button>
            )}
          </>
        )}

        {/* STEP 4: DONE */}
        {step === "done" && (
          <>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto">
                <Check size={32} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold">You're All Set!</h2>
              <p className="text-sm text-zinc-500">
                {phoneVerified ? "Phone verified. " : ""}
                {locationGranted ? "Location sharing active. " : ""}
                {installAccepted ? "App installed on your device." : ""}
              </p>
            </div>
            <button
              onClick={handleFinish}
              className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg transition"
            >
              Start Parking
            </button>
          </>
        )}

        {/* Progress dots */}
        <div className="flex items-center gap-1 justify-center">
          {["phone", "location", "install", "done"].map((s) => (
            <div key={s}
              className={`h-1.5 w-5 rounded-full ${
                step === s ? "bg-blue-600" :
                ["done", "install", "location"].indexOf(step) >= ["phone", "location", "install", "done"].indexOf(s) ? "bg-green-500" :
                "bg-zinc-300 dark:bg-zinc-600"
              }`}
            />
          ))}
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
