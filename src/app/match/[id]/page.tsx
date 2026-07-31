"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { speak, stopSpeech } from "@/lib/speech";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useTurnByTurn } from "@/hooks/useTurnByTurn";
import Map, { Marker, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { INITIAL_VIEW_STATE, MAP_STYLE_URL } from "@/lib/map";
import { BlockUserModal } from "@/components/BlockUserModal";
import {
  Loader2, CheckCircle2, XCircle, Navigation, MapPin, Clock,
  Mic, MicOff, Volume2, VolumeX, Car, ArrowRight, Locate, Ban,
} from "lucide-react";

interface MatchData {
  id: string;
  status: string;
  spot: {
    latitude: number;
    longitude: number;
    address: string;
    departure_time: string;
  };
  owner: { name: string | null; email: string | null };
  seeker: { name: string | null; email: string | null };
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export default function MatchNotificationPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createBrowserClient();

  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherUserName, setOtherUserName] = useState("");
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState<"accepted" | "declined" | "arrived" | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const hasSpokenRef = useRef(false);

  // Turn-by-turn navigation
  const nav = useTurnByTurn({
    destination: match ? { lat: match.spot.latitude, lng: match.spot.longitude } : null,
    voiceEnabled: ttsEnabled,
    onArrive: () => {
      if (result !== "arrived") handleArrived();
    },
  });

  // Load match data
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.push("/"); return; }
      setUserId(session.user.id);

      const res = await fetch(`/api/matches/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.match) {
        setMatch(data.match);
        const ouid = data.match.spot_owner_id === session.user.id
          ? data.match.seeker_id : data.match.spot_owner_id;
        const oname = data.match.spot_owner_id === session.user.id
          ? (data.match.seeker?.name || "this user")
          : (data.match.spot_owner?.name || "this user");
        setOtherUserId(ouid);
        setOtherUserName(oname);
      }
      setLoading(false);
    });
  }, [id, router, supabase]);

  // Get user position on mount
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  // TTS announcement on load
  useEffect(() => {
    if (!match || !ttsEnabled || hasSpokenRef.current) return;
    if (match.status !== "pending" && match.status !== "confirmed_by_owner" && match.status !== "confirmed_by_seeker") return;

    hasSpokenRef.current = true;
    const street = match.spot.address || "nearby location";
    const text = `A parking match has been detected on ${street}. Would you like to accept?`;
    speak(text, { rate: 0.95, pitch: 1 });
  }, [match, ttsEnabled]);

  // Handle URL action param (from notification click)
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "accept" && match && !result) {
      handleAccept();
    } else if (action === "decline" && match && !result) {
      handleDecline();
    } else if (action === "arrived" && match && !result) {
      handleArrived();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, match]);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }, [supabase]);

  const updateMatchStatus = useCallback(async (action: string) => {
    const token = await getToken();
    if (!token) return;
    await fetch(`/api/matches/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action }),
    });
  }, [id, getToken]);

  const handleAccept = useCallback(async () => {
    if (acting || result) return;
    setActing(true);
    stopSpeech();
    await updateMatchStatus("confirm");
    setResult("accepted");
    if (ttsEnabled) {
      speak("Match accepted. Starting navigation to your parking spot.", { rate: 0.95 });
    }
    // Start turn-by-turn navigation
    if (userPosition && match) {
      nav.start(userPosition);
    }
    setActing(false);
  }, [acting, result, updateMatchStatus, match, ttsEnabled, userPosition, nav]);

  const handleDecline = useCallback(async () => {
    if (acting || result) return;
    setActing(true);
    stopSpeech();
    await updateMatchStatus("reject");
    setResult("declined");
    if (ttsEnabled) {
      speak("Match declined.", { rate: 0.95 });
    }
    setTimeout(() => router.push("/"), 2000);
  }, [acting, result, updateMatchStatus, router, ttsEnabled]);

  const handleArrived = useCallback(async () => {
    if (acting || result === "arrived") return;
    setActing(true);
    stopSpeech();
    const token = await getToken();
    if (token) {
      await fetch(`/api/matches/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "arrived" }),
      });
    }
    setResult("arrived");
    nav.stop();
    if (ttsEnabled) {
      speak("Parking confirmed. Thank you for using ParkingMeeters!", { rate: 0.95 });
    }
    setActing(false);
  }, [acting, result, id, getToken, ttsEnabled, nav]);

  // Voice recognition
  const handleVoiceResult = useCallback((result: { transcript: string }) => {
    const t = result.transcript.toLowerCase();
    if (t.includes("yes") || t.includes("accept") || t.includes("sure") || t.includes("go")) {
      handleAccept();
    } else if (t.includes("no") || t.includes("decline") || t.includes("deny") || t.includes("cancel")) {
      handleDecline();
    } else if (t.includes("parked") || t.includes("arrived")) {
      handleArrived();
    }
  }, [handleAccept, handleDecline, handleArrived]);

  const { listening, supported: voiceSupported, startListening, stopListening } = useVoiceInput(handleVoiceResult);

  const isActive = match?.status === "pending" || match?.status === "confirmed_by_owner" || match?.status === "confirmed_by_seeker";
  const isConfirmed = match?.status === "confirmed";

  // Route line for the mini-map
  const routeGeoJson = useMemo(() => {
    if (!nav.route?.geometry?.coordinates) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: nav.route.geometry.coordinates,
      },
    };
  }, [nav.route]);

  const mapViewState = useMemo(() => {
    if (nav.currentPosition) {
      return {
        latitude: nav.currentPosition.lat,
        longitude: nav.currentPosition.lng,
        zoom: 14,
      };
    }
    if (match) {
      return {
        latitude: match.spot.latitude,
        longitude: match.spot.longitude,
        zoom: 13,
      };
    }
    return INITIAL_VIEW_STATE;
  }, [nav.currentPosition, match]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500">Match not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <div className="max-w-lg mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Parking Match</h1>
          <button
            onClick={() => setTtsEnabled((v) => { const next = !v; if (!next) stopSpeech(); return next; })}
            className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition"
          >
            {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>

        {/* Result banner */}
        {result && (
          <div className={`mb-4 p-4 rounded-2xl flex items-center gap-3 ${
            result === "accepted"
              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
              : result === "arrived"
              ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
              : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          }`}>
            {result === "accepted" ? (
              <>
                <CheckCircle2 size={24} className="text-green-600 shrink-0" />
                <div>
                  <p className="font-bold text-green-700">Match Accepted!</p>
                  <p className="text-xs text-green-600">Voice-guided navigation active.</p>
                </div>
              </>
            ) : result === "arrived" ? (
              <>
                <CheckCircle2 size={24} className="text-blue-600 shrink-0" />
                <div>
                  <p className="font-bold text-blue-700">Arrival Confirmed!</p>
                  <p className="text-xs text-blue-600">Thank you for using ParkingMeeters.</p>
                </div>
              </>
            ) : (
              <>
                <XCircle size={24} className="text-red-600 shrink-0" />
                <div>
                  <p className="font-bold text-red-700">Match Declined</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Navigation Map */}
        {result === "accepted" && nav.route && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-4">
            <div style={{ height: 220 }}>
              <Map
                {...mapViewState}
                mapStyle={MAP_STYLE_URL}
                style={{ width: "100%", height: "100%" }}
                scrollZoom={false}
                dragPan={true}
                attributionControl={false}
              >
                {nav.currentPosition && (
                  <Marker latitude={nav.currentPosition.lat} longitude={nav.currentPosition.lng} anchor="center">
                    <div className="w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                      <Locate size={10} className="text-white" />
                    </div>
                  </Marker>
                )}
                <Marker latitude={match.spot.latitude} longitude={match.spot.longitude} anchor="bottom">
                  <div className="w-7 h-7 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                    <MapPin size={14} className="text-white" />
                  </div>
                </Marker>
                {routeGeoJson && (
                  <Source id="route" type="geojson" data={routeGeoJson as any}>
                    <Layer
                      id="route-line"
                      type="line"
                      paint={{
                        "line-color": "#3b82f6",
                        "line-width": 4,
                        "line-opacity": 0.85,
                      }}
                    />
                  </Source>
                )}
              </Map>
            </div>
          </div>
        )}

        {/* Navigation status panel */}
        {nav.status === "navigating" && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <Navigation size={20} className="text-blue-600" />
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide font-bold">Next Turn</p>
                <p className="font-bold text-sm mt-0.5">{nav.nextInstruction || "Calculating..."}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-lg font-bold">{formatDistance(nav.remainingDistance)}</p>
                <p className="text-[10px] text-zinc-500">Remaining</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{formatDuration(nav.remainingDuration)}</p>
                <p className="text-[10px] text-zinc-500">ETA</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{formatDistance(nav.distanceToNext)}</p>
                <p className="text-[10px] text-zinc-500">To Turn</p>
              </div>
            </div>
          </div>
        )}

        {/* Off-route alert */}
        {nav.status === "off_route" && (
          <div className="mb-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="font-bold text-amber-700 text-sm mb-2">Off Route Detected</p>
            <p className="text-xs text-amber-600 mb-3">You've deviated from the route. Recalculating...</p>
            <button
              onClick={nav.dismissOffRoute}
              className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold transition"
            >
              Recalculate Route
            </button>
          </div>
        )}

        {/* No route found */}
        {nav.status === "no_route" && (
          <div className="mb-4 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="font-bold text-red-700 text-sm">Unable to calculate route</p>
            <p className="text-xs text-red-600 mt-1">Opening Google Maps instead.</p>
          </div>
        )}

        {/* Spot info card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <MapPin size={20} className="text-green-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-sm">{match.spot.address || "Parking Spot"}</h2>
              <p className="text-xs text-zinc-500">
                Shared by {match.owner?.name || "someone"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              Leave: {new Date(match.spot.departure_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
            {nav.status === "navigating" && (
              <span className="flex items-center gap-1">
                <Navigation size={12} />
                {formatDistance(nav.remainingDistance)} away
              </span>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <Car size={18} className="text-zinc-400" />
            <div>
              <p className="text-sm font-bold">Status: {match.status.replace(/_/g, " ")}</p>
              {isConfirmed && (
                <p className="text-xs text-zinc-500">Both parties confirmed. Navigate to the spot!</p>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {!result && (isActive || isConfirmed) && (
          <div className="space-y-3">
            {/* Voice input */}
            {voiceSupported && (
              <button
                onClick={listening ? stopListening : startListening}
                className={`w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition ${
                  listening
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {listening ? <MicOff size={18} /> : <Mic size={18} />}
                {listening ? "Listening... Say yes or no" : "Voice Command"}
              </button>
            )}

            {/* Accept */}
            {isActive && (
              <button
                onClick={handleAccept}
                disabled={acting || !userPosition}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
              >
                {acting ? <Loader2 className="animate-spin" size={20} /> : <Navigation size={20} />}
                {acting ? "Processing..." : "Accept & Navigate"}
              </button>
            )}

            {/* Confirm arrival */}
            {isConfirmed && (
              <button
                onClick={handleArrived}
                disabled={acting}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
              >
                {acting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                {acting ? "Processing..." : "Confirm I've Parked"}
              </button>
            )}

            {/* Decline */}
            <button
              onClick={handleDecline}
              disabled={acting}
              className="w-full h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition disabled:opacity-50"
            >
              Decline
            </button>
            {otherUserId && (
              <button
                onClick={() => setShowBlockModal(true)}
                className="w-full text-center text-xs text-red-400 hover:text-red-500 transition py-1"
              >
                <Ban size={12} className="inline mr-1" />Block {otherUserName}
              </button>
            )}
          </div>
        )}

        {/* Navigation status badge */}
        {nav.status === "navigating" && !result && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-center">
            <p className="text-xs font-bold text-blue-700 flex items-center justify-center gap-2">
              <ArrowRight size={14} />
              Step {Math.min(nav.currentStepIndex + 1, nav.steps.length)} of {nav.steps.length}
            </p>
          </div>
        )}

        {/* Arrival proximity */}
        {nav.status === "arrived" && result !== "arrived" && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl text-center">
            <CheckCircle2 size={28} className="mx-auto text-green-600 mb-2" />
            <p className="font-bold text-green-700">You have arrived!</p>
            <p className="text-xs text-green-600 mt-1">Please confirm you have parked.</p>
            <button
              onClick={handleArrived}
              className="mt-3 w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition"
            >
              Confirm I've Parked
            </button>
          </div>
        )}
      </div>

      <BlockUserModal
        open={showBlockModal}
        userId={otherUserId || ""}
        userName={otherUserName}
        onClose={() => setShowBlockModal(false)}
      />
    </div>
  );
}
