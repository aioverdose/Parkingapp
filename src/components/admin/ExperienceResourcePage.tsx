"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";

type Props = { resource: string; title: string; description: string; singleton?: boolean };

export function ExperienceResourcePage({ resource, title, description, singleton }: Props) {
  const [data, setData] = useState<any>(singleton ? null : []);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const { data: { session } } = await createBrowserClient().auth.getSession();
    if (!session) { setMessage("Your admin session has expired."); setLoading(false); return; }
    const response = await fetch(`/api/admin/experience/${resource}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    const body = await response.json();
    setData(body.data ?? (singleton ? {} : []));
    setMessage(response.ok ? "" : body.error || "Unable to load.");
    setLoading(false);
  }

  useEffect(() => { void load(); }, [resource]);

  async function save(action?: string) {
    const { data: { session } } = await createBrowserClient().auth.getSession();
    if (!session) return;
    const body = singleton ? { action, draft: data?.draft ?? data } : { ...(data || {}), id: data?.id, action };
    const response = await fetch(`/api/admin/experience/${resource}`, { method: "PUT", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setMessage(response.ok ? action === "publish" ? "Published." : "Saved draft." : (await response.json()).error || "Save failed.");
    if (response.ok) void load();
  }

  async function archive(row: any) {
    if (!window.confirm(`Archive ${row.label || row.name || row.title}? It will disappear from published Explore.`)) return;
    const reason = window.prompt("Reason for archiving this category (required)");
    if (!reason?.trim()) return;
    const { data: { session } } = await createBrowserClient().auth.getSession();
    if (!session) return;
    const response = await fetch(`/api/admin/experience/${resource}`, { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, reason: reason.trim() }) });
    const body = await response.json();
    setMessage(response.ok ? "Category archived." : body.error || "Archive failed.");
    if (response.ok) void load();
  }

  return <main className="min-h-screen bg-[#f6f8f6] px-5 py-8 text-[#17211e] sm:px-8 lg:px-10"><div className="mx-auto max-w-6xl"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#e85d3f]">Admin / Experience management</p><h1 className="mt-2 text-4xl font-black tracking-[-0.05em]">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#71807b]">{description}</p>{message && <p role="status" className="mt-5 rounded-xl bg-[#fff0eb] p-3 text-sm font-semibold text-[#8d3d2d]">{message}</p>}{loading ? <p className="mt-8 text-sm text-[#71807b]">Loading configuration...</p> : !singleton && Array.isArray(data) ? <div className="mt-8 grid gap-3">{data.length === 0 ? <div className="rounded-2xl border border-dashed border-[#cbdcd3] bg-white p-8 text-sm text-[#71807b]">No records yet.</div> : data.map((row: any) => <div key={row.id || row.name} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#dce3df] bg-white p-4"><div><div className="flex items-center gap-2"><h2 className="font-black">{row.label || row.name || row.title}</h2><span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase text-zinc-600">{row.status || "draft"}</span></div><p className="mt-1 text-xs text-[#71807b]">{row.description || row.slug}</p></div><div className="flex gap-2"><button className="rounded-xl border border-[#dce3df] px-3 py-2 text-xs font-bold" onClick={() => setData(row)}>Edit</button>{row.status !== "published" && row.status !== "archived" && <button className="rounded-xl bg-[#e85d3f] px-3 py-2 text-xs font-bold text-white" onClick={() => { setData(row); void save("publish"); }}>Publish</button>}{resource === "categories" && row.status !== "archived" && <button className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-700" onClick={() => void archive(row)}>Archive</button>}</div></div>)}</div> : <div className="mt-8 max-w-2xl rounded-3xl border border-[#dce3df] bg-white p-6 shadow-sm"><label className="block text-sm font-bold">Draft JSON</label><textarea value={JSON.stringify(data?.draft ?? data, null, 2)} onChange={(event) => { try { setData((current: any) => ({ ...current, draft: JSON.parse(event.target.value) })); } catch { /* wait for valid JSON */ } }} className="mt-2 min-h-64 w-full rounded-xl border border-[#dce3df] p-3 font-mono text-xs" aria-label="Draft JSON" /><button className="mt-4 rounded-xl bg-[#17211e] px-4 py-2 text-sm font-bold text-white" onClick={() => void save()}>Save draft</button></div>}</div></main>;
}
