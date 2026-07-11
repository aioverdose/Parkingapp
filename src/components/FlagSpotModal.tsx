"use client";

import { useState } from "react";
import { Loader2, AlertTriangle, X } from "lucide-react";

interface FlagSpotModalProps {
  open: boolean;
  spotId: string;
  onClose: () => void;
}

const FLAG_TYPES = [
  { value: "wrong_location", label: "Wrong Location" },
  { value: "fake_spot", label: "Fake Spot" },
  { value: "misleading_alert", label: "Misleading / Stale Alert" },
  { value: "rude_user", label: "User Being Rude" },
  { value: "dangerous_behavior", label: "Dangerous Behavior" },
  { value: "other", label: "Other" },
];

export function FlagSpotModal({ open, spotId, onClose }: FlagSpotModalProps) {
  const [flagType, setFlagType] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [flagCount, setFlagCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const getToken = async () => {
    const { createBrowserClient } = await import("@/lib/supabaseClient");
    const supabase = createBrowserClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const handleSubmit = async () => {
    if (!flagType) return;
    setSubmitting(true);
    setError(null);

    const token = await getToken();
    const res = await fetch("/api/flags/add", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ spot_id: spotId, flag_type: flagType, comment }),
    });
    const data = await res.json();

    setSubmitting(false);
    if (data.error) {
      setError(data.error);
      return;
    }

    setSuccess(true);
    setFlagCount(data.flag_count);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[32px] shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-500" />
            <h2 className="text-lg font-bold">Report This Spot</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center py-6 text-center space-y-2">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-500">
              <AlertTriangle size={28} />
            </div>
            <p className="text-lg font-bold">Spot Flagged</p>
            <p className="text-sm text-zinc-500">Admin will review. This user has {flagCount} flag(s).</p>
            <button onClick={onClose} className="mt-2 h-10 px-6 rounded-full bg-blue-600 text-white font-bold text-sm">
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {FLAG_TYPES.map((ft) => (
                <button
                  key={ft.value}
                  onClick={() => setFlagType(ft.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition ${
                    flagType === ft.value
                      ? "bg-red-50 dark:bg-red-900/20 border-2 border-red-500 text-red-700 dark:text-red-400"
                      : "bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                  }`}
                >
                  {ft.label}
                </button>
              ))}
            </div>

            <textarea
              placeholder="Comment (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm resize-none"
            />

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting || !flagType}
              className="w-full h-12 rounded-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white font-bold transition flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : "Submit Report"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
