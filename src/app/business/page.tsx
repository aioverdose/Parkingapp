"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Building2, Plus, ArrowRight, Loader2 } from "lucide-react";

interface BusinessMembership {
  business: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    plan: string;
    status: string;
    primary_network_id: string | null;
  };
  role: "admin" | "staff" | "member";
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    address: "",
    phone: "",
    operating_lat: "33.7637",
    operating_lng: "-118.1679",
    operating_radius_meters: "200",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = async () => {
    const supabase = createBrowserClient();
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Not authenticated");
        return;
      }
      const res = await fetch("/api/businesses", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Server error ${res.status}`);
        return;
      }
      const data = await res.json();
      setBusinesses(data.businesses ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load businesses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setSaveError("Not authenticated");
        return;
      }
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          description: form.description || null,
          address: form.address || null,
          phone: form.phone || null,
          operating_lat: Number(form.operating_lat),
          operating_lng: Number(form.operating_lng),
          operating_radius_meters: Number(form.operating_radius_meters),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSaveError(body.error || `Server error ${res.status}`);
        return;
      }
      const data = await res.json();
      setShowCreate(false);
      setForm({ name: "", slug: "", description: "", address: "", phone: "", operating_lat: "33.7637", operating_lng: "-118.1679", operating_radius_meters: "200" });
      await load();
      window.location.href = `/business/${data.business.id}`;
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to create business");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 max-w-4xl mx-auto text-center py-12 text-zinc-500">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Your Businesses</h1>
          <p className="text-sm text-zinc-500 mt-1">Parking coordination for your team and network.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700"
        >
          <Plus size={16} /> New Business
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl p-4 text-sm mb-6">{error}</div>
      )}

      {showCreate && (
        <form onSubmit={create} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-6 space-y-4">
          <h2 className="font-bold">Create a business</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Business name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                placeholder="e.g. Belmont Brewing Co"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Slug * (lowercase, dashes)</label>
              <input
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                placeholder="belmont-brewing"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-zinc-500 block mb-1">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                placeholder="What your team coordinates over"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Address</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                placeholder="2nd St, Long Beach"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                placeholder="(562) 555-0123"
              />
            </div>
             <div className="md:col-span-2">
               <p className="text-xs font-medium text-zinc-500">Operating area saved privately</p>
               <input type="hidden" value={form.operating_lat} readOnly />
               <input type="hidden" value={form.operating_lng} readOnly />
             </div>
          </div>
          {saveError && <p className="text-red-500 text-sm">{saveError}</p>}
          <button
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {saving && <Loader2 size={16} className="animate-spin" />} Create Business
          </button>
        </form>
      )}

      {businesses.length === 0 && !showCreate ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <Building2 size={40} className="mx-auto text-zinc-300 mb-3" />
          <p className="font-semibold">No businesses yet</p>
          <p className="text-sm text-zinc-500 mt-1">Create a business to start coordinating parking with your team.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {businesses.map((m) => (
            <a
              key={m.business.id}
              href={`/business/${m.business.id}`}
              className="flex items-center justify-between gap-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 hover:border-blue-400 transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Building2 size={20} />
                </div>
                <div>
                  <p className="font-bold">{m.business.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {m.role} · {m.business.plan} · {m.business.status}
                  </p>
                </div>
              </div>
              <span className="text-zinc-400"><ArrowRight size={18} /></span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
