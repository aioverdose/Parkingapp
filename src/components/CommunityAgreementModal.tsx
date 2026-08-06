"use client";

import { useState } from "react";
import { Loader2, Shield, X } from "lucide-react";

interface CommunityAgreementModalProps {
  open: boolean;
  onAccept: () => Promise<void>;
  onClose: () => void;
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

const SAFETY_RULES = [
  "Use this app for imminent departures only — alerts are limited to 15 minutes",
  "Don't wait near someone's home or circle the block",
  "Don't wait on sidewalks — stay in your vehicle until the spot is free",
  "Don't follow people to their car — wait for them to leave first",
  "Keep handoffs brief — exchange a wave, not a conversation",
  "Block users if you feel unsafe — use the report button",
  "Report dangerous behavior or misleading alerts via the flag system",
];

type Tab = "terms" | "safety";

export function CommunityAgreementModal({ open, onAccept, onClose }: CommunityAgreementModalProps) {
  const [checked, setChecked] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [showLaw, setShowLaw] = useState(false);
  const [tab, setTab] = useState<Tab>("terms");

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

  if (showLaw) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        onClick={() => { if (!accepting) onClose(); }}
      >
        <div
          className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[32px] shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 pt-6 pb-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-lg font-bold">CA Vehicle Code § 22651.9</h2>
            <button onClick={() => setShowLaw(false)} className="text-zinc-400 hover:text-zinc-600 p-1">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {CA_VEHICLE_CODE}
            </pre>
          </div>
          <div className="px-6 pb-6 pt-2">
            <button onClick={() => setShowLaw(false)} className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={() => { if (!accepting) onClose(); }}
    >
      <div
        className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[32px] shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-0 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield size={20} className="text-blue-600" />
            <h2 className="text-lg font-bold">Community Agreement</h2>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setTab("terms")}
              className={`flex-1 py-2 text-sm font-bold rounded-t-lg transition ${
                tab === "terms"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              Terms &amp; Privacy
            </button>
            <button
              onClick={() => setTab("safety")}
              className={`flex-1 py-2 text-sm font-bold rounded-t-lg transition ${
                tab === "safety"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              Safety Rules
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {tab === "terms" && (
            <>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  No money for spots
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                  ParkingMeeters never buys, sells, rents, or leases street parking
                  spots, and neither may members. Handoffs are voluntary and free.
                  Any fee you pay is for access to our arrival/departure detection
                  and matching technology — never for a spot.
                </p>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <p className="text-sm font-bold text-red-700 dark:text-red-400">
                  Selling public parking spaces is ILLEGAL
                </p>
                <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                  Under California law, it is illegal to sell, rent, or charge for
                  public on-street parking spaces. We only sell access to our
                  matching technology — never a spot, and never a reservation.
                  Violators may face fines and towing.
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
                  Privacy &amp; Data Use
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  We collect your approximate location to connect you with nearby
                  drivers leaving and drivers arriving. We do not sell your data. Location is
                  shared at block-level only during active sessions.
                </p>
              </div>
            </>
          )}

          {tab === "safety" && (
            <>
              <p className="text-sm text-zinc-500">
                Before using the app, please read and acknowledge these safety rules:
              </p>
              <div className="space-y-3">
                {SAFETY_RULES.map((rule, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 shrink-0 text-xs font-bold">
                      {i + 1}
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{rule}</p>
                  </div>
                ))}
              </div>
            </>
          )}
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
              I agree to the Terms of Service, Privacy Policy, and Safety Rules.
              I understand that buying, selling, or renting parking spots is illegal.
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
      </div>
    </div>
  );
}
