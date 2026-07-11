"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { BookOpen, CheckCircle2, Lock, ArrowLeft, Loader2, GraduationCap } from "lucide-react";
import type { Course, UserCourseProgress } from "@/lib/courses";

export default function CoursesPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<Record<string, UserCourseProgress>>({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        router.push("/");
        return;
      }
      setUser(session.user);

      const [coursesRes, progressRes] = await Promise.all([
        fetch("/api/courses"),
        supabase
          .from("user_course_progress")
          .select("*")
          .eq("user_id", session.user.id),
      ]);

      const coursesData = await coursesRes.json();
      setCourses(coursesData.courses ?? []);

      const progressMap: Record<string, UserCourseProgress> = {};
      (progressRes.data ?? []).forEach((p: any) => {
        progressMap[p.course_id] = p as UserCourseProgress;
      });
      setProgress(progressMap);
      setLoading(false);
    });
  }, []);

  const completedCount = Object.values(progress).filter((p) => p.status === "passed").length;
  const totalCourses = courses.length;

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
          <h1 className="text-2xl font-bold">Courses</h1>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl p-6 mb-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <GraduationCap size={28} />
            <div>
              <h2 className="text-lg font-bold">Safety Education</h2>
              <p className="text-sm text-blue-100">Learn to use the app safely</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 size={16} />
            <span>{completedCount}/{totalCourses} completed</span>
          </div>
        </div>

        <div className="space-y-3">
          {courses.map((course) => {
            const prog = progress[course.id];
            const status = prog?.status ?? "not_started";
            const isLocked = course.required && completedCount === 0 && status !== "passed";

            return (
              <a
                key={course.id}
                href={`/courses/${course.id}`}
                className={`block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 transition hover:shadow-md ${
                  status === "passed" ? "border-l-4 border-l-green-500" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    status === "passed"
                      ? "bg-green-100 dark:bg-green-900/30 text-green-600"
                      : status === "failed"
                      ? "bg-red-100 dark:bg-red-900/30 text-red-500"
                      : "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                  }`}>
                    {status === "passed" ? (
                      <CheckCircle2 size={20} />
                    ) : status === "failed" ? (
                      <Lock size={20} />
                    ) : (
                      <BookOpen size={20} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm">{course.title}</h3>
                      {course.required && (
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{course.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-zinc-400 font-medium">{course.points} pts</span>
                      {prog?.score !== null && prog?.score !== undefined && (
                        <>
                          <span className={`text-[10px] font-bold ${
                            prog.score >= 80 ? "text-green-600" : "text-red-500"
                          }`}>
                            {prog.score}%
                          </span>
                        </>
                      )}
                      <span className={`text-[10px] font-medium capitalize ${
                        status === "passed" ? "text-green-600" : status === "failed" ? "text-red-500" : "text-zinc-400"
                      }`}>
                        {status === "not_started" ? "Start" : status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
