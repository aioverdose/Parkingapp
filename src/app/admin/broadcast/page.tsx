"use client";

import { useState } from "react";
import { Loader2, Send, Users } from "lucide-react";

const NOTIFICATION_TYPES = [
  "broadcast", "match", "claim", "agent", "waitlist", "promotional", "system",
];

export default function BroadcastPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("broadcast");
  const [target, setTarget] = useState<"all" | "ids">("all");
  const [userIds, setUserIds] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; errors: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    setError(null);
    setResult(null);

    const { createBrowserClient } = await import("@/lib/supabaseClient");
    const supabase = createBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch("/api/admin/broadcast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        title: title.trim(),
        message: message.trim(),
        type,
        target,
        userIds: target === "ids" ? userIds.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to send");
    } else {
      setResult(data);
      setTitle("");
      setMessage("");
    }
    setSending(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Broadcast Notification</h1>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
        <input
          type="text" value={title} placeholder="Notification title"
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
        />

        <textarea
          rows={4} value={message} placeholder="Notification message"
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition resize-none"
        />

        <select
          value={type} onChange={(e) => setType(e.target.value)}
          className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
        >
          {NOTIFICATION_TYPES.map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="radio" checked={target === "all"} onChange={() => setTarget("all")} />
            <span className="text-sm font-medium">All users</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={target === "ids"} onChange={() => setTarget("ids")} />
            <span className="text-sm font-medium">Specific users (comma-separated IDs)</span>
          </label>
          {target === "ids" && (
            <textarea
              rows={2} value={userIds} placeholder="user-id-1, user-id-2, ..."
              onChange={(e) => setUserIds(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition resize-none"
            />
          )}
        </div>

        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
        {result && (
          <p className="text-emerald-600 text-sm font-medium">
            Sent to {result.sent} users ({result.errors} errors)
          </p>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !title.trim() || !message.trim()}
          className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 text-white font-bold text-sm transition flex items-center justify-center gap-2"
        >
          {sending ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <><Send size={16} /> Send Broadcast</>
          )}
        </button>
      </div>
    </div>
  );
}
