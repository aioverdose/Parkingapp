"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Loader2, User, Car, ArrowLeft, CheckCircle, LogOut } from "lucide-react";
import { VEHICLE_TYPES } from "@/lib/vehicle-types";

export default function SettingsPage() {
  const supabase = createBrowserClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.push("/"); return; }
      setEmail(session.user.email ?? "");
      const { data: profile } = await supabase
        .from("users")
        .select("name, vehicle_type")
        .eq("id", session.user.id)
        .single();
      if (profile) {
        setName(profile.name ?? "");
        setVehicleType(profile.vehicle_type ?? "");
      }
      setLoading(false);
    });
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error: updateError } = await supabase
      .from("users")
      .update({ name: name || null, vehicle_type: vehicleType || null })
      .eq("id", session.user.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-lg mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/")} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <form onSubmit={handleSave} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5">
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block">Email</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input type="email" value={email} disabled
                className="w-full pl-10 pr-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm opacity-60 cursor-not-allowed" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block">Vehicle Type</label>
            <div className="relative">
              <Car className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={18} />
              <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition appearance-none">
                <option value="">Select vehicle type</option>
                {VEHICLE_TYPES.map((vt) => (
                  <option key={vt.value} value={vt.value}>{vt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}

          {saved && (
            <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-bold">
              <CheckCircle size={16} /> Saved!
            </div>
          )}

          <Button type="submit" disabled={saving} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold">
            {saving ? <Loader2 className="animate-spin" /> : "Save Changes"}
          </Button>
        </form>

        <div className="mt-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="font-bold mb-3">Account</h2>
          <div className="space-y-3">
            <a href="/profile" className="block w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-sm font-medium text-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition">
              My Profile
            </a>
            <a href="/rankings" className="block w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-sm font-medium text-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition">
              View Rankings
            </a>
            <a href="/notifications" className="block w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-sm font-medium text-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition">
              Notification History
            </a>
            <a href="/privacy-policy" className="block w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-sm font-medium text-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition">
              Privacy Policy
            </a>
            <a href="/faq" className="block w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-sm font-medium text-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition">
              FAQ / Help
            </a>
            <a href="/support" className="block w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-sm font-medium text-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition">
              Support Center
            </a>
            <a href="/tos/latest" className="block w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-sm font-medium text-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition">
              Terms of Service
            </a>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/");
              }}
              className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 text-center hover:bg-red-100 dark:hover:bg-red-900/30 transition flex items-center justify-center gap-2"
            >
              <LogOut size={16} /> Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
