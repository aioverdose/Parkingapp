"use client";

import { BookOpen, CheckCircle2, Lock } from "lucide-react";
import type { Course, UserCourseProgress } from "@/lib/courses";

interface CourseCardProps {
  course: Course;
  progress?: UserCourseProgress;
}

export function CourseCard({ course, progress }: CourseCardProps) {
  const status = progress?.status ?? "not_started";

  return (
    <a
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
          {status === "passed" ? <CheckCircle2 size={20} /> : status === "failed" ? <Lock size={20} /> : <BookOpen size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm">{course.title}</h3>
            {course.required && (
              <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Required</span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{course.description}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] text-zinc-400 font-medium">{course.points} pts</span>
            {progress?.score !== null && progress?.score !== undefined && (
              <span className={`text-[10px] font-bold ${progress.score >= 80 ? "text-green-600" : "text-red-500"}`}>{progress.score}%</span>
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
}
