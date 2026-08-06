"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { speak, stopSpeech } from "@/lib/speech";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useTurnByTurn } from "@/hooks/useTurnByTurn";
import { useLiveTracking } from "@/hooks/useLiveTracking";
import { useLocationSharing } from "@/hooks/useLocationSharing";
import { useBehaviorAgentPrefs } from "@/hooks/useBehaviorAgentPrefs";
import { useHandoffAutomation } from "@/hooks/useHandoffAutomation";
import type { HandoffAutomationAction } from "@/hooks/useHandoffAutomation";
import Map, { Marker, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { INITIAL_VIEW_STATE, MAP_STYLE_URL } from "@/lib/map";
import { BlockUserModal } from "@/components/BlockUserModal";
import {
  Loader2, CheckCircle2, XCircle, Navigation, MapPin, Clock,
  Mic, MicOff, Volume2, VolumeX, Car, ArrowRight, Locate, Ban,
  Radio, Send, ShieldAlert, Eye, Undo2, Timer, Sparkles,
} from "lucide-react";

interface MatchData {
  id: string;
  status: string;
  spot_owner_id: string;
  seeker_id: string;
  spot: {
    latitude: number;
    longitude: number;
    address: string;
    departure_time: string;
    return_time: string | null;
    vehicle_type: string | null;
  };
  owner: { name: string | null; email: string | null; vehicle_type?: string | null };
  seeker: { name: string | null; email: string | null; vehicle_type?: string | null };
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

function formatGoTime(seconds: number): string {
  if (seconds <= 0) return "now";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fitView(points: { lat: number; lng: number }[]): { latitude: number; longitude: number; zoom: number } {
  if (points.length === 0) return INITIAL_VIEW_STATE;
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const span = Math.max(maxLat - minLat, maxLng - minLng, 0.0005);
  const zoom = Math.max(10, Math.min(16, Math.round(Math.log2(360 / span) - 1)));
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    zoom,
  };
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
  const [result, setResult] = useState<"accepted" | "declined" | "arrived" | "departed" | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [departed, setDeparted] = useState(false);
  const [driverArrived, setDriverArrived] = useState(false);
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(false);
  const hasSpokenRef = useRef(false);
  const sharingStartedRef = useRef(false);

  const isOwner = userId != null && match?.spot_owner_id === userId;
  const isActive = match?.status === "pending" || match?.status === "confirmed_by_owner" || match?.status === "confirmed_by_seeker";
  const isConfirmed = match?.status === "confirmed";
  const isCompleted = match?.status === "completed";

  // Turn-by-turn navigation (arriving driver only)
  const nav = useTurnByTurn({
    destination: match ? { lat: match.spot.latitude, lng: match.spot.longitude } : null,
    voiceEnabled: ttsEnabled,
    onArrive: () => {
      if (result !== "arrived" && !isOwner) handleArrived();
    },
  });

  // Live GPS handoff: see the partner's car approaching (owner) / share own car (seeker)
  const { partnerLocation, partnerSharing, partnerStatus, partnerDepartEtaSeconds } = useLiveTracking(
    isConfirmed ? (match?.id ?? null) : null,
    userId,
    match?.spot.latitude,
    match?.spot.longitude,
  );
  const { sharing: mySharing, stopSharing } = useLocationSharing(
    isConfirmed ? (match?.id ?? null) : null,
    locationSharingEnabled,
  );

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }, [supabase]);

  const refreshMatch = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch(`/api/matches/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.match) setMatch(data.match);
  }, [id, getToken]);

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
    const text = isOwner
      ? `A handoff has been detected. ${otherUserName} wants your spot on ${street}. Would you like to confirm?`
      : `A parking match has been detected on ${street}. Would you like to accept?`;
    speak(text, { rate: 0.95, pitch: 1 });
  }, [match, ttsEnabled, isOwner, otherUserName]);

  // Auto-enable live GPS sharing once BOTH drivers confirm the handoff.
  // This powers the seamless exchange: the arriving driver is tracked by the
  // parked driver in an Uber-style view, and the arriving driver is guided by
  // voice navigation.
  useEffect(() => {
    if (!isConfirmed || !match || locationSharingEnabled || sharingStartedRef.current) return;
    sharingStartedRef.current = true;
    const enable = async () => {
      const token = await getToken();
      if (!token) return;
      try {
        await fetch(`/api/matches/${match.id}/location/start`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        setLocationSharingEnabled(true);
      } catch {
        // ignore — user can enable manually
      }
    };
    enable();
  }, [isConfirmed, match, locationSharingEnabled, getToken]);

  // Handle URL action param (from notification click)
  useEffect(() => {
    const action = searchParams.get("action");
    if (!match || result || userId == null) return;
    if (action === "accept") {
      handleAccept();
    } else if (action === "decline") {
      handleDecline();
    } else if (action === "arrived") {
      if (match.spot_owner_id === userId) {
        setDriverArrived(true);
      } else {
        handleArrived();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, match, userId]);

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
    await refreshMatch();
    setResult("accepted");
    if (ttsEnabled) {
      speak(isOwner
        ? "Match confirmed. Please wait near your car for the driver to arrive."
        : "Match accepted. Starting navigation to your parking spot.", { rate: 0.95 });
    }
    if (!isOwner && userPosition && match) {
      nav.start(userPosition);
    }
    setActing(false);
  }, [acting, result, updateMatchStatus, refreshMatch, match, ttsEnabled, isOwner, userPosition, nav]);

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
    await refreshMatch();
    if (ttsEnabled) {
      speak("Parking confirmed. Thank you for using ParkingMeeters!", { rate: 0.95 });
    }
    setActing(false);
  }, [acting, result, id, getToken, ttsEnabled, nav, refreshMatch]);

  const handleDeparted = useCallback(async () => {
    if (acting || departed) return;
    setActing(true);
    stopSpeech();
    const token = await getToken();
    if (token) {
      await fetch(`/api/matches/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "departed" }),
      });
    }
    setDeparted(true);
    setResult("departed");
    await refreshMatch();
    if (ttsEnabled) {
      speak("You've pulled out. The arriving driver can now park.", { rate: 0.95 });
    }
    setActing(false);
  }, [acting, departed, id, getToken, ttsEnabled, refreshMatch]);

  // Voice recognition
  const handleVoiceResult = useCallback((result: { transcript: string }) => {
    const t = result.transcript.toLowerCase();
    if (t.includes("yes") || t.includes("accept") || t.includes("confirm") || t.includes("sure") || t.includes("go")) {
      handleAccept();
    } else if (t.includes("no") || t.includes("decline") || t.includes("deny") || t.includes("cancel")) {
      handleDecline();
    } else if (t.includes("parked") || t.includes("arrived")) {
      if (isOwner) setDriverArrived(true);
      else handleArrived();
    } else if (t.includes("pulled") || t.includes("left") || t.includes("departed")) {
      if (isOwner) handleDeparted();
    }
  }, [handleAccept, handleDecline, handleArrived, handleDeparted, isOwner]);

  const { listening, supported: voiceSupported, startListening, stopListening } = useVoiceInput(handleVoiceResult);

  // Behavior agent automation: auto-confirm arrived/departed with an undo window
  const prefs = useBehaviorAgentPrefs();

  const handleAutomationApplied = useCallback((action: HandoffAutomationAction) => {
    if (action === "arrived" && !isOwner) {
      setResult("arrived");
      nav.stop();
      void refreshMatch();
      if (ttsEnabled) {
        speak("Parking confirmed. Thank you for using ParkingMeeters!", { rate: 0.95 });
      }
    } else if (action === "departed" && isOwner) {
      setDeparted(true);
      setResult("departed");
      void refreshMatch();
      if (ttsEnabled) {
        speak("You've pulled out. The arriving driver can now park.", { rate: 0.95 });
      }
    }
  }, [isOwner, nav, refreshMatch, ttsEnabled]);

  const spotCoords = useMemo(
    () => (match ? { latitude: match.spot.latitude, longitude: match.spot.longitude } : null),
    [match],
  );

  const automation = useHandoffAutomation({
    matchId: isConfirmed && !result ? (match?.id ?? null) : null,
    role: isConfirmed && !result ? (isOwner ? "owner" : "seeker") : null,
    spot: spotCoords,
    enabled: isConfirmed && !result,
    autoConfirm: prefs.prefs.enabled && prefs.prefs.autoConfirm,
    motionEnabled: prefs.prefs.enabled && prefs.motionPermission !== "denied",
    ownerDeparted: isOwner ? false : departed || partnerStatus === "departed",
    onApplied: handleAutomationApplied,
  });

  const [undoRemaining, setUndoRemaining] = useState<number | null>(null);
  useEffect(() => {
    const deadline = automation.undoDeadline;
    if (!automation.pendingAction || deadline == null) {
      queueMicrotask(() => setUndoRemaining(null));
      return;
    }
    const tick = () => {
      const rem = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setUndoRemaining(rem);
      if (rem <= 0) clearInterval(iv);
    };
    const iv = setInterval(tick, 250);
    const initial = setTimeout(tick, 0);
    return () => {
      clearInterval(iv);
      clearTimeout(initial);
    };
  }, [automation.pendingAction, automation.undoDeadline]);

  // Route line for the mini-map (arriving driver)
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

  // Owner sees both the spot and the approaching driver
  const ownerView = useMemo(() => {
    if (!match) return INITIAL_VIEW_STATE;
    const points = [{ lat: match.spot.latitude, lng: match.spot.longitude }];
    if (partnerLocation) points.push({ lat: partnerLocation.latitude, lng: partnerLocation.longitude });
    return fitView(points);
  }, [match, partnerLocation]);

  const mapViewState = useMemo(() => {
    if (isOwner) return ownerView;
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
  }, [isOwner, ownerView, nav.currentPosition, match]);

  const driverNear = partnerLocation?.distance_meters != null && partnerLocation.distance_meters < 150;

  // Arrival-departure alignment (owner side): live countdown until the driver
  // arrives AND the owner is ready, so the owner pulls out the moment the
  // driver reaches the spot. "GO NOW" when the driver would otherwise wait.
  const [ownerAtCar, setOwnerAtCar] = useState(false);
  const myDepartEtaSeconds = useMemo(() => {
    if (!isOwner) return null;
    if (ownerAtCar) return 30;
    if (!match || !userPosition) return 60;
    const dist = haversine(userPosition.lat, userPosition.lng, match.spot.latitude, match.spot.longitude);
    if (dist <= 30) return 30;
    return Math.min(Math.round(dist / 1.4) + 30, 900);
  }, [isOwner, match, userPosition, ownerAtCar]);

  const goInSeconds = useMemo(() => {
    if (!isOwner || myDepartEtaSeconds == null) return null;
    if (partnerLocation?.eta_seconds == null) return null;
    return partnerLocation.eta_seconds - myDepartEtaSeconds;
  }, [isOwner, partnerLocation, myDepartEtaSeconds]);

  // Live tick so the GO countdown counts down between realtime updates.
  // All ref reads/setState happen inside the interval callback (async), so the
  // countdown never touches refs or impure calls during render.
  const goInRef = useRef<number | null>(null);
  useEffect(() => {
    goInRef.current = goInSeconds;
  }, [goInSeconds]);
  const [goLive, setGoLive] = useState<number | null>(null);
  const goCountdownRef = useRef<number | null>(null);
  const goTargetRef = useRef<number | null>(null);
  useEffect(() => {
    const iv = setInterval(() => {
      const target = goInRef.current;
      if (target == null) {
        if (goCountdownRef.current !== null) {
          goCountdownRef.current = null;
          setGoLive(null);
        }
        return;
      }
      if (goTargetRef.current !== target) {
        goTargetRef.current = target;
        goCountdownRef.current = target;
      } else {
        goCountdownRef.current = Math.max(0, (goCountdownRef.current ?? target) - 1);
      }
      setGoLive(goCountdownRef.current);
    }, 1000);
    return () => clearInterval(iv);
  }, []);

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
          <div>
            <h1 className="text-xl font-bold">Parking Handoff</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isOwner ? "You're departing — a driver is coming to take your spot" : "You're arriving — navigate to the spot"}
            </p>
          </div>
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
            result === "declined"
              ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              : "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
          }`}>
            {result === "declined" ? (
              <>
                <XCircle size={24} className="text-red-600 shrink-0" />
                <div>
                  <p className="font-bold text-red-700">Match Declined</p>
                </div>
              </>
            ) : result === "arrived" ? (
              <>
                <CheckCircle2 size={24} className="text-green-600 shrink-0" />
                <div>
                  <p className="font-bold text-green-700">Arrival Confirmed!</p>
                  <p className="text-xs text-green-600">You're parked. Thank you for using ParkingMeeters.</p>
                </div>
              </>
            ) : result === "departed" ? (
              <>
                <CheckCircle2 size={24} className="text-green-600 shrink-0" />
                <div>
                  <p className="font-bold text-green-700">You've pulled out!</p>
                  <p className="text-xs text-green-600">The arriving driver can now park in your spot.</p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 size={24} className="text-green-600 shrink-0" />
                <div>
                  <p className="font-bold text-green-700">{isOwner ? "Handoff Confirmed!" : "Match Accepted!"}</p>
                  <p className="text-xs text-green-600">
                    {isOwner
                      ? "Waiting for the driver. Live GPS tracking is active."
                      : "Voice-guided navigation active."}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Behavior agent auto-confirm (undo) banner */}
        {automation.pendingAction && (
          <div className="mb-4 p-4 rounded-2xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 flex items-center gap-3">
            <Sparkles size={24} className="text-violet-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-violet-700 dark:text-violet-200 text-sm">
                Agent detected {automation.pendingAction === "arrived" ? "you parked" : "you pulled out"}
              </p>
              <p className="text-xs text-violet-600 dark:text-violet-300 flex items-center gap-1 mt-0.5">
                <Timer size={12} />
                Auto-confirming in {undoRemaining ?? 0}s — wrong?
              </p>
            </div>
            <button
              onClick={automation.cancelPending}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 transition"
            >
              <Undo2 size={14} />
              Undo
            </button>
          </div>
        )}

        {/* Live tracking / navigation map */}
        {(result === "accepted" || isConfirmed || nav.status === "navigating") && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-4">
            <div style={{ height: isOwner ? 260 : 220 }}>
              <Map
                {...mapViewState}
                mapStyle={MAP_STYLE_URL}
                style={{ width: "100%", height: "100%" }}
                scrollZoom={false}
                dragPan={true}
                attributionControl={false}
              >
                {!isOwner && nav.currentPosition && (
                  <Marker latitude={nav.currentPosition.lat} longitude={nav.currentPosition.lng} anchor="center">
                    <div className="w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                      <Locate size={10} className="text-white" />
                    </div>
                  </Marker>
                )}

                {/* Arriving driver's live car (owner view) */}
                {isOwner && partnerLocation && partnerSharing && (
                  <Marker
                    latitude={partnerLocation.latitude}
                    longitude={partnerLocation.longitude}
                    anchor="center"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 w-9 h-9 -ml-0.5 -mt-0.5 rounded-full bg-blue-400 animate-ping opacity-30" />
                      <div className="w-8 h-8 rounded-full bg-blue-600 border-3 border-white shadow-lg flex items-center justify-center">
                        <Car size={16} className="text-white" style={{
                          transform: partnerLocation.heading != null ? `rotate(${partnerLocation.heading}deg)` : "none",
                        }} />
                      </div>
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

        {/* Uber-style tracking card for the parked (departing) driver */}
        {isOwner && isConfirmed && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${partnerSharing ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"}`}>
                <Radio size={20} className={partnerSharing ? "animate-pulse" : ""} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-zinc-500 uppercase tracking-wide font-bold">Live Handoff</p>
                <p className="font-bold text-sm">
                  {driverArrived || driverNear
                    ? "Driver arrived — pull out to hand off"
                    : `${otherUserName} is on the way`}
                </p>
              </div>
            </div>

            {partnerLocation && partnerSharing ? (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-lg font-bold">{formatDistance(partnerLocation.distance_meters ?? 0)}</p>
                  <p className="text-[10px] text-zinc-500">Away</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{partnerLocation.eta_seconds != null ? formatDuration(partnerLocation.eta_seconds) : "—"}</p>
                  <p className="text-[10px] text-zinc-500">ETA</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{partnerLocation.speed != null && partnerLocation.speed > 0 ? `${Math.round(partnerLocation.speed * 3.6)}` : "0"}</p>
                  <p className="text-[10px] text-zinc-500">km/h</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 mb-4">
                Waiting for {otherUserName} to begin sharing their live location...
              </p>
            )}

            {!departed && (driverArrived || driverNear) && (
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-center">
                <p className="text-xs font-bold text-blue-700">
                  {driverArrived ? "Driver arrived — you can leave now" : "Driver is pulling in — get ready to leave"}
                </p>
              </div>
            )}

            {!departed && goLive != null && myDepartEtaSeconds != null && (
              <div className={`p-3 rounded-xl border text-center mb-3 ${
                goLive <= 0
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800"
              }`}>
                <p className="text-[10px] uppercase tracking-wide font-bold text-zinc-500">Departure alignment</p>
                <p className={`text-2xl font-extrabold ${goLive <= 0 ? "text-green-600" : "text-violet-700 dark:text-violet-300"}`}>
                  {goLive <= 0 ? "GO NOW" : `Pull out in ${formatGoTime(goLive)}`}
                </p>
                <p className="text-[10px] text-zinc-500 mt-1">
                  {goLive <= 0
                    ? "Driver is arriving — pull out now so they can park."
                    : `Driver arrives in ${formatDuration(partnerLocation?.eta_seconds ?? 0)}; you need about ${formatDuration(myDepartEtaSeconds)} to pull out.`}
                </p>
              </div>
            )}

            {!departed && (
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setOwnerAtCar(true)}
                  className={`flex-1 h-9 rounded-xl text-[11px] font-bold transition border ${
                    ownerAtCar
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
                  }`}
                >
                  {"I'm at the car"}
                </button>
                <button
                  onClick={() => setOwnerAtCar(false)}
                  className={`flex-1 h-9 rounded-xl text-[11px] font-bold transition border ${
                    !ownerAtCar
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
                  }`}
                >
                  {"I'm walking back"}
                </button>
              </div>
            )}

            {departed && (
              <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
                <p className="text-xs font-bold text-green-700">Spot is open — {otherUserName} can park now</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation status panel (arriving driver) */}
        {!isOwner && nav.status === "navigating" && (
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
        {!isOwner && nav.status === "off_route" && (
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

        {/* Spot info card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <MapPin size={20} className="text-green-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-sm">{match.spot.address || "Parking Spot"}</h2>
              <p className="text-xs text-zinc-500">
                {isOwner
                  ? `Your spot — matched with ${match.seeker?.name || "this driver"}`
                  : `Shared by ${match.owner?.name || "someone"}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              Leave: {new Date(match.spot.departure_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
            {!isOwner && nav.status === "navigating" && (
              <span className="flex items-center gap-1">
                <Navigation size={12} />
                {formatDistance(nav.remainingDistance)} away
              </span>
            )}
            {isOwner && partnerLocation?.distance_meters != null && (
              <span className="flex items-center gap-1">
                <Car size={12} />
                {otherUserName}: {formatDistance(partnerLocation.distance_meters)} away
              </span>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3 text-xs text-zinc-500">
            <Car size={14} className="shrink-0" />
            <span>
              {isOwner ? "Arriving driver" : "Spot owner"}: <strong>{isOwner ? match.seeker?.name || "—" : match.owner?.name || "—"}</strong>
              {(isOwner ? match.seeker?.vehicle_type : match.owner?.vehicle_type) && (
                <> · {isOwner ? match.seeker?.vehicle_type : match.owner?.vehicle_type}</>
              )}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <Car size={18} className="text-zinc-400" />
            <div>
              <p className="text-sm font-bold">Status: {match.status.replace(/_/g, " ")}</p>
              {isConfirmed && (
                <p className="text-xs text-zinc-500">
                  Both drivers confirmed. {isOwner ? "Live GPS tracking active — the driver is approaching." : "Voice navigation is active — drive to the spot."}
                </p>
              )}
              {isCompleted && (
                <p className="text-xs text-green-600 font-semibold">Handoff complete! You helped keep this spot in use.</p>
              )}
            </div>
          </div>
        </div>

        {/* GPS sharing privacy control */}
        {isConfirmed && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-zinc-500 flex-1">
              <Eye size={14} className={mySharing ? "text-blue-600" : "text-zinc-400"} />
              <span>
                {mySharing
                  ? "Live GPS handoff active — your matched driver can see your location until the handoff ends."
                  : "Live GPS handoff is off."}
              </span>
            </div>
            <button
              onClick={() => {
                if (mySharing) {
                  stopSharing();
                  setLocationSharingEnabled(false);
                } else {
                  getToken().then((token) => {
                    if (token && match) {
                      fetch(`/api/matches/${match.id}/location/start`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                      }).then(() => setLocationSharingEnabled(true));
                    }
                  });
                }
              }}
              className={`shrink-0 h-8 px-3 rounded-lg text-[11px] font-bold transition ${
                mySharing
                  ? "bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {mySharing ? "Stop Sharing" : "Share Location"}
            </button>
          </div>
        )}

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
                {listening ? "Listening..." : "Voice Command"}
              </button>
            )}

            {/* Accept / Confirm */}
            {isActive && (
              <button
                onClick={handleAccept}
                disabled={acting || (!isOwner && !userPosition)}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
              >
                {acting ? <Loader2 className="animate-spin" size={20} /> : isOwner ? <CheckCircle2 size={20} /> : <Navigation size={20} />}
                {acting ? "Processing..." : isOwner ? "Confirm Handoff" : "Accept & Navigate"}
              </button>
            )}

            {/* Arriving driver confirms parking */}
            {isConfirmed && !isOwner && (
              <button
                onClick={handleArrived}
                disabled={acting}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
              >
                {acting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                {acting ? "Processing..." : "Confirm I've Parked"}
              </button>
            )}

            {/* Departing driver confirms they pulled out (also available in the live-tracking card above) */}
            {isConfirmed && isOwner && !departed && (
              <button
                onClick={handleDeparted}
                disabled={acting}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
              >
                {acting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                {acting ? "Processing..." : "I've Pulled Out of the Spot"}
              </button>
            )}

            {/* Decline */}
            {isActive && (
              <button
                onClick={handleDecline}
                disabled={acting}
                className="w-full h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition disabled:opacity-50"
              >
                Decline
              </button>
            )}
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
        {!isOwner && nav.status === "navigating" && !result && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-center">
            <p className="text-xs font-bold text-blue-700 flex items-center justify-center gap-2">
              <ArrowRight size={14} />
              Step {Math.min(nav.currentStepIndex + 1, nav.steps.length)} of {nav.steps.length}
            </p>
          </div>
        )}

        {/* Arrival proximity (arriving driver) — only ask to confirm once the
            spot is actually free, so the driver never "parks" over the owner. */}
        {!isOwner && nav.status === "arrived" && result !== "arrived" && (departed || partnerStatus === "departed") && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl text-center">
            <CheckCircle2 size={28} className="mx-auto text-green-600 mb-2" />
            <p className="font-bold text-green-700">You have arrived!</p>
            <p className="text-xs text-green-600 mt-1">The owner has pulled out. Please confirm you have parked.</p>
            <button
              onClick={handleArrived}
              className="mt-3 w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition"
            >
              Confirm I've Parked
            </button>
          </div>
        )}

        {/* Hold banner: the driver beat the owner to the spot — wait, the spot
            opens the moment the owner leaves (no circling the block). */}
        {!isOwner && isConfirmed && result !== "arrived" && nav.status === "arrived" && departed === false && partnerStatus !== "departed" && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl text-center">
            <Timer size={28} className="mx-auto text-amber-600 mb-2" />
            <p className="font-bold text-amber-700">{"You're at the spot — the owner is pulling out now"}</p>
            <p className="text-xs text-amber-600 mt-1">
              {partnerDepartEtaSeconds != null && partnerDepartEtaSeconds > 60
                ? `The owner needs about ${Math.round(partnerDepartEtaSeconds / 60)} min to reach their car and leave.`
                : "The owner is about to leave. Wait right here and pull in the moment they go."}
            </p>
          </div>
        )}

        {/* Spot is ready banner (arriving driver) */}
        {!isOwner && isConfirmed && (departed || partnerStatus === "departed") && (
          <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center">
            <CheckCircle2 size={28} className="mx-auto text-emerald-600 mb-2" />
            <p className="font-bold text-emerald-700">The spot is open!</p>
            <p className="text-xs text-emerald-600 mt-1">{match.owner?.name || "The driver"} has pulled out. Park now.</p>
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
