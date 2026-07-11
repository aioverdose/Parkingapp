"use client";

import { Loader2, MapPin } from "lucide-react";

interface PilotAreaWarningProps {
  open: boolean;
  areaName: string;
  onRequestAccess?: () => void;
}

export function PilotAreaWarning({ open, areaName, onRequestAccess }: PilotAreaWarningProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[32px] shadow-2xl p-6 text-center">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 mx-auto mb-4">
          <MapPin size={28} />
        </div>
        <h2 className="text-lg font-bold mb-2">Outside Pilot Area</h2>
        <p className="text-sm text-zinc-500 mb-4">
          This app is currently in beta for <span className="font-bold text-zinc-700 dark:text-zinc-300">{areaName}</span> only.
          You are outside the allowed area and cannot post or search for spots yet.
        </p>
        <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 mb-4">
          <p className="text-xs text-zinc-500 mb-1">Allowed Area:</p>
          <p className="text-sm font-bold">{areaName}</p>
        </div>
        {onRequestAccess && (
          <button
            onClick={onRequestAccess}
            className="w-full h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm"
          >
            Request Access
          </button>
        )}
      </div>
    </div>
  );
}
