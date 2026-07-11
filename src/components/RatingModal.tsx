"use client";

import { useState } from "react";
import { Loader2, Star, X } from "lucide-react";

interface RatingModalProps {
  open: boolean;
  ratedUserId: string;
  spotId: string;
  onClose: () => void;
}

export function RatingModal({ open, ratedUserId, spotId, onClose }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const getToken = async () => {
    const { createBrowserClient } = await import("@/lib/supabaseClient");
    const supabase = createBrowserClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const handleSubmit = async () => {
    if (rating < 1) return;
    setSubmitting(true);
    setError(null);

    const token = await getToken();
    const res = await fetch("/api/ratings/add", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rated_user_id: ratedUserId, rating, comment, spot_id: spotId }),
    });
    const data = await res.json();

    setSubmitting(false);
    if (data.error) {
      setError(data.error);
      return;
    }

    setSuccess(true);
    setAverageRating(data.average_rating);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[32px] shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Rate Your Handoff</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center py-6 text-center">
            <p className="text-lg font-bold mb-1">Rating Submitted!</p>
            {averageRating !== null && (
              <p className="text-sm text-zinc-500">
                Their average: {"★".repeat(Math.round(averageRating))}{"☆".repeat(5 - Math.round(averageRating))} ({averageRating.toFixed(1)})
              </p>
            )}
            <button onClick={onClose} className="mt-4 h-10 px-6 rounded-full bg-blue-600 text-white font-bold text-sm">
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500 text-center">How was your spot handoff?</p>

            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="text-3xl transition-transform hover:scale-110"
                >
                  <Star
                    size={36}
                    className={
                      (hoverRating || rating) >= star
                        ? "fill-amber-400 text-amber-400"
                        : "text-zinc-300 dark:text-zinc-600"
                    }
                  />
                </button>
              ))}
            </div>

            {rating > 0 && (
              <textarea
                placeholder="Comment (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm resize-none"
              />
            )}

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting || rating < 1}
              className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white font-bold transition flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : "Submit Rating"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
