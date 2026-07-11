const DEFAULT_LAT = Number(process.env.NEXT_PUBLIC_MAP_DEFAULT_LAT) || 33.7701;
const DEFAULT_LNG = Number(process.env.NEXT_PUBLIC_MAP_DEFAULT_LNG) || -118.1937;

export const INITIAL_VIEW_STATE = {
  latitude: DEFAULT_LAT,
  longitude: DEFAULT_LNG,
  zoom: 13,
};

export const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/liberty";

export const SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    satellite: {
      type: "raster" as const,
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Esri",
    },
  },
  layers: [
    {
      id: "satellite-layer",
      type: "raster" as const,
      source: "satellite" as const,
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

export function formatLeavingCountdown(leavingAt: string | null | undefined) {
  if (!leavingAt) {
    return "Unknown";
  }

  const diff = new Date(leavingAt).getTime() - Date.now();
  if (diff <= 0) {
    return "Now";
  }

  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}
