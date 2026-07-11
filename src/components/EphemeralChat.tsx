"use client";

import { useState, useEffect, useRef } from "react";
import { sendChatMessage, getChatMessages, closeChat } from "@/actions/social";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Loader2, Send, X, MessageSquare } from "lucide-react";

interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface EphemeralChatProps {
  chatId: string;
  spotId: string;
  otherUserName?: string;
  onClose: () => void;
}

export function EphemeralChat({ chatId, spotId, otherUserName, onClose }: EphemeralChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createBrowserClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, [supabase]);

  useEffect(() => {
    async function load() {
      const msgs = await getChatMessages(chatId);
      setMessages(msgs as ChatMessage[]);
    }
    load();
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ephemeral_messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMsg]);
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [chatId, supabase]);

  const handleSend = async () => {
    if (!input.trim() || !userId) return;
    setSending(true);
    setError(null);

    const result = await sendChatMessage(chatId, userId, input);
    if (result.error) {
      setError(result.error);
      setSending(false);
      return;
    }

    setInput("");
    setSending(false);
  };

  const handleClose = async () => {
    await closeChat(chatId);
    onClose();
  };

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-blue-600" />
          <span className="font-bold text-sm">
            {otherUserName ? `Chat with ${otherUserName}` : "Spot Handoff Chat"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-400">Auto-closes in 30min</span>
          <button onClick={handleClose} className="text-zinc-400 hover:text-zinc-600">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-zinc-400 text-sm py-8">No messages yet. Say hello!</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender_id === userId ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                msg.sender_id === userId
                  ? "bg-blue-600 text-white rounded-br-md"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-1 text-xs text-red-500">{error}</p>}

      <div className="p-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            maxLength={500}
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
      </div>
    </div>
  );
}
