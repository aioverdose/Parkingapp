"use client";

import { Marker } from "react-map-gl/maplibre";
import type { ClusterFeature } from "@/hooks/useSpotClusters";

interface ClusterMarkerProps {
  cluster: ClusterFeature;
  onClick: (cluster: ClusterFeature) => void;
}

export function ClusterMarker({ cluster, onClick }: ClusterMarkerProps) {
  const size = Math.min(20 + cluster.count * 2, 60);

  return (
    <Marker latitude={cluster.lat} longitude={cluster.lng} anchor="center">
      <button
        onClick={() => onClick(cluster)}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
          color: "white",
          border: "3px solid white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: size > 30 ? "14px" : "11px",
          transition: "transform 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        {cluster.count}
      </button>
    </Marker>
  );
}
