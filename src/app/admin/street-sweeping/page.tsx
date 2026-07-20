"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Loader2, Plus, Pencil, Trash2, Search, Truck } from "lucide-react";

interface SweepingEntry {
  id: string;
  street_name: string;
  city: string;
  day_of_week: string;
  time_start: string;
  time_end: string;
  zone: string;
  holiday_exemptions: string[];
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function AdminStreetSweepingPage() {
  const supabase = createBrowserClient();
  const [entries, setEntries] = useState<SweepingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SweepingEntry | null>(null);
  const [saving, setSaving] = useState(false);

  const [streetName, setStreetName] = useState("");
  const [city, setCity] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("Monday");
  const [timeStart, setTimeStart] = useState("08:00");
  const [timeEnd, setTimeEnd] = useState("10:00");
  const [zone, setZone] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load(searchTerm?: string) {
    let query = (supabase as any)
      .from("street_sweeping")
      .select("*")
      .order("street_name", { ascending: true });

    if (searchTerm) {
      query = query.or(`street_name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,zone.ilike.%${searchTerm}%`);
    }

    const { data } = await query;
    setEntries((data ?? []) as SweepingEntry[]);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setStreetName(""); setCity(""); setDayOfWeek("Monday"); setTimeStart("08:00"); setTimeEnd("10:00"); setZone("");
    setShowForm(true);
  }

  function openEdit(entry: SweepingEntry) {
    setEditing(entry);
    setStreetName(entry.street_name);
    setCity(entry.city);
    setDayOfWeek(entry.day_of_week);
    setTimeStart(entry.time_start.slice(0, 5));
    setTimeEnd(entry.time_end.slice(0, 5));
    setZone(entry.zone);
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      street_name: streetName,
      city: city || "",
      day_of_week: dayOfWeek,
      time_start: timeStart,
      time_end: timeEnd,
      zone: zone || "",
    };

    if (editing) {
      await (supabase as any).from("street_sweeping").update(payload).eq("id", editing.id);
    } else {
      await (supabase as any).from("street_sweeping").insert(payload);
    }

    setSaving(false);
    setShowForm(false);
    load(search || undefined);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this street sweeping entry?")) return;
    await (supabase as any).from("street_sweeping").delete().eq("id", id);
    load(search || undefined);
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search || undefined);
  };

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Street Sweeping Schedules</h1>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition">
          <Plus size={18} /> Add Entry
        </button>
      </div>

      <form onSubmit={handleSearch} className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input
          type="text"
          placeholder="Search by street, city, or zone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-24 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
        />
        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 h-9 px-4 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition">
          Search
        </button>
      </form>

      {entries.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          <Truck className="mx-auto mb-4 opacity-30" size={48} />
          <p className="font-medium">No schedules found</p>
          <p className="text-sm mt-1">Add street sweeping schedules to alert users.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
                  <th className="text-left p-4 font-medium">Street</th>
                  <th className="text-left p-4 font-medium">City</th>
                  <th className="text-left p-4 font-medium">Day</th>
                  <th className="text-left p-4 font-medium">Time</th>
                  <th className="text-left p-4 font-medium">Zone</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="p-4 font-medium">{entry.street_name}</td>
                    <td className="p-4 text-zinc-500">{entry.city}</td>
                    <td className="p-4">{entry.day_of_week}</td>
                    <td className="p-4 font-mono text-xs">{entry.time_start.slice(0, 5)} - {entry.time_end.slice(0, 5)}</td>
                    <td className="p-4">
                      <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full font-medium">{entry.zone || "—"}</span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => openEdit(entry)} className="p-1.5 text-zinc-400 hover:text-blue-600 transition"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-zinc-400 hover:text-red-600 transition"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 text-xs text-zinc-400 border-t border-zinc-100 dark:border-zinc-800">
            {entries.length} entr{entries.length === 1 ? "y" : "ies"}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editing ? "Edit Schedule" : "New Schedule"}</h2>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Street Name" required value={streetName} onChange={(e) => setStreetName(e.target.value)}
                  className="col-span-2 w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
                <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
                <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition appearance-none">
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <div>
                  <label className="text-[10px] text-zinc-500 font-medium">Start</label>
                  <input type="time" required value={timeStart} onChange={(e) => setTimeStart(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-medium">End</label>
                  <input type="time" required value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
                </div>
                <input placeholder="Zone (optional)" value={zone} onChange={(e) => setZone(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
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
