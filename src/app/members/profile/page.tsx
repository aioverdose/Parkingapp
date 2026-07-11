"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabaseClient";
import { getUserContributionStats } from "@/actions/rankings";
import { getParkingSpots, deleteParkingSpot } from "@/lib/parking-spot";
import type { SavedParkingSpot } from "@/lib/parking-spot";
import type { UserRanking, RankTier } from "@/lib/ranking";
import { RankBadge } from "@/components/RankBadge";
import {
  ArrowLeft, MapPin, Clock, Star, TrendingUp, CheckCircle2,
  BookOpen, Settings, GraduationCap, Loader2, Trash2, Award,
  User as UserIcon, Bell,
} from "lucide-react";

export default function MembersProfilePage() {
  const supabase = createBrowserClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<{
    name: string | null;
    email: string;
    vehicle_type: string | null;
    created_at: string | null;
    average_rating: number | null;
    flag_count: number;
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
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.push("/"); return; }

      const [
        profileRes, rankingRes, stat, spotsRes,
        coursesRes, courseCountRes, alertsRes,
      ] = await Promise.all([
        supabase.from("users").select("name, email, vehicle_type, created_at, average_rating, flag_count").eq("id", session.user.id).single(),
        supabase.from("user_ranking").select("*").eq("user_id", session.user.id).maybeSingle(),
        getUserContributionStats(session.user.id),
        getParkingSpots(session.user.id),
        supabase.from("user_course_progress").select("id").eq("user_id", session.user.id).eq("status", "passed"),
        supabase.from("courses").select("id"),
        supabase.from("parking_spots").select("id, address, latitude, longitude, departure_time, expires_at, status").eq("user_id", session.user.id).eq("status", "active").gt("expires_at", new Date().toISOString()),
      ]);

      setUserData(profileRes.data as typeof userData);
      setRanking(rankingRes.data as UserRanking);
      setStats(stat);
      setSavedSpots(spotsRes.spots ?? []);
      setCoursesCompleted(coursesRes.data?.length ?? 0);
      setTotalCourses(courseCountRes.data?.length ?? 0);
      setActiveAlerts(alertsRes.data ?? []);
      setLoading(false);
    });
  }, []);

  const handleDeleteSpot = async (spotId: string) => {
    await deleteParkingSpot(spotId);
    setSavedSpots((prev) => prev.filter((s) => s.id !== spotId));
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
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push("/")} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Member Profile</h1>
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
                  <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-600 dark:text-zinc-400 font-medium">{userData.vehicle_type}</span>
                )}
                {userData?.average_rating !== null && userData?.average_rating !== undefined && (
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full text-amber-700 font-medium flex items-center gap-1">
                    <Star size={10} /> {userData.average_rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Rank & Stats Card */}
        {ranking && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Award size={16} className="text-amber-500" /> Ranking
              </h3>
              <Link href="/profile/rank" className="text-xs text-blue-600 hover:underline">Details</Link>
            </div>
            <div className="flex items-center gap-4">
              <RankBadge tier={ranking.rank_tier as RankTier} size="md" />
              <div className="flex gap-4 text-center">
                <div><p className="text-lg font-bold">{ranking.rank_points}</p><p className="text-[10px] text-zinc-500">Points</p></div>
                <div><p className="text-lg font-bold">{ranking.trust_score.toFixed(1)}</p><p className="text-[10px] text-zinc-500">Trust</p></div>
                <div><p className="text-lg font-bold">{coursesCompleted}/{totalCourses}</p><p className="text-[10px] text-zinc-500">Courses</p></div>
              </div>
            </div>
          </div>
        )}

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Bell size={16} className="text-orange-500" /> Active Alerts
            </h3>
            {activeAlerts.map((alert: any) => (
              <div key={alert.id} className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold truncate">{alert.address || "Parking Spot"}</p>
                  {alert.expires_at && (
                    <span className="text-xs font-bold text-orange-600">
                      {Math.max(0, Math.round((new Date(alert.expires_at).getTime() - Date.now()) / 60000))}m left
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {alert.latitude?.toFixed(4)}, {alert.longitude?.toFixed(4)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" /> Activity
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
              <p className="text-xs text-zinc-500 text-center mt-4">Active in <strong>{stats.neighborhood}</strong></p>
            )}
          </div>
        )}

        {/* Saved Spots */}
        {savedSpots.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <MapPin size={16} className="text-blue-600" /> Saved Spots
            </h3>
            <div className="space-y-2">
              {savedSpots.map((spot) => (
                <div key={spot.id} className="flex items-center justify-between gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{spot.label}</p>
                    <p className="text-[11px] text-zinc-400 truncate">{spot.address || `${spot.latitude.toFixed(4)}, ${spot.longitude.toFixed(4)}`}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => router.push("/")} className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition">
                      <Clock size={13} />
                    </button>
                    <button onClick={() => handleDeleteSpot(spot.id)} className="h-8 w-8 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-500 hover:text-red-500 transition flex items-center justify-center">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <UserIcon size={16} className="text-blue-600" /> Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/courses" className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition">
              <BookOpen size={22} /><span className="text-[11px] font-bold">Start Courses</span>
            </Link>
            <Link href="/profile/rank" className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition">
              <Award size={22} /><span className="text-[11px] font-bold">My Ranking</span>
            </Link>
            <Link href="/settings" className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition">
              <Settings size={22} /><span className="text-[11px] font-bold">Edit Profile</span>
            </Link>
            <Link href="/" className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition">
              <MapPin size={22} /><span className="text-[11px] font-bold">View Map</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
