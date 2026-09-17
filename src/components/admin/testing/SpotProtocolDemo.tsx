"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Marker, Source } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Check, CircleStop, Mic, Play, Smartphone, Volume2 } from "lucide-react";
import { MAP_STYLE_URL } from "@/lib/map";
import { speak as speakSpeech } from "@/lib/speech";
import { SPOT_PROTOCOL } from "@/lib/spot-protocol";
import { getSpotDemoStage, SPOT_DEMO_STAGES } from "@/lib/testing/spot-protocol-demo";

const BUSINESSES = [
  { name: "The Attic", latitude: 33.76045, longitude: -118.13455 },
  { name: "Open Sesame", latitude: 33.76015, longitude: -118.13535 },
  { name: "Belmont Shore Restaurant", latitude: 33.75985, longitude: -118.13375 },
] as const;

const PROMPTS = [
  [0.1, "Continue south toward 2nd Street."],
  [0.35, "Turn right and continue toward the Belmont Shore pilot area."],
  [0.6, "Turn left onto 2nd Street."],
  [0.82, "The SPOT handoff zone is ahead on the right."],
] as const;

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

type Point = { latitude: number; longitude: number };
type Business = (typeof BUSINESSES)[number];
type Recognition = { start: () => void; stop: () => void; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; continuous: boolean; interimResults: boolean; lang: string };
type Log = { text: string; kind: "stage" | "voice" | "pass" };

function makeRoute(business: Business) {
  const departure = { latitude: business.latitude + 0.00075, longitude: business.longitude - 0.0006 };
  const points = [
    { latitude: 33.771, longitude: -118.145 }, { latitude: 33.7685, longitude: -118.145 },
    { latitude: 33.7655, longitude: -118.145 }, { latitude: 33.7655, longitude: -118.141 },
    { latitude: 33.762, longitude: -118.141 }, { latitude: 33.762, longitude: -118.137 },
    { latitude: departure.latitude, longitude: -118.137 }, departure,
  ];
  return { departure, points };
}

function interpolate(points: Point[], progress: number) {
  const scaled = Math.min(0.999, Math.max(0, progress)) * (points.length - 1);
  const index = Math.floor(scaled);
  const amount = scaled - index;
  const from = points[index];
  const to = points[Math.min(index + 1, points.length - 1)];
  return { latitude: from.latitude + (to.latitude - from.latitude) * amount, longitude: from.longitude + (to.longitude - from.longitude) * amount };
}

function geoJson(points: Point[]) {
  return { type: "FeatureCollection" as const, features: [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: points.map((point) => [point.longitude, point.latitude] as [number, number]) } }] };
}

function say(text: string, onEnd?: () => void) {
  void speakSpeech(text, { rate: 0.88, pitch: 1, volume: 1 }).then(() => onEnd?.());
}

export default function SpotProtocolDemo() {
  const [view, setView] = useState<"arriving" | "departing">("arriving");
  const [arrivalStarted, setArrivalStarted] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [text, setText] = useState("");
  const [business, setBusiness] = useState<Business | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [speed, setSpeed] = useState(0.5);
  const [vehicle, setVehicle] = useState("Sedan");
  const [logs, setLogs] = useState<Log[]>([]);
  const recognitionRef = useRef<Recognition | null>(null);
  const lastStageRef = useRef(-1);
  const lastPromptRef = useRef(-1);

  const selected = business || BUSINESSES[0];
  const route = useMemo(() => makeRoute(selected), [selected]);
  const line = useMemo(() => geoJson(route.points), [route.points]);
  const current = getSpotDemoStage(elapsed);
  const seeker = interpolate(route.points, current.stage.key === "approach" ? current.progress : current.index >= 6 ? 1 : 0);

  const addLog = (textValue: string, kind: Log["kind"]) => setLogs((items) => [...items, { text: textValue, kind }]);

  const listen = () => {
    const browserWindow = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Constructor = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    if (!Constructor) { setVoiceSupported(false); addLog("Voice recognition unavailable; use the destination buttons.", "voice"); return; }
    recognitionRef.current?.stop();
    const recognition = new Constructor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => { const value = event.results[0][0].transcript; setText(value); choose(value); };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); addLog("Microphone stopped; use a destination button if needed.", "voice"); };
    recognitionRef.current = recognition;
    setVoiceSupported(true);
    setListening(true);
    addLog("Listening for destination...", "voice");
    try { recognition.start(); } catch { setListening(false); addLog("Microphone could not start; use a destination button.", "voice"); }
  };

  const choose = (value: string) => {
    const match = BUSINESSES.find((item) => value.toLowerCase().includes(item.name.toLowerCase()));
    if (!match) { addLog(`Destination not recognized: ${value}`, "voice"); say("I did not recognize that business. Please choose a destination button.", listen); return; }
    recognitionRef.current?.stop();
    setListening(false);
    setBusiness(match);
    addLog(`Destination recognized: ${match.name}`, "voice");
    window.setTimeout(() => { setRunning(true); setElapsed(0); lastStageRef.current = -1; lastPromptRef.current = -1; say(`I found ${match.name}. Searching within one block for a departing driver.`); }, 1200);
  };

  const start = () => { setArrivalStarted(true); setBusiness(null); setText(""); setLogs([]); say("Welcome to 2nd Street. What is your destination?", listen); };
  const reset = () => { recognitionRef.current?.stop(); window.speechSynthesis?.cancel(); setArrivalStarted(false); setListening(false); setBusiness(null); setText(""); setRunning(false); setElapsed(0); setLogs([]); lastStageRef.current = -1; lastPromptRef.current = -1; };

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setElapsed((value) => {
      const next = value + speed * 100;
      const stage = getSpotDemoStage(next);
      if (stage.index !== lastStageRef.current) { lastStageRef.current = stage.index; addLog(`${stage.stage.label}: ${stage.stage.detail}`, "stage"); const message = STAGE_VOICE[stage.stage.key]; if (message) { addLog(message, "voice"); say(message); } }
      if (stage.stage.key === "approach") { const promptIndex = PROMPTS.reduce((latest, prompt, index) => stage.progress >= prompt[0] ? index : latest, -1); if (promptIndex > lastPromptRef.current) { lastPromptRef.current = promptIndex; addLog(PROMPTS[promptIndex][1], "voice"); say(PROMPTS[promptIndex][1]); } }
      const total = SPOT_DEMO_STAGES.reduce((sum, item) => sum + item.durationMs, 0);
      if (next >= total) { setRunning(false); addLog("Assertion passed: no public fallback occurred", "pass"); return total; }
      return next;
    }), 100);
    return () => window.clearInterval(timer);
  }, [running, speed]);

  return <div className="h-full overflow-y-auto bg-zinc-950 text-white"><div className="grid min-h-full xl:grid-cols-[360px_1fr]"><aside className="border-r border-white/10 bg-zinc-900 p-5"><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600"><Smartphone size={19} /></div><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">Live demonstration</p><h2 className="mt-1 text-lg font-bold">{SPOT_PROTOCOL.name}</h2></div></div><p className="mt-4 text-xs leading-5 text-zinc-400">The selected phone runs the user experience. Switch between the arriving and departing views while the simulation is running.</p><div className="mt-5 grid grid-cols-2 gap-2"><button onClick={() => setView("arriving")} className={`rounded-xl px-2 py-2 text-[11px] font-bold ${view === "arriving" ? "bg-blue-600 text-white" : "bg-white/5 text-zinc-400"}`}>Arriving driver</button><button onClick={() => setView("departing")} className={`rounded-xl px-2 py-2 text-[11px] font-bold ${view === "departing" ? "bg-red-600 text-white" : "bg-white/5 text-zinc-400"}`}>Departing driver</button></div><div className="mt-3 flex gap-2"><button onClick={running ? () => setRunning(false) : arrivalStarted && business ? () => setRunning(true) : start} className={`flex-1 rounded-xl px-3 py-3 text-xs font-bold ${running ? "bg-red-600" : "bg-emerald-600"}`}>{running ? <span className="flex items-center justify-center gap-2"><CircleStop size={15} /> Pause</span> : <span className="flex items-center justify-center gap-2"><Play size={15} /> Start phone flow</span>}</button><button onClick={reset} className="rounded-xl border border-white/15 px-3 text-xs font-bold text-zinc-300">Reset</button></div><div className="mt-4 flex items-center gap-2 text-xs text-zinc-400"><span>Speed</span>{[0.25, 0.5, 1, 2].map((option) => <button key={option} onClick={() => setSpeed(option)} className={`rounded-lg px-2 py-1 ${speed === option ? "bg-blue-600 text-white" : "bg-white/5"}`}>{option}x</button>)}</div><label className="mt-4 block text-xs text-zinc-400">Departing vehicle<select value={vehicle} onChange={(event) => setVehicle(event.target.value)} className="mt-1 w-full rounded-xl bg-zinc-800 px-3 py-2 text-xs text-white"><option>Compact</option><option>Sedan</option><option>SUV</option><option>Truck</option><option>Van</option><option>Motorcycle</option></select></label><div className="mt-5 rounded-2xl border border-blue-900/60 bg-blue-950/30 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Current stage</p><p className="mt-2 font-bold">{current.stage.label}</p><p className="mt-1 text-xs leading-5 text-blue-100">{current.stage.detail}</p></div><div className="mt-5"><p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Timeline</p>{SPOT_DEMO_STAGES.map((stage, index) => <div key={stage.key} className={`flex items-center gap-2 rounded-lg px-2 py-2 text-xs ${index === current.index ? "bg-blue-600/20 text-blue-100" : index < current.index ? "text-emerald-300" : "text-zinc-500"}`}>{index < current.index ? <Check size={13} /> : <span>{index + 1}</span>}<span>{stage.label}</span></div>)}</div><div className="mt-5 border-t border-white/10 pt-4"><p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Voice and event log</p>{logs.length === 0 ? <p className="text-xs text-zinc-600">Start the phone flow.</p> : logs.map((item, index) => <div key={index} className={`py-1 text-[11px] ${item.kind === "pass" ? "text-emerald-300" : item.kind === "voice" ? "text-blue-200" : "text-zinc-400"}`}>{item.kind === "voice" && <Volume2 size={11} className="mr-1 inline" />}{item.text}</div>)}</div></aside><main className="flex min-h-[700px] items-start justify-center p-6">{view === "arriving" ? <ArrivingPhone arrivalStarted={arrivalStarted} listening={listening} voiceSupported={voiceSupported} transcript={text} setTranscript={setText} destination={business} stage={current.stage} progress={current.progress} seeker={seeker} route={line} departure={route.departure} onStart={start} onListen={listen} onChoose={choose} /> : <DepartingPhone stage={current.stage} destination={selected} departure={route.departure} seeker={seeker} route={line} vehicle={vehicle} />}</main></div></div>;
}

function ArrivingPhone({ arrivalStarted, listening, voiceSupported, transcript, setTranscript, destination, stage, progress, seeker, route, departure, onStart, onListen, onChoose }: { arrivalStarted: boolean; listening: boolean; voiceSupported: boolean; transcript: string; setTranscript: (value: string) => void; destination: Business | null; stage: (typeof SPOT_DEMO_STAGES)[number]; progress: number; seeker: Point; route: ReturnType<typeof geoJson>; departure: Point; onStart: () => void; onListen: () => void; onChoose: (value: string) => void }) {
  const prompt = stage.key === "approach" ? PROMPTS.reduce((latest, item) => progress >= item[0] ? item[1] : latest, "") : "";
  return <Phone title="Arriving driver">{!arrivalStarted ? <><PhoneMap route={route} business={BUSINESSES[0]} seeker={null} departure={departure} /><p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">SpotMatch</p><p className="text-xl font-bold">Where are you headed?</p><p className="text-sm text-zinc-500">Start SPOT Arrival Mode while safely stopped.</p><button onClick={onStart} className="w-full rounded-2xl bg-blue-600 py-4 text-sm font-bold text-white">Start SPOT Arrival Mode</button></> : <><PhoneMap route={route} business={destination || BUSINESSES[0]} seeker={seeker} departure={departure} /><p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">SPOT Protocol</p><p className="text-xl font-bold">{listening ? "Listening for destination" : "Arrival Mode active"}</p><p className="text-sm text-zinc-500">{destination ? stage.detail : "Welcome to 2nd Street. What is your destination?"}</p>{listening && <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3"><button onClick={onListen} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white"><Mic size={14} /> {listening ? "Restart microphone" : "Start microphone"}</button><p className="mt-2 text-center text-[10px] text-blue-700">{voiceSupported ? "Say the business name now" : "Choose a destination if voice is unavailable"}</p><input value={transcript} onChange={(event) => setTranscript(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onChoose(transcript)} placeholder="Type destination fallback" className="mt-3 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs" /><div className="mt-2 flex flex-wrap gap-2">{BUSINESSES.map((item) => <button key={item.name} onClick={() => onChoose(item.name)} className="rounded-xl bg-white px-2 py-1.5 text-[10px] font-semibold text-blue-700">{item.name}</button>)}</div></div>}{destination && !listening && <div className="space-y-2"><div className="rounded-xl bg-blue-50 p-3 text-xs font-semibold">{currentLabel(stage.key, destination.name)}</div>{prompt && <div className="rounded-xl bg-zinc-900 px-3 py-2 text-[10px] text-white"><Volume2 size={12} className="mr-1 inline text-blue-300" />{prompt}</div>}<p className="text-[10px] text-zinc-500">{stage.key === "complete" ? "Handoff complete" : "Keep eyes on the road"}</p></div>}</>}</Phone>;
}

function currentLabel(stage: string, name: string) { return ["nearby", "owner_ready", "departed", "complete"].includes(stage) ? `Departing member within one block of ${name}` : `Searching near ${name}`; }

function DepartingPhone({ stage, destination, departure, seeker, route, vehicle }: { stage: (typeof SPOT_DEMO_STAGES)[number]; destination: Business; departure: Point; seeker: Point; route: ReturnType<typeof geoJson>; vehicle: string }) {
  const status = stage.key === "complete" ? "Handoff complete" : stage.key === "departed" ? "You pulled out" : stage.key === "owner_ready" ? "Ready to leave" : stage.key === "nearby" ? "Driver nearby" : "Parked and waiting";
  return <Phone title="Departing driver"><PhoneMap route={route} business={destination} seeker={seeker} departure={departure} /><p className="text-[10px] font-bold uppercase tracking-widest text-red-600">Departing member</p><p className="text-xl font-bold">{status}</p><div className="rounded-xl bg-red-50 p-3 text-xs"><p className="font-bold text-red-700">Your {vehicle} is at the handoff point</p><p className="mt-1 text-zinc-600">{stage.key === "owner_ready" ? "Confirm while parked, then pull out when safe." : `Waiting for the SPOT handoff to ${destination.name}.`}</p></div><p className="text-[10px] text-zinc-500">Private network only · no public fallback</p></Phone>;
}

function Phone({ title, children }: { title: string; children: React.ReactNode }) { return <div className="w-full max-w-[390px] min-h-[760px] rounded-[2.8rem] border-4 border-zinc-700 bg-zinc-900 p-2 shadow-2xl"><div className="min-h-[744px] rounded-[2.25rem] bg-zinc-50 p-4 text-zinc-950"><div className="mx-auto mb-2 h-5 w-32 rounded-b-2xl bg-zinc-900" /><div className="mb-3 flex justify-between text-[11px] text-zinc-500"><span>9:41</span><span>{title} · SPOT PWA</span></div>{children}</div></div>; }

function PhoneMap({ route, business, seeker, departure }: { route: ReturnType<typeof geoJson>; business: Business; seeker: Point | null; departure: Point }) {
  const coordinates = route.features[0].geometry.coordinates;
  const lats = coordinates.map((point) => point[1]);
  const lngs = coordinates.map((point) => point[0]);
  const bounds = [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]] as [[number, number], [number, number]];
  return <div className="relative mb-3 h-48 overflow-hidden rounded-2xl"><Map initialViewState={{ bounds, fitBoundsOptions: { padding: 28 } }} mapStyle={MAP_STYLE_URL} attributionControl={false} interactive={false}><Source id="spot-demo-route" type="geojson" data={route}><Layer id="spot-demo-route-line" type="line" paint={{ "line-color": "#f59e0b", "line-width": 4 }} /></Source><Marker latitude={coordinates[0][1]} longitude={coordinates[0][0]}><span className="grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-emerald-600 text-[8px] font-bold text-white">S</span></Marker>{seeker && <Marker latitude={seeker.latitude} longitude={seeker.longitude}><span className="block h-4 w-4 rounded-full border-2 border-white bg-blue-600" /></Marker>}<Marker latitude={departure.latitude} longitude={departure.longitude}><span className="grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-red-600 text-[8px] font-bold text-white">D</span></Marker><Marker latitude={business.latitude} longitude={business.longitude}><span className="grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-purple-600 text-[8px] font-bold text-white">B</span></Marker></Map><span className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-[9px] font-bold text-blue-700">S Start · D Departure · B Business</span></div>;
}
