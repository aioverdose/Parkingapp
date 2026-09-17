"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { speak, stopSpeech } from "@/lib/speech";
import { createBrowserClient } from "@/lib/supabaseClient";

type RecognitionResult = { isFinal: boolean; [index: number]: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = { lang: string; interimResults: boolean; continuous: boolean; onresult: ((event: RecognitionEvent) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };

function getRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as typeof window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition || null;
}

export default function CustomerVoiceWelcome({ businessName, brandColor, businessId, previewOnly = false, autoGreet = true }: { businessName: string; brandColor: string; businessId: string; previewOnly?: boolean; autoGreet?: boolean }) {
  const [answer, setAnswer] = useState("");
  const [listening, setListening] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [greetingPlayed, setGreetingPlayed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sideStreets, setSideStreets] = useState<string[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);

  const greeting = `Welcome to ${businessName}. Where are you headed?`;

  useEffect(() => {
    const availabilityTimer = window.setTimeout(() => {
      setSpeechAvailable(Boolean(getRecognition()));
    }, 0);
    const timer = autoGreet ? window.setTimeout(() => { void speak(greeting); setGreetingPlayed(true); }, 250) : undefined;
    return () => {
      window.clearTimeout(availabilityTimer);
      if (timer) window.clearTimeout(timer);
      stopSpeech();
      recognitionRef.current?.stop();
    };
  }, [autoGreet, greeting]);

  const playGreeting = () => { void speak(greeting); setGreetingPlayed(true); };

  const startListening = () => {
    const Constructor = getRecognition();
    if (!Constructor) return;
    const recognition = new Constructor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) transcript += event.results[index][0]?.transcript || "";
      if (transcript) setAnswer(transcript.trim());
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const destination = answer.trim();
    if (!destination) return;
    setSubmitted(true);
    if (!previewOnly && businessId) {
      setRecommendationsLoading(true);
      const loadRecommendations = async () => {
        const { data: { session } } = await createBrowserClient().auth.getSession();
        if (!session?.access_token) return;
        const response = await fetch(`/api/businesses/${businessId}/parking-recommendations`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (response.ok) { const body = await response.json(); setSideStreets(Array.isArray(body.sideStreets) ? body.sideStreets : []); }
        setRecommendationsLoading(false);
      };
      void loadRecommendations();
    }
    void speak(`Thanks. For ${destination}, start with metered curb parking on 2nd Street, then check the adjacent side streets. Check posted signs and meters. Parking is not guaranteed.`);
  };

  if (submitted) return <div className="rounded-3xl bg-white p-6 shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800"><p className="text-sm text-zinc-500">Parking options near</p><h2 className="text-2xl font-bold mt-1">{answer}</h2><div className="mt-5 space-y-3"><div className="rounded-2xl border-2 p-4" style={{ borderColor: brandColor }}><p className="text-xs font-bold uppercase tracking-wide" style={{ color: brandColor }}>1. Start here</p><p className="font-bold mt-1">Metered curb parking on 2nd Street</p><p className="text-xs text-zinc-500 mt-1">Check the meter, signs, time limits, and sweeping restrictions near your destination.</p></div><div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 p-4"><p className="text-xs font-bold uppercase tracking-wide text-zinc-500">2. Nearby alternative</p>{recommendationsLoading ? <p className="font-bold mt-1 text-zinc-500">Finding the closest side streets...</p> : sideStreets.length > 0 ? <div className="mt-1 space-y-1">{sideStreets.map((street) => <p key={street} className="font-bold">{street}</p>)}</div> : <p className="font-bold mt-1">Adjacent side streets near {answer}</p>}<p className="text-xs text-zinc-500 mt-1">Check each block for legal curb parking and posted restrictions.</p></div><div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 p-4"><p className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">3. Network heads-up</p><p className="text-sm text-blue-900 dark:text-blue-100 mt-1">Look for a private departure heads-up from someone leaving nearby.</p></div></div><p className="text-xs text-zinc-500 mt-4">These are recommended starting areas, not live availability. Parking is never reserved or guaranteed.</p>{previewOnly ? <button type="button" onClick={() => setSubmitted(false)} className="inline-flex mt-5 rounded-2xl px-5 py-3 text-white font-bold" style={{ backgroundColor: brandColor }}>Run another test</button> : <div className="flex flex-wrap gap-2 mt-5"><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${answer}, 2nd Street, Belmont Shore, Long Beach, CA`)}`} target="_blank" rel="noreferrer" className="inline-flex rounded-2xl px-4 py-3 text-white font-bold" style={{ backgroundColor: brandColor }}>Open map</a><a href={`/search?destination=${encodeURIComponent(answer)}&business=${encodeURIComponent(businessId)}`} className="inline-flex rounded-2xl px-4 py-3 border font-bold" style={{ borderColor: brandColor, color: brandColor }}>Find live heads-ups</a></div>}<button type="button" onClick={() => setSubmitted(false)} className="block mt-4 text-sm font-semibold" style={{ color: brandColor }}>Change destination</button></div>;

  return <div className="rounded-3xl bg-white p-6 shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Voice welcome</p><h2 className="text-2xl font-bold mt-1">Where are you headed?</h2></div><button type="button" onClick={playGreeting} aria-label="Play welcome greeting" className="rounded-full p-3 bg-zinc-100 dark:bg-zinc-800"><Volume2 size={20} /></button></div><p className="text-sm text-zinc-500 mt-3">{speechAvailable ? "Say a destination or type it below." : "Voice input is unavailable here. Type your destination below."}</p><form onSubmit={submit} className="mt-5"><div className="flex gap-2"><input value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="e.g. 2nd Street and PCH" className="min-w-0 flex-1 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent px-4 py-3 outline-none focus:ring-2" /><button type="button" onClick={listening ? () => recognitionRef.current?.stop() : startListening} disabled={!speechAvailable} aria-label={listening ? "Stop listening" : "Answer by voice"} className="rounded-2xl px-4 text-white disabled:bg-zinc-300" style={{ backgroundColor: listening ? "#dc2626" : brandColor }}>{listening ? <MicOff size={20} /> : <Mic size={20} />}</button></div><button type="submit" disabled={!answer.trim()} className="w-full mt-3 rounded-2xl py-3 text-white font-bold disabled:opacity-40" style={{ backgroundColor: brandColor }}>Continue</button></form>{greetingPlayed && <p className="text-xs text-zinc-400 mt-4">You can replay the greeting with the speaker button.</p>}</div>;
}
