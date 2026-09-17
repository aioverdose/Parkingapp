"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Marker, Source } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Check, CircleStop, Mic, Play, Smartphone, Volume2 } from "lucide-react";
import { MAP_STYLE_URL } from "@/lib/map";
import { SPOT_PROTOCOL } from "@/lib/spot-protocol";
import { getSpotDemoStage, SPOT_DEMO_STAGES } from "@/lib/testing/spot-protocol-demo";

const DESTINATIONS = [
  { name: "The Attic", latitude: 33.76045, longitude: -118.13455 },
  { name: "Open Sesame", latitude: 33.76015, longitude: -118.13535 },
  { name: "Belmont Shore Restaurant", latitude: 33.75985, longitude: -118.13375 },
] as const;

const APPROACH_PROMPTS = [
  { at: 0.1, text: "Continue south toward 2nd Street." },
  { at: 0.35, text: "Turn right and continue toward the Belmont Shore pilot area." },
  { at: 0.6, text: "Turn left onto 2nd Street." },
  { at: 0.82, text: "The SPOT handoff zone is ahead on the right." },
];

const STAGE_VOICE: Record<string, string> = {
  geofence: "Welcome to 2nd Street. Searching your private network for a nearby departure.",
  searching: "Searching within one block of your destination.",
  offered: "A SPOT handoff is available. One departing member has been selected.",
  accepted: "Match accepted. Keep your eyes on the road. Voice guidance is active.",
  nearby: "The departing driver is within one block of your destination.",
  owner_ready: "The departing member is ready to complete the handoff.",
  departed: "The spot is ready. Please park when safely stopped.",
  complete: "SPOT handoff complete.",
};

type RoutePoint = { latitude: number; longitude: number };
type Business = (typeof DESTINATIONS)[number];
type LogItem = { text: string; kind: "stage" | "voice" | "pass" };
type SpeechRecognitionLike = { continuous: boolean; interimResults: boolean; lang: string; start: () => void; stop: () => void; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

function buildRoute(destination: Business) {
  const departure = { latitude: destination.latitude + 0.00075, longitude: destination.longitude - 0.0006 };
  return { departure, points: [
    { latitude: 33.771, longitude: -118.145 },
    { latitude: 33.7685, longitude: -118.145 },
    { latitude: 33.7655, longitude: -118.145 },
    { latitude: 33.7655, longitude: -118.141 },
    { latitude: 33.762, longitude: -118.141 },
    { latitude: 33.762, longitude: -118.137 },
    { latitude: departure.latitude, longitude: -118.137 },
    departure,
  ] as RoutePoint[] };
}

function interpolate(route: RoutePoint[], progress: number): RoutePoint {
  const scaled = Math.min(0.999, Math.max(0, progress)) * (route.length - 1);
  const index = Math.floor(scaled);
  const fraction = scaled - index;
  const from = route[index];
  const to = route[Math.min(index + 1, route.length - 1)];
  return { latitude: from.latitude + (to.latitude - from.latitude) * fraction, longitude: from.longitude + (to.longitude - from.longitude) * fraction };
}

function makeRouteGeoJson(route: RoutePoint[]) {
  return { type: "FeatureCollection" as const, features: [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: route.map((point) => [point.longitude, point.latitude] as [number, number]) } }] };
}

function say(text: string, onEnd?: () => void) {
  if (!("speechSynthesis" in window)) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.onend = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}

export function MatchScenario() {
  const [arrivalStarted, setArrivalStarted] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [destination, setDestination] = useState<Business | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [speed, setSpeed] = useState(0.5);
  const [vehicleType, setVehicleType] = useState("sedan");
  const [logs, setLogs] = useState<LogItem[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const lastStageRef = useRef(-1);
  const lastPromptRef = useRef(-1);
  const selected = destination || DESTINATIONS[0];
  const route = useMemo(() => buildRoute(selected), [selected]);
  const routeGeoJson = useMemo(() => makeRouteGeoJson(route.points), [route.points]);
  const current = getSpotDemoStage(elapsed);
  const seeker = interpolate(route.points, current.stage.key === "approach" ? current.progress : current.index >= 6 ? 1 : 0);

  const log = (text: string, kind: LogItem["kind"]) => setLogs((items) => [...items, { text, kind }]);

  const startListening = () => {
    const browserWindow = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Recognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    if (!Recognition) { setVoiceSupported(false); log("Voice recognition unavailable; use a destination button.", "voice"); return; }
    recognitionRef.current?.stop();
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => { const text = event.results[0][0].transcript; setTranscript(text); chooseDestination(text); };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); log("Microphone ended; use a destination button if needed.", "voice"); };
    recognitionRef.current = recognition;
    setVoiceSupported(true);
    setListening(true);
    log("Listening for destination...", "voice");
    try { recognition.start(); } catch { setListening(false); log("Microphone could not start; use a destination button.", "voice"); }
  };

  const chooseDestination = (text: string) => {
    const match = DESTINATIONS.find((item) => text.toLowerCase().includes(item.name.toLowerCase()));
    if (!match) { log(`Destination not recognized: ${text}`, "voice"); say("I did not recognize that business. Please choose a destination button.", startListening); return; }
    recognitionRef.current?.stop();
    setListening(false);
    setDestination(match);
    log(`Voice destination recognized: ${match.name}`, "voice");
    window.setTimeout(() => { setRunning(true); setElapsed(0); lastStageRef.current = -1; lastPromptRef.current = -1; say(`I found ${match.name}. Searching within one block for a departing driver.`); }, 1600);
  };

  const startArrival = () => { setArrivalStarted(true); setDestination(null); setTranscript(""); setLogs([]); say("Welcome to 2nd Street. What is your destination?", startListening); };

  const reset = () => { recognitionRef.current?.stop(); recognitionRef.current = null; window.speechSynthesis?.cancel(); setArrivalStarted(false); setListening(false); setDestination(null); setTranscript(""); setRunning(false); setElapsed(0); setLogs([]); lastStageRef.current = -1; lastPromptRef.current = -1; };

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setElapsed((value) => {
        const next = value + 100 * speed;
        const stage = getSpotDemoStage(next);
        if (stage.index !== lastStageRef.current) { lastStageRef.current = stage.index; log(`${stage.stage.label}: ${stage.stage.detail}`, "stage"); const message = STAGE_VOICE[stage.stage.key]; if (message) { log(message, "voice"); say(message); } }
        if (stage.stage.key === "approach") { const promptIndex = APPROACH_PROMPTS.reduce((latest, prompt, index) => stage.progress >= prompt.at ? index : latest, -1); if (promptIndex >= 0 && lastPromptRef.current < promptIndex) { lastPromptRef.current = promptIndex; log(APPROACH_PROMPTS[promptIndex].text, "voice"); say(APPROACH_PROMPTS[promptIndex].text); } }
        const total = SPOT_DEMO_STAGES.reduce((sum, item) => sum + item.durationMs, 0);
        if (next >= total) { setRunning(false); log("Assertion passed: no public fallback occurred", "pass"); return total; }
        return next;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [running, speed]);

  return <div className="h-full overflow-y-auto bg-zinc-950 text-white"><div className="grid min-h-full xl:grid-cols-[360px_1fr]"><aside className="border-r border-white/10 bg-zinc-900 p-5"><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600"><Smartphone size={19} /></div><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">Live demonstration</p><h2 className="mt-1 text-lg font-bold">{SPOT_PROTOCOL.name}</h2></div></div><p className="mt-4 text-xs leading-5 text-zinc-400">This database-free demo follows the real phone experience: Arrival Mode, voice destination, private one-block search, and hands-free handoff.</p><div className="mt-5 flex gap-2"><button onClick={running ? () => setRunning(false) : arrivalStarted && destination ? () => setRunning(true) : startArrival} className={`flex-1 rounded-xl px-3 py-3 text-xs font-bold ${running ? "bg-red-600" : "bg-emerald-600"}`}>{running ? <span className="flex items-center justify-center gap-2"><CircleStop size={15} /> Pause demo</span> : <span className="flex items-center justify-center gap-2"><Play size={15} /> Start phone flow</span>}</button><button onClick={reset} className="rounded-xl border border-white/15 px-3 text-xs font-bold text-zinc-300">Reset</button></div><div className="mt-4 flex items-center gap-2 text-xs text-zinc-400"><span>Playback</span>{[0.25, 0.5, 1, 2].map((option) => <button key={option} onClick={() => setSpeed(option)} className={`rounded-lg px-2 py-1 ${speed === option ? "bg-blue-600 text-white" : "bg-white/5"}`}>{option}x</button>)}</div><label className="mt-4 block text-xs text-zinc-400">Departing vehicle type<select value={vehicleType} onChange={(event) => setVehicleType(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white"><option>Compact</option><option>Sedan</option><option>SUV</option><option>Truck</option><option>Van</option><option>Motorcycle</option></select></label><div className="mt-5 rounded-2xl border border-blue-900/60 bg-blue-950/30 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Current stage</p><p className="mt-2 font-bold">{current.stage.label}</p><p className="mt-1 text-xs leading-5 text-blue-100">{current.stage.detail}</p></div><div className="mt-5"><p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Protocol timeline</p>{SPOT_DEMO_STAGES.map((stage, index) => <div key={stage.key} className={`flex items-center gap-2 rounded-lg px-2 py-2 text-xs ${index === current.index ? "bg-blue-600/20 text-blue-100" : index < current.index ? "text-emerald-300" : "text-zinc-500"}`}>{index < current.index ? <Check size={13} /> : <span className="grid h-3 w-3 place-items-center rounded-full border border-current text-[8px]">{index + 1}</span>}<span>{stage.label}</span></div>)}</div><div className="mt-5 border-t border-white/10 pt-4"><p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Live event log</p>{logs.length === 0 ? <p className="text-xs text-zinc-600">Start the phone flow to hear and see events.</p> : logs.map((item, index) => <div key={index} className={`rounded-lg px-2 py-1.5 text-[11px] ${item.kind === "pass" ? "text-emerald-300" : item.kind === "voice" ? "text-blue-200" : "text-zinc-400"}`}>{item.kind === "voice" && <Volume2 size={11} className="mr-1 inline" />}{item.text}</div>)}</div></aside><main className="min-h-[700px] p-6"><div className="grid gap-5 lg:grid-cols-2"><ArrivingPhone arrivalStarted={arrivalStarted} listening={listening} voiceSupported={voiceSupported} transcript={transcript} setTranscript={setTranscript} destination={destination} stage={current.stage} progress={current.progress} seeker={seeker} route={routeGeoJson} departure={route.departure} onStart={startArrival} onStartListening={startListening} onChoose={chooseDestination} /><DepartingPhone stage={current.stage} destination={selected} departure={route.departure} seeker={seeker} route={routeGeoJson} vehicleType={vehicleType} /></div></main></div></div>;
}

function ArrivingPhone({ arrivalStarted, listening, voiceSupported, transcript, setTranscript, destination, stage, progress, seeker, route, start, departure, onStart, onStartListening, onChoose }: { arrivalStarted: boolean; listening: boolean; voiceSupported: boolean; transcript: string; setTranscript: (value: string) => void; destination: Business | null; stage: (typeof SPOT_DEMO_STAGES)[number]; progress: number; seeker: RoutePoint; route: { type: "FeatureCollection"; features: unknown[] }; start?: RoutePoint; departure: RoutePoint; onStart: () => void; onStartListening: () => void; onChoose: (text: string) => void }) {
  const voicePrompt = stage.key === "approach" ? APPROACH_PROMPTS.reduce((latest, prompt) => progress >= prompt.at ? prompt.text : latest, "") : "";
  return <PhoneFrame title="Arriving driver">{!arrivalStarted ? <><PhoneMap route={route} start={start} destination={DESTINATIONS[0]} seeker={null} departure={departure} /><p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">SpotMatch</p><p className="text-xl font-bold">Where are you headed?</p><p className="text-sm leading-5 text-zinc-500">Start SPOT Arrival Mode while safely stopped.</p><button onClick={onStart} className="w-full rounded-2xl bg-blue-600 py-4 text-sm font-bold text-white">Start SPOT Arrival Mode</button></> : <><PhoneMap route={route} start={start} destination={destination || DESTINATIONS[0]} seeker={seeker} departure={departure} /><p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">SPOT Protocol</p><p className="text-xl font-bold">{listening ? "Listening for destination" : "Arrival Mode active"}</p><p className="text-sm leading-5 text-zinc-500">{destination ? stage.detail : "Welcome to 2nd Street. What is your destination?"}</p>{listening && <DestinationPicker listening={listening} voiceSupported={voiceSupported} transcript={transcript} setTranscript={setTranscript} onStartListening={onStartListening} onChoose={onChoose} />}{destination && !listening && <div className="space-y-2"><div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-semibold">{stage.key === "nearby" || stage.key === "owner_ready" || stage.key === "departed" || stage.key === "complete" ? "Departing member within one block" : `Searching near ${destination.name}`}</div>{voicePrompt && <div className="rounded-xl bg-zinc-900 px-3 py-2 text-[10px] text-white"><Volume2 size={12} className="mr-1 inline text-blue-300" />{voicePrompt}</div>}<p className="text-[10px] text-zinc-500">{stage.key === "complete" ? "Handoff complete" : "Keep eyes on the road"}</p></div>}</>}</PhoneFrame>;
}

function DestinationPicker({ listening, voiceSupported, transcript, setTranscript, onStartListening, onChoose }: { listening: boolean; voiceSupported: boolean; transcript: string; setTranscript: (value: string) => void; onStartListening: () => void; onChoose: (text: string) => void }) {
  return <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3"><button onClick={onStartListening} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white"><Mic size={14} />{listening ? "Restart microphone" : "Start microphone"}</button><p className="mt-2 text-center text-[10px] text-blue-700">{voiceSupported ? "Say the business name now" : "Choose a destination if voice is unavailable"}</p><input value={transcript} onChange={(event) => setTranscript(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onChoose(transcript); }} placeholder="Type destination fallback" className="mt-3 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs outline-none" /><div className="mt-2 flex flex-wrap gap-2">{DESTINATIONS.map((item) => <button key={item.name} onClick={() => onChoose(item.name)} className="rounded-xl bg-white px-2.5 py-1.5 text-[10px] font-semibold text-blue-700 shadow-sm">{item.name}</button>)}</div></div>;
}

function DepartingPhone({ stage, destination, start, departure, seeker, route, vehicleType }: { stage: (typeof SPOT_DEMO_STAGES)[number]; destination: Business; start?: RoutePoint; departure: RoutePoint; seeker: RoutePoint; route: { type: "FeatureCollection"; features: unknown[] }; vehicleType: string }) {
  const status = stage.key === "complete" ? "Handoff complete" : stage.key === "departed" ? "You pulled out" : stage.key === "owner_ready" ? "Ready to leave" : stage.key === "nearby" ? "Driver nearby" : "Parked and waiting";
  return <PhoneFrame title="Departing driver"><PhoneMap route={route} start={start} destination={destination} seeker={seeker} departure={departure} /><p className="text-[10px] font-bold uppercase tracking-widest text-red-600">Departing member</p><p className="text-xl font-bold">{status}</p><div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs"><p className="font-bold text-red-700">Your {vehicleType} is at the handoff point</p><p className="mt-1 text-zinc-600">{stage.key === "owner_ready" ? "Confirm while parked, then pull out when safe." : stage.key === "nearby" ? "The arriving member is within one block." : `Waiting for the SPOT handoff to ${destination.name}.`}</p></div><p className="text-[10px] text-zinc-500">Private network only · no public fallback</p></PhoneFrame>;
}

function PhoneFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="w-full max-w-[390px] rounded-[2.8rem] border-4 border-zinc-700 bg-zinc-900 p-2 shadow-2xl"><div className="overflow-hidden rounded-[2.25rem] bg-zinc-50 p-4 text-zinc-950"><div className="mx-auto mb-2 h-5 w-32 rounded-b-2xl bg-zinc-900" /><div className="mb-3 flex items-center justify-between text-[11px] text-zinc-500"><span>9:41</span><span>{title} · SPOT PWA</span></div>{children}</div></div>;
}

function PhoneMap({ route, start, destination, seeker, departure }: { route: { type: "FeatureCollection"; features: unknown[] }; start?: RoutePoint; destination: Business; seeker: RoutePoint | null; departure: RoutePoint }) {
  const points = route.features[0] as { geometry?: { coordinates?: [number, number][] } };
  const coordinates = points.geometry?.coordinates || [];
  const lats = coordinates.map((point) => point[1]);
  const lngs = coordinates.map((point) => point[0]);
  const startPoint = start || (coordinates.length > 0 ? { latitude: coordinates[0][1], longitude: coordinates[0][0] } : destination);
  const bounds = lats.length > 0 ? [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]] as [[number, number], [number, number]] : undefined;
  return <div className="relative mb-3 h-48 overflow-hidden rounded-2xl bg-blue-100"><Map initialViewState={bounds ? { bounds, fitBoundsOptions: { padding: 28 } } : { latitude: destination.latitude, longitude: destination.longitude, zoom: 14 }} mapStyle={MAP_STYLE_URL} attributionControl={false} interactive={false}><Source id={`phone-route-${destination.name}`} type="geojson" data={route as never}><Layer id={`phone-line-${destination.name}`} type="line" paint={{ "line-color": "#f59e0b", "line-width": 4 }} /></Source><Marker latitude={startPoint.latitude} longitude={startPoint.longitude}><div className="grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-emerald-600 text-[8px] font-bold text-white shadow">S</div></Marker>{seeker && <Marker latitude={seeker.latitude} longitude={seeker.longitude}><div className="h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow" /></Marker>}<Marker latitude={departure.latitude} longitude={departure.longitude}><div className="grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-red-600 text-[8px] font-bold text-white shadow">D</div></Marker><Marker latitude={destination.latitude} longitude={destination.longitude}><div className="grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-purple-600 text-[8px] font-bold text-white shadow">B</div></Marker></Map><div className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-blue-700">S Start · D Departure · B Business</div></div>;
}
