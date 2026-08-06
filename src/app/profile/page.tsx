"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { getUserContributionStats } from "@/actions/rankings";
import { getParkingSpots, deleteParkingSpot } from "@/lib/parking-spot";
import type { SavedParkingSpot } from "@/lib/parking-spot";
import type { UserRanking, RankTier } from "@/lib/ranking";
import { RankBadge } from "@/components/RankBadge";
import Map, { Marker, ViewStateChangeEvent } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { INITIAL_VIEW_STATE, MAP_STYLE_URL } from "@/lib/map";
import { reverseGeocode } from "@/lib/geocode";
import { CreditBalance } from "@/components/CreditBalance";
import {
  ArrowLeft, MapPin, Clock, Star, TrendingUp, CheckCircle2,
  BookOpen, Settings, GraduationCap, Loader2, Trash2, Award,
  User as UserIcon, AlertCircle, Plus, LogOut, Shield, Handshake,
  Smartphone,
} from "lucide-react";

export default function ProfilePage() {
  const supabase = createBrowserClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<{
    name: string | null;
    email: string;
    vehicle_type: string | null;
    created_at: string | null;
    average_rating: number | null;
    flag_count: number;
    role: string | null;
  } | null>(null);
  const [ranking, setRanking] = useState<UserRanking | null>(null);
  const [stats, setStats] = useState<{
    spots_posted: number;
    spots_claimed: number;
    hours_saved: number;
    streak_7d: number;
    streak_30d: number;
    neighborhood: string | null;
  } | null>(null);
  const [savedSpots, setSavedSpots] = useState<SavedParkingSpot[]>([]);
  const [coursesCompleted, setCoursesCompleted] = useState(0);
  const [totalCourses, setTotalCourses] = useState(0);
  const [matchCredits, setMatchCredits] = useState(0);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const [schedArrivalHour, setSchedArrivalHour] = useState("8");
  const [schedArrivalMin, setSchedArrivalMin] = useState("00");
  const [schedArrivalAmPm, setSchedArrivalAmPm] = useState("AM");
  const [schedDepartureHour, setSchedDepartureHour] = useState("5");
  const [schedDepartureMin, setSchedDepartureMin] = useState("00");
  const [schedDepartureAmPm, setSchedDepartureAmPm] = useState("PM");
  const [schedDays, setSchedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [scheduleSaved, setScheduleSaved] = useState(false);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleLabel, setScheduleLabel] = useState("");
  const [scheduleDays, setScheduleDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [scheduleDepartHour, setScheduleDepartHour] = useState("8");
  const [scheduleDepartMin, setScheduleDepartMin] = useState("00");
  const [scheduleDepartAmPm, setScheduleDepartAmPm] = useState("AM");
  const [scheduleReturnHour, setScheduleReturnHour] = useState("5");
  const [scheduleReturnMin, setScheduleReturnMin] = useState("00");
  const [scheduleReturnAmPm, setScheduleReturnAmPm] = useState("PM");
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleMatching, setScheduleMatching] = useState(false);
  const [scheduleMatchMessage, setScheduleMatchMessage] = useState<string | null>(null);

  // Map state
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [newPin, setNewPin] = useState<{ lat: number; lng: number } | null>(null);
  const [showPinForm, setShowPinForm] = useState(false);
  const [pinLabel, setPinLabel] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const [pinAddress, setPinAddress] = useState<string | null>(null);
  const [pinSaveError, setPinSaveError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.push("/"); return; }
      setUserId(session.user.id);

      const [profileRes, rankingRes, stat, spotsRes, coursesRes, courseCountRes] = await Promise.all([
        supabase
          .from("users")
          .select("name, email, vehicle_type, created_at, average_rating, flag_count, role, match_credits, schedule_arrival, schedule_departure, schedule_days")
          .eq("id", session.user.id)
          .single(),
        supabase
          .from("user_ranking")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle(),
        getUserContributionStats(session.user.id),
        getParkingSpots(session.user.id),
        supabase
          .from("user_course_progress")
          .select("id")
          .eq("user_id", session.user.id)
          .eq("status", "passed"),
        supabase.from("courses").select("id"),
      ]);

      setUserData(profileRes.data as typeof userData);
      setMatchCredits(profileRes.data?.match_credits ?? 0);
      setRanking(rankingRes.data as UserRanking);
      setStats(stat);

      // Check purchase status from URL
      const params = new URLSearchParams(window.location.search);
      if (params.get("purchase") === "success") {
        setPurchaseMessage("Credits purchased! Your balance has been updated.");
        setTimeout(() => {
          window.history.replaceState({}, "", "/profile");
          setPurchaseMessage(null);
        }, 5000);
      } else if (params.get("purchase") === "cancelled") {
        setPurchaseMessage("Purchase cancelled.");
        setTimeout(() => {
          window.history.replaceState({}, "", "/profile");
          setPurchaseMessage(null);
        }, 5000);
      }
      setSavedSpots(spotsRes.spots ?? []);
      setCoursesCompleted(coursesRes.data?.length ?? 0);
      setTotalCourses(courseCountRes.data?.length ?? 0);

      if (profileRes.data?.schedule_days) setSchedDays(profileRes.data.schedule_days);
      if (profileRes.data?.schedule_arrival) {
        const [h, m] = profileRes.data.schedule_arrival.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        setSchedArrivalHour(String(h % 12 || 12));
        setSchedArrivalMin(String(m).padStart(2, "0"));
        setSchedArrivalAmPm(ampm);
      }
      if (profileRes.data?.schedule_departure) {
        const [h, m] = profileRes.data.schedule_departure.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        setSchedDepartureHour(String(h % 12 || 12));
        setSchedDepartureMin(String(m).padStart(2, "0"));
        setSchedDepartureAmPm(ampm);
      }

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (token) {
        const schedRes = await fetch("/api/schedules", { headers: { Authorization: `Bearer ${token}` } });
        const schedData = await schedRes.json();
        setSchedules(schedData.schedules ?? []);
      }

      setLoading(false);
    });
  }, []);

  const handleDeleteSpot = async (spotId: string) => {
    await deleteParkingSpot(spotId);
    setSavedSpots((prev) => prev.filter((s) => s.id !== spotId));
  };

  const to24h = (h: string, min: string, ampm: string) => {
    let hour = parseInt(h, 10);
    if (ampm === "AM" && hour === 12) hour = 0;
    else if (ampm === "PM" && hour !== 12) hour += 12;
    return `${String(hour).padStart(2, "0")}:${min}`;
  };

  const handleSaveSchedule = async () => {
    if (!userId) return;
    const arrival = to24h(schedArrivalHour, schedArrivalMin, schedArrivalAmPm);
    const departure = to24h(schedDepartureHour, schedDepartureMin, schedDepartureAmPm);
    const { error } = await supabase
      .from("users")
      .update({ schedule_arrival: arrival, schedule_departure: departure, schedule_days: schedDays })
      .eq("id", userId);
    if (!error) {
      setScheduleSaved(true);
      setTimeout(() => setScheduleSaved(false), 3000);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleAddSchedule = async () => {
    if (!userId) return;
    setScheduleSaving(true);
    setScheduleError(null);
    try {
      const { latitude, longitude } = viewState;
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) { setScheduleError("Not authenticated"); setScheduleSaving(false); return; }

      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          latitude,
          longitude,
          label: scheduleLabel.trim() || "Recurring Spot",
          days_of_week: scheduleDays,
          departure_time: to24h(scheduleDepartHour, scheduleDepartMin, scheduleDepartAmPm),
          return_time: to24h(scheduleReturnHour, scheduleReturnMin, scheduleReturnAmPm),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setScheduleError(data.error || "Failed"); setScheduleSaving(false); return; }
      setSchedules((prev) => [data.schedule, ...prev]);
      setShowScheduleForm(false);
      setScheduleLabel("");
      setScheduleDepartHour("8"); setScheduleDepartMin("00"); setScheduleDepartAmPm("AM");
      setScheduleReturnHour("5"); setScheduleReturnMin("00"); setScheduleReturnAmPm("PM");
      setScheduleDays([1, 2, 3, 4, 5]);
    } catch {
      setScheduleError("Failed to save schedule");
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) return;
    await fetch(`/api/schedules?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  const handleRunScheduleMatch = async () => {
    if (scheduleMatching) return;
    setScheduleMatching(true);
    setScheduleMatchMessage(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) { setScheduleMatchMessage("Not authenticated"); return; }
      const res = await fetch("/api/matches/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setScheduleMatchMessage(data.error || "Failed to run schedule matching.");
      } else if (data.matches_created > 0) {
        setScheduleMatchMessage(`Handoff matched! ${data.matches_created} driver${data.matches_created === 1 ? "" : "s"} notified to confirm.`);
      } else {
        setScheduleMatchMessage("No matching handoff found right now. Try again later or add more schedule detail.");
      }
    } catch {
      setScheduleMatchMessage("Failed to run schedule matching.");
    } finally {
      setScheduleMatching(false);
    }
  };

  const formatTime12h = (time24: string) => {
    const [h, m] = time24.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handleMapClick = async (evt: any) => {
    const { lngLat } = evt;
    setNewPin({ lat: lngLat.lat, lng: lngLat.lng });
    setPinLabel("");
    setPinAddress(null);
    setPinSaveError(null);
    setPinSuccess(null);

    const address = await reverseGeocode(lngLat.lat, lngLat.lng);
    setPinAddress(address);
    setShowPinForm(true);
  };

  const handleSavePin = async () => {
    if (!userId || !newPin) return;
    setSavingPin(true);
    setPinSaveError(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) { setPinSaveError("Not authenticated"); setSavingPin(false); return; }

      const res = await fetch("/api/parking-spots/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude: newPin.lat,
          longitude: newPin.lng,
          label: pinLabel.trim() || "Dropped Pin",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPinSaveError(data.error || "Failed to save spot");
        setSavingPin(false);
        return;
      }

      // Refresh spots list
      const { spots } = await getParkingSpots(userId);
      setSavedSpots(spots ?? []);
      setShowPinForm(false);
      setNewPin(null);
      setPinSuccess(`Saved "${pinLabel.trim() || 'Dropped Pin'}"`);
      setTimeout(() => setPinSuccess(null), 3000);
    } catch {
      setPinSaveError("Failed to save spot");
    } finally {
      setSavingPin(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <div className="max-w-lg mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push("/")} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-2xl shrink-0">
              {(userData?.name ?? userData?.email ?? "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{userData?.name ?? "Unnamed"}</h2>
              <p className="text-sm text-zinc-500 truncate">{userData?.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {userData?.vehicle_type && (
                  <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-600 dark:text-zinc-400 font-medium">
                    {userData.vehicle_type}
                  </span>
                )}
                {userData?.average_rating !== null && userData?.average_rating !== undefined && (
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full text-amber-700 font-medium flex items-center gap-1">
                    <Star size={10} /> {userData.average_rating.toFixed(1)}
                  </span>
                )}
                <span className="text-[10px] text-zinc-400">
                  Joined {userData?.created_at ? new Date(userData.created_at).toLocaleDateString() : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Arrival & Departure Time Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
          <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
            <Clock size={16} className="text-blue-600" /> Arrival & Departure
          </h3>
          <p className="text-[11px] text-zinc-400 mb-4">
            Set the times you typically arrive at and depart from your parking spot.
          </p>

          <div className="space-y-3">
            {/* Arrival Time */}
            <div>
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-1 block">Arrival Time</label>
              <div className="flex gap-1">
                <select value={schedArrivalHour} onChange={(e) => setSchedArrivalHour(e.target.value)}
                  className="flex-1 px-2 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="text-zinc-400 self-center">:</span>
                <select value={schedArrivalMin} onChange={(e) => setSchedArrivalMin(e.target.value)}
                  className="w-16 px-2 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none">
                  {["00", "15", "30", "45"].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={schedArrivalAmPm} onChange={(e) => setSchedArrivalAmPm(e.target.value)}
                  className="w-16 px-2 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold appearance-none focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            {/* Departure Time */}
            <div>
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-1 block">Departure Time</label>
              <div className="flex gap-1">
                <select value={schedDepartureHour} onChange={(e) => setSchedDepartureHour(e.target.value)}
                  className="flex-1 px-2 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="text-zinc-400 self-center">:</span>
                <select value={schedDepartureMin} onChange={(e) => setSchedDepartureMin(e.target.value)}
                  className="w-16 px-2 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none">
                  {["00", "15", "30", "45"].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={schedDepartureAmPm} onChange={(e) => setSchedDepartureAmPm(e.target.value)}
                  className="w-16 px-2 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold appearance-none focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            {scheduleSaved && (
              <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs font-bold">
                <CheckCircle2 size={14} /> Times saved!
              </div>
            )}

            <button
              onClick={handleSaveSchedule}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition"
            >
              Save Times
            </button>
          </div>
        </div>

        {/* Purchase status message */}
        {purchaseMessage && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 mb-4 text-sm text-emerald-700 dark:text-emerald-300 font-medium text-center">
            {purchaseMessage}
          </div>
        )}

        {/* Match Credits */}
        <CreditBalance credits={matchCredits} />

        {/* Rank Card */}
        {ranking && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Award size={16} className="text-amber-500" /> Ranking
              </h3>
              <a href="/profile/rank" className="text-xs text-blue-600 hover:underline">Details</a>
            </div>
            <div className="flex items-center gap-4">
              <RankBadge tier={ranking.rank_tier as RankTier} size="lg" />
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-lg font-bold">{ranking.rank_points}</p>
                  <p className="text-[10px] text-zinc-500">Points</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{ranking.trust_score.toFixed(1)}</p>
                  <p className="text-[10px] text-zinc-500">Trust</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{coursesCompleted}/{totalCourses}</p>
                  <p className="text-[10px] text-zinc-500">Courses</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Map Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4 overflow-hidden">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <MapPin size={16} className="text-blue-600" /> My Saved Spots
          </h3>
          <div className="relative rounded-xl overflow-hidden" style={{ height: 300 }}>
            <Map
              {...viewState}
              onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
              mapStyle={MAP_STYLE_URL}
              style={{ width: "100%", height: "100%" }}
              onClick={handleMapClick}
              cursor="crosshair"
            >
              {savedSpots.map((spot) => (
                <Marker key={spot.id} latitude={spot.latitude} longitude={spot.longitude} anchor="bottom">
                  <div className="relative group cursor-pointer">
                    <div className="w-7 h-7 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                      <MapPin size={14} className="text-white" />
                    </div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                      <div className="bg-zinc-900 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap shadow">
                        {spot.label}
                      </div>
                    </div>
                  </div>
                </Marker>
              ))}
              {newPin && (
                <Marker latitude={newPin.lat} longitude={newPin.lng} anchor="bottom">
                  <div className="w-7 h-7 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-bounce">
                    <Plus size={14} className="text-white" />
                  </div>
                </Marker>
              )}
            </Map>
          </div>
          <p className="text-[11px] text-zinc-400 mt-2 text-center">
            Click on the map to drop a pin and save a new parking spot
          </p>
          {pinSuccess && (
            <div className="mt-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 text-center">
              {pinSuccess}
            </div>
          )}
        </div>

        {/* Schedule Matching Profile */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
          <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
            <Clock size={16} className="text-blue-600" /> Schedule Matching Profile
          </h3>
          <p className="text-[11px] text-zinc-400 mb-4">
            Set your typical arrival & departure times so we can match you with compatible spots.
          </p>

          <div className="space-y-3">
            {/* Days */}
            <div>
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-1 block">Days</label>
              <div className="flex gap-1">
                {DAY_LABELS.map((day, i) => (
                  <button
                    key={i}
                    onClick={() => setSchedDays((prev) => prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i].sort())}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
                      schedDays.includes(i)
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Arrival Time */}
            <div>
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-1 block">Arrive at</label>
              <div className="flex gap-1">
                <select value={schedArrivalHour} onChange={(e) => setSchedArrivalHour(e.target.value)}
                  className="flex-1 px-2 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="text-zinc-400 self-center">:</span>
                <select value={schedArrivalMin} onChange={(e) => setSchedArrivalMin(e.target.value)}
                  className="w-16 px-2 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none">
                  {["00", "15", "30", "45"].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={schedArrivalAmPm} onChange={(e) => setSchedArrivalAmPm(e.target.value)}
                  className="w-16 px-2 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold appearance-none focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            {/* Departure Time */}
            <div>
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-1 block">Leave at</label>
              <div className="flex gap-1">
                <select value={schedDepartureHour} onChange={(e) => setSchedDepartureHour(e.target.value)}
                  className="flex-1 px-2 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="text-zinc-400 self-center">:</span>
                <select value={schedDepartureMin} onChange={(e) => setSchedDepartureMin(e.target.value)}
                  className="w-16 px-2 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none">
                  {["00", "15", "30", "45"].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={schedDepartureAmPm} onChange={(e) => setSchedDepartureAmPm(e.target.value)}
                  className="w-16 px-2 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold appearance-none focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            {scheduleSaved && (
              <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs font-bold">
                <CheckCircle2 size={14} /> Schedule saved!
              </div>
            )}

            <button
              onClick={handleSaveSchedule}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition"
            >
              Save Schedule
            </button>
          </div>
        </div>

        {/* Contribution Stats */}
        {stats && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" /> Contribution Stats
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-center">
                <MapPin size={20} className="mx-auto text-blue-600 mb-1" />
                <p className="text-2xl font-bold">{stats.spots_posted}</p>
                <p className="text-[10px] text-zinc-500">Posted</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl text-center">
                <CheckCircle2 size={20} className="mx-auto text-green-600 mb-1" />
                <p className="text-2xl font-bold">{stats.spots_claimed}</p>
                <p className="text-[10px] text-zinc-500">Claimed</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl text-center">
                <Clock size={20} className="mx-auto text-purple-600 mb-1" />
                <p className="text-2xl font-bold">{stats.hours_saved}</p>
                <p className="text-[10px] text-zinc-500">Hours Saved</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl text-center">
                <GraduationCap size={20} className="mx-auto text-orange-600 mb-1" />
                <p className="text-2xl font-bold">{coursesCompleted}</p>
                <p className="text-[10px] text-zinc-500">Courses</p>
              </div>
            </div>
            {stats.neighborhood && (
              <p className="text-xs text-zinc-500 text-center mt-4">
                Active in <strong>{stats.neighborhood}</strong>
              </p>
            )}
          </div>
        )}

        {/* Saved Spots List */}
        {savedSpots.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <MapPin size={16} className="text-blue-600" /> Saved Spots ({savedSpots.length})
            </h3>
            <div className="space-y-2">
              {savedSpots.map((spot) => (
                <div key={spot.id} className="flex items-center justify-between gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{spot.label}</p>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {spot.address || `${spot.latitude.toFixed(4)}, ${spot.longitude.toFixed(4)}`}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => {
                        router.push(`/?post=save&lat=${spot.latitude}&lng=${spot.longitude}`);
                      }}
                      className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition"
                    >
                      <Clock size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteSpot(spot.id)}
                      className="h-8 w-8 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-500 hover:text-red-500 transition flex items-center justify-center"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <UserIcon size={16} className="text-blue-600" /> Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="/courses"
              className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition"
            >
              <BookOpen size={22} />
              <span className="text-[11px] font-bold">Start Courses</span>
            </a>
            <a
              href="/profile/rank"
              className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition"
            >
              <Award size={22} />
              <span className="text-[11px] font-bold">My Ranking</span>
            </a>
            <a
              href="/spotquest"
              className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 text-purple-600 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 transition"
            >
              <span className="text-2xl">🎮</span>
              <span className="text-[11px] font-bold">SpotQuest</span>
            </a>
            <a
              href="/test/behavior"
              className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition"
            >
              <Smartphone size={22} />
              <span className="text-[11px] font-bold">Device Test</span>
            </a>
            <a
              href="/settings"
              className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
            >
              <Settings size={22} />
              <span className="text-[11px] font-bold">Settings</span>
            </a>
            {userData?.role === "admin" && (
              <a
                href="/admin"
                className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition"
              >
                <Shield size={22} />
                <span className="text-[11px] font-bold">Admin Dashboard</span>
              </a>
            )}
            <a
              href="/"
              className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition"
            >
              <MapPin size={22} />
              <span className="text-[11px] font-bold">View Map</span>
            </a>
            <button
              onClick={handleLogout}
              className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition"
            >
              <LogOut size={22} />
              <span className="text-[11px] font-bold">Logout</span>
            </button>
          </div>
        </div>

        {/* Recurring Schedules */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Clock size={16} className="text-blue-600" /> Recurring Schedule
            </h3>
            {!showScheduleForm && (
              <button
                onClick={() => setShowScheduleForm(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                + Add
              </button>
            )}
          </div>

          {schedules.length === 0 && !showScheduleForm && (
            <p className="text-xs text-zinc-500 mb-3">
              No recurring schedules yet. Add one to auto-list your spot at the same time every day.
            </p>
          )}

          {schedules.map((sched) => (
            <div key={sched.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl mb-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold">{sched.label || "Recurring Spot"}</p>
                <button onClick={() => handleDeleteSchedule(sched.id)} className="text-xs text-red-500 hover:text-red-600 font-bold">Remove</button>
              </div>
              <p className="text-xs text-zinc-500">
                {formatTime12h(sched.departure_time)} – {formatTime12h(sched.return_time)}
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {(sched.days_of_week || []).sort().map((d: number) => DAY_LABELS[d]).join(", ") || "No days"}
              </p>
            </div>
          ))}

          {schedules.length > 0 && (
            <div className="mt-3">
              <button
                onClick={handleRunScheduleMatch}
                disabled={scheduleMatching}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {scheduleMatching ? <Loader2 className="animate-spin" size={16} /> : <Handshake size={16} />}
                {scheduleMatching ? "Matching Drivers..." : "Run Handoff Matching"}
              </button>
              <p className="text-[10px] text-zinc-400 text-center mt-1.5">
                Air-traffic-control style: pairs your departure with drivers arriving in your area.
              </p>
              {scheduleMatchMessage && (
                <p className={`text-xs mt-2 px-3 py-2 rounded-xl text-center font-bold ${
                  scheduleMatchMessage.startsWith("Handoff matched")
                    ? "bg-green-50 dark:bg-green-900/20 text-green-700"
                    : "bg-amber-50 dark:bg-amber-900/20 text-amber-700"
                }`}>
                  {scheduleMatchMessage}
                </p>
              )}
            </div>
          )}

          {showScheduleForm && (
            <div className="mt-2 space-y-3">
              {scheduleError && (
                <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{scheduleError}</p>
              )}

              <div>
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-1 block">Label</label>
                <input
                  type="text" value={scheduleLabel} onChange={(e) => setScheduleLabel(e.target.value)}
                  placeholder="e.g. Work, Gym"
                  className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-1 block">Days</label>
                <div className="flex gap-1">
                  {DAY_LABELS.map((day, i) => (
                    <button
                      key={i}
                      onClick={() => setScheduleDays((prev) => prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i].sort())}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
                        scheduleDays.includes(i)
                          ? "bg-blue-600 text-white"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-1 block">Departure Time</label>
                <div className="flex gap-1">
                  <select value={scheduleDepartHour} onChange={(e) => setScheduleDepartHour(e.target.value)}
                    className="flex-1 px-2 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <span className="text-zinc-400 self-center">:</span>
                  <select value={scheduleDepartMin} onChange={(e) => setScheduleDepartMin(e.target.value)}
                    className="w-16 px-2 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none">
                    {["00", "15", "30", "45"].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select value={scheduleDepartAmPm} onChange={(e) => setScheduleDepartAmPm(e.target.value)}
                    className="w-16 px-2 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold appearance-none focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-1 block">Return Time</label>
                <div className="flex gap-1">
                  <select value={scheduleReturnHour} onChange={(e) => setScheduleReturnHour(e.target.value)}
                    className="flex-1 px-2 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <span className="text-zinc-400 self-center">:</span>
                  <select value={scheduleReturnMin} onChange={(e) => setScheduleReturnMin(e.target.value)}
                    className="w-16 px-2 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none">
                    {["00", "15", "30", "45"].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select value={scheduleReturnAmPm} onChange={(e) => setScheduleReturnAmPm(e.target.value)}
                    className="w-16 px-2 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold appearance-none focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setShowScheduleForm(false); setScheduleError(null); }}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSchedule}
                  disabled={scheduleSaving || scheduleDays.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {scheduleSaving ? <Loader2 className="animate-spin" size={14} /> : null}
                  {scheduleSaving ? "Saving..." : "Save Schedule"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Links */}
        <div className="space-y-2">
          <a href="/rankings" className="block w-full px-4 py-3.5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">
            Community Rankings
          </a>
          <a href="/notifications" className="block w-full px-4 py-3.5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">
            Notification History
          </a>
        </div>
      </div>

      {/* Pin Save Form Overlay */}
      {showPinForm && newPin && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => { setShowPinForm(false); setNewPin(null); }}>
          <div
            className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[24px] shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base">Save This Spot</h3>
              <button onClick={() => { setShowPinForm(false); setNewPin(null); }} className="text-zinc-400 hover:text-zinc-600">
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <div className="mb-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
              <p className="text-xs text-zinc-400">Coordinates</p>
              <p className="text-sm font-mono">{newPin.lat.toFixed(6)}, {newPin.lng.toFixed(6)}</p>
              {pinAddress && (
                <>
                  <p className="text-xs text-zinc-400 mt-2">Address</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">{pinAddress}</p>
                </>
              )}
            </div>

            <div className="mb-4">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1 block">Label</label>
              <input
                type="text"
                value={pinLabel}
                onChange={(e) => setPinLabel(e.target.value)}
                placeholder="e.g. Work, Gym, Home"
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                autoFocus
              />
            </div>

            {pinSaveError && (
              <div className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2 text-xs text-red-600 dark:text-red-400">
                {pinSaveError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setShowPinForm(false); setNewPin(null); }}
                className="flex-1 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePin}
                disabled={savingPin}
                className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingPin ? <Loader2 className="animate-spin" size={16} /> : <MapPin size={16} />}
                {savingPin ? "Saving..." : "Save Spot"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
