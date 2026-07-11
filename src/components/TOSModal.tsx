"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface TOSModalProps {
  onAccept: () => Promise<void>;
  open: boolean;
  onClose: () => void;
  mode: "post" | "look";
}

const CA_VEHICLE_CODE = `California Vehicle Code § 22651.9

(a) A peace officer, as defined in Chapter 4.5 (commencing with Section 830) of Title 3 of Part 2 of the Penal Code, or a person authorized to enforce parking laws, ordinances, or regulations, may remove a vehicle from a street or highway when a person has been issued a notice of parking violation and the vehicle is parked in a street or highway in violation of a local ordinance that governs street sweeping and restricts parking during certain hours.

(b) A local authority may adopt an ordinance authorizing the removal of vehicles parked in violation of street sweeping restrictions during posted hours.

(c) Any vehicle removed under this section shall be impounded and the owner shall be responsible for all towing and storage fees.

(d) This section does not authorize the removal of a vehicle from private property.

(e) For purposes of this section, "street sweeping" means the cleaning of streets or highways by mechanical means by a public agency.

Penalties for Violation:
- A first offense is an infraction punishable by a fine not exceeding $100.
- A second offense within one year is an infraction punishable by a fine not exceeding $200.
- A third or subsequent offense within one year is an infraction punishable by a fine not exceeding $500.
- Additionally, the vehicle may be towed and impounded at the owner's expense.`;

export function TOSModal({ onAccept, open, onClose, mode }: TOSModalProps) {
  const [checked, setChecked] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [showLaw, setShowLaw] = useState(false);

  if (!open) return null;

  const handleAccept = async () => {
    if (!checked) return;
    setAccepting(true);
    try {
      await onAccept();
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={() => {
        if (!accepting) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[32px] shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {showLaw ? (
          <>
            <div className="px-6 pt-6 pb-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-lg font-bold">CA Vehicle Code § 22651.9</h2>
              <button
                onClick={() => setShowLaw(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6l-12 12"/><path d="M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {CA_VEHICLE_CODE}
              </pre>
            </div>
            <div className="px-6 pb-6 pt-2">
              <button
                onClick={() => setShowLaw(false)}
                className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-6 pt-6 pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-center">Terms of Service</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  This is a FREE service
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                  No payment, no tips, no selling of parking spots. All handoffs
                  are voluntary and non-commercial.
                </p>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <p className="text-sm font-bold text-red-700 dark:text-red-400">
                  Selling public parking spaces is ILLEGAL
                </p>
                <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                  Under California law, it is illegal to sell or charge for
                  public on-street parking spaces. Violators may face fines and
                  towing.
                </p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                  California Vehicle Code § 22651.9
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  No person may block or impede street sweeping operations.
                  Vehicles parked during posted street sweeping hours may be
                  ticketed and towed.
                </p>
                <button
                  onClick={() => setShowLaw(true)}
                  className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700 underline"
                >
                  Read Full Law
                </button>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                  Privacy & Data Use
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  We collect your approximate location to connect you with nearby
                  posters and seekers. We do not sell your data. Location is
                  shared at block-level only during active sessions.
                </p>
              </div>
            </div>
            <div className="px-6 pb-6 pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  I agree to the Terms of Service and understand that selling
                  parking spots is illegal
                </span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  disabled={accepting}
                  className="flex-1 h-12 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAccept}
                  disabled={!checked || accepting}
                  className="flex-1 h-12 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white font-bold transition disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {accepting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "I Agree"
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
