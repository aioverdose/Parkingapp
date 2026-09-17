"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient, isSupabaseConfigured } from "@/lib/supabaseClient";
import { Loader2, Mail, Lock, Phone } from "lucide-react";

export default function LoginPage() {
  const supabase = createBrowserClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneStep, setPhoneStep] = useState<"phone" | "code">("phone");
  const [phoneLoading, setPhoneLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured()) {
      setError("Login is temporarily unavailable. Supabase is not configured.");
      setLoading(false);
      return;
    }

    try {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        setError(loginError.message);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role, vehicle_type, schedule_arrival, schedule_departure")
        .eq("id", loginData.user.id)
        .maybeSingle();

      const { count: savedAreaCount } = await supabase
        .from("user_parking_spots")
        .select("id", { count: "exact", head: true })
        .eq("user_id", loginData.user.id);

      const requestedDestination = new URLSearchParams(window.location.search).get("next");
      const safeDestination = requestedDestination?.startsWith("/") && !requestedDestination.startsWith("//")
        ? requestedDestination
        : null;
      const destination = safeDestination ?? (
        profile?.role === "admin" || profile?.role === "moderator"
          ? "/admin"
          : profile?.vehicle_type && profile.schedule_arrival && profile.schedule_departure && (savedAreaCount ?? 0) > 0
            ? "/profile"
            : "/profile/setup"
      );

      router.replace(destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to log in. Please try again.");
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Enter your email address first.");
      return;
    }
    if (!isSupabaseConfigured()) {
      setError("Password reset is temporarily unavailable. Supabase is not configured.");
      return;
    }
    setResetLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) {
        setError(error.message);
        return;
      }
      setResetSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send the reset email.");
    } finally {
      setResetLoading(false);
    }
  }

  async function requestPhoneCode() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) { setError("Enter a valid mobile number."); return; }
    setPhoneLoading(true); setError(null);
    const response = await fetch("/api/auth/phone-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: `+1${digits}`, mode: "login" }) });
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) setError(body.error || "Phone sign-in is unavailable."); else setPhoneStep("code");
    setPhoneLoading(false);
  }

  async function verifyPhoneCode(event: React.FormEvent) {
    event.preventDefault();
    if (phoneCode.length !== 6) { setError("Enter the 6-digit code."); return; }
    setPhoneLoading(true); setError(null);
    const response = await fetch("/api/auth/phone-verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: `+1${phone.replace(/\D/g, "")}`, code: phoneCode, mode: "login" }) });
    const body = await response.json().catch(() => ({})) as { error?: string; action_link?: string };
    if (!response.ok || !body.action_link) setError(body.error || "Unable to verify that code."); else window.location.assign(body.action_link);
    setPhoneLoading(false);
  }

  return (
    <div className="premium-shell premium-grid flex min-h-screen items-center justify-center p-4">
      <div className="auth-surface w-full max-w-md p-6 sm:p-8">
        <div className="text-center space-y-2 mb-8">
           <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#e85d3f] text-2xl font-bold text-white shadow-lg shadow-[#e85d3f]/20">
             P
          </div>
          <h1 className="text-2xl font-bold">Welcome Back</h1>
           <p className="text-[#5f756c]">Log in to manage your business parking network</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              name="email"
              type="email"
              placeholder="Email Address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
               className="app-input w-full rounded-xl border py-3 pl-10 pr-4 outline-none transition"
            />
          </div>

          {resetSent ? (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-sm text-green-700 dark:text-green-300 text-center">
              Reset link sent! Check your email inbox.
            </div>
          ) : (
            <>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  name="password"
                  type="password"
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                 className="app-input w-full rounded-xl border py-3 pl-10 pr-4 outline-none transition"
                />
              </div>

              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                 className="app-link text-xs hover:underline self-end -mt-2 disabled:opacity-50"
              >
                {resetLoading ? "Sending..." : "Forgot Password?"}
              </button>

              {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                 className="app-primary flex h-14 w-full items-center justify-center rounded-full text-lg font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Log In"}
              </button>
            </>
          )}
        </form>

        <div className="my-7 flex items-center gap-3 text-xs text-zinc-400"><span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" /><span>or use your mobile</span><span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" /></div>
        {phoneStep === "phone" ? (
          <div className="space-y-3">
             <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#718a80]" size={18} /><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Mobile number" className="app-input w-full rounded-xl border py-3 pl-10 pr-4 outline-none transition" /></div>
             <button type="button" onClick={() => void requestPhoneCode()} disabled={phoneLoading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#e5a08d] text-sm font-bold text-[#b93d29] transition hover:bg-[#fff1eb] disabled:opacity-50">{phoneLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Phone className="h-4 w-4" />Continue with phone</>}</button>
          </div>
        ) : (
          <form onSubmit={(event) => void verifyPhoneCode(event)} className="space-y-3"><p className="text-center text-sm text-zinc-500">Code sent to {phone}</p><input autoFocus inputMode="numeric" maxLength={6} value={phoneCode} onChange={(event) => setPhoneCode(event.target.value.replace(/\D/g, ""))} placeholder="6-digit code" className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-center text-lg font-bold tracking-[0.35em] outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800" /><button type="submit" disabled={phoneLoading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#17211e] text-sm font-bold text-white transition hover:bg-zinc-700 disabled:opacity-50">{phoneLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify and sign in"}</button><button type="button" onClick={() => setPhoneStep("phone")} className="w-full text-xs font-semibold text-zinc-400 hover:text-zinc-700">Use a different number</button></form>
        )}

         <p className="text-center mt-6 text-sm text-[#5f756c]">
          Don&apos;t have an account?{" "}
           <a href="/auth/signup" className="app-link font-medium hover:underline">Sign up</a>
        </p>
      </div>
    </div>
  );
}
