"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Plus, Pencil, Trash2, ExternalLink, Loader2 } from "lucide-react";

interface Ad {
  id: string;
  title: string;
  business_name: string;
  tagline: string | null;
  image_url: string | null;
  link_url: string | null;
  active: boolean;
  start_date: string;
  end_date: string | null;
  impressions: number;
  clicks: number;
}

export default function AdminAdsPage() {
  const supabase = createBrowserClient();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Ad | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [tagline, setTagline] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [active, setActive] = useState(true);
  const [endDate, setEndDate] = useState("");

  async function loadAds() {
    const { data } = await supabase.from("ads").select("*").order("created_at", { ascending: false });
    setAds((data ?? []) as Ad[]);
    setLoading(false);
  }

  useEffect(() => { loadAds(); }, []);

  function openNew() {
    setEditing(null);
    setTitle(""); setBusinessName(""); setTagline(""); setImageUrl(""); setLinkUrl(""); setActive(true); setEndDate("");
    setShowForm(true);
  }

  function openEdit(ad: Ad) {
    setEditing(ad);
    setTitle(ad.title); setBusinessName(ad.business_name); setTagline(ad.tagline ?? "");
    setImageUrl(ad.image_url ?? ""); setLinkUrl(ad.link_url ?? ""); setActive(ad.active);
    setEndDate(ad.end_date ? ad.end_date.split("T")[0] : "");
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title,
      business_name: businessName,
      tagline: tagline || null,
      image_url: imageUrl || null,
      link_url: linkUrl || null,
      active,
      end_date: endDate ? new Date(endDate).toISOString() : null,
    };

    if (editing) {
      await supabase.from("ads").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("ads").insert(payload);
    }

    setSaving(false);
    setShowForm(false);
    loadAds();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this ad?")) return;
    await supabase.from("ads").delete().eq("id", id);
    loadAds();
  }

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Ad Campaigns</h1>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition">
          <Plus size={18} /> New Ad
        </button>
      </div>

      {ads.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <MegaphoneIcon className="mx-auto mb-4 opacity-30" size={48} />
          <p className="font-medium">No ads yet</p>
          <p className="text-sm">Create your first ad campaign for local businesses</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {ads.map((ad) => (
            <div key={ad.id} className="flex items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{ad.title}</span>
                  {!ad.active && <span className="text-[10px] bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded-full text-zinc-500">Inactive</span>}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{ad.business_name}{ad.tagline ? ` — ${ad.tagline}` : ""}</p>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-400">
                  <span>{ad.impressions} impressions</span>
                  <span>{ad.clicks ?? 0} clicks</span>
                  <span>CTR: {ad.impressions > 0 ? ((ad.clicks ?? 0) / ad.impressions * 100).toFixed(1) : "0.0"}%</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(ad)} className="p-2 text-zinc-400 hover:text-blue-600 transition"><Pencil size={16} /></button>
                <button onClick={() => handleDelete(ad.id)} className="p-2 text-zinc-400 hover:text-red-600 transition"><Trash2 size={16} /></button>
                {ad.link_url && (
                  <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="p-2 text-zinc-400 hover:text-blue-600 transition"><ExternalLink size={16} /></a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editing ? "Edit Ad" : "New Ad Campaign"}</h2>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <input placeholder="Ad Title" required value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
              <input placeholder="Business Name" required value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
              <input placeholder="Tagline (optional)" value={tagline} onChange={(e) => setTagline(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
              <input placeholder="Image URL (optional)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
              <input placeholder="Link URL (optional)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
              <div className="flex items-center gap-3">
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
                <label className="flex items-center gap-2 text-sm text-zinc-600">
                  <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded" />
                  Active
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-sm transition">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 h-12 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:bg-zinc-300 transition">
                  {saving ? <Loader2 className="animate-spin mx-auto" /> : editing ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MegaphoneIcon({ className, size }: { className?: string; size?: number }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
}
