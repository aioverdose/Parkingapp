"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import Map, { Marker, Source, Layer, NavigationControl, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Loader2,
  MapPin,
  Navigation,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";

const INITIAL_VIEW = {
  latitude: 40.7128,
  longitude: -74.006,
  zoom: 11,
};

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

interface DriverLocation {
  id: string;
  user_id: string;
  match_id: string | null;
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  recorded_at: string;
}

interface ActiveSession {
  id: string;
  user_id: string;
  match_id: string;
  role: string;
  status: string;
  eta_seconds: number | null;
  grace_period_ends_at: string | null;
  arrived_at: string | null;
  departed_at: string | null;
}

interface Match {
  id: string;
  spot_id: string;
  spot_owner_id: string;
  seeker_id: string;
  status: string;
  created_at: string;
  spot: {
    id: string;
    latitude: number;
    longitude: number;
    address: string;
    departure_time: string;
    return_time: string | null;
  };
  owner: { id: string; name: string | null; email: string | null };
  seeker: { id: string; name: string | null; email: string | null };
  owner_location: DriverLocation | null;
  seeker_location: DriverLocation | null;
  owner_session: ActiveSession | null;
  seeker_session: ActiveSession | null;
}

function formatEta(seconds: number | null): string {
  if (seconds == null) return "--";
  if (seconds < 60) return "<1 min";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    en_route: "bg-blue-100 text-blue-700 border-blue-200",
    arrived: "bg-green-100 text-green-700 border-green-200",
    departed: "bg-purple-100 text-purple-700 border-purple-200",
    no_show: "bg-red-100 text-red-700 border-red-200",
    completed: "bg-zinc-100 text-zinc-600 border-zinc-200",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[status] || "bg-zinc-100 text-zinc-600"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function ControlTowerPage() {
  const supabase = createBrowserClient();
  const mapRef = useRef<any>(null);

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();
      if (data?.role !== "admin" && data?.role !== "moderator") return;
      setAuthorized(true);
    });
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/control-tower");
      if (!res.ok) return;
      const json = await res.json();
      setMatches(json.matches || []);
    } catch {
      setErrors((prev) => [...prev.slice(-4), "Failed to fetch control tower data"]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authorized) return;
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [authorized, fetchData]);

  useEffect(() => {
    if (!authorized) return;

    const locChannel = supabase
      .channel("control-tower:locations")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "driver_locations" },
        (payload) => {
          const loc = payload.new as DriverLocation;
          setMatches((prev) =>
            prev.map((m) => {
              if (m.id === loc.match_id) {
                const isOwner = loc.user_id === m.spot_owner_id;
                return {
                  ...m,
                  owner_location: isOwner ? loc : m.owner_location,
                  seeker_location: !isOwner ? loc : m.seeker_location,
                };
              }
              return m;
            }),
          );
        },
      )
      .subscribe();

    const sessionChannel = supabase
      .channel("control-tower:sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "active_sessions" },
        (payload) => {
          const ses = payload.new as ActiveSession;
          setMatches((prev) =>
            prev.map((m) => {
              if (m.id === ses.match_id) {
                const isOwner = ses.user_id === m.spot_owner_id;
                return {
                  ...m,
                  owner_session: isOwner ? ses : m.owner_session,
                  seeker_session: !isOwner ? ses : m.seeker_session,
                };
              }
              return m;
            }),
          );
        },
      )
      .subscribe();

    const matchChannel = supabase
      .channel("control-tower:matches")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "spot_matches" },
        () => {
          fetchData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(locChannel);
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(matchChannel);
    };
  }, [authorized]);

  if (!authorized) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <p className="text-zinc-500">Access denied. Admins only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white dark:bg-zinc-900 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">Control Tower</h1>
          <span className="text-sm text-zinc-500">{matches.length} active match{matches.length !== 1 ? "es" : ""}</span>
        </div>
        <div className="flex items-center gap-2">
          {errors.length > 0 && (
            <div className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle size={12} />
              {errors[errors.length - 1]}
            </div>
          )}
          <button
            onClick={fetchData}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <Map
            ref={mapRef}
            {...viewState}
            onMove={(evt) => setViewState(evt.viewState)}
            mapStyle={MAP_STYLE}
            style={{ width: "100%", height: "100%" }}
            reuseMaps
          >
            <NavigationControl position="top-left" />

            {matches.map((match) => (
              <div key={match.id}>
                {match.owner_location && (
                  <Marker
                    latitude={match.owner_location.latitude}
                    longitude={match.owner_location.longitude}
                    onClick={() => setSelectedMatch(match)}
                    pitchAlignment="map"
                  >
                    <div className="relative cursor-pointer group">
                      <div
                        className="w-5 h-5 rounded-full bg-purple-600 border-2 border-white shadow-md flex items-center justify-center"
                        style={{
                          transform: `rotate(${match.owner_location.heading ?? 0}deg)`,
                        }}
                      >
                        <Navigation size={12} className="text-white" />
                      </div>
                      <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-purple-700 whitespace-nowrap bg-white/80 px-1 rounded">
                        Owner
                      </span>
                    </div>
                  </Marker>
                )}

                {match.seeker_location && (
                  <Marker
                    latitude={match.seeker_location.latitude}
                    longitude={match.seeker_location.longitude}
                    onClick={() => setSelectedMatch(match)}
                    pitchAlignment="map"
                  >
                    <div className="relative cursor-pointer group">
                      <div
                        className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center"
                        style={{
                          transform: `rotate(${match.seeker_location.heading ?? 0}deg)`,
                        }}
                      >
                        <Navigation size={12} className="text-white" />
                      </div>
                      <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-blue-700 whitespace-nowrap bg-white/80 px-1 rounded">
                        Seeker
                      </span>
                    </div>
                  </Marker>
                )}

                <Marker
                  latitude={match.spot.latitude}
                  longitude={match.spot.longitude}
                  pitchAlignment="map"
                >
                  <div className="cursor-pointer">
                    <MapPin size={20} className="text-green-600 drop-shadow" />
                  </div>
                </Marker>

                {(match.owner_location && match.seeker_location) && (
                  <Source
                    id={`line-${match.id}`}
                    type="geojson"
                    data={{
                      type: "Feature",
                      properties: {},
                      geometry: {
                        type: "LineString",
                        coordinates: [
                          [match.owner_location.longitude, match.owner_location.latitude],
                          [match.seeker_location.longitude, match.seeker_location.latitude],
                        ],
                      },
                    } as any}
                  >
                    <Layer
                      id={`line-layer-${match.id}`}
                      type="line"
                      paint={{
                        "line-color": "#6366f1",
                        "line-width": 2,
                        "line-dasharray": [3, 3],
                        "line-opacity": 0.6,
                      }}
                    />
                  </Source>
                )}
              </div>
            ))}

            {selectedMatch && (
              <Popup
                latitude={(selectedMatch.seeker_location?.latitude ?? selectedMatch.spot.latitude) + 0.005}
                longitude={selectedMatch.seeker_location?.longitude ?? selectedMatch.spot.longitude}
                onClose={() => setSelectedMatch(null)}
                closeButton={true}
                closeOnClick={false}
                maxWidth="300px"
              >
                <div className="text-sm space-y-2 p-1">
                  <h3 className="font-bold text-base">{selectedMatch.spot.address}</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="font-semibold text-purple-700">Owner</p>
                      <p>{selectedMatch.owner.name || selectedMatch.owner.email || "—"}</p>
                      <p className="text-zinc-500">
                        {selectedMatch.owner_session ? formatEta(selectedMatch.owner_session.eta_seconds) : "--"}
                      </p>
                      {selectedMatch.owner_session && (
                        <StatusBadge status={selectedMatch.owner_session.status} />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-blue-700">Seeker</p>
                      <p>{selectedMatch.seeker.name || selectedMatch.seeker.email || "—"}</p>
                      <p className="text-zinc-500">
                        {selectedMatch.seeker_session ? formatEta(selectedMatch.seeker_session.eta_seconds) : "--"}
                      </p>
                      {selectedMatch.seeker_session && (
                        <StatusBadge status={selectedMatch.seeker_session.status} />
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500 pt-1 border-t">
                    <p>Departure: {new Date(selectedMatch.spot.departure_time).toLocaleTimeString()}</p>
                    {selectedMatch.spot.return_time && (
                      <p>Return: {new Date(selectedMatch.spot.return_time).toLocaleTimeString()}</p>
                    )}
                  </div>
                </div>
              </Popup>
            )}
          </Map>
        </div>

        <div className="w-80 border-l bg-white dark:bg-zinc-900 overflow-y-auto shrink-0 hidden lg:block">
          <div className="p-3 border-b text-sm font-semibold text-zinc-500 uppercase tracking-wide">
            Active Matches
          </div>
          {matches.length === 0 ? (
            <div className="p-4 text-sm text-zinc-400 text-center">No active matches</div>
          ) : (
            <div className="divide-y">
              {matches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => {
                    setSelectedMatch(match);
                    if (match.seeker_location) {
                      setViewState({
                        latitude: match.seeker_location.latitude,
                        longitude: match.seeker_location.longitude,
                        zoom: 13,
                      });
                    }
                  }}
                  className={`w-full text-left p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition text-sm ${
                    selectedMatch?.id === match.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
                  }`}
                >
                  <p className="font-semibold truncate">{match.spot.address}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Navigation size={10} className="text-purple-500" />
                      {match.owner_session ? formatEta(match.owner_session.eta_seconds) : "--"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Navigation size={10} className="text-blue-500" />
                      {match.seeker_session ? formatEta(match.seeker_session.eta_seconds) : "--"}
                    </span>
                    {match.owner_session && <StatusBadge status={match.owner_session.status} />}
                    {match.seeker_session && <StatusBadge status={match.seeker_session.status} />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
