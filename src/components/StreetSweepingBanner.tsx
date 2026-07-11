"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Loader2, Bell, X, Check } from "lucide-react";

interface SweepingData {
  street_name: string;
  day_of_week: string;
  time_start: string;
  time_end: string;
}

interface StreetSweepingBannerProps {
  sweepingData: SweepingData | null;
  loading: boolean;
  userId: string | null;
  onDismiss?: () => void;
}

const DAYS_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function daysUntilNext(day: string): number {
  const today = new Date().getDay();
  const target = DAYS_ORDER.indexOf(day);
  if (target < 0) return 7;
  let diff = target - today;
  if (diff <= 0) diff += 7;
  return diff;
}

export function StreetSweepingBanner({ sweepingData, loading, userId, onDismiss }: StreetSweepingBannerProps) {
  const supabase = createBrowserClient();
  const [dismissed, setDismissed] = useState(false);
  const [settingAlert, setSettingAlert] = useState(false);
  const [saved, setSaved] = useState(false);
  const [alertOption, setAlertOption] = useState<"1day" | "2hours" | null>(null);

  if (dismissed || !sweepingData || loading) return null;

  const { street_name, day_of_week, time_start, time_end } = sweepingData;
  const daysUntil = daysUntilNext(day_of_week);
  const isToday = daysUntil === 0;
  const isTomorrow = daysUntil === 1;

  const handleSetAlert = async () => {
    if (!userId || !alertOption) return;
    setSettingAlert(true);

    const dayNum = DAYS_ORDER.indexOf(day_of_week);
    if (dayNum < 0) { setSettingAlert(false); return; }

    const now = new Date();
    let daysUntilSweep = dayNum - now.getDay();
    if (daysUntilSweep <= 0) daysUntilSweep += 7;

    const [hours, minutes] = time_start.split(":").map(Number);
    const sweepDate = new Date(now);
    sweepDate.setDate(sweepDate.getDate() + daysUntilSweep);
    sweepDate.setHours(hours, minutes, 0, 0);

    let alertTime: Date;
    if (alertOption === "1day") {
      alertTime = new Date(sweepDate.getTime() - 24 * 60 * 60 * 1000);
    } else {
      alertTime = new Date(sweepDate.getTime() - 2 * 60 * 60 * 1000);
    }

    await (supabase as any)
      .from("street_sweeping_alerts")
      .insert({ user_id: userId, street_name, alert_time: alertTime.toISOString() });

    setSettingAlert(false);
    setSaved(true);
  };

  const bgColor = isToday
    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
    : isTomorrow
      ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
      : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700";

  return (
    <div className={`rounded-2xl shadow-lg border ${bgColor} p-3`}>
      <div className="flex items-start gap-2">
        <div className={`p-1.5 rounded-lg shrink-0 ${
          isToday ? "bg-red-100 dark:bg-red-900/30 text-red-600" : "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
        }`}>
          <Bell size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold">
            {isToday ? "🚨 TODAY" : isTomorrow ? "⚠️ TOMORROW" : ""}
            {isToday || isTomorrow ? " — " : ""}
            Street Sweeping on <span className="font-black">{street_name}</span>
          </p>
          <p className="text-[11px] mt-0.5">
            {day_of_week} &middot; {time_start}–{time_end}
          </p>
          {!saved ? (
            <div className="mt-1.5 flex gap-1.5">
              <button
                onClick={() => setAlertOption("1day")}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                  alertOption === "1day"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                }`}
              >
                1 Day Before
              </button>
              <button
                onClick={() => setAlertOption("2hours")}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                  alertOption === "2hours"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                }`}
              >
                2 Hours Before
              </button>
              {userId && alertOption && (
                <button
                  onClick={handleSetAlert}
                  disabled={settingAlert}
                  className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-[10px] font-bold transition"
                >
                  {settingAlert ? <Loader2 size={10} className="animate-spin" /> : <Bell size={10} />}
                </button>
              )}
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-600">
              <Check size={12} />
              Alert set!
            </div>
          )}
        </div>
        <button
          onClick={() => { setDismissed(true); onDismiss?.(); }}
          className="text-zinc-400 hover:text-zinc-600 shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
