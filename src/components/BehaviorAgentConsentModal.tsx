"use client";

import { useState } from "react";
import { Loader2, Sparkles, X, Smartphone, Gauge, CircleCheck } from "lucide-react";
import type {
  BehaviorAgentPreferences,
  MotionPermissionState,
} from "@/lib/behavior/types";

interface BehaviorAgentConsentModalProps {
  open: boolean;
  onClose: () => void;
  prefs: BehaviorAgentPreferences;
  motionPermission: MotionPermissionState;
  motionSupported: boolean;
  onEnableMotion: () => Promise<void>;
  onSetAutoPost: (value: boolean) => void;
  onSetAutoConfirm: (value: boolean) => void;
  onSetEnabled: (value: boolean) => void;
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative h-7 w-12 rounded-full transition disabled:opacity-50 ${checked ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-700"}`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}

export function BehaviorAgentConsentModal({
  open,
  onClose,
  prefs,
  motionPermission,
  motionSupported,
  onEnableMotion,
  onSetAutoPost,
  onSetAutoConfirm,
  onSetEnabled,
}: BehaviorAgentConsentModalProps) {
  const [requesting, setRequesting] = useState(false);

  if (!open) return null;

  const motionActive = motionSupported && (motionPermission === "granted" || motionPermission === "unknown");

  const handleEnableMotion = async () => {
    setRequesting(true);
    try {
      await onEnableMotion();
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[32px] shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Smart Spot Agent</h2>
                <p className="text-xs text-zinc-500">Knows where you parked. Handles the exchange for you.</p>
              </div>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
            <Smartphone size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Uses only your phone&apos;s sensors</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                No extra hardware. It combines GPS with your phone&apos;s motion sensors
                (accelerometer/gyroscope) to detect when you park, when you walk away,
                and when the car pulls out — even in garages where GPS fails.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
            <Gauge size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">What it does</p>
              <ul className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 space-y-1 list-disc pl-4">
                <li>Remembers where your car is parked</li>
                <li>Warns you when you walk back (walking ETA)</li>
                <li>Auto-confirms handoff steps with an undo option</li>
                <li>Can auto-share your departure when you drive away (optional)</li>
              </ul>
            </div>
          </div>

          {motionSupported ? (
            motionActive ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <CircleCheck size={16} className="text-emerald-600" />
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  Motion sensors enabled. The agent will detect parking automatically.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl space-y-3">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {motionPermission === "denied"
                    ? "Motion access was denied. The agent will fall back to GPS-only detection."
                    : "Allow motion sensing to detect parking without relying on GPS alone. This only runs while the app is open."}
                </p>
                <button
                  onClick={handleEnableMotion}
                  disabled={requesting}
                  className="w-full h-11 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition"
                >
                  {requesting ? <Loader2 className="animate-spin" size={16} /> : null}
                  {requesting ? "Requesting..." : "Enable Motion Sensing"}
                </button>
              </div>
            )
          ) : (
            <p className="text-xs text-zinc-500">
              Motion sensors are not supported on this browser. The agent will use GPS only.
            </p>
          )}

          <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Auto-confirm handoffs</p>
                <p className="text-xs text-zinc-500">Confirm arrival/departure automatically, with an undo button.</p>
              </div>
              <Toggle checked={prefs.autoConfirm} onChange={onSetAutoConfirm} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Auto-share when you leave</p>
                <p className="text-xs text-zinc-500">Post a departure alert automatically when the agent detects you driving away.</p>
              </div>
              <Toggle checked={prefs.autoPost} onChange={onSetAutoPost} />
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Agent enabled</p>
            <Toggle checked={prefs.enabled} onChange={onSetEnabled} />
          </div>
          <button
            onClick={onClose}
            className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
