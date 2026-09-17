"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { acceptChat, getChatMessages, getUserChats } from "@/actions/social";
import { Loader2, ArrowLeft, MessageSquare, Send, Clock, MapPin } from "lucide-react";

type MatchStatus = "pending" | "offered" | "confirmed_by_owner" | "confirmed_by_seeker" | "confirmed";
interface Match {
  id: string; spot_id: string; spot_owner_id: string; seeker_id: string; status: MatchStatus;
  spot?: { address?: string | null; departure_time?: string | null; return_time?: string | null };
  spot_owner?: { name?: string | null; email?: string | null; schedule_departure?: string | null };
  seeker?: { name?: string | null; email?: string | null; schedule_departure?: string | null };
}
interface ChatSummary {
  id: string; spot_id: string; sender_id: string; receiver_id: string; status: string;
  created_at: string; expires_at: string; other_user: { name: string | null; email: string | null };
  last_message?: { content: string; created_at: string; sender_id: string };
}
type Message = { id: string; sender_id: string; content: string; created_at: string };

const MATCH_STATUSES: MatchStatus[] = ["pending", "offered", "confirmed_by_owner", "confirmed_by_seeker"];

function formatWallClock(value?: string | null) {
  if (!value) return null;
  const [hourText, minute = "00"] = value.split(":");
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) return null;
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
}

function MessagesContent() {
  const supabase = createBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedMatchId = searchParams.get("match");
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [matchAction, setMatchAction] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  const loadChats = useCallback(async (uid: string) => {
    const allChats = await getUserChats(uid);
    const enriched: ChatSummary[] = [];
    for (const c of allChats) {
      const otherId = c.sender_id === uid ? c.receiver_id : c.sender_id;
      const { data: user } = await supabase.from("users").select("name, email").eq("id", otherId).single();
      const { data: lastMsg } = await supabase.from("ephemeral_messages").select("content, created_at, sender_id").eq("chat_id", c.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      enriched.push({ ...c, other_user: { name: user?.name || null, email: user?.email || null }, last_message: lastMsg || undefined });
    }
    setChats(enriched);
    setLoading(false);
    return enriched;
  }, [supabase]);

  const loadMatches = useCallback(async (accessToken: string) => {
    const response = await fetch("/api/matches?status=all", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    if (!response.ok) { setMatchError(`Could not load matches (${response.status}).`); return []; }
    const body = await response.json() as { matches?: Match[] };
    const active = (body.matches ?? []).filter((match) => MATCH_STATUSES.includes(match.status) || match.status === "confirmed");
    setMatches(active);
    return active;
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user || !session.access_token) { router.push("/"); return; }
      setUserId(session.user.id); setToken(session.access_token);
      const [loadedChats, loadedMatches] = await Promise.all([loadChats(session.user.id), loadMatches(session.access_token)]);
      const requestedMatch = loadedMatches.find((match) => match.id === requestedMatchId && match.status === "confirmed");
      const requestedChat = requestedMatch && loadedChats.find((chat) => chat.spot_id === requestedMatch.spot_id);
      if (requestedChat) {
        setOpenChatId(requestedChat.id);
        setMessages((await getChatMessages(requestedChat.id)) as Message[]);
      }
    });
  }, [router, supabase, loadChats, loadMatches, requestedMatchId]);

  const openChat = async (chatId: string) => {
    setOpenChatId(chatId); setAccepted(false);
    const [loadedMessages, settings] = await Promise.all([
      getChatMessages(chatId),
      supabase
        .from("messenger_conversation_settings")
        .select("free_form_enabled, mutual_acceptance_at")
        .eq("conversation_id", chatId)
        .maybeSingle(),
    ]);
    setAccepted(Boolean(settings.data?.free_form_enabled && settings.data.mutual_acceptance_at));
    setMessages(loadedMessages as Message[]);
  };

  const acceptMatch = async (match: Match) => {
    if (!token || !userId) return;
    setMatchAction(match.id); setMatchError(null);
    const response = await fetch(`/api/matches/${match.id}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "confirm" }) });
    const body = await response.json().catch(() => ({})) as { error?: string; status?: string };
    if (!response.ok) { setMatchError(`${body.error || "Could not accept match."} (${response.status})`); setMatchAction(null); return; }
    const updated = { ...match, status: body.status as MatchStatus };
    setMatches((current) => current.map((item) => item.id === match.id ? updated : item));
    const refreshedChats = await loadChats(userId);
    if (body.status === "confirmed") {
      const chat = refreshedChats.find((item) => item.spot_id === match.spot_id);
      if (chat) await openChat(chat.id);
    }
    setMatchAction(null);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !openChatId || !userId) return;
    setSending(true);
    const { sendChatMessage } = await import("@/actions/social");
    const result = await sendChatMessage(openChatId, userId, newMessage.trim());
    if (!result.error) { setMessages((await getChatMessages(openChatId)) as Message[]); setNewMessage(""); }
    setSending(false);
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  const pendingMatches = matches.filter((match) => MATCH_STATUSES.includes(match.status));
  const focusedMatch = pendingMatches.find((match) => match.id === requestedMatchId) || pendingMatches[0];
  const isOwner = focusedMatch ? focusedMatch.spot_owner_id === userId : false;
  const mineAccepted = focusedMatch ? focusedMatch.status === (isOwner ? "confirmed_by_owner" : "confirmed_by_seeker") || focusedMatch.status === "confirmed" : false;
  const otherAccepted = focusedMatch ? focusedMatch.status === (isOwner ? "confirmed_by_seeker" : "confirmed_by_owner") || focusedMatch.status === "confirmed" : false;
  const counterpart = focusedMatch ? (isOwner ? focusedMatch.seeker : focusedMatch.spot_owner) : null;
  const ownerClock = formatWallClock(focusedMatch?.spot_owner?.schedule_departure);
  const schedule = ownerClock || (focusedMatch?.spot?.departure_time ? new Date(focusedMatch.spot.departure_time).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Schedule not available");

  const canAcceptMatch = Boolean(focusedMatch && !mineAccepted && (focusedMatch.status !== "offered" || !isOwner));

  return <div className="min-h-screen bg-zinc-50 pb-24 dark:bg-zinc-950"><div className="mx-auto max-w-lg p-6">
    <div className="mb-6 flex items-center gap-4"><button onClick={() => openChatId ? setOpenChatId(null) : router.push("/")} className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900"><ArrowLeft size={20} /></button><h1 className="text-2xl font-bold">{openChatId ? "Chat" : "Messages"}</h1></div>
    {!openChatId && focusedMatch && <section className="mb-5 rounded-2xl border border-blue-200 bg-[#eef4ff] p-4 text-[#153ea8] shadow-sm"><div className="flex items-center gap-2"><MapPin size={18} /><div><p className="text-xs font-black uppercase tracking-wider">Match Protocol</p><h2 className="font-bold">{counterpart?.name || counterpart?.email || "Your parking match"}</h2></div></div><p className="mt-3 text-sm">Shared parking area · {schedule}</p><p className="mt-2 text-xs font-semibold">Status: {focusedMatch.status.replaceAll("_", " ")}</p>{matchError && <p role="alert" className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-800">{matchError}</p>}{canAcceptMatch ? <button onClick={() => void acceptMatch(focusedMatch)} disabled={matchAction === focusedMatch.id} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#2457d6] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{matchAction === focusedMatch.id && <Loader2 size={15} className="animate-spin" />}Accept match</button> : mineAccepted && !otherAccepted ? <p className="mt-4 text-sm font-semibold">Waiting for the other member to accept.</p> : null}</section>}
    {openChatId ? <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" style={{ height: "70vh" }}><div className="flex-1 space-y-3 overflow-y-auto p-4">{messages.length === 0 && <p className="py-8 text-center text-sm text-zinc-400">No messages yet</p>}{messages.map((m) => <div key={m.id} className={`flex ${m.sender_id === userId ? "justify-end" : "justify-start"}`}><div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${m.sender_id === userId ? "rounded-br-md bg-blue-600 text-white" : "rounded-bl-md bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"}`}>{m.content}</div></div>)}</div><div className="flex gap-2 border-t border-zinc-200 px-3 py-2 dark:border-zinc-800"><button onClick={async () => { const result = await acceptChat(openChatId); if (!result.error) setAccepted(true); setMessages((await getChatMessages(openChatId)) as Message[]); }} className="text-xs font-bold text-blue-600">{accepted ? "Conversation accepted" : "Accept conversation"}</button><button onClick={async () => { const reason = window.prompt("Why are you reporting this conversation?"); if (!reason) return; await fetch("/api/messenger/report", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` }, body: JSON.stringify({ conversationId: openChatId, category: "other", reason }) }); }} className="ml-auto text-xs font-bold text-red-500">Report</button></div><div className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"><input value={newMessage} onChange={(event) => setNewMessage(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void handleSend()} placeholder={accepted ? "Type a message..." : "Accept the conversation to reply..."} disabled={!accepted || sending} className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800" /><button onClick={() => void handleSend()} disabled={!accepted || sending || !newMessage.trim()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white disabled:bg-zinc-300">{sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button></div></div> : <div className="space-y-2">{chats.length === 0 && !focusedMatch && <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900"><MessageSquare size={40} className="mx-auto mb-3 text-zinc-300" /><p className="text-sm text-zinc-500">No messages yet</p><p className="mt-1 text-xs text-zinc-400">Messages from spot matches will appear here.</p></div>}{chats.map((chat) => <button key={chat.id} onClick={() => void openChat(chat.id)} className="w-full rounded-2xl border border-zinc-200 bg-white p-4 text-left dark:border-zinc-800 dark:bg-zinc-900"><div className="mb-1 flex items-center justify-between"><span className="text-sm font-bold">{chat.other_user.name || chat.other_user.email || "Unknown"}</span><span className="text-[10px] text-zinc-400">{chat.status}</span></div>{chat.last_message && <p className="truncate text-xs text-zinc-500">{chat.last_message.sender_id === userId && "You: "}{chat.last_message.content}</p>}<div className="mt-1 flex items-center gap-1 text-[10px] text-zinc-400"><Clock size={10} />{new Date(chat.created_at).toLocaleDateString()}</div></button>)}</div>}
  </div></div>;
}

export default function MessagesPage() { return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>}><MessagesContent /></Suspense>; }
