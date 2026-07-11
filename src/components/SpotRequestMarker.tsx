"use client";

import { Marker } from "react-map-gl/maplibre";
import { Search, Clock } from "lucide-react";

export interface SpotRequestMarkerData {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  vehicle_type: string | null;
  status: string;
  created_at: string;
  expires_at: string;
}

interface SpotRequestMarkerProps {
  request: SpotRequestMarkerData;
  onClick: (req: SpotRequestMarkerData) => void;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function SpotRequestMarker({ request, onClick }: SpotRequestMarkerProps) {
  return (
    <Marker latitude={request.latitude} longitude={request.longitude} anchor="bottom">
      <button
        onClick={() => onClick(request)}
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
            background: "#f97316",
            color: "white",
            padding: "2px 8px",
            fontSize: "11px",
            fontWeight: 700,
            borderRadius: "4px 4px 0 0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            gap: 4,
            whiteSpace: "nowrap",
          }}
        >
          <Search size={10} />
          Looking
        </div>
        <div
          style={{
            background: "#fb923c",
            color: "white",
            padding: "1px 8px",
            fontSize: "10px",
            fontWeight: 500,
            borderRadius: "0 0 4px 4px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Clock size={8} />
          {timeAgo(request.created_at)}
        </div>
        <div
          style={{
            width: 14,
            height: 14,
            background: "#f97316",
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
