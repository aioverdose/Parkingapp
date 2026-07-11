"use client";

import { useState, useRef } from "react";
import { Loader2, MapPin } from "lucide-react";

interface LocationPermissionOverlayProps {
  onPermissionGranted: () => void;
  show: boolean;
}

type ErrorType = "denied" | "timeout" | "unavailable" | null;

export function LocationPermissionOverlay({ onPermissionGranted, show }: LocationPermissionOverlayProps) {
  const [error, setError] = useState<ErrorType>(null);
  const [loading, setLoading] = useState(false);
  const retryRef = useRef(false);

  if (!show) return null;

  const attemptGetPosition = (highAccuracy: boolean) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false);
        onPermissionGranted();
        window.dispatchEvent(
          new CustomEvent("user-location", {
            detail: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy },
          })
        );
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError("denied");
          setLoading(false);
        } else if (err.code === err.TIMEOUT && highAccuracy && !retryRef.current) {
          // Auto-retry once without high accuracy for a faster fix
          retryRef.current = true;
          attemptGetPosition(false);
        } else {
          setError(err.code === err.TIMEOUT ? "timeout" : "unavailable");
          setLoading(false);
        }
      },
      { enableHighAccuracy: highAccuracy, timeout: 10000, maximumAge: 5000 }
    );
  };

  const handleRequest = () => {
    if (!("geolocation" in navigator)) {
      setError("unavailable");
      return;
    }

    setLoading(true);
    setError(null);
    retryRef.current = false;
    attemptGetPosition(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-950 flex flex-col items-center justify-center p-8">
      <div className="bg-blue-100 dark:bg-blue-900/30 w-20 h-20 rounded-full flex items-center justify-center mb-6">
        <MapPin size={40} className="text-blue-600" />
      </div>
      <h1 className="text-2xl font-bold text-center mb-3">
        Location Access Required
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-sm mb-8">
        This app needs access to your location to show nearby parking spots and
        help others find your spot. Without location, we cannot function.
      </p>

      {error === "denied" && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 mb-4 max-w-sm text-center">
          <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-1">
            Location Permission Blocked
          </p>
          <p className="text-xs text-red-600 dark:text-red-500">
            You blocked location access for this site. Open your browser settings,
            find site permissions, and allow location for this site.
          </p>
        </div>
      )}

      {error === "timeout" && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-4 max-w-sm text-center">
          <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">
            Couldn&apos;t Get GPS Fix
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-500">
            Your location is on but GPS can&apos;t get a fix. Try moving to an open area
            or tap below to retry.
          </p>
        </div>
      )}

      {error === "unavailable" && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-4 max-w-sm text-center">
          <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">
            Location Unavailable
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-500">
            Your device couldn&apos;t provide a location. Enable GPS and try again.
          </p>
        </div>
      )}

      <button
        onClick={handleRequest}
        disabled={loading}
        className="w-full max-w-xs h-14 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white font-bold text-lg transition flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={22} className="animate-spin" />
            Finding location...
          </>
        ) : error ? (
          "Try Again"
        ) : (
          <>
            <MapPin size={22} />
            Turn On Location Services
          </>
        )}
      </button>

      <p className="text-xs text-zinc-400 mt-6 text-center max-w-xs">
        Your location is only used while the app is open. We never store or share
        your precise location without your consent.
      </p>
    </div>
  );
}
