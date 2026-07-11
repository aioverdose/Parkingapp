"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { QuizQuestion } from "@/lib/courses";

interface QuizComponentProps {
  questions: QuizQuestion[];
  onSubmit: (answers: number[]) => Promise<{ passed: boolean; score: number }>;
}

export function QuizComponent({ questions, onSubmit }: QuizComponentProps) {
  const [answers, setAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ passed: boolean; score: number } | null>(null);

  const handleAnswer = (questionIndex: number, optionIndex: number) => {
    if (result) return;
    const next = [...answers];
    next[questionIndex] = optionIndex;
    setAnswers(next);
  };

  const handleSubmit = async () => {
    if (answers.includes(-1)) { alert("Please answer all questions."); return; }
    setSubmitting(true);
    const res = await onSubmit(answers);
    setResult(res);
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      {result && (
        <div className={`rounded-2xl p-5 ${
          result.passed
            ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
            : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
        }`}>
          <div className="flex items-center gap-3">
            {result.passed ? <CheckCircle2 size={28} className="text-green-600" /> : <XCircle size={28} className="text-red-500" />}
            <div>
              <p className="font-bold text-lg">{result.passed ? "Passed!" : "Not this time"}</p>
              <p className="text-sm">Score: {result.score}%{result.passed ? "" : " — try again!"}</p>
            </div>
          </div>
        </div>
      )}

      {questions.map((q, qi) => (
        <div key={qi} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
          <p className="font-bold text-sm mb-3">{qi + 1}. {q.question}</p>
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
                    {answers[qi] === oi && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span>{opt}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {!result && (
        <button
          onClick={handleSubmit}
          disabled={submitting || answers.includes(-1)}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 disabled:from-zinc-300 disabled:to-zinc-300 dark:disabled:from-zinc-700 dark:disabled:to-zinc-700 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all duration-150 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {submitting ? <Loader2 className="animate-spin" size={22} /> : "Submit Quiz"}
        </button>
      )}
    </div>
  );
}
