"use client";

import { useState } from "react";
import CustomerVoiceWelcome from "@/components/business/CustomerVoiceWelcome";

export default function AdminVoiceSimulatorPage() {
  const [businessName, setBusinessName] = useState("Belmont Brewing Co");
  return <main className="p-6 max-w-3xl mx-auto"><div className="mb-6"><p className="text-xs uppercase tracking-[0.2em] text-blue-600 font-bold">Admin tool</p><h1 className="text-2xl font-black mt-1">Customer Voice Simulator</h1><p className="text-sm text-zinc-500 mt-2">Preview the white-label greeting and destination handoff without creating customer or parking data.</p></div><section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5"><label className="block max-w-md text-xs font-semibold text-zinc-500 mb-5">Preview business name<input value={businessName} onChange={(event) => setBusinessName(event.target.value)} maxLength={80} className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm" /></label><div className="max-w-xl"><CustomerVoiceWelcome businessName={businessName || "Your Business"} brandColor="#2563eb" businessId="preview" previewOnly autoGreet={false} /></div><p className="text-xs text-zinc-400 mt-4">Use the speaker button to play the greeting. Microphone access depends on the browser; typed input is always available.</p></section></main>;
}
