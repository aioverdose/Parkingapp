"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";

export default function MessengerOperationsAndSafetyCenter() {
  const supabase = createBrowserClient();
  const [token, setToken] = useState("");
  const [timeframe, setTimeframe] = useState("today");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function request(path: string, init?: RequestInit) {
    return fetch(path, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers || {}) } });
  }
  async function load() {
    if (!token) return;
    setLoading(true);
    const response = await request(`/api/admin/messenger?timeframe=${timeframe}`);
    setData(response.ok ? await response.json() : null);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setToken(session?.access_token || ""));
  }, [supabase]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [token, timeframe]);

  return (
    <main className="min-h-screen bg-[#f6f8f5] p-5 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e85d3f]\">Operations</p><h1 className="text-3xl font-black text-[#17211e]\">Messenger Operations and Safety Center</h1><p className="mt-1 text-sm text-zinc-500">Privacy-first. Operations and safety monitoring for match-specific coordination.</p></div>
          <button onClick={() => void load()} className="flex items-center gap-2 rounded-xl border border-[#dce3df] bg-white px-4 py-2 text-sm font-bold">Refresh</button>
        </header>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {['Active Sessions', 'Match Creation', 'Message Volume', 'Open Reports'].map((label) => (
            <div key={label} className="rounded-2xl border border-[#dce3df] bg-white p-5">
              <p className="text-xs font-bold uppercase text-zinc-400">{label}</p>
              <p className="mt-2 text-2xl font-black text-[#17211e]\">0</p>
              <p className="mt-1 text-xs text-zinc-500">Live metric</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}