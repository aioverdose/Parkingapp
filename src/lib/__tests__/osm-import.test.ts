import { describe, expect, it } from "vitest";
import { buildParkingQuery } from "@/lib/parking-providers/openstreetmap";
import { normalizeOSMElement } from "@/lib/parking-providers/osm-normalizer";
import { flagSpatialDuplicates } from "@/lib/parking-providers/osm-dedupe";
import { OSM_ATTRIBUTION } from "@/lib/parking-providers/attribution";
import { areaKm2, safeBbox } from "@/lib/parking-providers/boundary";
const boundary = { type: "Polygon", coordinates: [[[-74.01, 40.70], [-73.99, 40.70], [-73.99, 40.72], [-74.01, 40.72], [-74.01, 40.70]]] };
describe("OSM import", () => {
  it("generates a bounded parking query", () => { const query = buildParkingQuery(boundary); expect(query).toContain("amenity~"); expect(query).toContain("40.7,-74.01,40.72,-73.99"); expect(query).not.toContain("world"); });
  it("normalizes tags without inventing access or fee", () => { const result = normalizeOSMElement({ type: "node", id: 1, lat: 40.71, lon: -74, tags: { amenity: "parking", name: "Lot" } }); expect(result?.parking_type).toBe("surface"); expect(result?.access).toBe("unknown"); expect(result?.fee).toBe("unknown"); expect(result?.data_confidence).toBe("reference"); });
  it("keeps private parking restricted", () => { const result = normalizeOSMElement({ type: "node", id: 2, lat: 40.71, lon: -74, tags: { amenity: "parking", access: "private" } }); expect(result?.visibility).toBe("admin_only"); expect(result?.access).toBe("private"); });
  it("flags nearby duplicate names without merging", () => { const a = normalizeOSMElement({ type: "node", id: 1, lat: 40.71, lon: -74, tags: { amenity: "parking", name: "Lot" } })!; const b = normalizeOSMElement({ type: "node", id: 2, lat: 40.7101, lon: -74, tags: { amenity: "parking", name: "Lot" } })!; expect(flagSpatialDuplicates([a, b])).toEqual([1]); });
  it("exposes ODbL attribution", () => { expect(OSM_ATTRIBUTION.license).toBe("ODbL 1.0"); expect(OSM_ATTRIBUTION.sourceUrl).toContain("openstreetmap.org"); });
  it("rejects large boundaries", () => { expect(areaKm2([-180, -80, 180, 80])).toBeGreaterThan(1000); expect(() => safeBbox([-180, -80, 180, 80], 1000)).toThrow(); });
});
