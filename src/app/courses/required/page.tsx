"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { ArrowLeft, BookOpen, Loader2, AlertCircle } from "lucide-react";

export default function RequiredCoursePage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [loading, setLoading] = useState(true);
  const [requiredCourse, setRequiredCourse] = useState<{ id: string; title: string } | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.push("/"); return; }

      const { data: courses } = await supabase
        .from("courses")
        .select("id, title")
        .eq("required", true)
        .order("created_at", { ascending: true })
        .limit(1);

      if (courses && courses.length > 0) {
        setRequiredCourse(courses[0]);

        const { data: prog } = await supabase
          .from("user_course_progress")
          .select("status")
          .eq("user_id", session.user.id)
          .eq("course_id", courses[0].id)
          .maybeSingle();

        setProgress(prog?.status ?? "not_started");
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

  if (progress === "passed") {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-lg mx-auto p-6 text-center pt-20">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <BookOpen size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">All Set!</h1>
          <p className="text-zinc-500 mb-6">You have completed the required course. You can now use all app features.</p>
          <button
            onClick={() => router.push("/")}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-extrabold"
          >
            Go to Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-lg mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/")} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Required Course</h1>
        </div>

        <div className="rounded-2xl p-6 mb-6 bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
          <AlertCircle size={28} className="mb-3" />
          <h2 className="text-lg font-bold mb-1">Complete This Course to Use the App</h2>
          <p className="text-sm text-blue-100">
            One required course must be passed before you can post departure alerts.
          </p>
        </div>

        {requiredCourse && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
              <BookOpen size={24} className="text-amber-600" />
            </div>
            <h3 className="font-bold text-lg mb-1">{requiredCourse.title}</h3>
            <p className="text-sm text-zinc-500 mb-4">Take this course to unlock full app access.</p>
            <button
              onClick={() => router.push(`/courses/${requiredCourse.id}`)}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-extrabold flex items-center justify-center gap-2 transition"
            >
              <BookOpen size={20} />
              Start Course
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
