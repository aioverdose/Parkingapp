"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import type { Course } from "@/lib/courses";

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createBrowserClient();
  const [course, setCourse] = useState<Course | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ passed: boolean; score: number } | null>(null);
  const [existingProgress, setExistingProgress] = useState<{
    status: string;
    score: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.push("/"); return; }

      const res = await fetch(`/api/courses/${id}`);
      const data = await res.json();
      if (data.course) {
        setCourse(data.course);
        setAnswers(new Array(data.course.quiz_questions.length).fill(-1));
      }

      const { data: progress } = await supabase
        .from("user_course_progress")
        .select("status, score")
        .eq("user_id", session.user.id)
        .eq("course_id", id)
        .maybeSingle();

      if (progress) setExistingProgress(progress);
      setLoading(false);
    });
  }, [id]);

  const handleAnswer = (questionIndex: number, optionIndex: number) => {
    if (result) return;
    const next = [...answers];
    next[questionIndex] = optionIndex;
    setAnswers(next);
  };

  const handleSubmit = async () => {
    if (!course || submitting) return;
    if (answers.includes(-1)) { alert("Please answer all questions."); return; }

    setSubmitting(true);
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch(`/api/courses/${id}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ answers }),
    });
    const data = await res.json();
    setResult({ passed: data.passed, score: data.score });
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500">Course not found.</p>
      </div>
    );
  }

  const questions = course.quiz_questions;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <div className="max-w-lg mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push("/courses")} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold">{course.title}</h1>
            <p className="text-xs text-zinc-500">
              {course.points} points &middot; {questions.length} questions &middot; 80% to pass
            </p>
          </div>
        </div>

        {result && (
          <div className={`rounded-2xl p-5 mb-6 ${
            result.passed
              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          }`}>
            <div className="flex items-center gap-3">
              {result.passed ? (
                <CheckCircle2 size={28} className="text-green-600" />
              ) : (
                <XCircle size={28} className="text-red-500" />
              )}
              <div>
                <p className="font-bold text-lg">{result.passed ? "Passed!" : "Not this time"}</p>
                <p className="text-sm">Score: {result.score}%{result.passed ? "" : " — try again!"}</p>
              </div>
            </div>
            {result.passed && (
              <div className="mt-3">
                <button
                  onClick={() => router.push("/courses")}
                  className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition"
                >
                  Back to Courses
                </button>
              </div>
            )}
          </div>
        )}

        {existingProgress?.status === "passed" && !result && (
          <div className="rounded-2xl p-5 mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-green-600" />
              <div>
                <p className="font-bold">Already Passed</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Score: {existingProgress.score}%
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-6">
          <h2 className="font-bold text-sm mb-3">Reading Material</h2>
          <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
            {course.content}
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <AlertCircle size={16} className="text-blue-600" />
            Quiz ({questions.length} questions)
          </h2>

          {questions.map((q, qi) => (
            <div key={qi} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
              <p className="font-bold text-sm mb-3">
                {qi + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => handleAnswer(qi, oi)}
                    disabled={!!result}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition border ${
                      answers[qi] === oi
                        ? result
                          ? oi === q.correct
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700"
                            : "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700"
                          : "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                    } ${result ? "cursor-default" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        answers[qi] === oi
                          ? result
                            ? oi === q.correct
                              ? "border-green-500 bg-green-500"
                              : "border-red-500 bg-red-500"
                            : "border-blue-500 bg-blue-500"
                          : "border-zinc-300 dark:border-zinc-600"
                      }`}>
                        {answers[qi] === oi && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <span>{opt}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {!result && existingProgress?.status !== "passed" && (
          <button
            onClick={handleSubmit}
            disabled={submitting || answers.includes(-1)}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 disabled:from-zinc-300 disabled:to-zinc-300 dark:disabled:from-zinc-700 dark:disabled:to-zinc-700 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all duration-150 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {submitting ? (
              <Loader2 className="animate-spin" size={22} />
            ) : (
              "Submit Quiz"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
