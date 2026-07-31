"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Loader2, ArrowLeft, MessageSquare, Send, X, Clock } from "lucide-react";

interface ChatSummary {
  id: string;
  spot_id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  expires_at: string;
  other_user: { name: string | null; email: string | null };
  last_message?: { content: string; created_at: string; sender_id: string };
}

export default function MessagesPage() {
  const supabase = createBrowserClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ id: string; sender_id: string; content: string; created_at: string }[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const loadChats = useCallback(async (uid: string) => {
    const { createAdminClient } = await import("@/lib/supabaseAdmin");
    const admin = createAdminClient();

    const { data: allChats } = await admin
      .from("ephemeral_chats")
      .select("id, spot_id, sender_id, receiver_id, status, created_at, expires_at")
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .gt("expires_at", new Date(Date.now() - 86400000).toISOString())
      .order("created_at", { ascending: false })
      .limit(50);

    if (!allChats) { setLoading(false); return; }

    const enriched: ChatSummary[] = [];
    for (const c of allChats) {
      const otherId = c.sender_id === uid ? c.receiver_id : c.sender_id;
      const { data: user } = await admin.from("users").select("name, email").eq("id", otherId).single();
      const { data: lastMsg } = await admin
        .from("ephemeral_messages")
        .select("content, created_at, sender_id")
        .eq("chat_id", c.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      enriched.push({
        ...c,
        other_user: { name: user?.name || null, email: user?.email || null },
        last_message: lastMsg || undefined,
      });
    }
    setChats(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.push("/"); return; }
      setUserId(session.user.id);
      loadChats(session.user.id);
    });
  }, [router, supabase, loadChats]);

  const openChat = async (chatId: string) => {
    setOpenChatId(chatId);
    const admin = (await import("@/lib/supabaseAdmin")).createAdminClient();
    const { data: msgs } = await admin
      .from("ephemeral_messages")
      .select("id, sender_id, content, created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });
    setMessages(msgs || []);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !openChatId || !userId) return;
    setSending(true);
    const { sendChatMessage } = await import("@/actions/social");
    const result = await sendChatMessage(openChatId, userId, newMessage.trim());
    if (result.error) { setSending(false); return; }
    const admin = (await import("@/lib/supabaseAdmin")).createAdminClient();
    const { data: msgs } = await admin
      .from("ephemeral_messages")
      .select("id, sender_id, content, created_at")
      .eq("chat_id", openChatId)
      .order("created_at", { ascending: true });
    setMessages(msgs || []);
    setNewMessage("");
    setSending(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-lg mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => openChatId ? setOpenChatId(null) : router.push("/")} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">{openChatId ? "Chat" : "Messages"}</h1>
        </div>

        {openChatId ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col" style={{ height: "70vh" }}>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-zinc-400 text-sm text-center py-8">No messages yet</p>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender_id === userId ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                    m.sender_id === userId
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-md"
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-200 dark:border-zinc-800 p-3 flex gap-2">
              <input
                type="text" value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
              <button
                onClick={handleSend} disabled={sending || !newMessage.trim()}
                className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 text-white flex items-center justify-center transition"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.length === 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
                <MessageSquare size={40} className="mx-auto text-zinc-300 mb-3" />
                <p className="text-zinc-500 text-sm">No messages yet</p>
                <p className="text-zinc-400 text-xs mt-1">Messages from spot matches will appear here.</p>
              </div>
            )}
            {chats.map((c) => (
              <button
                key={c.id}
                onClick={() => openChat(c.id)}
                className="w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 text-left hover:border-zinc-300 dark:hover:border-zinc-700 transition"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">{c.other_user.name || c.other_user.email || "Unknown"}</span>
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${c.status === "active" ? "bg-emerald-500" : "bg-zinc-300"}`} />
                    <span className="text-[10px] text-zinc-400">{c.status}</span>
                  </div>
                </div>
                {c.last_message && (
                  <p className="text-xs text-zinc-500 truncate">
                    {c.last_message.sender_id === userId && "You: "}{c.last_message.content}
                  </p>
                )}
                <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-400">
                  <Clock size={10} />
                  {new Date(c.created_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
