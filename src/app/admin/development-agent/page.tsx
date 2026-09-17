"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Brain, Loader2, Send } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

export default function DevelopmentAgentPage() {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "Describe a coding task. I will inspect the GitHub repository context and return findings, exact file paths, a minimal change proposal, and verification steps. I will not claim to edit or deploy until a reviewable PR workflow is explicitly configured." }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const send = async () => {
    const text = input.trim(); if (!text || sending) return;
    const next = [...messages, { role: "user", content: text } as Message]; setMessages(next); setInput(""); setSending(true);
    try {
      const { data: { session } } = await createBrowserClient().auth.getSession();
      const response = await fetch("/api/agents/development", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` }, body: JSON.stringify({ messages: next }) });
      const body = await response.json(); setMessages((current) => [...current, { role: "assistant", content: response.ok ? `${body.reply}\n\nRepository: ${body.repository?.repository || "unknown"}` : body.error || "Development agent failed." }]);
    } catch (error) { setMessages((current) => [...current, { role: "assistant", content: error instanceof Error ? error.message : "Development agent failed." }]); } finally { setSending(false); }
  };
  return <main className="p-6 max-w-4xl mx-auto"><div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 grid place-items-center text-white"><Brain size={20} /></div><div><h1 className="text-2xl font-black">Development Agent</h1><p className="text-sm text-zinc-500">GitHub-context analysis with reviewable engineering guidance.</p></div></div><div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 p-4 text-sm mb-5">Read-only analysis is enabled first. Configure `GITHUB_TOKEN` and `GITHUB_REPOSITORY` in Vercel before adding explicit branch and pull-request actions.</div><div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 min-h-[55vh] flex flex-col"><div className="flex-1 p-5 space-y-4 overflow-y-auto">{messages.map((message, index) => <div key={index} className={`max-w-[90%] rounded-2xl p-4 text-sm whitespace-pre-wrap ${message.role === "user" ? "ml-auto bg-blue-600 text-white" : "bg-zinc-100 dark:bg-zinc-800"}`}>{message.content}</div>)}</div><form onSubmit={(event) => { event.preventDefault(); void send(); }} className="border-t p-4 flex gap-2"><input value={input} onChange={(event) => setInput(event.target.value)} disabled={sending} placeholder="e.g. Add an admin-only API for exporting business metrics" className="flex-1 rounded-xl border px-4 py-3 bg-transparent text-sm" /><button disabled={sending || !input.trim()} className="rounded-xl bg-blue-600 text-white px-4 disabled:opacity-50">{sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}</button></form></div></main>;
}
