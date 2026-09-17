"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { APP_COLOR_PALETTES, EXPERIENCE_APPEARANCE_PRESETS, type AppColorPalette, type ExperienceAppearancePreset } from "@/lib/experience-appearance";

type Appearance = { preset?: string; palette?: string };

export default function ProfileAppearancePage() {
  const [selected, setSelected] = useState<ExperienceAppearancePreset>("parking-native");
  const [palette, setPalette] = useState<AppColorPalette>("native-forest-coral");
  const [active, setActive] = useState({ preset: "parking-native" as ExperienceAppearancePreset, palette: "native-forest-coral" as AppColorPalette });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await createBrowserClient().auth.getSession();
      if (!session) { setMessage("Your admin session has expired."); setLoading(false); return; }
      const response = await fetch("/api/admin/experience/profile-appearance", { headers: { Authorization: `Bearer ${session.access_token}` } });
      const body = await response.json().catch(() => ({})) as { data?: { draft?: Appearance; published?: Appearance } };
      const appearance = body.data?.published ?? body.data?.draft ?? {};
      if (EXPERIENCE_APPEARANCE_PRESETS.some((item) => item.id === appearance.preset)) setSelected(appearance.preset as ExperienceAppearancePreset);
      if (APP_COLOR_PALETTES.some((item) => item.id === appearance.palette)) setPalette(appearance.palette as AppColorPalette);
      if (EXPERIENCE_APPEARANCE_PRESETS.some((item) => item.id === appearance.preset) && APP_COLOR_PALETTES.some((item) => item.id === appearance.palette)) setActive({ preset: appearance.preset as ExperienceAppearancePreset, palette: appearance.palette as AppColorPalette });
      setLoading(false);
    }
    void load();
  }, []);

  async function save(action: "draft" | "publish") {
    setSaving(true); setMessage("");
    const { data: { session } } = await createBrowserClient().auth.getSession();
    if (!session) { setMessage("Your admin session has expired."); setSaving(false); return; }
    const response = await fetch("/api/admin/experience/profile-appearance", { method: "PUT", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: action === "publish" ? "publish" : undefined, draft: { preset: selected, palette } }) });
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (response.ok) { if (action === "publish") setActive({ preset: selected, palette }); setMessage(action === "publish" ? "Visual style and app-wide palette published globally." : "Visual style and palette saved as a draft."); } else setMessage(body.error || "Could not save appearance.");
    setSaving(false);
  }

  if (loading) return <main className="min-h-screen bg-[#f6f8f6] p-8 text-sm text-[#71807b]">Loading visual styles...</main>;
  return <main className="min-h-screen bg-[var(--app-surface)] px-5 py-8 text-[var(--app-ink)] sm:px-8 lg:px-10"><div className="mx-auto max-w-6xl"><p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--app-accent)]">Admin / Experience management</p><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="mt-2 text-4xl font-black tracking-[-0.05em]">Profile visual direction</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--app-muted)]">Choose an approved profile direction and a separate app-wide color system.</p></div><div className="rounded-xl border border-[var(--app-border)] px-3 py-2 text-xs font-bold">Active: {EXPERIENCE_APPEARANCE_PRESETS.find((item) => item.id === active.preset)?.label} / {APP_COLOR_PALETTES.find((item) => item.id === active.palette)?.label}</div></div>{message && <p role="status" className="mt-5 rounded-xl bg-[#fff0eb] p-3 text-sm font-semibold text-[#8d3d2d]">{message}</p>}
    <h2 className="mt-10 text-xl font-black">Profile visual presets</h2><section className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{EXPERIENCE_APPEARANCE_PRESETS.map((item) => { const isSelected = selected === item.id; return <button key={item.id} type="button" onClick={() => setSelected(item.id)} aria-pressed={isSelected} className={`rounded-3xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] ${isSelected ? "border-[var(--app-accent)] ring-2 ring-[var(--app-accent)]/20" : "border-[#dce3df]"}`}><div className="h-32 rounded-2xl p-4" style={{ background: item.surface, color: item.ink }}><span className="inline-block h-7 w-7 rounded-lg" style={{ background: item.accent }} /><p className="mt-7 text-lg font-black">{item.label}</p></div><p className="mt-3 text-sm font-bold">{item.source}</p><p className="mt-1 text-xs leading-5 text-[#71807b]">{item.description}</p></button>; })}</section>
    <h2 className="mt-10 text-xl font-black">App-wide color system</h2><p className="mt-2 text-sm text-[var(--app-muted)]">Approved palettes affect shared buttons, cards, borders, focus states, and key accents.</p><section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{APP_COLOR_PALETTES.map((item) => { const isSelected = palette === item.id; return <button key={item.id} type="button" onClick={() => setPalette(item.id)} aria-pressed={isSelected} className={`flex items-center gap-3 rounded-2xl border bg-white p-4 text-left focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] ${isSelected ? "border-[var(--app-accent)] ring-2 ring-[var(--app-accent)]/20" : "border-[#dce3df]"}`}><span className="h-10 w-10 shrink-0 rounded-xl" style={{ background: `linear-gradient(135deg, ${item.accent}, ${item.accentStrong})` }} /><span><strong className="block text-sm">{item.label}</strong><span className="text-xs text-[#71807b]">{item.ink} on {item.surface}</span></span></button>; })}</section>
    <div className="mt-8 flex gap-3"><button type="button" disabled={saving} onClick={() => void save("draft")} className="rounded-xl border border-[var(--app-border)] px-5 py-3 text-sm font-bold">Save draft</button><button type="button" disabled={saving} onClick={() => void save("publish")} className="app-primary rounded-xl px-5 py-3 text-sm font-bold">Publish globally</button></div>
  </div></main>;
}
