"use client";

import { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Lock, User, Car, Phone, Check, X, AlertCircle, RefreshCw } from "lucide-react";
import { VEHICLE_TYPES } from "@/lib/vehicle-types";

const COOLDOWN_SECONDS = 60;

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

type AuthStep = "form" | "phone_verify";

export function Auth({ onComplete }: { onComplete: () => void }) {
  const supabase = createBrowserClient();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  // Phone verification state
  const [step, setStep] = useState<AuthStep>("form");
  const [verifyPhone, setVerifyPhone] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyStep, setVerifyStep] = useState<"phone" | "code">("phone");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Enter your email above, then click Forgot Password.");
      return;
    }
    setResetLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setResetLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (loginError) throw loginError;
        onComplete();
      } else {
        // Sign up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
          },
        });
        if (signUpError) throw signUpError;

        // Create public user profile
        if (data.user) {
          const { error: profileError } = await supabase.from("users").insert({
            id: data.user.id,
            email,
            name,
            vehicle_type: vehicleType || null,
            phone_number: phone ? `+1${phone.replace(/\D/g, "")}` : null,
          });
          if (profileError) {
            console.error("Failed to create user profile:", profileError);
          }
        }

        // If phone provided, go to phone verification step
        if (phone.replace(/\D/g, "").length >= 10) {
          setVerifyPhone(phone);
          setStep("phone_verify");
          setVerifyStep("phone");
          setLoading(false);
          return;
        }

        onComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    const digits = verifyPhone.replace(/\D/g, "");
    if (digits.length < 10) return;
    setSending(true);
    setVerifyError(null);
    setSimulated(false);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const e164 = `+1${digits}`;
    const res = await fetch("/api/auth/phone-request", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phone: e164 }),
    });
    const resData = await res.json();

    setSending(false);
    if (resData.error) {
      setVerifyError(resData.error);
      return;
    }

    setSimulated(resData.method === "simulated");
    setVerifyStep("code");
    setCooldown(COOLDOWN_SECONDS);
  };

  const handleVerify = async () => {
    if (verifyCode.length < 6) return;
    setVerifying(true);
    setVerifyError(null);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const digits = verifyPhone.replace(/\D/g, "");
    const e164 = `+1${digits}`;
    const res = await fetch("/api/auth/phone-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phone: e164, code: verifyCode }),
    });
    const resData = await res.json();

    setVerifying(false);
    if (resData.error) {
      setVerifyError(resData.error);
      return;
    }

    setVerifySuccess(true);
    setTimeout(() => onComplete(), 1500);
  };

  const handleSkipPhone = () => {
    onComplete();
  };

  // Phone verification step
  if (step === "phone_verify") {
    return (
      <div className="flex flex-col gap-6 p-8">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mx-auto">
            <Phone size={24} />
          </div>
          <h2 className="text-2xl font-bold">Verify Your Phone</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Required before posting spots
          </p>
        </div>

        {verifySuccess ? (
          <div className="flex flex-col items-center py-8">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 mb-4">
              <Check size={32} />
            </div>
            <p className="text-lg font-bold text-emerald-600">Phone Verified!</p>
            <p className="text-sm text-zinc-500 mt-1">You can now post spots</p>
          </div>
        ) : verifyStep === "phone" ? (
          <div className="space-y-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-medium">+1</span>
              <Phone className="absolute left-9 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="tel"
                placeholder="(555) 123-4567"
                value={formatPhone(verifyPhone)}
                onChange={(e) => setVerifyPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full pl-16 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
            {verifyError && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle size={14} />
                <span>{verifyError}</span>
              </div>
            )}
            <button
              onClick={handleSendCode}
              disabled={sending || verifyPhone.replace(/\D/g, "").length < 10}
              className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white font-bold transition flex items-center justify-center gap-2"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : null}
              Send Verification Code
            </button>
            <button
              onClick={handleSkipPhone}
              className="w-full h-10 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-medium transition"
            >
              Skip for now
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500 text-center">
              Enter the 6-digit code sent to <span className="font-medium text-zinc-800 dark:text-zinc-200">{formatPhone(verifyPhone)}</span>
            </p>
            {simulated && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400 text-center">
                Dev mode — enter any 6-digit code
              </div>
            )}
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                placeholder="000000"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
            {verifyError && (
              <div className="flex items-center gap-2 text-red-500 text-sm justify-center">
                <AlertCircle size={14} />
                <span>{verifyError}</span>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setVerifyStep("phone"); setVerifyCode(""); setVerifyError(null); }}
                className="flex-1 h-12 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-sm"
              >
                Change Number
              </button>
              <button
                onClick={handleVerify}
                disabled={verifying || verifyCode.length < 6}
                className="flex-1 h-12 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white font-bold transition flex items-center justify-center gap-2"
              >
                {verifying ? <Loader2 size={18} className="animate-spin" /> : "Verify"}
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
    );
  }

  // Main auth form
  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{isLogin ? "Welcome Back" : "Create Account"}</h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          {isLogin ? "Log in to find your match" : "Join ParkingMeeters and find your perfect parking spot"}
        </p>
      </div>

      <form onSubmit={handleAuth} className="flex flex-col gap-4">
        {!isLogin && (
          <>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="text"
                placeholder="Full Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="tel"
                placeholder="Phone number"
                value={formatPhone(phone)}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
            <div className="relative">
              <Car className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition appearance-none"
              >
                <option value="">Select your vehicle type</option>
                {VEHICLE_TYPES.map((vt) => (
                  <option key={vt.value} value={vt.value}>{vt.label}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="email"
            placeholder="Email Address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>

        {resetSent ? (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-sm text-green-700 dark:text-green-300 text-center">
            Reset link sent! Check your email inbox (and spam folder).
          </div>
        ) : (
          <>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>

            {isLogin && (
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-xs text-blue-600 hover:underline self-end -mt-2 disabled:opacity-50"
              >
                {resetLoading ? "Sending..." : "Forgot Password?"}
              </button>
            )}

            {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}

            <Button type="submit" disabled={loading} className="h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                isLogin ? "Log In" : "Sign Up"
              )}
            </Button>
          </>
        )}
      </form>

      <div className="text-center">
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
