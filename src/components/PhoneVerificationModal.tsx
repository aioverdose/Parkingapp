"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Phone, Check, X, AlertCircle, RefreshCw } from "lucide-react";

interface PhoneVerificationModalProps {
  open: boolean;
  userId: string;
  onVerified: () => void;
  onClose: () => void;
}

const COOLDOWN_SECONDS = 60;

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function PhoneVerificationModal({ open, userId, onVerified, onClose }: PhoneVerificationModalProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open) {
      setPhone("");
      setCode("");
      setStep("phone");
      setError(null);
      setSuccess(false);
      setSimulated(false);
      setCooldown(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [open]);

  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [cooldown]);

  if (!open) return null;

  const getToken = async () => {
    const { createBrowserClient } = await import("@/lib/supabaseClient");
    const supabase = createBrowserClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const handleSendCode = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return;
    setSending(true);
    setError(null);
    setSimulated(false);

    const token = await getToken();
    const e164 = `+1${digits}`;
    const res = await fetch("/api/auth/phone-request", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phone: e164 }),
    });
    const data = await res.json();

    setSending(false);
    if (data.error) {
      setError(data.error);
      return;
    }

    setSimulated(data.method === "simulated");
    setStep("code");
    setCooldown(COOLDOWN_SECONDS);
  };

  const handleVerify = async () => {
    if (code.length < 6) return;
    setVerifying(true);
    setError(null);

    const token = await getToken();
    const digits = phone.replace(/\D/g, "");
    const e164 = `+1${digits}`;
    const res = await fetch("/api/auth/phone-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phone: e164, code }),
    });
    const data = await res.json();

    setVerifying(false);
    if (data.error) {
      setError(data.error);
      return;
    }

    setSuccess(true);
    setTimeout(() => onVerified(), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[32px] shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Phone Verification</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center py-8">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 mb-4">
              <Check size={32} />
            </div>
            <p className="text-lg font-bold text-emerald-600">Phone Verified!</p>
            <p className="text-sm text-zinc-500 mt-1">You can now post spots</p>
          </div>
        ) : step === "phone" ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">
              Enter your phone number to verify your identity. Required before posting spots.
            </p>
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
            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
            <button
              onClick={handleSendCode}
              disabled={sending || phone.replace(/\D/g, "").length < 10}
              className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white font-bold transition flex items-center justify-center gap-2"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : null}
              Send Verification Code
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">
              Enter the 6-digit code sent to <span className="font-medium text-zinc-800 dark:text-zinc-200">{formatPhone(phone)}</span>
            </p>
            {simulated && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
                SMS not configured. Enter any 6-digit code to verify.
              </div>
            )}
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setStep("phone"); setCode(""); setError(null); }}
                className="flex-1 h-12 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold"
              >
                Change Number
              </button>
              <button
                onClick={handleVerify}
                disabled={verifying || code.length < 6}
                className="flex-1 h-12 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white font-bold transition flex items-center justify-center gap-2"
              >
                {verifying ? <Loader2 size={18} className="animate-spin" /> : "Verify Code"}
              </button>
            </div>
            <div className="flex justify-center">
              {cooldown > 0 ? (
                <span className="text-xs text-zinc-400">Resend in {cooldown}s</span>
              ) : (
                <button
                  onClick={handleSendCode}
                  disabled={sending}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  <RefreshCw size={12} />
                  Resend code
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
