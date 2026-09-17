"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Marker, Source } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { ArrowLeft, LocateFixed, MapPin, Navigation, ShieldCheck, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import { SPOT_ARRIVAL_GEOFENCE, SPOT_PROTOCOL } from "@/lib/spot-protocol";
import { useSpotProtocolArrival } from "@/hooks/useSpotProtocolArrival";
import { useTurnByTurn } from "@/hooks/useTurnByTurn";
import { MAP_STYLE_URL } from "@/lib/map";
import { speak as speakSpeech } from "@/lib/speech";
import { createBrowserClient } from "@/lib/supabaseClient";

const BELMONT_SHORE_VIEW = {
  latitude: SPOT_ARRIVAL_GEOFENCE.latitude,
  longitude: SPOT_ARRIVAL_GEOFENCE.longitude,
  zoom: 14,
};

function statusCopy(status: ReturnType<typeof useSpotProtocolArrival>["status"], arrivalEligible: boolean | null): { title: string; detail: string; color: string } {
  switch (status) {
    case "inside": return { title: "You are in the Belmont Shore area", detail: arrivalEligible === false ? "Arrival matching is temporarily unavailable." : "Searching your private network for a SPOT handoff.", color: arrivalEligible === false ? "text-amber-700" : "text-emerald-700" };
    case "outside": return { title: "Approaching Belmont Shore", detail: "Keep Arrival Mode open. We will search when you enter the pilot area.", color: "text-blue-700" };
    case "paused": return { title: "Tracking paused", detail: "Return to this screen when safely stopped to resume Arrival Mode.", color: "text-amber-700" };
    case "low_accuracy": return { title: "Improving location accuracy", detail: "GPS uncertainty is too high to confirm the pilot area yet.", color: "text-amber-700" };
    case "requesting": return { title: "Requesting location", detail: "Allow location access to start the SPOT Protocol.", color: "text-blue-700" };
    case "denied": return { title: "Location permission needed", detail: "Enable location for this site, then start Arrival Mode again.", color: "text-red-700" };
    case "unavailable": return { title: "Location unavailable", detail: "Check device location settings and try again.", color: "text-red-700" };
    default: return { title: "Ready for arrival mode", detail: "Start before driving and keep your phone mounted.", color: "text-zinc-700" };
  }
}

export default function ArrivalPage() {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [destination, setDestination] = useState("Belmont Shore / 2nd Street");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationStatus, setDestinationStatus] = useState<string | null>(null);
  const [arrivalEligible, setArrivalEligible] = useState<boolean | null>(null);
  const { status, position, error, wakeLockActive, motionPermission, requestMotionPermission } = useSpotProtocolArrival(active);
  const copy = statusCopy(status, arrivalEligible);
  const navigationStartedRef = useRef(false);
  const nav = useTurnByTurn({ destination: destinationCoords, voiceEnabled });

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const response = await fetch("/api/matches/eligibility", { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (mounted && response.ok) {
        const body = await response.json() as { eligible?: boolean };
        setArrivalEligible(body.eligible === true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const geocodeDestination = useCallback(async () => {
    setDestinationStatus("Finding the business location...");
    try {
      const directoryResponse = await fetch(`/api/directory/resolve?q=${encodeURIComponent(destination)}`);
      const directoryBody = await directoryResponse.json().catch(() => ({})) as { candidates?: Array<{ name: string; latitude: number; longitude: number }> };
      const directoryMatch = directoryBody.candidates?.[0];
      if (directoryResponse.ok && directoryMatch) {
        setDestinationCoords({ lat: directoryMatch.latitude, lng: directoryMatch.longitude });
        setDestinationStatus(`Destination found: ${directoryMatch.name}. Preparing voice navigation...`);
        return;
      }
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&q=${encodeURIComponent(`${destination}, Belmont Shore, Long Beach, CA`)}`);
      const results = await response.json() as Array<{ lat: string; lon: string }>;
      if (!results[0]) throw new Error("Destination not found");
      setDestinationCoords({ lat: Number(results[0].lat), lng: Number(results[0].lon) });
      setDestinationStatus("Destination found. Preparing voice navigation...");
    } catch {
      setDestinationStatus("We could not find that destination. Try a business name and cross street.");
    }
  }, [destination]);

  const geofence = useMemo(() => {
    const points: [number, number][] = [];
    for (let index = 0; index <= 64; index += 1) {
      const angle = (index / 64) * Math.PI * 2;
      const latitudeDelta = (SPOT_ARRIVAL_GEOFENCE.radiusMeters / 111_320) * Math.sin(angle);
      const longitudeDelta = (SPOT_ARRIVAL_GEOFENCE.radiusMeters / (111_320 * Math.cos(SPOT_ARRIVAL_GEOFENCE.latitude * Math.PI / 180))) * Math.cos(angle);
      points.push([SPOT_ARRIVAL_GEOFENCE.longitude + longitudeDelta, SPOT_ARRIVAL_GEOFENCE.latitude + latitudeDelta]);
    }
    return { type: "FeatureCollection" as const, features: [{ type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [points] } }] };
  }, []);

  const startArrival = async () => {
    if (!destination.trim()) return;
    if (motionPermission !== "granted") await requestMotionPermission();
    setActive(true);
    navigationStartedRef.current = false;
    await geocodeDestination();
    if (voiceEnabled) void speakSpeech("SPOT Arrival Mode is active. Keep your eyes on the road. Your location is monitored only while this screen is open.", { rate: 0.88, pitch: 1, volume: 1 });
  };

  useEffect(() => {
    if (!active || !position || !destinationCoords || navigationStartedRef.current) return;
    navigationStartedRef.current = true;
    void nav.start({ lat: position.latitude, lng: position.longitude });
  }, [active, destinationCoords, nav, position]);

  const stopArrival = () => {
    navigationStartedRef.current = false;
    nav.stop();
    setActive(false);
    setDestinationCoords(null);
    setDestinationStatus(null);
  };

  const routeGeoJson = useMemo(() => nav.route?.geometry?.coordinates ? ({
    type: "FeatureCollection" as const,
    features: [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: nav.route.geometry.coordinates } }],
  }) : null, [nav.route]);

  const formatDistance = (meters: number) => meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <button onClick={() => router.back()} className="rounded-xl p-2 text-zinc-300 hover:bg-white/10" aria-label="Go back"><ArrowLeft size={20} /></button>
          <div className="text-center"><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">{SPOT_PROTOCOL.name}</p><h1 className="mt-1 text-lg font-bold">Arrival Mode</h1></div>
          <button onClick={() => setVoiceEnabled((current) => !current)} className="rounded-xl p-2 text-zinc-300 hover:bg-white/10" aria-label={voiceEnabled ? "Mute voice" : "Enable voice"}>{voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
        </header>

        <section className="relative h-[52vh] min-h-[360px] overflow-hidden">
          <Map initialViewState={BELMONT_SHORE_VIEW} mapStyle={MAP_STYLE_URL} attributionControl={false} reuseMaps>
            <Source id="spot-geofence" type="geojson" data={geofence}>
              <Layer id="spot-geofence-fill" type="fill" paint={{ "fill-color": "#2563eb", "fill-opacity": 0.1 }} />
              <Layer id="spot-geofence-line" type="line" paint={{ "line-color": "#60a5fa", "line-width": 2, "line-dasharray": [2, 2] }} />
            </Source>
            {routeGeoJson && <Source id="spot-navigation-route" type="geojson" data={routeGeoJson}><Layer id="spot-navigation-route-line" type="line" paint={{ "line-color": "#f59e0b", "line-width": 5, "line-opacity": 0.9 }} /></Source>}
            <Marker latitude={SPOT_ARRIVAL_GEOFENCE.latitude} longitude={SPOT_ARRIVAL_GEOFENCE.longitude} anchor="center"><div className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-blue-600 shadow-xl"><MapPin size={19} /></div></Marker>
            {position && <Marker latitude={position.latitude} longitude={position.longitude} anchor="center"><div className="relative grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-cyan-400 shadow-lg"><span className="absolute h-12 w-12 animate-ping rounded-full bg-cyan-300/30" /><LocateFixed size={13} className="relative text-zinc-950" /></div></Marker>}
            {destinationCoords && <Marker latitude={destinationCoords.lat} longitude={destinationCoords.lng} anchor="center"><div className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-purple-600 shadow-xl"><MapPin size={15} /></div></Marker>}
          </Map>
          <div className="pointer-events-none absolute left-4 right-4 top-4 flex items-start justify-between gap-3"><div className="rounded-2xl border border-white/10 bg-zinc-950/85 px-4 py-3 shadow-xl backdrop-blur"><p className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Destination</p><p className="mt-1 text-sm font-semibold">{destination}</p></div><div className="rounded-2xl border border-white/10 bg-zinc-950/85 px-3 py-2 text-right text-[10px] text-zinc-300 shadow-xl backdrop-blur"><p>Blue zone</p><p>Belmont Shore pilot area</p></div></div>
        </section>

        <section className="space-y-4 px-4 py-5">
           <div className="rounded-3xl border border-white/10 bg-white p-5 text-zinc-950 shadow-2xl"><div className="flex items-start gap-3"><div className={`mt-1 h-3 w-3 rounded-full ${active && status === "inside" ? "bg-emerald-500" : active ? "bg-blue-500" : "bg-zinc-300"}`} /><div className="min-w-0 flex-1"><h2 className={`font-bold ${copy.color}`}>{nav.status === "navigating" ? "Voice navigation active" : nav.status === "arrived" ? "You have arrived" : nav.status === "off_route" ? "Route recalculation needed" : copy.title}</h2><p className="mt-1 text-sm leading-6 text-zinc-600">{nav.status === "navigating" ? nav.nextInstruction || "Calculating the next turn..." : nav.status === "arrived" ? "You are within the arrival zone. Continue only when safely stopped and verify public signs and actual conditions." : nav.status === "off_route" ? "The app detected that you left the route. Recalculate only while safely stopped." : copy.detail}</p></div><Navigation className="text-blue-600" size={20} /></div>{nav.status === "navigating" && <div className="mt-4 flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-800"><span>{formatDistance(nav.remainingDistance)} remaining</span><span>{Math.max(0, Math.round(nav.remainingDuration / 60))} min</span></div>}{nav.status === "off_route" && <button onClick={() => void nav.reroute()} className="mt-4 w-full rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white">Recalculate while stopped</button>}{destinationStatus && <p className="mt-3 text-xs text-zinc-500">{destinationStatus}</p>}{position && <p className="mt-4 text-xs text-zinc-500">Location updated {new Date(position.updatedAt).toLocaleTimeString()} · accuracy about {Math.round(position.accuracy)}m</p>}</div>

           {!active && <div className="space-y-3"><label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">Where are you headed?</label><input value={destination} onChange={(event) => setDestination(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-400" placeholder="Business or destination" /><button onClick={startArrival} className="w-full rounded-2xl bg-blue-600 px-4 py-4 text-sm font-bold shadow-lg shadow-blue-900/30 hover:bg-blue-500"><span className="flex items-center justify-center gap-2"><LocateFixed size={18} /> Start while safely stopped</span></button><p className="text-center text-xs leading-5 text-zinc-500">Arrival Mode is informational. Public rules control, and an exact location or signal is never a reservation or guarantee. Use controls only while safely stopped.</p>{arrivalEligible === false && <p className="rounded-2xl border border-amber-900/50 bg-amber-950/40 p-3 text-center text-xs leading-5 text-amber-200">Arrival matches unlock after you complete one departure handoff. You can still use Arrival Mode for navigation.</p>}</div>}

          {active && <button onClick={stopArrival} className="w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-bold text-zinc-300 hover:bg-white/10">Stop Arrival Mode</button>}
          {active && <div className="flex items-start gap-3 rounded-2xl border border-blue-900/60 bg-blue-950/40 p-4 text-xs leading-5 text-blue-100"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-blue-300" /><p>SPOT Protocol keeps departure details private. The arriving driver does not need to interact with the app while moving. {wakeLockActive ? "The screen is being kept awake on this device." : "Screen wake lock is unavailable or inactive."}</p></div>}
          {error && <p className="rounded-xl bg-red-950/50 p-3 text-xs text-red-200">{error}</p>}
        </section>
      </div>
    </main>
  );
}
