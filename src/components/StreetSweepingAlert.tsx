"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Loader2, Bell, X, Check } from "lucide-react";

interface SweepingData {
  street_name: string;
  city: string;
  day_of_week: string;
  time_start: string;
  time_end: string;
  zone: string;
}

interface StreetSweepingAlertProps {
  sweepingData: SweepingData | null;
  loading: boolean;
  userId: string | null;
}

export function StreetSweepingAlert({ sweepingData, loading, userId }: StreetSweepingAlertProps) {
  const supabase = createBrowserClient();
  const [dismissed, setDismissed] = useState(false);
  const [settingAlert, setSettingAlert] = useState(false);
  const [saved, setSaved] = useState(false);
  const [alertOption, setAlertOption] = useState<"1day" | "2hours" | null>(null);

  if (dismissed || !sweepingData || loading) return null;

  const { street_name, day_of_week, time_start, time_end } = sweepingData;

  const handleSetAlert = async () => {
    if (!userId || !alertOption) return;
    setSettingAlert(true);

    const daysOfWeek: Record<string, number> = {
      Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
      Thursday: 4, Friday: 5, Saturday: 6,
    };
    const dayNum = daysOfWeek[day_of_week];
    if (dayNum === undefined) { setSettingAlert(false); return; }

    const now = new Date();
    const currentDay = now.getDay();
    let daysUntil = dayNum - currentDay;
    if (daysUntil <= 0) daysUntil += 7;

    const [hours, minutes] = time_start.split(":").map(Number);
    const sweepDate = new Date(now);
    sweepDate.setDate(sweepDate.getDate() + daysUntil);
    sweepDate.setHours(hours, minutes, 0, 0);

    let alertTime: Date;
    if (alertOption === "1day") {
      alertTime = new Date(sweepDate.getTime() - 24 * 60 * 60 * 1000);
    } else {
      alertTime = new Date(sweepDate.getTime() - 2 * 60 * 60 * 1000);
    }

    const { error } = await (supabase as any).from("street_sweeping_alerts").insert({
      user_id: userId,
      street_name,
      alert_time: alertTime.toISOString(),
    });

    setSettingAlert(false);
    if (!error) setSaved(true);
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl shadow-lg p-4">
      <div className="flex items-start gap-3">
        <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-xl text-amber-600 shrink-0">
          <Bell size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
            Street Sweeping on {street_name}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
            {day_of_week} &middot; {time_start}–{time_end}
          </p>
          {!saved ? (
            <div className="mt-2 space-y-2">
              <p className="text-[11px] font-bold text-amber-700 dark:text-amber-500">
                Set Alert:
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setAlertOption("1day")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                    alertOption === "1day"
                      ? "bg-amber-500 text-white"
                      : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                  }`}
                >
                  1 Day Before
                </button>
                <button
                  onClick={() => setAlertOption("2hours")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                    alertOption === "2hours"
                      ? "bg-amber-500 text-white"
                      : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                  }`}
                >
                  2 Hours Before
                </button>
                {userId && alertOption && (
                  <button
                    onClick={handleSetAlert}
                    disabled={settingAlert}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white text-[11px] font-bold transition flex items-center gap-1"
                  >
                    {settingAlert ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Bell size={12} />
                    )}
                    Set
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Check size={14} />
              Alert saved!
            </div>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400 hover:text-amber-600 shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
