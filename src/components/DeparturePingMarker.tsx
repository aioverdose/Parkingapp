"use client";

import { Marker } from "react-map-gl/maplibre";
import { Bell, Clock } from "lucide-react";

export interface DeparturePingData {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  leaving_in_minutes: number;
  created_at: string;
}

interface DeparturePingMarkerProps {
  ping: DeparturePingData;
  onClick: (ping: DeparturePingData) => void;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function DeparturePingMarker({ ping, onClick }: DeparturePingMarkerProps) {
  return (
    <Marker latitude={ping.latitude} longitude={ping.longitude} anchor="bottom">
      <button
        onClick={() => onClick(ping)}
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
            background: "#7c3aed",
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
          <Bell size={10} />
          Leaving soon
        </div>
        <div
          style={{
            background: "#8b5cf6",
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
          in {ping.leaving_in_minutes}m · {timeAgo(ping.created_at)}
        </div>
        <div
          style={{
            width: 14,
            height: 14,
            background: "#7c3aed",
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
