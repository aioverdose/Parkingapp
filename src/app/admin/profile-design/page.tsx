"use client";

import { useEffect, useState } from "react";
import { Check, LayoutTemplate, Loader2, Save, Sparkles, Users } from "lucide-react";
import { createBrowserClient } from "@/lib/supabaseClient";
import type { ProfileVariant } from "@/components/ProfileVariants";

const designs: Array<{ id: ProfileVariant; label: string; summary: string; icon: typeof LayoutTemplate; accent: string; bullets: string[] }> = [
  { id: "classic", label: "Classic", summary: "The familiar profile overview, preserving the current information hierarchy and parking map.", icon: LayoutTemplate, accent: "#e85d3f", bullets: ["Current profile structure", "Parking area map", "Account and community links"] },
  { id: "readiness", label: "Readiness", summary: "A control center organized around trust, profile completion, availability, and safe coordination.", icon: Sparkles, accent: "#4b805d", bullets: ["Availability and readiness progress", "Privacy-aware area and schedule summaries", "Safety and reputation actions"] },
  { id: "network", label: "Network", summary: "A community-first profile that puts contributions, connections, and shared parking preferences forward.", icon: Users, accent: "#315c4b", bullets: ["Network and contribution cards", "Community actions and feed access", "Preferences and settings"] },
];

export default function ProfileDesignPage() {
  const [active, setActive] = useState<ProfileVariant>("classic");
  const [selected, setSelected] = useState<ProfileVariant>("classic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setMessage("Your admin session has expired."); setLoading(false); return; }
      const response = await fetch("/api/admin/profile-variant", { headers: { Authorization: `Bearer ${session.access_token}` } });
      const body = await response.json() as { variant?: ProfileVariant; error?: string };
      if (mounted) { if (response.ok && body.variant) { setActive(body.variant); setSelected(body.variant); } else setMessage(body.error || "Unable to load the active variant."); setLoading(false); }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  async function save() {
    setSaving(true); setMessage(null);
    const supabase = createBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { setMessage("Your admin session has expired."); setSaving(false); return; }
    const response = await fetch("/api/admin/profile-variant", { method: "PUT", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ variant: selected }) });
    const body = await response.json() as { variant?: ProfileVariant; error?: string };
    if (response.ok && body.variant) { setActive(body.variant); setMessage("Profile design saved globally."); } else setMessage(body.error || "Unable to save the profile design.");
    setSaving(false);
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f6f8f6] text-sm font-semibold text-[#71807b]"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading profile designs...</div>;
  return <main className="min-h-screen bg-[#f6f8f6] px-5 py-8 text-[#17211e] sm:px-8 lg:px-10 lg:py-10"><div className="mx-auto max-w-6xl"><header><p className="text-xs font-black uppercase tracking-[0.18em] text-[#e85d3f]">Admin / Profile design</p><h1 className="mt-2 text-4xl font-black tracking-[-0.05em]">Choose the profile experience</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#71807b]">Compare the three profile prototypes and publish one global experience. The choice affects the `/profile` route for all authenticated members.</p></header><section className="mt-8 grid gap-5 lg:grid-cols-3">{designs.map((design) => { const Icon = design.icon; const isSelected = selected === design.id; return <button key={design.id} type="button" onClick={() => setSelected(design.id)} aria-pressed={isSelected} className={`group text-left ${isSelected ? "ring-2 ring-[#e85d3f] ring-offset-2" : ""} rounded-3xl border border-[#dce3df] bg-white p-5 shadow-[0_18px_45px_-35px_rgba(23,33,30,0.4)] transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#e85d3f] focus:ring-offset-2`}><div className="h-36 rounded-2xl p-4 text-white" style={{ background: design.accent }}><div className="flex items-center justify-between"><Icon className="h-5 w-5" /><span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]">{design.id}</span></div><div className="mt-8 h-3 w-2/3 rounded-full bg-white/25" /><div className="mt-3 h-2 w-1/2 rounded-full bg-white/15" /><div className="mt-5 flex gap-2"><span className="h-8 flex-1 rounded-xl bg-white/15" /><span className="h-8 w-1/4 rounded-xl bg-white/15" /></div></div><div className="mt-5 flex items-start justify-between gap-3"><div><h2 className="text-xl font-black">{design.label}</h2><p className="mt-2 text-sm leading-5 text-[#71807b]">{design.summary}</p></div>{isSelected && <span className="rounded-full bg-[#fff0eb] p-2 text-[#e85d3f]" aria-label="Selected"><Check className="h-4 w-4" /></span>}</div><ul className="mt-5 space-y-2 text-xs font-bold text-[#52615b]">{design.bullets.map((bullet) => <li key={bullet} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: design.accent }} />{bullet}</li>)}</ul><p className="mt-5 text-[11px] font-black uppercase tracking-[0.12em] text-[#9aa49f]">{active === design.id ? "Active globally" : "Preview option"}</p></button>; })}</section><div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-3xl border border-[#dce3df] bg-white p-5 sm:flex-row sm:items-center"><div><p className="text-sm font-black">Global profile variant: <span className="text-[#e85d3f]">{active}</span></p><p className="mt-1 text-xs text-[#71807b]">Only authorized admins and moderators can save this setting.</p></div><button type="button" disabled={saving || selected === active} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-[#17211e] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save globally"}</button></div>{message && <p role="status" className="mt-4 rounded-xl bg-[#fff0eb] px-4 py-3 text-sm font-bold text-[#a43e2d]">{message}</p>}</div></main>;
}
