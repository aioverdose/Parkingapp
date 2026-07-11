"use client";

import { useState } from "react";
import { Loader2, Shield, X, Check } from "lucide-react";

interface SafetyWarningModalProps {
  open: boolean;
  onAcknowledge: () => Promise<void>;
  onClose: () => void;
}

export function SafetyWarningModal({ open, onAcknowledge, onClose }: SafetyWarningModalProps) {
  const [checked, setChecked] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);

  if (!open) return null;

  const handleAcknowledge = async () => {
    if (!checked) return;
    setAcknowledging(true);
    try {
      await onAcknowledge();
    } finally {
      setAcknowledging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[32px] shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield size={22} className="text-blue-600" />
            <h2 className="text-lg font-bold">Safety Rules</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-zinc-500 mb-4">
          Before using the app, please read and acknowledge these safety rules:
        </p>

        <div className="space-y-3 mb-6">
          {[
            "Use this app for imminent departures only — alerts are limited to 15 minutes",
            "Don't wait near someone's home or circle the block",
            "Don't wait on sidewalks — stay in your vehicle until the spot is free",
            "Don't follow people to their car — wait for them to leave first",
            "Keep handoffs brief — exchange a wave, not a conversation",
            "Block users if you feel unsafe — use the report button",
            "Report dangerous behavior or misleading alerts via the flag system",
          ].map((rule, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 shrink-0 text-xs font-bold">
                {i + 1}
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{rule}</p>
            </div>
          ))}
        </div>

        <label className="flex items-start gap-3 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            I understand and agree to follow all safety rules
          </span>
        </label>

        <button
          onClick={handleAcknowledge}
          disabled={!checked || acknowledging}
          className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white font-bold transition flex items-center justify-center gap-2"
        >
          {acknowledging ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <Check size={18} />
              I Agree
            </>
          )}
        </button>
      </div>
    </div>
  );
}
