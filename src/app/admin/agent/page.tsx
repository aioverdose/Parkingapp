"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Brain, Send, Loader2, Trash2, Sparkles, RefreshCw } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AgentSnapshot {
  users: number;
  activeSpots: number;
  activeMatches: number;
  ads: number;
  activeChats: number;
  congestionToday: number;
  alertsToday: number;
  predictionsToday: number;
  invitesToday: number;
  topNeighborhoods: { name: string; count: number }[];
  fetchedAt: string;
}

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "Hi, I'm the App Agent for Parking Meeters. Ask me anything about the app — users, active spots, matches, ads, congestion, predictions, or invites — and I'll pull the live numbers.",
};

const SUGGESTIONS = [
  "How many users do we have?",
  "How many active spots right now?",
  "Any congestion alerts today?",
  "How are the ads performing?",
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function AgentChatPage() {
  const supabase = createBrowserClient();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [engine, setEngine] = useState<"ollama" | "template" | null>(null);
  const [snapshot, setSnapshot] = useState<AgentSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();
      if (data?.role === "admin" || data?.role === "moderator") setAuthorized(true);
    });
  }, [supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      const userMessage: ChatMessage = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setSending(true);
      setError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError("Not authenticated");
          return;
        }

        const history = [...messages, userMessage].filter((m) => m.role !== "assistant" || m.content !== WELCOME.content);

        const res = await fetch("/api/agents/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ messages: history }),
        });

        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(body.error || `Server error ${res.status}`);
          return;
        }

        setMessages((prev) => [...prev, { role: "assistant", content: body.reply }]);
        setEngine(body.engine || "template");
        if (body.snapshot) setSnapshot(body.snapshot);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reach the agent");
      } finally {
        setSending(false);
      }
    },
    [messages, sending, supabase],
  );

  const clearChat = () => {
    setMessages([WELCOME]);
    setEngine(null);
    setSnapshot(null);
    setError(null);
    setInput("");
  };

  if (!authorized) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <p className="text-zinc-500">Access denied. Admins only.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white dark:bg-zinc-900 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white">
            <Brain size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">App Agent</h1>
            <p className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Sparkles size={10} className="text-blue-500" />
              Ask about users, spots, matches, ads & more
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {engine && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              engine === "ollama"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              {engine === "ollama" ? "LLM online" : "Smart fallback"}
            </span>
          )}
          <button
            onClick={clearChat}
            title="Clear conversation"
            className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white mr-2 mt-0.5 shrink-0">
                <Brain size={14} />
              </div>
            )}
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-md"
                  : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white mr-2 mt-0.5 shrink-0">
              <Brain size={14} />
            </div>
            <div className="px-4 py-2.5 rounded-2xl text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-bl-md">
              <Loader2 size={16} className="animate-spin text-blue-500" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && !sending && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <p className="px-4 pb-1 text-xs text-red-500">{error}</p>}

      <div className="p-4 pt-2 border-t bg-white dark:bg-zinc-900 shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the agent..."
            maxLength={1000}
            disabled={sending}
            className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white flex items-center justify-center transition"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>

        {snapshot && (
          <button
            onClick={() => setSnapshot(null)}
            className="mt-2 flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-blue-500 transition"
            title="App snapshot used by the agent for this reply"
          >
            <RefreshCw size={10} />
            snapshot: {snapshot.users} users · {snapshot.activeSpots} spots · {snapshot.activeMatches} matches ·{" "}
            {snapshot.ads} ads · fetched {formatTime(snapshot.fetchedAt)}
          </button>
        )}
      </div>
    </div>
  );
}
