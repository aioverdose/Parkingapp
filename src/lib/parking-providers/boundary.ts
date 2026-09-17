export type BBox = [number, number, number, number];
export function bboxFromGeoJSON(input: any): BBox {
  const points: number[][] = [];
  const walk = (value: any): void => { if (Array.isArray(value) && typeof value[0] === "number") points.push(value); else if (Array.isArray(value)) value.forEach(walk); };
  walk(input?.geometry?.coordinates ?? input?.coordinates ?? input);
  if (!points.length) throw new Error("Boundary has no coordinates");
  const lngs = points.map((p) => p[0]), lats = points.map((p) => p[1]);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}
export function areaKm2(bbox: BBox): number { const [west, south, east, north] = bbox; const lat = (south + north) / 2; return Math.abs(east - west) * 111.32 * Math.abs(north - south) * 111.32 * Math.cos(lat * Math.PI / 180); }
export function safeBbox(bbox: BBox, maxArea = 250): BBox { if (bbox.some((n) => !Number.isFinite(n)) || bbox[0] >= bbox[2] || bbox[1] >= bbox[3]) throw new Error("Invalid boundary"); if (bbox[0] < -180 || bbox[2] > 180 || bbox[1] < -90 || bbox[3] > 90 || areaKm2(bbox) > maxArea) throw new Error("Boundary exceeds the configured area limit"); return bbox; }
