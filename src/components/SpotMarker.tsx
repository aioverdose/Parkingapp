"use client";

import { Marker } from "react-map-gl/maplibre";
import { useLeavingTimer } from "@/hooks/useLeavingTimer";
import type { Spot } from "@/hooks/useRealtimeSpots";
import { getVehicleTypeLabel } from "@/lib/vehicle-types";

interface SpotMarkerProps {
  spot: Spot;
  onClick: (spot: Spot) => void;
}

export function SpotMarker({ spot, onClick }: SpotMarkerProps) {
  const { formatted, isExpired } = useLeavingTimer(spot.departure_time);
  const isScheduled = spot.relay_mode === "scheduled";

  if (isExpired) return null;

  const bgColor = isScheduled ? "#7c3aed" : "#2563eb";
  const dotColor = isScheduled ? "#7c3aed" : "#2563eb";

  return (
    <Marker latitude={spot.latitude} longitude={spot.longitude} anchor="bottom">
      <button
        onClick={() => onClick(spot)}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          border: "none",
          background: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <div
          style={{
            background: bgColor,
            color: "white",
            padding: "2px 8px",
            fontSize: "11px",
            fontWeight: 700,
            borderRadius: spot.vehicle_type ? "4px 4px 0 0" : "4px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            whiteSpace: "nowrap",
          }}
        >
          {isScheduled ? `${formatted}` : formatted}
        </div>
        {spot.vehicle_type && (
          <div
            style={{
              background: bgColor,
              color: "white",
              padding: "1px 8px",
              fontSize: "10px",
              fontWeight: 500,
              borderRadius: "0 0 4px 4px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
              opacity: 0.85,
            }}
          >
            {getVehicleTypeLabel(spot.vehicle_type)}
          </div>
        )}
        <div
          style={{
            width: 14,
            height: 14,
            background: dotColor,
            borderRadius: "50%",
            border: "2px solid white",
            boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            marginTop: 2,
          }}
        />
      </button>
    </Marker>
  );
}
