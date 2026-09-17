"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Loader2, MessageSquare, ShieldCheck } from "lucide-react";

export default function AdminSmsTestPage() {
  const supabase = createBrowserClient();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function sendTest(action: "request" | "verify") {
    setSending(true); setStatus(null); setError(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("Please log in again.");
      const response = await fetch("/api/admin/sms-test", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action, phone, code }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not send SMS test.");
      setStatus(body.message); if (action === "request") setCodeSent(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not send SMS test."); }
    finally { setSending(false); }
  }

  return <main className="app-page min-h-screen px-5 py-8 sm:px-8"><div className="mx-auto max-w-xl"><div className="mb-8 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff0eb] text-[#e85d3f]"><MessageSquare className="h-5 w-5" /></span><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#e85d3f]">Admin tools</p><h1 className="text-3xl font-bold tracking-tight">SMS OTP test</h1></div></div><section className="app-card p-6 sm:p-8"><div className="flex gap-3 rounded-2xl bg-[#e6f0e8] p-4 text-sm text-[#386348]"><ShieldCheck className="h-5 w-5 shrink-0" /><p>This tests the complete request, delivery, and verification flow. It is limited to three tests per hour and does not change your profile verification state.</p></div><label className="mt-6 block text-sm font-bold text-[#17211e]">Destination phone number<input type="tel" inputMode="tel" autoComplete="tel" placeholder="(555) 123-4567" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} className="app-input mt-2 w-full rounded-xl border px-4 py-3 outline-none" /></label><button type="button" onClick={() => void sendTest("request")} disabled={sending || phone.length !== 10} className="app-primary mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl font-bold disabled:cursor-not-allowed disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send verification code"}</button>{codeSent && <><label className="mt-5 block text-sm font-bold text-[#17211e]">Verification code<input type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className="app-input mt-2 w-full rounded-xl border px-4 py-3 text-center text-xl tracking-[0.4em] outline-none" /></label><button type="button" onClick={() => void sendTest("verify")} disabled={sending || code.length !== 6} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#17211e] font-bold text-[#17211e] disabled:cursor-not-allowed disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify code"}</button></>}{status && <p className="mt-4 rounded-xl bg-[#e6f0e8] p-3 text-sm font-semibold text-[#386348]">{status}</p>}{error && <p className="mt-4 rounded-xl bg-[#fff0eb] p-3 text-sm font-semibold text-[#b9432b]">{error}</p>}</section></div></main>;
}
