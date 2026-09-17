"use client";

import { CalendarClock, Car, MapPin, ShieldCheck } from "lucide-react";
import { getMatchFitSummary, type MatchFitInput } from "@/lib/match-fit";

interface MatchFitSummaryProps extends MatchFitInput {
  compact?: boolean;
}

export function MatchFitSummary({ compact = false, ...input }: MatchFitSummaryProps) {
  const summary = getMatchFitSummary(input);

  return (
    <section className={`rounded-2xl border border-blue-200 bg-blue-50/70 dark:border-blue-900/60 dark:bg-blue-950/20 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="shrink-0 text-blue-600" />
        <p className="text-xs font-bold uppercase tracking-wide text-blue-800 dark:text-blue-200">Match fit</p>
      </div>
      <div className={`mt-3 grid gap-2 ${compact ? "sm:grid-cols-3" : "sm:grid-cols-3"}`}>
        <p className="flex items-start gap-2 text-xs text-blue-900 dark:text-blue-100"><CalendarClock size={14} className="mt-0.5 shrink-0" />{summary.schedule}</p>
        <p className="flex items-start gap-2 text-xs text-blue-900 dark:text-blue-100"><Car size={14} className="mt-0.5 shrink-0" />{summary.vehicle}</p>
        <p className="flex items-start gap-2 text-xs text-blue-900 dark:text-blue-100"><MapPin size={14} className="mt-0.5 shrink-0" />{summary.location}</p>
      </div>
      <p className="mt-3 text-[11px] leading-4 text-blue-800 dark:text-blue-200">
        Informational coordination only. Public signs, posted rules, and actual conditions control; this is not a reservation or guarantee of a space.
      </p>
    </section>
  );
}
