import type { NormalizedParkingRecord, OSMElement } from "./types";

function validPoint(point: unknown): point is { lat: number; lon: number } {
  if (!point || typeof point !== "object") return false;
  const candidate = point as { lat?: unknown; lon?: unknown };
  return typeof candidate.lat === "number" && Number.isFinite(candidate.lat) && candidate.lat >= -90 && candidate.lat <= 90
    && typeof candidate.lon === "number" && Number.isFinite(candidate.lon) && candidate.lon >= -180 && candidate.lon <= 180;
}

function centroid(element: OSMElement): [number, number] {
  const nodePoint = { lat: element.lat, lon: element.lon };
  if (validPoint(nodePoint)) return [nodePoint.lat, nodePoint.lon];
  if (validPoint(element.center)) return [element.center.lat, element.center.lon];
  const points = (element.geometry || []).filter(validPoint);
  if (points.length) return [
    points.reduce((sum, point) => sum + point.lat, 0) / points.length,
    points.reduce((sum, point) => sum + point.lon, 0) / points.length,
  ];
  throw new Error("OSM element has no valid geometry");
}

export function normalizeOSMElement(element: OSMElement): NormalizedParkingRecord | null {
  if (!element || !["node", "way", "relation"].includes(element.type) || !Number.isSafeInteger(element.id)) return null;
  const tags = element.tags && typeof element.tags === "object" ? element.tags : {};
  const [lat, lng] = centroid(element);
  const privateAccess = ["private", "employees", "residents", "permit"].includes(tags.access || "") || tags.access === "no";
  const residentialDriveway = tags.highway === "service" && tags.service === "driveway" && (tags.access === "private" || tags.driveway === "residential");
  if (residentialDriveway && !tags.amenity) return null;

  const parking_type = tags.amenity === "parking_space" ? "parking_space"
    : tags.amenity === "motorcycle_parking" ? "motorcycle"
    : tags.parking === "underground" ? "underground"
    : tags.parking === "multi-storey" ? "multi_storey"
    : tags.highway === "parking_aisle" || (tags.highway === "service" && tags.service === "parking_aisle") ? "lane"
    : tags.building ? "garage" : "surface";
  const geometryPoints = (element.geometry || []).filter(validPoint);
  const geometry = element.lat !== undefined && element.lon !== undefined
    ? { type: "Point", coordinates: [lng, lat] }
    : geometryPoints.length >= 3
      ? { type: "Polygon", coordinates: [[...geometryPoints.map((point) => [point.lon, point.lat]), [geometryPoints[0].lon, geometryPoints[0].lat]]] }
      : { type: "Point", coordinates: [lng, lat] };

  return {
    name: tags.name || tags["name:en"] || "Unnamed parking reference",
    operator: tags.operator || "",
    parking_type,
    geometry,
    centroid_lat: lat,
    centroid_lng: lng,
    capacity: tags.capacity && /^\d+$/.test(tags.capacity) ? Number(tags.capacity) : null,
    access: tags.access === "no" ? "private" : ["public", "customers", "permit", "private", "employees", "residents"].includes(tags.access || "") ? tags.access! : "unknown",
    fee: tags.fee === "yes" ? "yes" : tags.fee === "no" ? "no" : "unknown",
    opening_hours: tags.opening_hours || "",
    vehicle_restrictions: Object.fromEntries(Object.entries(tags).filter(([key]) => /vehicle|motorcar|hgv|maxheight|maxweight/.test(key))),
    amenities: Object.fromEntries(Object.entries(tags).filter(([key]) => /wheelchair|lit|covered|surveillance|amenity/.test(key))),
    data_confidence: "reference",
    visibility: privateAccess ? (tags.access === "private" || residentialDriveway ? "admin_only" : "restricted_reference") : "public_reference",
    source_metadata: { osm_type: element.type, osm_id: element.id, osm_version: element.version ?? null, tags },
  };
}
