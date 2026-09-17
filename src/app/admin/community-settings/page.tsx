"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";

type Settings = { feed_enabled: boolean; composer_enabled: boolean; require_moderation: boolean; allow_media: boolean; max_media_mb: number };
const defaults: Settings = { feed_enabled: true, composer_enabled: true, require_moderation: false, allow_media: true, max_media_mb: 10 };

export default function Page() {
  const [settings, setSettings] = useState<Settings>(defaults), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [message, setMessage] = useState("");
  async function load() {
    const { data: { session } } = await createBrowserClient().auth.getSession();
    if (!session) { setMessage("Your admin session has expired."); setLoading(false); return; }
    const response = await fetch("/api/admin/community/settings", { headers: { Authorization: `Bearer ${session.access_token}` } });
    const body = await response.json(); setMessage(response.ok ? "" : body.error || "Could not load settings"); setSettings(body.draft || defaults); setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  async function save(action: "draft" | "publish") {
    setSaving(true); setMessage(""); const { data: { session } } = await createBrowserClient().auth.getSession();
    const response = await fetch("/api/admin/community/settings", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` }, body: JSON.stringify({ action, settings }) });
    const body = await response.json(); setMessage(response.ok ? action === "publish" ? "Settings published." : "Draft saved." : body.error || "Could not save settings"); setSaving(false); if (response.ok) setSettings(body.draft || settings);
  }
  const toggle = (key: keyof Settings) => <label className="flex items-center justify-between gap-4 rounded-2xl border border-[#dce3df] bg-white p-4"><span><strong className="block text-sm">{key === "feed_enabled" ? "Community feed enabled" : key === "composer_enabled" ? "Community composer enabled" : key === "require_moderation" ? "Require moderation" : "Allow media"}</strong><span className="text-xs text-[#71807b]">{key === "feed_enabled" ? "Show the community feed to members." : key === "composer_enabled" ? "Allow members to submit new posts." : key === "require_moderation" ? "Hold new member posts until reviewed." : "Allow approved posts to include media."}</span></span><input type="checkbox" checked={Boolean(settings[key])} onChange={(event) => setSettings({ ...settings, [key]: event.target.checked })} className="h-5 w-5" /></label>;
  return <main className="min-h-screen bg-[#f6f8f6] px-5 py-8 text-[#17211e] sm:px-8"><div className="mx-auto max-w-3xl"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#e85d3f]">Admin / Community</p><h1 className="mt-2 text-4xl font-black tracking-[-0.05em]">Community control panel</h1><p className="mt-3 text-sm leading-6 text-[#71807b]">Disabling the feed hides community posts and composer actions. It does not delete posts.</p>{message && <p role="status" className="mt-5 rounded-xl bg-[#fff0eb] p-3 text-sm font-semibold text-[#8d3d2d]">{message}</p>}{loading ? <p className="mt-8">Loading controls...</p> : <div className="mt-8 space-y-3">{toggle("feed_enabled")}{toggle("composer_enabled")}{toggle("require_moderation")}{toggle("allow_media")}<label className="block rounded-2xl border border-[#dce3df] bg-white p-4 text-sm font-bold">Maximum media size (MB)<input type="number" min={1} max={100} value={settings.max_media_mb} onChange={(event) => setSettings({ ...settings, max_media_mb: Number(event.target.value) })} className="app-input mt-2 block w-32 rounded-xl px-3 py-2" /></label><div className="flex flex-wrap gap-3 pt-3"><button disabled={saving} onClick={() => void save("draft")} className="rounded-xl border border-[#dce3df] bg-white px-4 py-2 text-sm font-bold disabled:opacity-50">Save draft</button><button disabled={saving} onClick={() => void save("publish")} className="rounded-xl bg-[#e85d3f] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Publish settings</button></div></div>}</div></main>;
}
