"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Loader2, Plus, Pencil, Trash2, Globe } from "lucide-react";

interface PilotArea {
  id: string;
  name: string;
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
  active: boolean;
  created_at: string;
}

export default function AdminPilotAreasPage() {
  const supabase = createBrowserClient();
  const [areas, setAreas] = useState<PilotArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PilotArea | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [minLat, setMinLat] = useState("");
  const [maxLat, setMaxLat] = useState("");
  const [minLng, setMinLng] = useState("");
  const [maxLng, setMaxLng] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await (supabase as any)
      .from("pilot_areas")
      .select("*")
      .order("created_at", { ascending: false });
    setAreas((data ?? []) as PilotArea[]);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setName(""); setMinLat(""); setMaxLat(""); setMinLng(""); setMaxLng(""); setActive(true);
    setShowForm(true);
  }

  function openEdit(area: PilotArea) {
    setEditing(area);
    setName(area.name);
    setMinLat(String(area.min_lat));
    setMaxLat(String(area.max_lat));
    setMinLng(String(area.min_lng));
    setMaxLng(String(area.max_lng));
    setActive(area.active);
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name,
      min_lat: parseFloat(minLat),
      max_lat: parseFloat(maxLat),
      min_lng: parseFloat(minLng),
      max_lng: parseFloat(maxLng),
      active,
    };

    if (editing) {
      await (supabase as any).from("pilot_areas").update(payload).eq("id", editing.id);
    } else {
      await (supabase as any).from("pilot_areas").insert(payload);
    }

    setSaving(false);
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this pilot area?")) return;
    await (supabase as any).from("pilot_areas").delete().eq("id", id);
    load();
  }

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pilot Areas</h1>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition">
          <Plus size={18} /> New Area
        </button>
      </div>

      {areas.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          <Globe className="mx-auto mb-4 opacity-30" size={48} />
          <p className="font-medium">No pilot areas defined</p>
          <p className="text-sm mt-1">Define geographic areas where the app is active.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {areas.map((a) => (
            <div key={a.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 shrink-0">
                  <Globe size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{a.name}</span>
                    {!a.active && <span className="text-[10px] bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded-full text-zinc-500">Inactive</span>}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 font-mono">
                    Lat: {a.min_lat} to {a.max_lat} &middot; Lng: {a.min_lng} to {a.max_lng}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Created {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(a)} className="p-2 text-zinc-400 hover:text-blue-600 transition"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(a.id)} className="p-2 text-zinc-400 hover:text-red-600 transition"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editing ? "Edit Pilot Area" : "New Pilot Area"}</h2>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <input placeholder="Area Name" required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Min Latitude" required type="number" step="any" value={minLat} onChange={(e) => setMinLat(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
                <input placeholder="Max Latitude" required type="number" step="any" value={maxLat} onChange={(e) => setMaxLat(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
                <input placeholder="Min Longitude" required type="number" step="any" value={minLng} onChange={(e) => setMinLng(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
                <input placeholder="Max Longitude" required type="number" step="any" value={maxLng} onChange={(e) => setMaxLng(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-600">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded" />
                Active
              </label>
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
