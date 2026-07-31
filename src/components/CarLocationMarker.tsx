"use client";

import { Marker } from "react-map-gl/maplibre";

interface CarLocationMarkerProps {
  latitude: number;
  longitude: number;
  status: "parked" | "walking_back" | "departed";
}

export function CarLocationMarker({ latitude, longitude, status }: CarLocationMarkerProps) {
  const color = status === "parked" ? "#10b981" : status === "walking_back" ? "#f59e0b" : "#6b7280";

  return (
    <Marker latitude={latitude} longitude={longitude} anchor="center">
      <div
        style={{
          width: 32,
          height: 32,
          background: color,
          borderRadius: "50%",
          border: "3px solid white",
          boxShadow: `0 0 0 3px ${color}40, 0 2px 8px rgba(0,0,0,0.3)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          cursor: "default",
          transition: "all 0.3s ease",
        }}
        title={`Car is ${status === "parked" ? "parked here" : status === "walking_back" ? "walking back" : "departed"}`}
      >
        🚗
      </div>
    </Marker>
  );
}
