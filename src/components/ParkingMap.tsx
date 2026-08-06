"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Map, { Marker, ViewStateChangeEvent, MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useRealtimeSpots } from "@/hooks/useRealtimeSpots";
import { INITIAL_VIEW_STATE, MAP_STYLE_URL, SATELLITE_STYLE } from "@/lib/map";
import { SpotMarker } from "./SpotMarker";
import { ClusterMarker } from "./ClusterMarker";
import { useSpotClusters } from "@/hooks/useSpotClusters";
import type { Spot } from "@/hooks/useRealtimeSpots";
import { SpotDetails } from "./SpotDetails";
import { PostSpotForm } from "./PostSpotForm";
import { StatsDashboard } from "./StatsDashboard";
import { EphemeralChat } from "./EphemeralChat";
import { Auth } from "./Auth";
import { Button } from "./ui/button";
import { SpotRequestMarker } from "./SpotRequestMarker";
import { DeparturePingMarker } from "./DeparturePingMarker";
import type { DeparturePingData } from "./DeparturePingMarker";
import { User as UserIcon, Search, Loader2, Bell, MapPin, Clock, X as CloseIcon, Handshake } from "lucide-react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { useNotifications } from "@/hooks/useNotifications";
import { getUserChats, getActiveSpotRequests, getActiveDeparturePings } from "@/actions/social";
import { getParkingSpots, deleteParkingSpot } from "@/lib/parking-spot";
import { reverseGeocode } from "@/lib/geocode";
import type { SavedParkingSpot } from "@/lib/parking-spot";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

import { CommunityAgreementModal } from "./CommunityAgreementModal";
import { NotificationConsent } from "./NotificationConsent";

import { StreetSweepingBanner } from "./StreetSweepingBanner";
import { PhoneVerificationModal } from "./PhoneVerificationModal";
import { PilotAreaWarning } from "./PilotAreaWarning";
import { MatchList } from "./MatchList";
import { LocationConsentModal } from "./LocationConsentModal";
import { LiveTrackingOverlay } from "./LiveTrackingOverlay";
import { useLocationSharing } from "@/hooks/useLocationSharing";
import { useLiveTracking } from "@/hooks/useLiveTracking";
import { reverseGeocodeStreet } from "@/lib/reverse-geocode";
import { checkPilotArea } from "@/lib/pilot-area";
import { SpotQuestOverlay } from "./spotquest/SpotQuestOverlay";
import { LocationPermissionOverlay } from "./LocationPermissionOverlay";

const LOCATION_PERMISSION_KEY = "spotmatch_location_granted";
import { useCarLocation } from "@/hooks/useCarLocation";
import { CarLocationMarker } from "./CarLocationMarker";
import { CarLocationPanel } from "./CarLocationPanel";
import { useBehaviorAgentPrefs } from "@/hooks/useBehaviorAgentPrefs";
import { BehaviorAgentConsentModal } from "./BehaviorAgentConsentModal";
import { postAutoSpot } from "@/lib/behavior/actions";
import type { BehaviorAgentEvent } from "@/lib/behavior/types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];
type SweepingData = {
  id: string;
  street_name: string;
  city: string;
  day_of_week: string;
  time_start: string;
  time_end: string;
  zone: string;
  holiday_exemptions: string[];
};

export interface ParkingMapProps {
  onSpotClick?: (spot: Spot) => void;
  fullHeight?: boolean;
}

export function ParkingMap({ onSpotClick, fullHeight }: ParkingMapProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createBrowserClient();
  const [userVehicleType, setUserVehicleType] = useState<string | null>(null);
  const { spots, loading, error } = useRealtimeSpots(userVehicleType);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [joinWaitlistLoading, setJoinWaitlistLoading] = useState(false);
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showMatches, setShowMatches] = useState(false);
  const [pendingMatchCount, setPendingMatchCount] = useState(0);
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [activeChat, setActiveChat] = useState<{ chatId: string; spotId: string } | null>(null);
  const [activeChats, setActiveChats] = useState<{ id: string; spot_id: string }[]>([]);
  const [spotRequests, setSpotRequests] = useState<Database["public"]["Tables"]["spot_requests"]["Row"][]>([]);
  const [selectedSpotRequest, setSelectedSpotRequest] = useState<Database["public"]["Tables"]["spot_requests"]["Row"] | null>(null);
  const [departurePings, setDeparturePings] = useState<DeparturePingData[]>([]);
  const [selectedDeparturePing, setSelectedDeparturePing] = useState<DeparturePingData | null>(null);
  const [showLookingForSpot, setShowLookingForSpot] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [savedSpots, setSavedSpots] = useState<SavedParkingSpot[]>([]);
  const [savingSpot, setSavingSpot] = useState(false);
  const [saveAccuracy, setSaveAccuracy] = useState<number | null>(null);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [selectedLeaveSpot, setSelectedLeaveSpot] = useState<SavedParkingSpot | null>(null);
  const [leaveMinutes, setLeaveMinutes] = useState(10);
  const [postingLeave, setPostingLeave] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [satelliteView, setSatelliteView] = useState(false);

  // Live tracking state
  const [activeTrackingMatch, setActiveTrackingMatch] = useState<{
    matchId: string;
    partnerName: string;
    spotAddress: string;
    spotLat: number;
    spotLng: number;
  } | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [trackingEnabled, setTrackingEnabled] = useState(false);

  // Map
  const mapRef = useRef<MapRef>(null);

  // Location permission on open
  const [showLocationPermission, setShowLocationPermission] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem(LOCATION_PERMISSION_KEY);
  });

  // Step 2: Community Agreement modal (TOS + Safety combined)
  const [showCommunityAgreement, setShowCommunityAgreement] = useState(false);
  const [agreementMode, setAgreementMode] = useState<"post" | "look">("post");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);
  const [showNotificationConsent, setShowNotificationConsent] = useState(false);

  // Step 3: Street sweeping
  const [sweepingData, setSweepingData] = useState<SweepingData | null>(null);
  const [sweepingLoading, setSweepingLoading] = useState(false);

  // Security gating
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [flagCount, setFlagCount] = useState(0);
  const [pilotAreaAllowed, setPilotAreaAllowed] = useState(true);
  const [pilotAreaName, setPilotAreaName] = useState("");
  const [showPilotWarning, setShowPilotWarning] = useState(false);
  const [gatingChecked, setGatingChecked] = useState(false);
  const [gatingBlockReason, setGatingBlockReason] = useState<string | null>(null);

  // Live tracking hooks
  const { sharing: mySharing, stopSharing } = useLocationSharing(
    activeTrackingMatch?.matchId ?? null,
    trackingEnabled,
  );
  const { partnerLocation, partnerSharing, isTracking, error: trackingError } = useLiveTracking(
    activeTrackingMatch?.matchId ?? null,
    user?.id ?? null,
    activeTrackingMatch?.spotLat,
    activeTrackingMatch?.spotLng,
  );

  // Behavior agent (Smart Spot Agent) preferences + first-run consent
  const agentPrefs = useBehaviorAgentPrefs();
  const [agentConsentOpen, setAgentConsentOpen] = useState(false);
  const [autoPosted, setAutoPosted] = useState(false);
  const autoPostedRef = useRef(false);
  const agentConsentSeenKey = "spotmatch_agent_consent_seen";

  useEffect(() => {
    if (agentPrefs.loaded && agentPrefs.motionSupported && typeof window !== "undefined") {
      if (window.localStorage.getItem(agentConsentSeenKey) !== "1") {
        queueMicrotask(() => setAgentConsentOpen(true));
      }
    }
  }, [agentPrefs.loaded, agentPrefs.motionSupported]);

  const handleAgentConsentClose = useCallback(() => {
    setAgentConsentOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(agentConsentSeenKey, "1");
    }
  }, []);

  const handleCarMoved = useCallback(
    async (event: BehaviorAgentEvent) => {
      if (!agentPrefs.prefs.enabled || !agentPrefs.prefs.autoPost) return;
      if (event.lat == null || event.lng == null) return;
      if (autoPostedRef.current) return;
      autoPostedRef.current = true;
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const ok = await postAutoSpot({ latitude: event.lat, longitude: event.lng, token, leadMinutes: 5 });
      if (ok) setAutoPosted(true);
    },
    [agentPrefs.prefs.enabled, agentPrefs.prefs.autoPost, supabase],
  );

  const carLocationState = useCarLocation(user?.id ?? null, !!user, {
    motionEnabled: agentPrefs.prefs.enabled && agentPrefs.motionPermission !== "denied",
    onCarMoved: handleCarMoved,
  });

  const handleTrackOpen = useCallback((matchId: string, _spotId: string, partnerName: string, spotAddress: string, spotLat: number, spotLng: number) => {
    setShowMatches(false);
    setActiveTrackingMatch({ matchId, partnerName, spotAddress, spotLat, spotLng });
    setShowConsentModal(true);
    setTrackingEnabled(false);
  }, []);

  const handleConsentGiven = useCallback(async () => {
    setShowConsentModal(false);
    // Call the start API to record consent
    if (activeTrackingMatch) {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (token) {
        await fetch(`/api/matches/${activeTrackingMatch.matchId}/location/start`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    }
    setTrackingEnabled(true);
  }, [activeTrackingMatch, supabase]);

  const handleStopTracking = useCallback(() => {
    stopSharing();
    setTrackingEnabled(false);
    setActiveTrackingMatch(null);
  }, [stopSharing]);

  async function fetchActiveChatsFunc(userId: string) {
    const chats = await getUserChats(userId);
    setActiveChats(chats as { id: string; spot_id: string }[]);
  }

  async function fetchMatchCountFunc(_userId: string) {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) return;
    try {
      const res = await fetch("/api/matches?status=pending", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPendingMatchCount((data.matches ?? []).length);
    } catch {}
  }

  // Real-time Notification Listener
  useNotifications((notif) => {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioCtx();
    const osc = audioCtx.createOscillator();
    osc.type = 'sine'; osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    const gain = audioCtx.createGain(); gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.5);

    setUnreadNotifications(prev => prev + 1);
    setActiveNotification(notif as Notification);
    setTimeout(() => setActiveNotification(null), 6000);

    // Refresh match count on notification
    if (notif.type === 'match') {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) fetchMatchCountFunc(session.user.id);
      });
    }
  });

  // User custom event from LocationPermissionOverlay
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.latitude != null) {
        setUserLocation({ latitude: detail.latitude, longitude: detail.longitude, accuracy: detail.accuracy });
        setViewState((prev) => ({
          ...prev,
          latitude: detail.latitude,
          longitude: detail.longitude,
          zoom: 13,
        }));
      }
    };
    window.addEventListener("user-location", handler as EventListener);
    return () => window.removeEventListener("user-location", handler as EventListener);
  }, []);

  // Center on user location (on-demand, not automatic)
  const centerOnMe = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserLocation({ latitude, longitude, accuracy });
        setViewState((prev) => ({ ...prev, latitude, longitude, zoom: 13 }));
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 8000 },
    );
  }, []);

  // Auth session + profile check
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data: profile } = await (supabase as any)
          .from("users")
          .select("vehicle_type, tos_accepted, phone_verified, safety_acknowledged, average_rating, flag_count")
          .eq("id", session.user.id)
          .single();
        setUserVehicleType(profile?.vehicle_type ?? null);
        setTosAccepted(profile?.tos_accepted ?? false);
        setPhoneVerified(profile?.phone_verified ?? false);
        setSafetyAcknowledged(profile?.safety_acknowledged ?? false);
        setAverageRating(profile?.average_rating ?? null);
        setFlagCount(profile?.flag_count ?? 0);
        setProfileChecked(true);
        fetchActiveChatsFunc(session.user.id);
        fetchMatchCountFunc(session.user.id);
      } else {
        setProfileChecked(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data: profile } = await (supabase as any)
          .from("users")
          .select("vehicle_type, tos_accepted, phone_verified, safety_acknowledged, average_rating, flag_count")
          .eq("id", session.user.id)
          .single();
        setUserVehicleType(profile?.vehicle_type ?? null);
        setTosAccepted(profile?.tos_accepted ?? false);
        setPhoneVerified(profile?.phone_verified ?? false);
        setSafetyAcknowledged(profile?.safety_acknowledged ?? false);
        setAverageRating(profile?.average_rating ?? null);
        setFlagCount(profile?.flag_count ?? 0);
        setProfileChecked(true);
        fetchActiveChatsFunc(session.user.id);
        fetchMatchCountFunc(session.user.id);
      } else {
        setUserVehicleType(null);
        setActiveChats([]);
        setTosAccepted(false);
        setPhoneVerified(false);
        setSafetyAcknowledged(false);
        setGatingChecked(false);
        setPendingMatchCount(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    getActiveSpotRequests().then((data) => {
      setSpotRequests(data as Database["public"]["Tables"]["spot_requests"]["Row"][]);
    });

    const channel = supabase
      .channel("public:spot_requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "spot_requests" },
        () => {
          getActiveSpotRequests().then((data) => {
            setSpotRequests(data as Database["public"]["Tables"]["spot_requests"]["Row"][]);
          });
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, []);

  // Load saved parking spots
  useEffect(() => {
    if (!user) { setSavedSpots([]); return; }
    getParkingSpots(user.id).then((res) => {
      if (res.spots) setSavedSpots(res.spots);
    });
  }, [user]);

  // Fetch departure pings when location is available
  useEffect(() => {
    if (!userLocation) return;
    getActiveDeparturePings(userLocation.latitude, userLocation.longitude).then(setDeparturePings);
    const interval = setInterval(() => {
      getActiveDeparturePings(userLocation.latitude, userLocation.longitude).then(setDeparturePings);
    }, 30000);
    return () => clearInterval(interval);
  }, [userLocation]);

  // Realtime subscription for agent triggers
  useEffect(() => {
    const channel = supabase
      .channel("public:parking_spots:agents")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "parking_spots" },
        (payload) => {
          const newSpot = payload.new as Record<string, unknown>;
          if (newSpot?.id) {
            fetch(`/api/agents/demand-match`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ spot_id: newSpot.id }),
            }).catch(() => {});
            fetch(`/api/agents/grow-users`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ spot_id: newSpot.id }),
            }).catch(() => {});
          }
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, []);

  // Fetch street sweeping when location is obtained
  useEffect(() => {
    if (!userLocation) return;
    setSweepingLoading(true);

    reverseGeocodeStreet(userLocation.latitude, userLocation.longitude).then((geo) => {
      if (!geo.street) { setSweepingLoading(false); return; }

      (supabase as any)
        .from("street_sweeping")
        .select("*")
        .eq("street_name", geo.street)
        .eq("city", geo.city || "")
        .maybeSingle()
        .then(({ data }: any) => {
          setSweepingData(data as SweepingData | null);
          setSweepingLoading(false);
        });
    });
  }, [userLocation]);

  // Handle ?signup=success and ?verify_phone=true from redirect
  useEffect(() => {
    const signup = searchParams.get("signup");
    const verifyPhone = searchParams.get("verify_phone");
    if (signup === "success" && verifyPhone === "true" && user && profileChecked) {
      setShowPhoneVerification(true);
      router.replace("/", { scroll: false });
    } else if (signup === "success") {
      router.replace("/", { scroll: false });
    }
  }, [searchParams, user, profileChecked, router]);

  // Gating check: pilot area, rating, flags
  useEffect(() => {
    if (!user || !profileChecked || !userLocation) return;

    const runGatingCheck = async () => {
      // Check pilot area
      const pilot = await checkPilotArea(userLocation.latitude, userLocation.longitude);
      setPilotAreaAllowed(pilot.allowed);
      setPilotAreaName(pilot.areaName);

      // Check if blocked
      const blockReasons: string[] = [];
      if (!pilot.allowed) {
        blockReasons.push(`Outside ${pilot.areaName} pilot area`);
      }
      if (flagCount >= 5) {
        blockReasons.push("Account flagged — contact admin");
      }
      if (averageRating !== null && averageRating < 3.0) {
        blockReasons.push("Low rating — improve your rating to post");
      }

      setGatingBlockReason(blockReasons.length > 0 ? blockReasons.join(". ") : null);
      setGatingChecked(true);
    };

    runGatingCheck();
  }, [user, profileChecked, userLocation, flagCount, averageRating]);

  const handleChatStart = (chatId: string, spot: Spot) => {
    setSelectedSpot(null);
    setActiveChat({ chatId, spotId: spot.id });
  };

  const [rankingChecked, setRankingChecked] = useState(false);
  const [requiresCourses, setRequiresCourses] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_ranking")
      .select("courses_completed")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setRequiresCourses(!data || (data as any).courses_completed < 1);
        setRankingChecked(true);
      });
  }, [user]);

  const handleBottomAction = (mode: "post" | "look") => {
    setAgreementMode(mode);

    if (!user) {
      setShowAuth(true);
      return;
    }

    // Gating checks
    if (!phoneVerified) {
      setShowPhoneVerification(true);
      return;
    }

    if (!pilotAreaAllowed) {
      setShowPilotWarning(true);
      return;
    }

    if (gatingBlockReason) {
      alert(gatingBlockReason);
      return;
    }

    // Community agreement covers both TOS + safety
    if (!tosAccepted || !safetyAcknowledged) {
      setShowCommunityAgreement(true);
      return;
    }

    // Recommend courses if none completed
    if (requiresCourses && rankingChecked) {
      router.push("/courses");
      return;
    }

    executeAction(mode);
  };

  const executeAction = (mode: "post" | "look") => {
    if (mode === "post") {
      setShowPostForm(true);
    } else {
      setShowLookingForSpot(true);
    }
  };

  const handleCommunityAgree = async () => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) return;

    const res = await fetch("/api/tos/accept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ safety_acknowledged: true }),
    });
    const data = await res.json();

    if (data.success) {
      setTosAccepted(true);
      setSafetyAcknowledged(true);
      setShowCommunityAgreement(false);
      // Show notification consent after community agreement is accepted
      setShowNotificationConsent(true);
      executeAction(agreementMode);
    }
  };

  const handleSaveSpot = async () => {
    if (!user || !("geolocation" in navigator)) return;
    setSavingSpot(true);
    setSaveAccuracy(null);
    setSaveSuccess(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setSaveAccuracy(accuracy);

        if (accuracy > 50) {
          setSavingSpot(false);
          setSaveSuccess(`Accuracy too low (${Math.round(accuracy)}m). Go outside and try again.`);
          return;
        }

        const address = await reverseGeocode(latitude, longitude);
        const res = await fetch("/api/parking-spots/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude, longitude, accuracy, label: "Current Spot" }),
        });
        const data = await res.json();

        setSavingSpot(false);
        if (data.spot) {
          setSavedSpots((prev) => {
            const filtered = prev.filter((s) => s.label !== "Current Spot");
            return [data.spot as SavedParkingSpot, ...filtered];
          });
          setSaveSuccess(`Parking spot saved at ${address || latitude.toFixed(4) + ", " + longitude.toFixed(4)}`);
          setTimeout(() => setSaveSuccess(null), 4000);
        }
      },
      () => { setSavingSpot(false); setSaveSuccess("Location unavailable. Enable GPS and try again."); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  };

  const handleLeavePost = async () => {
    if (!selectedLeaveSpot || !user) return;
    setPostingLeave(true);

    const effectiveMinutes = Math.min(leaveMinutes, 15);
    const leavingAt = new Date(Date.now() + effectiveMinutes * 60_000).toISOString();

    const res = await fetch("/api/spots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: selectedLeaveSpot.latitude,
        longitude: selectedLeaveSpot.longitude,
        address: selectedLeaveSpot.address || "Saved Spot",
        departure_time: leavingAt,
        lead_minutes: effectiveMinutes,
      }),
    });
    const data = await res.json();

    setPostingLeave(false);
    if (data.spot) {
      setShowLeaveForm(false);
      setSelectedLeaveSpot(null);
      setSaveSuccess(`Alert posted! Spot opening in ${leaveMinutes} mins at ${selectedLeaveSpot.address || "saved location"}`);
      setTimeout(() => setSaveSuccess(null), 4000);
    }
  };

  const handleDeleteSpot = async (spotId: string) => {
    await deleteParkingSpot(spotId);
    setSavedSpots((prev) => prev.filter((s) => s.id !== spotId));
  };

  const handleCarLocationPost = useCallback(async () => {
    const cl = carLocationState.carLocation;
    if (!cl || !user) return;
    setPostingLeave(true);

    const leavingAt = new Date(Date.now() + 60_000).toISOString();
    const address = await reverseGeocode(cl.latitude, cl.longitude).catch(() => "Car Location");

    const res = await fetch("/api/spots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: cl.latitude,
        longitude: cl.longitude,
        address: address || "Car Location",
        departure_time: leavingAt,
        lead_minutes: 1,
      }),
    });
    const data = await res.json();

    setPostingLeave(false);
    if (data.spot) {
      setSaveSuccess("Alert posted! Opening in 1 minute.");
      setTimeout(() => setSaveSuccess(null), 4000);

      fetch(`/api/car-locations/${cl.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "departed", departed_at: new Date().toISOString() }),
      }).catch(() => {});
    }
  }, [carLocationState.carLocation, user]);

  const clusters = useSpotClusters(spots, viewState.zoom);

  const handleClusterClick = useCallback((cluster: { lat: number; lng: number }) => {
    const zoom = Math.min(viewState.zoom + 3, 16);
    setViewState((prev) => ({
      ...prev,
      latitude: cluster.lat,
      longitude: cluster.lng,
      zoom,
      transitionDuration: 500,
    }));
  }, [viewState.zoom]);

  const handleJoinWaitlist = async () => {
    if (!user) { setShowAuth(true); return; }
    setJoinWaitlistLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/waitlist/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          latitude: viewState.latitude,
          longitude: viewState.longitude,
          radius_meters: 200,
          vehicle_type: userVehicleType,
        }),
      });
      if (res.ok) setWaitlistJoined(true);
    } finally {
      setJoinWaitlistLoading(false);
    }
  };

  if (error) return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <p className="text-red-500 mb-2">Could not load spots: {error}</p>
      <p className="text-sm text-zinc-500 mb-4">Check your internet connection and try again.</p>
      <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Retry
      </button>
    </div>
  );

  return (
    <>
      <LocationPermissionOverlay
        show={showLocationPermission}
        onPermissionGranted={() => {
          localStorage.setItem(LOCATION_PERMISSION_KEY, "true");
          setShowLocationPermission(false);
        }}
      />
      <div className={`relative w-full ${fullHeight ? 'h-full' : 'h-screen'} overflow-hidden bg-zinc-50 dark:bg-zinc-950`}>
      {/* Map */}
      <div className="w-full h-full">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
          mapStyle={satelliteView ? SATELLITE_STYLE : MAP_STYLE_URL}
          style={{ width: "100%", height: "100%" }}
        >
          <div className="absolute top-2 left-14 z-10 flex gap-1.5">
            <button
              onClick={() => setSatelliteView((v) => !v)}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-[11px] font-bold shadow-md hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
              title={satelliteView ? "Switch to street view" : "Switch to satellite view"}
            >
              {satelliteView ? "Street" : "Satellite"}
            </button>
            <button
              onClick={centerOnMe}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-[11px] font-bold shadow-md hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
              title="Center on my location"
            >
              📍 My Location
            </button>
          </div>
          {clusters.map((item) =>
            item.type === "cluster" ? (
              <ClusterMarker
                key={item.id}
                cluster={item}
                onClick={handleClusterClick}
              />
            ) : (
              <SpotMarker
                key={item.id}
                spot={item.spot}
                onClick={(s) => {
                  setSelectedSpot(s);
                  onSpotClick?.(s);
                }}
              />
            )
          )}
          {spotRequests.map((req) => (
            <SpotRequestMarker
              key={req.id}
              request={req}
              onClick={(r) => setSelectedSpotRequest(r)}
            />
          ))}
          {departurePings.map((ping) => (
            <DeparturePingMarker
              key={ping.id}
              ping={ping}
              onClick={(p) => setSelectedDeparturePing(p)}
            />
          ))}
          {carLocationState.carLocation && (carLocationState.parkingDetection === "parked" || carLocationState.parkingDetection === "walking_back") && (
            <CarLocationMarker
              latitude={carLocationState.carLocation.latitude}
              longitude={carLocationState.carLocation.longitude}
              status={carLocationState.carLocation.status as "parked" | "walking_back" | "departed"}
            />
          )}
          {userLocation && (
            <Marker latitude={userLocation.latitude} longitude={userLocation.longitude} anchor="center">
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div
                  style={{
                    position: "absolute",
                    width: Math.min(userLocation.accuracy * 0.8, 120),
                    height: Math.min(userLocation.accuracy * 0.8, 120),
                    background: "rgba(59,130,246,0.1)",
                    borderRadius: "50%",
                    border: "1px solid rgba(59,130,246,0.3)",
                  }}
                />
                <div
                  style={{
                    width: 18,
                    height: 18,
                    background: "#3b82f6",
                    borderRadius: "50%",
                    border: "3px solid white",
                    boxShadow: "0 0 0 3px rgba(59,130,246,0.3), 0 2px 8px rgba(0,0,0,0.3)",
                  }}
                />
                {userLocation.accuracy > 10 && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: -16,
                      fontSize: 9,
                      color: "#6b7280",
                      background: "rgba(255,255,255,0.8)",
                      padding: "0 4px",
                      borderRadius: 2,
                      whiteSpace: "nowrap",
                    }}
                  >
                    ±{Math.round(userLocation.accuracy)}m
                  </div>
                )}
              </div>
            </Marker>
          )}
        </Map>

        {/* Real-time Notification Toast */}
        {activeNotification && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-4 flex items-start gap-4 relative">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl text-blue-600">
                <Bell size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">{activeNotification.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{activeNotification.message}</p>
              </div>
              <button
                onClick={() => setActiveNotification(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <CloseIcon size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Street Sweeping Alert Banner */}
        {sweepingData && !showLookingForSpot && !showLeaveForm && !showPostForm && !selectedSpot && !activeChat && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 w-full max-w-sm px-4">
            <StreetSweepingBanner
              sweepingData={sweepingData}
              loading={sweepingLoading}
              userId={user?.id || null}
            />
          </div>
        )}

        {/* SpotQuest Game Overlay */}
        {user && !showPostForm && !showStats && !showMatches && !activeChat && !selectedSpot && (
          <SpotQuestOverlay />
        )}

        {/* Bottom section */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-full max-w-xs px-4 flex flex-col gap-2">
          {!showLookingForSpot && !showLeaveForm && !showPostForm ? (
            <div className="flex flex-col gap-2">
              {carLocationState.parkingDetection !== "off" && (
                <CarLocationPanel
                  parkingDetection={carLocationState.parkingDetection}
                  detectionProgress={carLocationState.detectionProgress}
                  walkingEtaFormatted={carLocationState.walkingEtaFormatted}
                  distanceToCar={carLocationState.distanceToCar}
                  onPostSpot={handleCarLocationPost}
                  onClearCarLocation={() => {
                    if (carLocationState.carLocation?.id) {
                      fetch(`/api/car-locations/${carLocationState.carLocation.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "departed" }),
                      }).catch(() => {});
                    }
                  }}
                  loading={carLocationState.loading}
                />
              )}
              {savedSpots.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-3 space-y-2 max-h-48 overflow-y-auto">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Saved Spots</p>
                  {savedSpots.map((spot) => (
                    <div key={spot.id} className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{spot.label}</p>
                        <p className="text-[10px] text-zinc-400 truncate">
                          {spot.address || `${spot.latitude.toFixed(4)}, ${spot.longitude.toFixed(4)}`}
                        </p>
                        {spot.accuracy && spot.accuracy > 50 && (
                          <p className="text-[10px] text-amber-500">Low accuracy — update?</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          onClick={() => { setSelectedLeaveSpot(spot); setShowLeaveForm(true); }}
                          className="h-7 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold"
                        >
                          <Clock size={12} />
                        </Button>
                        <Button
                          onClick={() => handleDeleteSpot(spot.id)}
                          className="h-7 w-7 p-0 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:text-red-500 text-[10px] font-bold"
                        >
                          <CloseIcon size={12} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : showLeaveForm && selectedLeaveSpot ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm">Leaving from {selectedLeaveSpot.label}</p>
                <button onClick={() => { setShowLeaveForm(false); setSelectedLeaveSpot(null); }} className="text-zinc-400 hover:text-zinc-600">
                  <CloseIcon size={18} />
                </button>
              </div>
              <p className="text-xs text-zinc-500 truncate">
                {selectedLeaveSpot.address || `${selectedLeaveSpot.latitude.toFixed(4)}, ${selectedLeaveSpot.longitude.toFixed(4)}`}
              </p>
              <div className="flex gap-2">
                {[5, 10, 15].map((m) => (
                  <button
                    key={m}
                    onClick={() => setLeaveMinutes(m)}
                    className={`flex-1 h-10 rounded-xl text-sm font-bold transition ${
                      leaveMinutes === m
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800 p-2.5 text-[11px] text-amber-700 dark:text-amber-400">
                <p className="font-bold mb-0.5">Imminent departure only</p>
                <p>Alerts expire after the selected time.</p>
              </div>
              <Button
                onClick={handleLeavePost}
                disabled={postingLeave}
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                {postingLeave ? <Loader2 className="animate-spin" /> : `Post Alert (${leaveMinutes} mins)`}
              </Button>
            </div>
          ) : user ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm">My Matches</p>
                <button onClick={() => setShowMatches(false)} className="text-zinc-400 hover:text-zinc-600">
                  <CloseIcon size={18} />
                </button>
              </div>
              <p className="text-xs text-zinc-500">View your pending and confirmed matches.</p>
              <Button
                onClick={() => setShowMatches(true)}
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                <Handshake size={16} className="mr-2" />
                View Matches
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setShowAuth(true)}
              className="w-full h-14 rounded-full shadow-2xl bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold flex items-center justify-center gap-2"
            >
              <UserIcon size={24} strokeWidth={3} />
              Sign In to Start Matching
            </Button>
          )}
        </div>

        {loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-zinc-900/90 px-4 py-2 rounded-full shadow-lg text-sm font-medium z-10">
            Finding spots...
          </div>
        )}

        {selectedSpotRequest && (
          <div className="absolute inset-0 z-20 bg-black/20" onClick={() => setSelectedSpotRequest(null)}>
            <div
              className="absolute inset-x-0 bottom-0 bg-white dark:bg-zinc-900 rounded-t-[32px] shadow-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                    <Search size={16} />
                  </div>
                  <h2 className="text-lg font-bold">Someone&apos;s Looking</h2>
                </div>
                <button onClick={() => setSelectedSpotRequest(null)} className="text-zinc-500 hover:text-zinc-700">
                  <CloseIcon size={20} />
                </button>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                A driver nearby is looking for a parking spot.
                {selectedSpotRequest.vehicle_type && (
                  <> They need space for a <span className="font-medium">{selectedSpotRequest.vehicle_type}</span>.</>
                )}
              </p>
              <p className="text-xs text-zinc-400 mt-2">
                If you&apos;re about to leave, share your spot to help them out!
              </p>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => { setSelectedSpotRequest(null); handleBottomAction("post"); }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  Share My Spot
                </Button>
                <Button variant="outline" onClick={() => setSelectedSpotRequest(null)} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {selectedDeparturePing && (
          <div className="absolute inset-0 z-20 bg-black/20" onClick={() => setSelectedDeparturePing(null)}>
            <div
              className="absolute inset-x-0 bottom-0 bg-white dark:bg-zinc-900 rounded-t-[32px] shadow-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                    <Bell size={16} />
                  </div>
                  <h2 className="text-lg font-bold">Someone&apos;s Leaving</h2>
                </div>
                <button onClick={() => setSelectedDeparturePing(null)} className="text-zinc-500 hover:text-zinc-700">
                  <CloseIcon size={20} />
                </button>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                A driver nearby is leaving their spot in <strong>{selectedDeparturePing.leaving_in_minutes} minutes</strong>.
              </p>
              <p className="text-xs text-zinc-400 mt-2">
                Head over to grab the spot before someone else does!
              </p>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => { setSelectedDeparturePing(null); handleBottomAction("post"); }} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                  I&apos;ll Take It
                </Button>
                <Button variant="outline" onClick={() => setSelectedDeparturePing(null)} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {selectedSpot && !activeChat && (
          <div className="absolute inset-0 z-20 bg-black/20" onClick={() => setSelectedSpot(null)}>
            <div
              className="absolute inset-x-0 bottom-0 bg-white dark:bg-zinc-900 rounded-t-[32px] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <SpotDetails spot={selectedSpot} onClose={() => setSelectedSpot(null)} onChatStart={handleChatStart} />
            </div>
          </div>
        )}

        {activeChat && (
          <div className="absolute inset-0 z-20 bg-black/20" onClick={() => setActiveChat(null)}>
            <div
              className="absolute inset-x-0 bottom-0 bg-white dark:bg-zinc-900 rounded-t-[32px] shadow-2xl max-h-[70vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <EphemeralChat
                chatId={activeChat.chatId}
                spotId={activeChat.spotId}
                onClose={() => setActiveChat(null)}
              />
            </div>
          </div>
        )}

        {showPostForm && (
          <div className="absolute inset-0 z-30 bg-white dark:bg-zinc-950">
            <PostSpotForm
              onClose={() => setShowPostForm(false)}
              onSuccess={() => setShowPostForm(false)}
            />
          </div>
        )}

        {showStats && (
          <div className="absolute inset-0 z-30 bg-white dark:bg-zinc-950">
            <StatsDashboard onClose={() => setShowStats(false)} onPostSpot={() => setShowPostForm(true)} />
          </div>
        )}

        {showMatches && (
          <div className="absolute inset-0 z-30 bg-white dark:bg-zinc-950">
            <MatchList
              onClose={() => {
                setShowMatches(false);
                if (user) fetchMatchCountFunc(user.id);
              }}
              onChatOpen={(chatId, spotId) => {
                setShowMatches(false);
                setActiveChat({ chatId, spotId });
              }}
              onTrackOpen={handleTrackOpen}
            />
          </div>
        )}

        {showAuth && (
          <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setShowAuth(false)}>
            <div
              className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <Auth onComplete={() => setShowAuth(false)} />
            </div>
          </div>
        )}

        {/* Live tracking overlay — rendered inside the map area */}
        {activeTrackingMatch && isTracking && (
          <LiveTrackingOverlay
            partnerLocation={partnerLocation}
            partnerSharing={partnerSharing}
            isTracking={isTracking}
            error={trackingError}
            partnerName={activeTrackingMatch.partnerName}
            spotAddress={activeTrackingMatch.spotAddress}
            spotLat={activeTrackingMatch.spotLat}
            spotLng={activeTrackingMatch.spotLng}
            onStopTracking={handleStopTracking}
            onEnableSharing={() => {
              supabase.auth.getSession().then(async ({ data: { session } }) => {
                if (session && activeTrackingMatch) {
                  await fetch(`/api/matches/${activeTrackingMatch.matchId}/location/start`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${session.access_token}` },
                  });
                  setTrackingEnabled(true);
                }
              });
            }}
            mySharing={mySharing}
          />
        )}
      </div>

      {/* Community Agreement Modal (TOS + Safety) */}
      <CommunityAgreementModal
        open={showCommunityAgreement}
        onAccept={handleCommunityAgree}
        onClose={() => setShowCommunityAgreement(false)}
      />

      {/* Push Notification Consent */}
      <NotificationConsent
        open={showNotificationConsent}
        onDismiss={() => setShowNotificationConsent(false)}
      />

      {/* Phone Verification Modal */}
      {user && (
        <PhoneVerificationModal
          open={showPhoneVerification}
          userId={user.id}
          onVerified={() => {
            setPhoneVerified(true);
            setShowPhoneVerification(false);
            executeAction(agreementMode);
          }}
          onClose={() => setShowPhoneVerification(false)}
        />
      )}

      {/* Pilot Area Warning */}
      <PilotAreaWarning
        open={showPilotWarning}
        areaName={pilotAreaName}
      />

      {/* Location Consent Modal */}
      {showConsentModal && activeTrackingMatch && (
        <LocationConsentModal
          partnerName={activeTrackingMatch.partnerName}
          spotAddress={activeTrackingMatch.spotAddress}
          onConsent={handleConsentGiven}
          onDecline={() => {
            setShowConsentModal(false);
            setActiveTrackingMatch(null);
          }}
        />
      )}

      {/* Auto-published departure notice */}
      {autoPosted && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <Handshake size={16} />
          Departure alert auto-published
        </div>
      )}


      {/* Smart Spot Agent consent */}
      <BehaviorAgentConsentModal
        open={agentConsentOpen}
        onClose={handleAgentConsentClose}
        prefs={agentPrefs.prefs}
        motionPermission={agentPrefs.motionPermission}
        motionSupported={agentPrefs.motionSupported}
        onEnableMotion={async () => {
          await agentPrefs.askForMotionPermission();
        }}
        onSetAutoPost={agentPrefs.setAutoPost}
        onSetAutoConfirm={agentPrefs.setAutoConfirm}
        onSetEnabled={agentPrefs.setEnabled}
      />
    </div>
    </>
  );
}
