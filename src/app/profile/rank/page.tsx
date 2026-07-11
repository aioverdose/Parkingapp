"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import type { UserRanking, RankTier } from "@/lib/ranking";
import { RankBadge } from "@/components/RankBadge";
import { ArrowLeft, Loader2, CheckCircle2, Shield, ShieldCheck, Award, Trophy, Info } from "lucide-react";

const TIER_INFO = [
  {
    tier: "bronze" as RankTier,
    icon: Shield,
    label: "Bronze",
    req: "0-1 courses completed",
    color: "text-amber-700",
    desc: "Getting started. Complete courses to unlock full alert posting.",
  },
  {
    tier: "silver" as RankTier,
    icon: ShieldCheck,
    label: "Silver",
    req: "2-3 courses completed",
    color: "text-zinc-400",
    desc: "Trusted member. Full alert posting enabled. Ranked in leaderboards.",
  },
  {
    tier: "gold" as RankTier,
    icon: Award,
    label: "Gold",
    req: "4-5 courses completed",
    color: "text-amber-400",
    desc: "Elite member. Featured in leaderboards. Priority visibility.",
  },
  {
    tier: "community_partner" as RankTier,
    icon: Trophy,
    label: "Community Partner",
    req: "4-5 courses + high trust + low flags",
    color: "text-purple-400",
    desc: "Top contributor. Featured leader. Possible moderator privileges.",
  },
];

export default function RankDetailPage() {
  const supabase = createBrowserClient();
  const router = useRouter();
  const [ranking, setRanking] = useState<UserRanking | null>(null);
  const [coursesTimeline, setCoursesTimeline] = useState<
    { title: string; completed_at: string; score: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.push("/"); return; }

      const [rankingRes, timelineRes] = await Promise.all([
        supabase
          .from("user_ranking")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle(),
        supabase
          .from("user_course_progress")
          .select("course_id, completed_at, score")
          .eq("user_id", session.user.id)
          .eq("status", "passed")
          .not("completed_at", "is", null),
      ]);

      setRanking(rankingRes.data as UserRanking);

      if (timelineRes.data && timelineRes.data.length > 0) {
        const courseIds = timelineRes.data.map((p) => p.course_id);
        const { data: courses } = await supabase
          .from("courses")
          .select("id, title")
          .in("id", courseIds);
        const courseMap = new Map((courses ?? []).map((c) => [c.id, c.title]));

        setCoursesTimeline(
          timelineRes.data
            .map((p) => ({
              title: courseMap.get(p.course_id) ?? "Unknown Course",
              completed_at: p.completed_at ?? "",
              score: p.score ?? 0,
            }))
            .sort(
              (a, b) =>
                new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime(),
            ),
        );
      }

      setLoading(false);
    });
  }, []);

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
          <button onClick={() => router.push("/profile")} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">My Ranking</h1>
        </div>

        {ranking && (
          <>
            {/* Current Rank */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-4 text-center">
              <div className="mb-3">
                <RankBadge tier={ranking.rank_tier as RankTier} size="lg" />
              </div>
              <p className="text-3xl font-bold">{ranking.rank_points}</p>
              <p className="text-sm text-zinc-500">Total Points</p>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div>
                  <p className="text-lg font-bold">{ranking.trust_score.toFixed(1)}</p>
                  <p className="text-[10px] text-zinc-500">Trust Score</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{ranking.courses_completed}</p>
                  <p className="text-[10px] text-zinc-500">Courses</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{ranking.successful_handoffs}</p>
                  <p className="text-[10px] text-zinc-500">Handoffs</p>
                </div>
              </div>
            </div>

            {/* Point Breakdown */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Info size={16} className="text-blue-600" /> Point Breakdown
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-zinc-500">Courses completed</span>
                  <span className="font-bold text-green-600">+{ranking.rank_points > ranking.successful_handoffs * 10 ? ranking.rank_points - ranking.successful_handoffs * 10 : ranking.rank_points}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-500">Successful handoffs</span>
                  <span className="font-bold text-green-600">+{ranking.successful_handoffs * 10}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-500">Flags received</span>
                  <span className="font-bold text-red-500">-{ranking.flags_received * 20}</span>
                </div>
                <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span>{ranking.rank_points}</span>
                </div>
              </div>
            </div>

            {/* Trust Score */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
              <h3 className="font-bold text-sm mb-3">Trust Score</h3>
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-3 mb-2">
                <div
                  className="bg-gradient-to-r from-red-500 via-amber-400 to-green-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(ranking.trust_score / 5) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>0</span>
                <span>2.5</span>
                <span>5.0</span>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Trust score starts at 5.0. Each flag reduces by 0.5, each handoff adds 0.1.
              </p>
            </div>

            {/* Rank Tiers */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
              <h3 className="font-bold text-sm mb-3">Rank Tiers</h3>
              <div className="space-y-2">
                {TIER_INFO.map((t) => {
                  const Icon = t.icon;
                  const isCurrent = ranking.rank_tier === t.tier;
                  const isUnlocked =
                    TIER_INFO.findIndex((x) => x.tier === ranking.rank_tier) >=
                    TIER_INFO.findIndex((x) => x.tier === t.tier);
                  return (
                    <div
                      key={t.tier}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        isCurrent
                          ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                          : isUnlocked
                          ? "bg-green-50 dark:bg-green-900/20"
                          : "bg-zinc-50 dark:bg-zinc-800/50 opacity-60"
                      }`}
                    >
                      <Icon size={20} className={t.color} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${t.color}`}>{t.label}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                              Current
                            </span>
                          )}
                          {isUnlocked && !isCurrent && (
                            <CheckCircle2 size={14} className="text-green-500" />
                          )}
                        </div>
                        <p className="text-xs text-zinc-500">{t.req}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Course Timeline */}
        {coursesTimeline.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-600" /> Completed Courses
            </h3>
            <div className="space-y-3">
              {coursesTimeline.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={16} className="text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{item.title}</p>
                    <p className="text-xs text-zinc-500">{item.score}% — {new Date(item.completed_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
