"use client";

import { useState, useRef } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { signUpWithTosGate } from "@/actions/tos";
import { CommunityAgreementModal } from "@/components/CommunityAgreementModal";
import { PostSignupSetup } from "@/components/PostSignupSetup";
import { Loader2, Mail, Lock, User, Car, Phone } from "lucide-react";
import { VEHICLE_TYPES } from "@/lib/vehicle-types";
import { PrivacyPolicyLink } from "@/components/PrivacyPolicyLink";
import { MembershipModal } from "@/components/MembershipModal";

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function SignUpPage() {
  const supabase = createBrowserClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTos, setShowTos] = useState(false);
  const [tosChecked, setTosChecked] = useState(false);
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const [showMembership, setShowMembership] = useState(false);
  const emailRef = useRef<string>("");
  const passwordRef = useRef<string>("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    formData.set("username", username.trim().toLowerCase());
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      setError("A valid 10-digit phone number is required to use location services.");
      setLoading(false);
      return;
    }
    formData.set("tos_accepted", tosChecked ? "true" : "false");
    formData.set("phone", `+1${phoneDigits}`);
    formData.set("age_confirmed", ageConfirmed ? "true" : "false");

    const result = await signUpWithTosGate(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Auto-login so session is available for location ping & phone verification
    emailRef.current = email;
    passwordRef.current = password;
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("Account created but auto-login failed. Please log in manually.");
      setLoading(false);
      return;
    }

    // Associate a supplied mobile number with the Supabase identity so it can
    // be used for passwordless sign-in after phone verification.
    await supabase.auth.updateUser({ phone: `+1${phoneDigits}` });

    setSignedUp(true);
  }

  if (signedUp) {
    return <PostSignupSetup phone={phone.replace(/\D/g, "").length >= 10 ? phone : undefined} />;
  }

  return (
    <div className="premium-shell premium-grid min-h-screen flex items-center justify-center p-4">
       <div className="auth-surface w-full max-w-md p-6 sm:p-8">
        <div className="text-center space-y-2 mb-8">
           <h1 className="text-2xl font-bold">Create a Parking Meeters account</h1>
            <p className="text-[#5f756c]">Join a business network for better arrivals</p>
            <button type="button" onClick={() => setShowMembership(true)} className="app-link mt-2 text-xs font-semibold hover:underline">What does membership include?</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>
           <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input name="name" type="text" placeholder="Full Name" required
              className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" />
           </div>

          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input name="username" type="text" placeholder="Username (3-20 characters)" required minLength={3} maxLength={20} pattern="[a-z0-9_]+" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))}
              className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" />
          </div>

          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="tel"
               name="phone"
               required
               minLength={10}
               inputMode="tel"
               autoComplete="tel"
               placeholder="Phone number (required)"
              value={formatPhone(phone)}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>

          <div className="relative">
            <Car className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <select name="vehicle_type"
              className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition appearance-none">
              <option value="">Select your vehicle type</option>
              {VEHICLE_TYPES.map((vt) => (
                <option key={vt.value} value={vt.value}>{vt.label}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input name="email" type="email" placeholder="Email Address" required
              className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input name="password" type="password" placeholder="Password (min 8 chars)" required minLength={8}
              className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" />
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              required
              checked={tosChecked}
              onChange={(e) => setTosChecked(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              I agree to the{" "}
              <button type="button" onClick={() => setShowTos(true)}
                className="text-blue-600 hover:underline font-medium">
                Terms of Service
              </button>
            </span>
          </div>

          <div className="flex items-start gap-3">
            <input type="checkbox" required checked={ageConfirmed} onChange={(e) => setAgeConfirmed(e.target.checked)} className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">I confirm that I meet the minimum age requirement in my location and will use the app lawfully.</span>
          </div>

          {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}

          <button type="submit" disabled={loading || !tosChecked}
               className="app-primary w-full h-14 rounded-full text-white font-bold text-lg disabled:cursor-not-allowed transition flex items-center justify-center">
            {loading ? <Loader2 className="animate-spin" /> : "Sign Up"}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-zinc-500">
          Already have an account?{" "}
           <a href="/auth/login" className="app-link hover:underline font-medium">Log in</a>
        </p>
        <p className="text-center mt-3">
          <PrivacyPolicyLink />
        </p>
      </div>

      {showTos && <CommunityAgreementModal open={showTos} onAccept={async () => { setShowTos(false); }} onClose={() => setShowTos(false)} />}
      <MembershipModal open={showMembership} onClose={() => setShowMembership(false)} onJoin={() => setShowMembership(false)} />
    </div>
  );
}
