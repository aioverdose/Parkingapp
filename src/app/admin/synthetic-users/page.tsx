"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { FlaskConical, Loader2, MessageSquare, ShieldCheck } from "lucide-react";

type Account = { email: string; username: string; vehicle_type: string };
type MessagingResult = { matchId: string; chatId: string; ownerEmail: string; seekerEmail: string; adminMessengerUrl: string };

export default function SyntheticUsersPage() {
  const supabase = createBrowserClient();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [testMatch, setTestMatch] = useState<{ matchId: string; ownerEmail: string; seekerEmail: string } | null>(null);
  const [messaging, setMessaging] = useState<MessagingResult | null>(null);

  async function provision(action?: "create_test_match" | "simulate_messaging") {
    setRunning(true); setMessage(null); setError(null); setMessaging(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("Please log in again.");
      const response = await fetch("/api/admin/synthetic-users", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(action ? { action } : {}) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not provision synthetic users.");
      setAccounts(body.accounts ?? []); setPassword(body.password ?? ""); setTestMatch(body.testMatch ?? null); setMessaging(body.testMessaging ?? null); setMessage(body.message);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not provision synthetic users."); }
    finally { setRunning(false); }
  }

  return <main className="app-page min-h-screen px-5 py-8 sm:px-8"><div className="mx-auto max-w-4xl"><header className="mb-8 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e6f0e8] text-[#4b805d]"><FlaskConical className="h-5 w-5" /></span><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#e85d3f]">Admin tools</p><h1 className="text-3xl font-bold tracking-tight">Synthetic test users</h1></div></header><section className="app-card p-6 sm:p-8"><div className="flex gap-3 rounded-2xl bg-[#fff0eb] p-4 text-sm text-[#8f3b2a]"><ShieldCheck className="h-5 w-5 shrink-0" /><p>Creates only reserved `.test` accounts with synthetic `555` numbers. These accounts are preverified for testing and never trigger SMS.</p></div><div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => void provision()} disabled={running} className="app-primary flex h-12 items-center gap-2 rounded-xl px-5 font-bold disabled:opacity-50">{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}Create or reset synthetic users</button><button type="button" onClick={() => void provision("create_test_match")} disabled={running} className="flex h-12 items-center rounded-xl border border-[#17211e] px-5 font-bold text-[#17211e] disabled:opacity-50">Create pending test match</button><button type="button" onClick={() => void provision("simulate_messaging")} disabled={running} className="flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 font-bold text-white disabled:opacity-50"><MessageSquare className="h-4 w-4" />Simulate match + messaging</button></div>{message && <p className="mt-4 rounded-xl bg-[#e6f0e8] p-3 text-sm font-semibold text-[#386348]">{message}</p>}{error && <p className="mt-4 rounded-xl bg-[#fff0eb] p-3 text-sm font-semibold text-[#b9432b]">{error}</p>}{messaging && <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><p className="font-bold">Messaging simulation ready</p><p className="mt-1 text-xs">Match {messaging.matchId} · Conversation {messaging.chatId}</p><a href={messaging.adminMessengerUrl} className="mt-3 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white">Open Messenger Control Center</a></div>}{accounts.length > 0 && <div className="mt-6 overflow-x-auto rounded-2xl border border-[#dce3df]"><table className="w-full text-left text-sm"><thead className="bg-[#f6f8f6] text-xs uppercase text-[#71807b]"><tr><th className="p-3">Email</th><th className="p-3">Username</th><th className="p-3">Vehicle</th></tr></thead><tbody>{accounts.map((account) => <tr key={account.email} className="border-t border-[#edf0ee]"><td className="p-3">{account.email}</td><td className="p-3">{account.username}</td><td className="p-3">{account.vehicle_type}</td></tr>)}</tbody></table></div>}{password && <p className="mt-4 text-xs text-zinc-500">Synthetic password: <code>{password}</code></p>}{testMatch && <div className="mt-6 rounded-2xl bg-[#e8edf5] p-4 text-sm"><p className="font-bold">Pending test match: {testMatch.matchId}</p><p className="mt-1 text-zinc-600">Owner: {testMatch.ownerEmail} · Seeker: {testMatch.seekerEmail}</p><p className="mt-2 text-xs text-zinc-500">Sign into both synthetic accounts on separate devices and open Messages to complete two-sided confirmation.</p></div>}</section></div></main>;
}
