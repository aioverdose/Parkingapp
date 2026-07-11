"use client";

import { useState } from "react";
import { Loader2, Phone, Check, X, AlertCircle } from "lucide-react";

interface PhoneVerificationModalProps {
  open: boolean;
  userId: string;
  onVerified: () => void;
  onClose: () => void;
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

  if (!open) return null;

  const getToken = async () => {
    const { createBrowserClient } = await import("@/lib/supabaseClient");
    const supabase = createBrowserClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const handleSendCode = async () => {
    if (!phone || phone.length < 10) return;
    setSending(true);
    setError(null);

    const token = await getToken();
    const res = await fetch("/api/auth/phone-request", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();

    setSending(false);
    if (data.error) {
      setError(data.error);
      return;
    }

    setSimulated(data.simulated || false);
    setStep("code");
  };

  const handleVerify = async () => {
    if (!code || code.length < 6) return;
    setVerifying(true);
    setError(null);

    const token = await getToken();
    const res = await fetch("/api/auth/phone-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phone, code }),
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
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
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
              disabled={sending || phone.length < 10}
              className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white font-bold transition flex items-center justify-center gap-2"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : null}
              Send Verification Code
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">
              Enter the 6-digit code sent to {phone}
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
          </div>
        )}
      </div>
    </div>
  );
}
