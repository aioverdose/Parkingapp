"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUpWithTosGate } from "@/actions/tos";
import { TOSModal } from "@/components/TOSModal";
import { Loader2, Mail, Lock, User, Car } from "lucide-react";
import { VEHICLE_TYPES } from "@/lib/vehicle-types";
import { PrivacyPolicyLink } from "@/components/PrivacyPolicyLink";

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTos, setShowTos] = useState(false);
  const [tosChecked, setTosChecked] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("tos_accepted", tosChecked ? "true" : "false");

    const result = await signUpWithTosGate(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/?signup=success");
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center space-y-2 mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto">
            S
          </div>
          <h1 className="text-2xl font-bold">Join SpotMatch</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Find your perfect parking spot match</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input name="name" type="text" placeholder="Full Name" required
              className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" />
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

          {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}

          <button type="submit" disabled={loading || !tosChecked}
            className="w-full h-14 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white font-bold text-lg disabled:cursor-not-allowed transition flex items-center justify-center">
            {loading ? <Loader2 className="animate-spin" /> : "Sign Up"}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-zinc-500">
          Already have an account?{" "}
          <a href="/" className="text-blue-600 hover:underline font-medium">Log in</a>
        </p>
        <p className="text-center mt-3">
          <PrivacyPolicyLink />
        </p>
      </div>

      {showTos && <TOSModal open={showTos} onAccept={async () => { setShowTos(false); }} onClose={() => setShowTos(false)} mode="post" />}
    </div>
  );
}
