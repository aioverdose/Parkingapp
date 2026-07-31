"use client";

import { Loader2, Car, Footprints, MapPin, Clock } from "lucide-react";
import { Button } from "./ui/button";

interface CarLocationPanelProps {
  parkingDetection: "off" | "detecting_park" | "parked" | "walking_back" | "near_car";
  detectionProgress: number;
  walkingEtaFormatted: string | null;
  distanceToCar: number | null;
  onPostSpot: () => void;
  onClearCarLocation: () => void;
  loading: boolean;
}

export function CarLocationPanel({
  parkingDetection,
  detectionProgress,
  walkingEtaFormatted,
  distanceToCar,
  onPostSpot,
  onClearCarLocation,
  loading,
}: CarLocationPanelProps) {
  if (loading || parkingDetection === "off") return null;

  if (parkingDetection === "detecting_park") {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-emerald-200 dark:border-emerald-800 p-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
            <Car size={16} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Detecting parking...</p>
            <div className="mt-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(detectionProgress * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (parkingDetection === "parked") {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-emerald-200 dark:border-emerald-800 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
              <MapPin size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Car parked</p>
              <p className="text-[10px] text-zinc-500">Location saved</p>
            </div>
          </div>
          <button
            onClick={onClearCarLocation}
            className="text-[10px] text-zinc-400 hover:text-zinc-600 underline"
          >
            Clear
          </button>
        </div>
      </div>
    );
  }

  if (parkingDetection === "walking_back" && walkingEtaFormatted) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-800 p-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
            <Footprints size={16} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Walking to car</p>
            <p className="text-[10px] text-zinc-500">
              {walkingEtaFormatted} away{distanceToCar !== null ? ` (${Math.round(distanceToCar)}m)` : ""}
            </p>
          </div>
          <div className="animate-pulse w-2 h-2 rounded-full bg-amber-500" />
        </div>
      </div>
    );
  }

  if (parkingDetection === "near_car") {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-blue-200 dark:border-blue-800 p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
            <Clock size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-700 dark:text-blue-400">Arrived at car</p>
            <p className="text-[10px] text-zinc-500">
              {distanceToCar !== null ? `${Math.round(distanceToCar)}m away` : "Nearby"}
            </p>
          </div>
        </div>
        <Button
          onClick={onPostSpot}
          className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
        >
          <Car size={14} className="mr-1.5" />
          Post Spot (Leaving Now)
        </Button>
      </div>
    );
  }

  return null;
}
