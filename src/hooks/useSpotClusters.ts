"use client";

import { useMemo } from "react";
import type { Spot } from "@/hooks/useRealtimeSpots";

export interface ClusterFeature {
  id: string;
  type: "cluster";
  lat: number;
  lng: number;
  count: number;
}

export interface PointFeature {
  id: string;
  type: "point";
  spot: Spot;
}

export type SpotClusterItem = ClusterFeature | PointFeature;

function gridSize(zoom: number): number {
  if (zoom >= 16) return 0.0005;
  if (zoom >= 14) return 0.002;
  if (zoom >= 12) return 0.01;
  if (zoom >= 10) return 0.05;
  return 0.2;
}

function clusterSpots(spots: Spot[], zoom: number): SpotClusterItem[] {
  const cellSize = gridSize(zoom);
  if (cellSize === 0) return spots.map((s) => ({ id: s.id, type: "point", spot: s }));

  const cells = new Map<string, { lat: number; lng: number; count: number; spotIds: string[] }>();

  for (const spot of spots) {
    const cx = Math.floor(spot.latitude / cellSize);
    const cy = Math.floor(spot.longitude / cellSize);
    const key = `${cx},${cy}`;
    if (cells.has(key)) {
      const cell = cells.get(key)!;
      cell.count++;
      cell.spotIds.push(spot.id);
    } else {
      cells.set(key, { lat: spot.latitude, lng: spot.longitude, count: 1, spotIds: [spot.id] });
    }
  }

  const result: SpotClusterItem[] = [];
  for (const [, cell] of cells) {
    if (cell.count === 1) {
      const spot = spots.find((s) => s.id === cell.spotIds[0])!;
      result.push({ id: spot.id, type: "point", spot });
    } else {
      result.push({
        id: `cluster-${cell.lat.toFixed(4)}-${cell.lng.toFixed(4)}`,
        type: "cluster",
        lat: cell.lat,
        lng: cell.lng,
        count: cell.count,
      });
    }
  }
  return result;
}

export function useSpotClusters(
  spots: Spot[],
  zoom: number,
): SpotClusterItem[] {
  return useMemo(() => clusterSpots(spots, zoom), [spots, zoom]);
}
