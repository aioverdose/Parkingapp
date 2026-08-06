"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Loader2, User, Car, ArrowLeft, CheckCircle, LogOut, Bell, Ban, Lock, Trash2 } from "lucide-react";
import { VEHICLE_TYPES } from "@/lib/vehicle-types";

function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    setSaving(true);
    setError(null);
    setMessage(null);

    const { createBrowserClient } = await import("@/lib/supabaseClient");
    const supabase = createBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="password" placeholder="New password" value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
      />
      {message && <p className="text-emerald-600 text-xs font-medium">{message}</p>}
      {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
      <button
        type="submit" disabled={saving || !newPassword}
        className="w-full h-10 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-sm font-medium rounded-xl transition disabled:opacity-50"
      >
        {saving ? <Loader2 className="animate-spin mx-auto" /> : "Update Password"}
      </button>
    </form>
  );
}

function DeleteAccountSection() {
  const [confirm, setConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);

    const { createBrowserClient } = await import("@/lib/supabaseClient");
    const supabase = createBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });

    if (res.ok) {
      await supabase.auth.signOut();
      router.push("/");
    }
    setDeleting(false);
  };

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition"
      >
        Delete My Account
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-red-600 dark:text-red-400">This cannot be undone. All your data will be permanently deleted.</p>
      <input
        type="text" placeholder='Type "DELETE" to confirm' value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-red-300 dark:border-red-700 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none transition"
      />
      <button
        onClick={handleDelete}
        disabled={deleting || confirmText !== "DELETE"}
        className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-zinc-300 text-white font-bold text-sm transition flex items-center justify-center gap-2"
      >
        {deleting ? <Loader2 className="animate-spin" /> : "Permanently Delete Account"}
      </button>
      <button onClick={() => setConfirm(false)} className="w-full text-xs text-zinc-500 hover:text-zinc-700 transition">
        Cancel
      </button>
    </div>
  );
}

function BlockedUsersSection() {
  const [blocks, setBlocks] = useState<{ blocked_id: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { createBrowserClient } = await import("@/lib/supabaseClient");
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const res = await fetch("/api/blocks", { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok) { setLoading(false); return; }

      const data = await res.json();
      setBlocks(data.blocks || []);

      const names: Record<string, string> = {};
      for (const b of data.blocks || []) {
        const { data: user } = await supabase.from("users").select("name").eq("id", b.blocked_id).single();
        names[b.blocked_id] = user?.name || "Unknown";
      }
      setUserNames(names);
      setLoading(false);
    })();
  }, []);

  const handleUnblock = async (blockedId: string) => {
    const { createBrowserClient } = await import("@/lib/supabaseClient");
    const supabase = createBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/blocks?blocked_id=${blockedId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    setBlocks((prev) => prev.filter((b) => b.blocked_id !== blockedId));
  };

  if (blocks.length === 0 && !loading) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-3 mt-6">
      <h2 className="font-bold flex items-center gap-2"><Ban size={16} /> Blocked Users</h2>
      {loading ? (
        <Loader2 className="animate-spin mx-auto" size={20} />
      ) : (
        blocks.map((b) => (
          <div key={b.blocked_id} className="flex items-center justify-between py-2">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">{userNames[b.blocked_id] || "Loading..."}</span>
            <button
              onClick={() => handleUnblock(b.blocked_id)}
              className="text-xs text-red-500 hover:text-red-600 font-medium"
            >
              Unblock
            </button>
          </div>
        ))
      )}
    </div>
  );
}

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
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean> | null>(null);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

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
      const prefRes = await fetch("/api/notifications/preferences");
      if (prefRes.ok) {
        const prefData = await prefRes.json();
        setNotifPrefs(prefData.preferences);
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

        {notifPrefs && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 mt-6">
            <h2 className="font-bold flex items-center gap-2"><Bell size={16} /> Notification Preferences</h2>
            {[
              { key: "match", label: "Match requests & updates" },
              { key: "claim", label: "Spot claimed notifications" },
              { key: "agent", label: "AI alerts (congestion, predictions)" },
              { key: "waitlist", label: "Waitlist spot available" },
              { key: "promotional", label: "Promotional & feature updates" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between py-2">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
                <input
                  type="checkbox"
                  checked={!!notifPrefs[key]}
                  onChange={(e) => setNotifPrefs({ ...notifPrefs, [key]: e.target.checked })}
                  className="rounded accent-blue-600"
                />
              </label>
            ))}
            {notifSaved && <p className="text-emerald-600 text-xs font-medium text-center">Preferences saved</p>}
            <button
              disabled={notifSaving}
              onClick={async () => {
                setNotifSaving(true);
                setNotifSaved(false);
                const res = await fetch("/api/notifications/preferences", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ preferences: notifPrefs }),
                });
                if (res.ok) setNotifSaved(true);
                setNotifSaving(false);
                setTimeout(() => setNotifSaved(false), 3000);
              }}
              className="w-full h-10 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-sm font-medium rounded-xl transition"
            >
              {notifSaving ? <Loader2 className="animate-spin mx-auto" /> : "Save Notification Preferences"}
            </button>
          </div>
        )}

        <BlockedUsersSection />

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

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 mt-6">
          <h2 className="font-bold flex items-center gap-2"><Lock size={16} /> Change Password</h2>
          <PasswordChangeForm />
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-red-200 dark:border-red-900/30 p-6 space-y-4 mt-6">
          <h2 className="font-bold flex items-center gap-2 text-red-600"><Trash2 size={16} /> Delete Account</h2>
          <DeleteAccountSection />
        </div>
      </div>
    </div>
  );
}
