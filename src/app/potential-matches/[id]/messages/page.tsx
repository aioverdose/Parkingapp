"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";

type Message = { id: string; sender_id: string; content: string; created_at: string };

export default function PotentialMessagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const session = (await createBrowserClient().auth.getSession()).data.session;
    if (!session) return;
    setUserId(session.user.id);
    const response = await fetch(`/api/potential-matches/${id}/messages`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    const body = await response.json().catch(() => ({})) as { messages?: Message[]; error?: string };
    if (!response.ok) setError(body.error || "Messenger unavailable");
    else setMessages(body.messages ?? []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [id]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    const session = (await createBrowserClient().auth.getSession()).data.session;
    if (!session) return;
    const response = await fetch(`/api/potential-matches/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ content: draft }),
    });
    if (response.ok) { setDraft(""); void load(); }
    else { const body = await response.json().catch(() => ({})) as { error?: string }; setError(body.error || "Message failed"); }
  }

  async function action(name: string, body: Record<string, string> = {}) {
    const session = (await createBrowserClient().auth.getSession()).data.session;
    if (!session) return;
    const response = await fetch(`/api/potential-matches/${id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: name, ...body }),
    });
    if (response.ok) {
      if (["end_conversation", "cancel_coordination", "block", "report"].includes(name)) window.location.href = `/potential-matches/${id}`;
    } else {
      const result = await response.json().catch(() => ({})) as { error?: string };
      setError(result.error || "Action failed");
    }
  }

  return <main className="mx-auto max-w-xl p-6 sm:p-10"><Link href={`/potential-matches/${id}`} className="text-sm font-bold text-[#2457d6]">Back to match</Link><section className="mt-6 rounded-3xl border border-[#dce3df] bg-white p-5 shadow-sm"><h1 className="text-2xl font-black">Coordination messages</h1><div className="mt-5 max-h-[55vh] space-y-3 overflow-y-auto">{messages.map((message) => <div key={message.id} className={`flex ${message.sender_id === userId ? "justify-end" : "justify-start"}`}><p className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${message.sender_id === userId ? "bg-[#2457d6] text-white" : "bg-[#f1f4f2] text-[#17211e]"}`}>{message.content}</p></div>)}</div>{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<form onSubmit={(event) => void send(event)} className="mt-5 flex gap-2"><input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={500} placeholder="Timing, vehicle, or lawful handoff area" className="min-w-0 flex-1 rounded-xl border border-[#dce3df] px-3 py-2.5 text-sm" /><button className="rounded-xl bg-[#2457d6] px-4 py-2.5 text-sm font-black text-white">Send</button></form><div className="mt-4 flex gap-3 text-xs font-bold"><button type="button" onClick={() => void action("end_conversation")} className="text-[#d94f35]">End conversation</button><button type="button" onClick={() => void action("report", { category: "other", reason: "Reported from conversation" })} className="text-[#71807b]">Report</button></div></section></main>;
}
