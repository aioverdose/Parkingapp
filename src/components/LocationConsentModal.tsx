"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Shield, Eye, Trash2, X } from "lucide-react";

interface LocationConsentModalProps {
  /** The name of the matched partner */
  partnerName: string;
  /** The spot address */
  spotAddress: string;
  /** Called when the user consents to share location */
  onConsent: () => void;
  /** Called when the user declines */
  onDecline: () => void;
}

/**
 * LocationConsentModal — Explicit consent dialog for live location sharing.
 *
 * CCPA & Privacy Compliance:
 * - Displays clear, plain-language disclosure BEFORE any data collection begins
 * - Explains exactly what data is shared, with whom, and for how long
 * - Requires an affirmative action (tap) to consent — no pre-checked boxes
 * - Provides a decline option that does not affect the match
 * - Records the consent action via the /location/start API endpoint
 *
 * The disclosure text covers:
 * - What: precise GPS coordinates
 * - Who: only the matched driver for this specific handoff
 * - How long: only during this active session, auto-deleted after
 * - Rights: stop sharing at any time, data deleted on session end
 */
export function LocationConsentModal({
  partnerName,
  spotAddress,
  onConsent,
  onDecline,
}: LocationConsentModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConsent = async () => {
    setLoading(true);
    try {
      onConsent();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <MapPin size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-base">Share Live Location?</h2>
              <p className="text-xs text-zinc-500">Handoff with {partnerName}</p>
            </div>
          </div>
          <button onClick={onDecline} className="text-zinc-400 hover:text-zinc-600">
            <X size={20} />
          </button>
        </div>

        {/* Disclosure — plain language, required for informed consent */}
        <div className="px-5 space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Allow <span className="font-medium">{partnerName}</span> to see your real-time
            location as you approach <span className="font-medium">{spotAddress}</span>?
          </p>

          {/* What data is shared */}
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Eye size={14} className="text-zinc-500 mt-0.5 shrink-0" />
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-medium">What&apos;s shared:</span> Your precise GPS
                location, updated every ~20 seconds
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Shield size={14} className="text-zinc-500 mt-0.5 shrink-0" />
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-medium">Who sees it:</span> Only {partnerName} — no
                one else
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Trash2 size={14} className="text-zinc-500 mt-0.5 shrink-0" />
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-medium">Data retention:</span> Auto-deleted when the
                handoff ends. You can stop sharing at any time.
              </p>
            </div>
          </div>

          {/* Legal / TOS reference */}
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            By tapping &quot;Share Location&quot; you consent to real-time GPS sharing for
            this handoff only. This is optional — you can still coordinate via chat without
            sharing your location. See our{" "}
            <a href="/privacy-policy" target="_blank" className="underline hover:text-zinc-600">
              Privacy Policy
            </a>{" "}
            for details.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5 pt-4">
          <Button
            onClick={onDecline}
            variant="outline"
            className="flex-1 h-11 rounded-xl font-bold"
            disabled={loading}
          >
            Skip
          </Button>
          <Button
            onClick={handleConsent}
            className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <MapPin size={16} className="mr-1.5" />
                Share Location
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
