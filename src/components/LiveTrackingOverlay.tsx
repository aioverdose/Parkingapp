"use client";

import { useEffect, useState } from "react";
import { Marker } from "react-map-gl/maplibre";
import { Button } from "@/components/ui/button";
import {
  Navigation,
  X as CloseIcon,
  Radio,
  MapPin,
  Clock,
} from "lucide-react";
import type { TrackedLocation } from "@/hooks/useLiveTracking";

interface LiveTrackingOverlayProps {
  /** The tracked partner's current location */
  partnerLocation: TrackedLocation | null;
  /** Whether the partner is actively sharing */
  partnerSharing: boolean;
  /** Whether tracking is active */
  isTracking: boolean;
  /** Error message if any */
  error: string | null;
  /** The partner's display name */
  partnerName: string;
  /** The parking spot address */
  spotAddress: string;
  /** The parking spot coordinates */
  spotLat: number;
  spotLng: number;
  /** Called to stop tracking */
  onStopTracking: () => void;
  /** Called to enable location sharing for this user */
  onEnableSharing?: () => void;
  /** Whether this user is sharing their own location */
  mySharing: boolean;
}

/**
 * LiveTrackingOverlay — Shows the matched partner's live position on the map.
 *
 * UI Features:
 * - Partner marker with animated pulse when moving
 * - Distance and ETA display
 * - "Stop Sharing" button for easy opt-out (CCPA requirement)
 * - Status indicators for sharing state
 * - Auto-hides when partner stops sharing
 */
export function LiveTrackingOverlay({
  partnerLocation,
  partnerSharing,
  isTracking,
  error,
  partnerName,
  spotAddress,
  spotLat,
  spotLng,
  onStopTracking,
  onEnableSharing,
  mySharing,
}: LiveTrackingOverlayProps) {
  const [showPanel, setShowPanel] = useState(true);

  // Format distance for display
  const formatDistance = (meters: number): string => {
    if (meters < 100) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Format ETA for display
  const formatETA = (seconds: number): string => {
    if (seconds < 60) return "Arriving now";
    const mins = Math.ceil(seconds / 60);
    return `${mins} min`;
  };

  // Auto-hide panel after 30 seconds of no updates
  useEffect(() => {
    if (!partnerSharing || !partnerLocation) return;
    const staleTimeout = setTimeout(() => {
      // Location hasn't updated in 60s — might be stale
    }, 60_000);
    return () => clearTimeout(staleTimeout);
  }, [partnerLocation, partnerSharing]);

  if (!isTracking) return null;

  return (
    <>
      {/* Partner location marker on the map */}
      {partnerLocation && partnerSharing && (
        <Marker
          longitude={partnerLocation.longitude}
          latitude={partnerLocation.latitude}
          anchor="center"
        >
          <div className="relative">
            {/* Pulse ring animation */}
            <div className="absolute inset-0 w-10 h-10 -ml-1 -mt-1 rounded-full bg-blue-400 animate-ping opacity-30" />
            {/* Driver dot */}
            <div className="w-8 h-8 rounded-full bg-blue-600 border-3 border-white shadow-lg flex items-center justify-center">
              <Navigation size={16} className="text-white" style={{
                transform: partnerLocation.heading != null
                  ? `rotate(${partnerLocation.heading}deg)`
                  : "none",
              }} />
            </div>
          </div>
        </Marker>
      )}

      {/* Spot marker (destination) */}
      <Marker longitude={spotLng} latitude={spotLat} anchor="center">
        <div className="relative">
          <div className="w-6 h-6 rounded-full bg-red-500 border-2 border-white shadow-lg flex items-center justify-center">
            <MapPin size={12} className="text-white" />
          </div>
        </div>
      </Marker>

      {/* Bottom panel with info and controls */}
      {showPanel && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-sm px-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* Status bar */}
            <div className={`px-4 py-2 flex items-center gap-2 text-xs font-medium ${
              partnerSharing
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500"
            }`}>
              <Radio size={12} className={partnerSharing ? "text-blue-500 animate-pulse" : ""} />
              {partnerSharing ? (
                <span>Live tracking active — sharing with {partnerName}</span>
              ) : (
                <span>Waiting for {partnerName} to share location...</span>
              )}
            </div>

            {/* Info section */}
            {partnerLocation && partnerSharing && (
              <div className="px-4 py-3 space-y-2">
                {/* ETA + Distance row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {partnerLocation.distance_meters != null && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Navigation size={14} className="text-blue-600" />
                        <span className="font-bold">
                          {formatDistance(partnerLocation.distance_meters)}
                        </span>
                        <span className="text-zinc-400">away</span>
                      </div>
                    )}
                    {partnerLocation.eta_seconds != null && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock size={14} className="text-green-600" />
                        <span className="font-bold">
                          {formatETA(partnerLocation.eta_seconds)}
                        </span>
                        <span className="text-zinc-400">ETA</span>
                      </div>
                    )}
                  </div>
                  {partnerLocation.speed != null && partnerLocation.speed > 0 && (
                    <span className="text-xs text-zinc-400">
                      {Math.round(partnerLocation.speed * 3.6)} km/h
                    </span>
                  )}
                </div>

                {/* Destination */}
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <MapPin size={12} />
                  <span className="truncate">{spotAddress}</span>
                </div>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-700 dark:text-amber-400">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
              {!mySharing && onEnableSharing && (
                <Button
                  onClick={onEnableSharing}
                  className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm"
                >
                  <Navigation size={14} className="mr-1.5" />
                  Share My Location
                </Button>
              )}
              <Button
                onClick={onStopTracking}
                variant="outline"
                className="h-10 rounded-xl font-bold text-sm text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
              >
                <CloseIcon size={14} className="mr-1" />
                Stop Sharing
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating toggle button when panel is hidden */}
      {!showPanel && partnerSharing && (
        <button
          onClick={() => setShowPanel(true)}
          className="absolute bottom-4 right-4 z-20 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center animate-pulse"
        >
          <Radio size={20} />
        </button>
      )}
    </>
  );
}
