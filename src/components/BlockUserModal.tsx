"use client";

import { useState } from "react";
import { Loader2, Ban, X, CheckCircle } from "lucide-react";

interface BlockUserModalProps {
  open: boolean;
  userId: string;
  userName: string;
  onClose: () => void;
}

export function BlockUserModal({ open, userId, userName, onClose }: BlockUserModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!open) return null;

  const handleBlock = async () => {
    setSubmitting(true);
    const { createBrowserClient } = await import("@/lib/supabaseClient");
    const supabase = createBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ blocked_id: userId }),
    });
    setSubmitting(false);

    if (res.ok) setDone(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[32px] shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Ban size={20} className="text-red-500" />
            <h2 className="text-lg font-bold">Block User</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1">
            <X size={20} />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center py-6 text-center space-y-2">
            <CheckCircle size={48} className="text-red-500" />
            <p className="text-lg font-bold">{userName} Blocked</p>
            <p className="text-sm text-zinc-500">They won't be able to match or chat with you.</p>
            <button onClick={onClose} className="mt-2 h-10 px-6 rounded-full bg-blue-600 text-white font-bold text-sm">
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Block <strong>{userName}</strong>? They won't be able to:
            </p>
            <ul className="text-sm text-zinc-500 space-y-1 ml-4 list-disc">
              <li>Match with your spots</li>
              <li>Send you chat messages</li>
              <li>See your profile</li>
            </ul>
            <button
              onClick={handleBlock}
              disabled={submitting}
              className="w-full h-12 rounded-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-300 text-white font-bold transition flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : `Block ${userName}`}
            </button>
            <button onClick={onClose} className="w-full text-sm text-zinc-500 hover:text-zinc-700 transition">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
