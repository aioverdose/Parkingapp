"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { CATEGORY_LABELS, DEPARTURE_CATEGORIES, type DepartureCategory, type KnownDeparture } from "@/lib/business-known-departures";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
type FormState = { category: DepartureCategory; title: string; specific_date: string; days: number[]; start_time: string; end_time: string; lead_minutes: string; notes: string; active: boolean };
const emptyForm = (): FormState => ({ category: "shift_end", title: "", specific_date: "", days: [1, 2, 3, 4, 5], start_time: "17:00", end_time: "", lead_minutes: "10", notes: "", active: true });

export default function KnownDeparturesSection({ businessId, isAdmin }: { businessId: string; isAdmin: boolean }) {
  const [departures, setDepartures] = useState<KnownDeparture[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const authHeaders = async (json = false) => {
    const { data: { session } } = await createBrowserClient().auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}`, ...(json ? { "Content-Type": "application/json" } : {}) } : null;
  };
  const load = async () => {
    const headers = await authHeaders();
    if (!headers) { setMessage("Not authenticated"); setLoading(false); return; }
    const response = await fetch(`/api/businesses/${businessId}/known-departures`, { headers });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(body.error || "Could not load known departures");
    else setDepartures(body.departures ?? []);
    setLoading(false);
  };
  useEffect(() => {
    const loadTimer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(loadTimer);
  }, [businessId]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setMessage(null);
    const headers = await authHeaders(true);
    if (!headers) { setMessage("Not authenticated"); setSaving(false); return; }
    const payload = { category: form.category, title: form.title || null, specific_date: form.specific_date || null, day_of_week: form.specific_date ? null : form.days, start_time: form.start_time, end_time: form.end_time || null, lead_minutes: form.lead_minutes === "" ? null : Number(form.lead_minutes), notes: form.notes || null, active: form.active };
    const response = await fetch(`/api/businesses/${businessId}/known-departures${editing ? `/${editing}` : ""}`, { method: editing ? "PATCH" : "POST", headers, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(Object.values(body.fields ?? {}).join(" ") || body.error || "Could not save entry");
    else { setOpen(false); setEditing(null); setForm(emptyForm()); await load(); }
    setSaving(false);
  };

  const edit = (entry: KnownDeparture) => {
    setEditing(entry.id); setOpen(true); setMessage(null);
    setForm({ category: entry.category, title: entry.title ?? "", specific_date: entry.specific_date ?? "", days: entry.day_of_week ?? [], start_time: entry.start_time.slice(0, 5), end_time: entry.end_time?.slice(0, 5) ?? "", lead_minutes: entry.lead_minutes?.toString() ?? "", notes: entry.notes ?? "", active: entry.active });
  };
  const remove = async (entry: KnownDeparture) => {
    if (!window.confirm(`Delete ${entry.title || CATEGORY_LABELS[entry.category]}?`)) return;
    const headers = await authHeaders();
    if (!headers) return setMessage("Not authenticated");
    const response = await fetch(`/api/businesses/${businessId}/known-departures/${entry.id}`, { method: "DELETE", headers });
    if (!response.ok) { const body = await response.json().catch(() => ({})); setMessage(body.error || "Could not delete entry"); }
    else await load();
  };
  const recurrence = (entry: KnownDeparture) => entry.specific_date ? new Date(`${entry.specific_date}T00:00:00`).toLocaleDateString() : (entry.day_of_week ?? []).map((day) => DAYS[day]).join(", ");

  return <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-8">
    <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
      <div><h2 className="font-bold">Known Departure Times</h2><p className="text-xs text-zinc-500 mt-1">Expected windows for coordination and local pattern awareness, not reserved or guaranteed parking.</p></div>
      {isAdmin && <button onClick={() => { setEditing(null); setForm(emptyForm()); setOpen(!open); setMessage(null); }} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm"><Plus size={15} /> Add</button>}
    </div>
    {isAdmin && open && <form onSubmit={save} className="p-5 border-b border-zinc-200 dark:border-zinc-800 space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">Add times when people usually leave (shift ends, closing, sweeping). These help coordination and local pattern awareness. They do not reserve or guarantee parking.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="text-xs font-medium text-zinc-500">Category *<select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as DepartureCategory })} className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm">{DEPARTURE_CATEGORIES.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}</select></label>
        <label className="text-xs font-medium text-zinc-500">Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Evening shift" className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm" /></label>
        <div className="text-xs font-medium text-zinc-500 md:col-span-2"><span>One-off date or recurring weekdays *</span><div className="flex flex-wrap gap-2 mt-2">{DAYS.map((day, index) => <label key={day} className="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300"><input type="checkbox" checked={!form.specific_date && form.days.includes(index)} onChange={() => setForm({ ...form, specific_date: "", days: form.days.includes(index) ? form.days.filter((d) => d !== index) : [...form.days, index].sort() })} />{day}</label>)}</div><input type="date" value={form.specific_date} onChange={(e) => setForm({ ...form, specific_date: e.target.value, days: [] })} className="mt-2 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm" /></div>
        <label className="text-xs font-medium text-zinc-500">Start time *<input required type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm" /></label>
        <label className="text-xs font-medium text-zinc-500">End time<input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm" /></label>
        <label className="text-xs font-medium text-zinc-500">Lead minutes<input type="number" min="0" max="1440" value={form.lead_minutes} onChange={(e) => setForm({ ...form, lead_minutes: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm" /></label>
        <label className="text-xs font-medium text-zinc-500 md:col-span-2">Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
      </div>
      {message && <p className="text-sm text-red-600">{message}</p>}<div className="flex gap-2"><button disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">{saving ? "Saving..." : editing ? "Save Changes" : "Add Departure"}</button><button type="button" onClick={() => { setOpen(false); setEditing(null); }} className="flex items-center gap-1 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm"><X size={15} /> Cancel</button></div>
    </form>}
    {message && !open && <p className="p-4 text-sm text-red-600">{message}</p>}
    {loading ? <p className="p-5 text-sm text-zinc-500">Loading known departure times...</p> : departures.length === 0 ? <p className="p-5 text-sm text-zinc-500">Add expected exit times like shift ends, closing, or sweeping windows.</p> : <div className="divide-y divide-zinc-100 dark:divide-zinc-800">{departures.map((entry) => <div key={entry.id} className="p-4 flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{entry.title || CATEGORY_LABELS[entry.category]}</p><span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{CATEGORY_LABELS[entry.category]}</span><span className={`text-[10px] px-2 py-0.5 rounded-full ${entry.active ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"}`}>{entry.active ? "Active" : "Inactive"}</span></div><p className="text-xs text-zinc-500 mt-1">{recurrence(entry)} · {entry.start_time.slice(0, 5)}{entry.end_time ? `–${entry.end_time.slice(0, 5)}` : ""} · {entry.timezone}</p>{entry.notes && <p className="text-xs text-zinc-500 mt-1 truncate">{entry.notes}</p>}</div>{isAdmin && <div className="flex gap-1 shrink-0"><button aria-label="Edit departure" onClick={() => edit(entry)} className="p-2 text-zinc-500 hover:text-blue-600"><Pencil size={15} /></button><button aria-label="Delete departure" onClick={() => remove(entry)} className="p-2 text-zinc-500 hover:text-red-600"><Trash2 size={15} /></button></div>}</div>)}</div>}
  </section>;
}
